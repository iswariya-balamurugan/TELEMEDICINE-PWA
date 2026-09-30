import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GitMerge, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskBadge, RiskMeter } from "@/components/aetheris/RiskBadge";
import { UnlockGate } from "@/components/aetheris/UnlockGate";
import { cn } from "@/lib/utils";
import { resolveConflict } from "@/lib/aetheris/store";
import { useAetheris } from "@/lib/aetheris/useAetheris";
import type { Conflict } from "@/lib/aetheris/types";

const TITLE = "Doctor referral dashboard — Aetheris";
const DESCRIPTION =
  "Doctors see rural patients ranked by risk, with the reasons behind each score and a field-level review for records edited in two places.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => (
    <UnlockGate>
      <Dashboard />
    </UnlockGate>
  ),
});

function Dashboard() {
  const state = useAetheris();
  const referrals = [...state.server].sort((a, b) => b.risk.score - a.risk.score);
  const open = state.conflicts.filter((c) => !c.resolved);

  return (
    <div className="space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Stethoscope className="h-6 w-6 text-primary" /> Referral queue
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Patients that reached the clinic, most urgent first — with the reasons the phone flagged them.
        </p>
      </header>

      {open.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <GitMerge className="h-5 w-5 text-high" /> Needs your review ({open.length})
          </h2>
          {open.map((c) => (
            <ConflictCard key={c.id} conflict={c} />
          ))}
        </section>
      )}

      {referrals.length === 0 ? (
        <p className="surface-panel p-6 text-sm text-muted-foreground">
          Nothing has arrived yet. Save patients in the field view, then turn the network on to sync.
        </p>
      ) : (
        <div className="space-y-4">
          {referrals.map((r, i) => (
            <article
              key={r.id}
              className={cn(
                "surface-panel grid gap-4 p-5 md:grid-cols-[auto_1fr_1.1fr]",
                r.risk.band === "critical" && "risk-ring-critical",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-mono text-sm font-semibold">
                {i + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                  <RiskBadge risk={r.risk} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.age} yrs · {r.sex} · {r.village} · from {r.worker}
                </p>
                <p className="mt-2 text-sm font-medium">{r.risk.referral}</p>
                {r.symptoms.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">{r.symptoms.join(" · ")}</p>
                )}
                {r.notes && <p className="mt-2 text-sm italic text-muted-foreground">“{r.notes}”</p>}
              </div>
              <div className="space-y-3">
                <RiskMeter risk={r.risk} />
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <Row label="History" value={r.conditions.join(", ") || "—"} />
                  <Row label="Allergies" value={r.allergies || "—"} />
                  <Row label="Medication" value={r.medications || "—"} />
                  <Row
                    label="Received"
                    value={r.syncedAt ? new Date(r.syncedAt).toLocaleTimeString() : "—"}
                  />
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const [choices, setChoices] = useState<Record<string, "local" | "remote">>(() =>
    Object.fromEntries(conflict.fields.map((f) => [f.field, "remote" as const])),
  );

  return (
    <div className="surface-panel space-y-4 p-5">
      <div>
        <h3 className="font-display text-lg font-semibold">{conflict.patientName}</h3>
        <p className="text-xs text-muted-foreground">
          Edited in the field and at the clinic at the same time.
          {conflict.autoMerged.length > 0 && (
            <> Merged automatically: {conflict.autoMerged.join(", ")}.</>
          )}
        </p>
      </div>
      <div className="space-y-3">
        {conflict.fields.map((f) => (
          <div key={f.field} className="rounded-xl bg-surface-2 p-4">
            <p className="text-sm font-semibold">{f.label}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["local", "remote"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setChoices({ ...choices, [f.field]: side })}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    choices[f.field] === side
                      ? "border-primary bg-surface"
                      : "border-border bg-surface/60 hover:border-primary/50",
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {side === "local" ? "Health worker (offline)" : "Clinic record"}
                  </p>
                  <p className="mt-1 text-sm">{side === "local" ? f.local : f.remote}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {new Date(side === "local" ? f.localTime : f.remoteTime).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => void resolveConflict(conflict.id, choices)}>Keep selected values</Button>
    </div>
  );
}
