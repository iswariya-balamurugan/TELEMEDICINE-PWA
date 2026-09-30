import { cipherPreview, isUnlocked, open, seal, unlock, type Sealed } from "./crypto";
import { STORES, clearStore, getAllRows, putRow } from "./db";
import { assessRisk } from "./risk";
import type {
  Conflict,
  ConflictField,
  NetworkMode,
  PatientRecord,
  ServerRecord,
  SyncLogEntry,
} from "./types";

export type State = {
  ready: boolean;
  unlocked: boolean;
  records: PatientRecord[];
  server: ServerRecord[];
  conflicts: Conflict[];
  log: SyncLogEntry[];
  network: NetworkMode;
  syncing: boolean;
  bytesSent: number;
  ciphertext: string | null;
};

const BANDWIDTH: Record<NetworkMode, number> = { offline: 0, "2g": 45, "3g": 500, "4g": 5000 };

const MERGEABLE: { field: keyof PatientRecord; label: string }[] = [
  { field: "symptoms", label: "Symptoms" },
  { field: "conditions", label: "Medical history" },
  { field: "allergies", label: "Allergies" },
  { field: "medications", label: "Current medication" },
  { field: "notes", label: "Field notes" },
  { field: "vitals", label: "Vitals" },
];

let state: State = {
  ready: false,
  unlocked: false,
  records: [],
  server: [],
  conflicts: [],
  log: [],
  network: "offline",
  syncing: false,
  bytesSent: 0,
  ciphertext: null,
};

const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState() {
  return state;
}

function log(kind: SyncLogEntry["kind"], message: string) {
  const entry: SyncLogEntry = { id: crypto.randomUUID(), at: Date.now(), kind, message };
  set({ log: [entry, ...state.log].slice(0, 60) });
}

function fmt(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return value === "" || value == null ? "—" : String(value);
}

function sizeOf(record: PatientRecord) {
  return new Blob([JSON.stringify(record)]).size;
}

/* ---------------------------------------------------------------- persistence */

async function persistRecords() {
  await clearStore(STORES.records);
  let preview: string | null = null;
  for (const r of state.records) {
    const sealed = await seal(r);
    await putRow(STORES.records, { id: r.id, ...sealed });
    if (!preview) preview = cipherPreview(sealed);
  }
  set({ ciphertext: preview });
}

async function persistServer() {
  await clearStore(STORES.server);
  for (const r of state.server) await putRow(STORES.server, r);
}

async function persistConflicts() {
  await clearStore(STORES.conflicts);
  for (const c of state.conflicts) await putRow(STORES.conflicts, c);
}

export async function unlockAndLoad(pin: string) {
  await unlock(pin);
  const rows = await getAllRows<{ id: string } & Sealed>(STORES.records);
  const records: PatientRecord[] = [];
  for (const row of rows) {
    try {
      records.push(await open<PatientRecord>({ iv: row.iv, data: row.data }));
    } catch {
      /* wrong PIN for this row — skip */
    }
  }
  const server = await getAllRows<ServerRecord>(STORES.server);
  const conflicts = await getAllRows<Conflict>(STORES.conflicts);
  records.sort((a, b) => b.createdAt - a.createdAt);
  set({
    ready: true,
    unlocked: isUnlocked(),
    records,
    server,
    conflicts,
    network: navigator.onLine ? "2g" : "offline",
  });
  log("info", `Encrypted store unlocked — ${records.length} record(s) on device`);
}

/* ------------------------------------------------------------------- records */

export type DraftInput = Omit<
  PatientRecord,
  | "id"
  | "risk"
  | "createdAt"
  | "updatedAt"
  | "fieldTimes"
  | "baseVersion"
  | "version"
  | "syncState"
  | "syncedAt"
  | "bytes"
>;

export async function saveRecord(draft: DraftInput) {
  const now = Date.now();
  const risk = assessRisk({
    age: draft.age,
    symptoms: draft.symptoms,
    conditions: draft.conditions,
    vitals: draft.vitals,
  });
  const record: PatientRecord = {
    ...draft,
    id: crypto.randomUUID(),
    risk,
    createdAt: now,
    updatedAt: now,
    fieldTimes: Object.fromEntries(MERGEABLE.map((m) => [m.field, now])),
    baseVersion: 0,
    version: 1,
    syncState: "pending",
    syncedAt: null,
    bytes: 0,
  };
  record.bytes = sizeOf(record);
  set({ records: [record, ...state.records] });
  await persistRecords();
  log("info", `Saved offline: ${record.name} — risk ${risk.score}% (${risk.band})`);
  return record;
}

