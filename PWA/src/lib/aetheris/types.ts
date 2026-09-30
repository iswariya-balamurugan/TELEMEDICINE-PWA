export type Sex = "female" | "male" | "other";

export type Vitals = {
  spo2: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  tempC: number | null;
  respRate: number | null;
  glucose: number | null;
};

export type RiskDriver = {
  label: string;
  detail: string;
  weight: number;
};

export type Risk = {
  score: number;
  band: "critical" | "high" | "moderate" | "low";
  drivers: RiskDriver[];
  referral: string;
};

export type SyncState = "pending" | "syncing" | "synced" | "conflict";

export type PatientRecord = {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  village: string;
  symptoms: string[];
  conditions: string[];
  allergies: string;
  medications: string;
  notes: string;
  vitals: Vitals;
  hasMedia: boolean;
  risk: Risk;
  createdAt: number;
  updatedAt: number;
  /** Per-field last-write timestamps, used for field-level conflict merges. */
  fieldTimes: Record<string, number>;
  /** Version of the server copy this record was based on. */
  baseVersion: number;
  version: number;
  syncState: SyncState;
  syncedAt: number | null;
  bytes: number;
  worker: string;
};

export type ServerRecord = PatientRecord & { version: number };

export type ConflictField = {
  field: string;
  label: string;
  local: string;
  remote: string;
  localTime: number;
  remoteTime: number;
  resolution: "local" | "remote" | null;
};

export type Conflict = {
  id: string;
  recordId: string;
  patientName: string;
  detectedAt: number;
  autoMerged: string[];
  fields: ConflictField[];
  resolved: boolean;
};

export type NetworkMode = "offline" | "2g" | "3g" | "4g";

export type SyncLogEntry = {
  id: string;
  at: number;
  kind: "info" | "sent" | "deferred" | "conflict" | "error";
  message: string;
};
