import { cn } from "@/lib/utils";
import { bandLabel } from "@/lib/aetheris/risk";
import type { Risk } from "@/lib/aetheris/types";

const BAND_CLASS: Record<Risk["band"], string> = {
  critical: "bg-critical text-critical-foreground",
  high: "bg-high text-high-foreground",
  moderate: "bg-moderate text-moderate-foreground",
  low: "bg-low text-low-foreground",
};

export function RiskBadge({ risk, className }: { risk: Risk; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        BAND_CLASS[risk.band],
        className,
      )}
    >
      <span className="font-mono">{risk.score}%</span>
      <span className="opacity-80">{bandLabel(risk.band)}</span>
    </span>
  );
}

export function RiskMeter({ risk }: { risk: Risk }) {
  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", {
            "bg-critical": risk.band === "critical",
            "bg-high": risk.band === "high",
            "bg-moderate": risk.band === "moderate",
            "bg-low": risk.band === "low",
          })}
          style={{ width: `${Math.max(4, risk.score)}%` }}
        />
      </div>
      <ul className="space-y-1">
        {risk.drivers.length === 0 && (
          <li className="text-xs text-muted-foreground">No warning signs detected.</li>
        )}
        {risk.drivers.map((d) => (
          <li key={d.label} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-medium">{d.label}</span>
            <span className="text-muted-foreground">{d.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