export async function updateRecord(id: string, patch: Partial<PatientRecord>) {
  const now = Date.now();
  const records = state.records.map((r) => {
    if (r.id !== id) return r;
    const next: PatientRecord = { ...r, ...patch, updatedAt: now };
    for (const m of MERGEABLE) {
      if (m.field in patch) next.fieldTimes = { ...next.fieldTimes, [m.field]: now };
    }
    next.risk = assessRisk(next);
    next.version = r.version + 1;
    next.syncState = "pending";
    next.bytes = sizeOf(next);
    return next;
  });
  set({ records });
  await persistRecords();
}

/* ---------------------------------------------------------------------- sync */

export function setNetwork(mode: NetworkMode) {
  set({ network: mode });
  log("info", `Network changed to ${mode === "offline" ? "offline" : mode.toUpperCase()}`);
  if (mode !== "offline") void runSync();
}

/** Pending records ordered by AI risk score, media deferred on weak links. */
export function priorityQueue(mode: NetworkMode = state.network) {
  const pending = state.records.filter((r) => r.syncState === "pending" || r.syncState === "syncing");
  const deferred = (r: PatientRecord) => r.hasMedia && (mode === "2g" || mode === "offline");
  return [...pending].sort((a, b) => {
    const d = Number(deferred(a)) - Number(deferred(b));
    if (d !== 0) return d;
    if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
    return a.createdAt - b.createdAt;
  });
}

