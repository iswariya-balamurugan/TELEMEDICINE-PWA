import { createFileRoute } from "@tanstack/react-router";
import { Camera, Clock, Lock, TriangleAlert } from "lucide-react";
import { NetworkBar } from "@/components/aetheris/NetworkBar";
import { RiskBadge } from "@/components/aetheris/RiskBadge";
import { UnlockGate } from "@/components/aetheris/UnlockGate";
import { cn } from "@/lib/utils";
import { isDeferred, priorityQueue } from "@/lib/aetheris/store";
import { useAetheris } from "@/lib/aetheris/useAetheris";

const TITLE = "Priority sync queue — Aetheris";
const DESCRIPTION =
  "Urgent patients upload first over weak 2G links, photos wait for a stronger signal, and every record stays encrypted until it is sent.";

export const Route = createFileRoute("/sync")({
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
      <SyncPage />
    </UnlockGate>
  ),
});

const KIND_CLASS = {
  info: "text-muted-foreground",
  sent: "text-low",
  deferred: "text-moderate-foreground",
  conflict: "text-high",
  error: "text-destructive",
} as const;

function SyncPage() {
  const state = useAetheris();
  const queue = priorityQueue();
  const synced = state.records.filter((r) => r.syncState === "synced");

  return (
    <div className="space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <header>
        <h1 className="font-display text-2xl font-semibold">Priority sync queue</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          The queue is ordered by risk, not by arrival. Drop the connection mid-upload — nothing is
          lost, the rest simply waits.
        </p>
      </header>

      <NetworkBar />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Waiting to upload ({queue.length})</h2>
          {queue.length === 0 && (
            <p className="surface-panel p-5 text-sm text-muted-foreground">
              Queue is empty — every record on this device has reached the doctor.
            </p>
          )}
          {queue.map((r, i) => {
            const held = isDeferred(r);
            return (
              <div
                key={r.id}
                className={cn(
                  "surface-panel flex flex-wrap items-center gap-3 p-4",
                  r.syncState === "syncing" && "ring-2 ring-ring",
                  held && "opacity-70",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.village} · {Math.max(600, Math.round(r.bytes * 0.45))} B delta
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {held && (
                    <span className="flex items-center gap-1 text-xs text-moderate-foreground">
                      <Camera className="h-3.5 w-3.5" /> photo deferred
                    </span>
                  )}
                  {r.syncState === "syncing" && (
                    <span className="text-xs font-medium text-primary">uploading…</span>
                  )}
                  <RiskBadge risk={r.risk} />
                </div>
              </div>
            );
          })}

          {synced.length > 0 && (
            <div className="surface-panel p-4">
              <h3 className="text-sm font-semibold">Delivered ({synced.length})</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {synced.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span>{r.name}</span>
                    <span className="font-mono">
                      {r.syncedAt ? new Date(r.syncedAt).toLocaleTimeString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="surface-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Lock className="h-4 w-4 text-primary" /> What's actually on the phone
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Records live in the browser database as ciphertext. This is the start of a stored record:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[11px] break-all whitespace-pre-wrap">
              {state.ciphertext ?? "No records stored yet."}
            </pre>
          </div>

          <div className="surface-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Clock className="h-4 w-4 text-primary" /> Sync activity
            </h2>
            <ul className="mt-3 space-y-2">
              {state.log.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing yet.</li>
              )}
              {state.log.map((e) => (
                <li key={e.id} className="flex gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">
                    {new Date(e.at).toLocaleTimeString()}
                  </span>
                  <span className={KIND_CLASS[e.kind]}>{e.message}</span>
                </li>
              ))}
            </ul>
          </div>

          {state.conflicts.some((c) => !c.resolved) && (
            <div className="surface-panel border-high p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-high-foreground">
                <TriangleAlert className="h-4 w-4" />
                Some records have overlapping edits — review them on the doctor dashboard.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
