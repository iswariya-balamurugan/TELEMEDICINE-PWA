import { AlertTriangle, Camera, CheckCircle2, CloudUpload, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PatientRecord } from "@/lib/aetheris/types";
import { RiskBadge, RiskMeter } from "./RiskBadge";

const STATE_META = {
  pending: { icon: CloudUpload, label: "Waiting to sync", className: "text-muted-foreground" },
  syncing: { icon: Loader2, label: "Uploading", className: "text-primary" },
  synced: { icon: CheckCircle2, label: "Synced", className: "text-low" },
  conflict: { icon: AlertTriangle, label: "Needs review", className: "text-high" },
} as const;

export function PatientCard({ record, children }: { record: PatientRecord; children?: React.ReactNode }) {
  const meta = STATE_META[record.syncState];
  const Icon = meta.icon;

  return (
    <article className="surface-panel space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{record.name}</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {record.age} yrs · {record.sex}
            <MapPin className="ml-1 h-3 w-3" />
            {record.village}
          </p>
        </div>
        <RiskBadge risk={record.risk} />
      </header>

      <RiskMeter risk={record.risk} />

      {record.symptoms.length > 0 && (
        <p className="text-sm text-muted-foreground">{record.symptoms.join(" · ")}</p>
      )}

      <footer className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
        <span className={cn("flex items-center gap-1.5 font-medium", meta.className)}>
          <Icon className={cn("h-3.5 w-3.5", record.syncState === "syncing" && "animate-spin")} />
          {meta.label}
        </span>
        {record.hasMedia && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Camera className="h-3.5 w-3.5" /> photo
          </span>
        )}
        <span className="text-muted-foreground">v{record.version}</span>
        <span className="ml-auto font-mono text-muted-foreground">{record.bytes} B</span>
      </footer>
      {children}
    </article>
  );
}