export function isDeferred(r: PatientRecord, mode: NetworkMode = state.network) {
  return r.hasMedia && (mode === "2g" || mode === "offline");
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSync() {
  if (state.syncing) return;
  if (state.network === "offline") {
    log("error", "Still offline — queue held on device");
    return;
  }
  set({ syncing: true });
  try {
    for (;;) {
      if (state.network === "offline") {
        log("error", "Connection dropped mid-sync — remaining items stay queued");
        break;
      }
      const queue = priorityQueue().filter((r) => !isDeferred(r));
      const next = queue[0];
      if (!next) break;

      const kbps = BANDWIDTH[state.network];
      const delta = Math.max(600, Math.round(next.bytes * 0.45)); // delta, not full record
      const ms = Math.min(6000, Math.round((delta * 8) / kbps) + 200);
      set({ records: state.records.map((r) => (r.id === next.id ? { ...r, syncState: "syncing" } : r)) });
      await wait(ms);

      const conflict = detectConflict(next);
      if (conflict) {
        set({
          records: state.records.map((r) =>
            r.id === next.id ? { ...r, syncState: "conflict" } : r,
          ),
          conflicts: [conflict, ...state.conflicts],
        });
        await persistRecords();
        await persistConflicts();
        log("conflict", `${next.name}: overlapping edits held for doctor review`);
        continue;
      }

      const merged = autoMerge(next);
      const serverCopy: ServerRecord = {
        ...merged,
        syncState: "synced",
        syncedAt: Date.now(),
        version: Math.max(merged.version, currentServer(next.id)?.version ?? 0) + 1,
      };
      set({
        server: [...state.server.filter((s) => s.id !== next.id), serverCopy],
        records: state.records.map((r) =>
          r.id === next.id
            ? {
                ...merged,
                syncState: "synced",
                syncedAt: serverCopy.syncedAt,
                version: serverCopy.version,
                baseVersion: serverCopy.version,
              }
            : r,
        ),
        bytesSent: state.bytesSent + delta,
      });
      await persistRecords();
      await persistServer();
      log(
        "sent",
        `Uploaded ${next.name} (risk ${next.risk.score}%) — ${delta} B delta in ${(ms / 1000).toFixed(1)}s`,
      );
    }

    const held = priorityQueue().filter((r) => isDeferred(r));
    if (held.length) {
      log("deferred", `${held.length} record(s) with photos held until 3G/4G`);
    }
  } finally {
    set({ syncing: false });
  }
}

function currentServer(id: string) {
  return state.server.find((s) => s.id === id);
}

/* ---------------------------------------------------------------- conflicts */

function detectConflict(local: PatientRecord): Conflict | null {
  const remote = currentServer(local.id);
  if (!remote || remote.version <= local.baseVersion) return null;

  const fields: ConflictField[] = [];
  const autoMerged: string[] = [];
  for (const m of MERGEABLE) {
    const lv = fmt(local[m.field]);
    const rv = fmt(remote[m.field]);
    if (lv === rv) continue;
    const lt = local.fieldTimes[m.field] ?? local.updatedAt;
    const rt = remote.fieldTimes[m.field] ?? remote.updatedAt;
    const bothChanged = lt > (local.syncedAt ?? 0) && rt > (local.syncedAt ?? 0);
    if (bothChanged) {
      fields.push({ field: m.field, label: m.label, local: lv, remote: rv, localTime: lt, remoteTime: rt, resolution: null });
    } else {
      autoMerged.push(m.label);
    }
  }
  if (!fields.length) return null;
  return {
    id: crypto.randomUUID(),
    recordId: local.id,
    patientName: local.name,
    detectedAt: Date.now(),
    autoMerged,
    fields,
    resolved: false,
  };
}

/** Field-level merge: fields only the server changed are pulled in, never overwritten wholesale. */
function autoMerge(local: PatientRecord): PatientRecord {
  const remote = currentServer(local.id);
  if (!remote) return local;
  const next = { ...local } as PatientRecord;
  for (const m of MERGEABLE) {
    const lt = local.fieldTimes[m.field] ?? local.updatedAt;
    const rt = remote.fieldTimes[m.field] ?? remote.updatedAt;
    if (rt > lt) {
      (next as Record<string, unknown>)[m.field] = remote[m.field];
      next.fieldTimes = { ...next.fieldTimes, [m.field]: rt };
    }
  }
  next.risk = assessRisk(next);
  return next;
}

export async function resolveConflict(conflictId: string, choices: Record<string, "local" | "remote">) {
  const conflict = state.conflicts.find((c) => c.id === conflictId);
  if (!conflict) return;
  const remote = currentServer(conflict.recordId);
  const now = Date.now();

  const records = state.records.map((r) => {
    if (r.id !== conflict.recordId) return r;
    const next = { ...r } as PatientRecord;
    for (const f of conflict.fields) {
      if (choices[f.field] === "remote" && remote) {
        (next as Record<string, unknown>)[f.field] = remote[f.field as keyof ServerRecord];
      }
      next.fieldTimes = { ...next.fieldTimes, [f.field]: now };
    }
    next.risk = assessRisk(next);
    next.updatedAt = now;
    next.baseVersion = remote?.version ?? next.baseVersion;
    next.syncState = "pending";
    next.bytes = sizeOf(next);
    return next;
  });

  set({
    records,
    conflicts: state.conflicts.map((c) =>
      c.id === conflictId
        ? { ...c, resolved: true, fields: c.fields.map((f) => ({ ...f, resolution: choices[f.field] ?? "local" })) }
        : c,
    ),
  });
  await persistRecords();
  await persistConflicts();
  log("info", `Conflict resolved for ${conflict.patientName} — re-queued for upload`);
  if (state.network !== "offline") void runSync();
}

/** Demo helper: a remote doctor edits the cloud copy while the worker is offline. */
export async function simulateDoctorEdit(recordId: string) {
  const local = state.records.find((r) => r.id === recordId);
  const existing = currentServer(recordId);
  const base: ServerRecord = existing ?? { ...(local as PatientRecord), version: 1 };
  if (!local) return;
  const now = Date.now();
  const updated: ServerRecord = {
    ...base,
    allergies: "Penicillin (confirmed at PHC)",
    medications: base.medications ? `${base.medications}; Amlodipine 5mg` : "Amlodipine 5mg",
    fieldTimes: { ...base.fieldTimes, allergies: now, medications: now },
    updatedAt: now,
    version: base.version + 1,
  };
  set({
    server: [...state.server.filter((s) => s.id !== recordId), updated],
    records: state.records.map((r) => (r.id === recordId ? { ...r, syncState: "pending" } : r)),
  });
  await persistServer();
  await persistRecords();
  log("info", `Doctor updated the cloud copy of ${local.name} (v${updated.version})`);
}

export async function resetDemo() {
  await clearStore(STORES.records);
  await clearStore(STORES.server);
  await clearStore(STORES.conflicts);
  set({ records: [], server: [], conflicts: [], log: [], bytesSent: 0, ciphertext: null });
  log("info", "Demo data cleared");
}
