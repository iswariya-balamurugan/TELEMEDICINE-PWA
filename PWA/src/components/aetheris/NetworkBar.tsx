import { RefreshCw, Signal, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { priorityQueue, runSync, setNetwork } from "@/lib/aetheris/store";
import { useAetheris } from "@/lib/aetheris/useAetheris";
import type { NetworkMode } from "@/lib/aetheris/types";

const MODES: { mode: NetworkMode; label: string }[] = [
  { mode: "offline", label: "Offline" },
  { mode: "2g", label: "2G" },
  { mode: "3g", label: "3G" },
  { mode: "4g", label: "4G" },
];

export function NetworkBar() {
  const state = useAetheris();
  const queued = priorityQueue().length;

  return (
    <div className="surface-panel flex flex-wrap items-center gap-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {state.network === "offline" ? (
          <WifiOff className="h-4 w-4 text-destructive" />
        ) : (
          <Signal className="h-4 w-4 text-primary" />
        )}
        Simulated network
      </div>
      <div className="flex rounded-lg bg-muted p-1">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            onClick={() => setNetwork(m.mode)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              state.network === m.mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {queued} queued · {(state.bytesSent / 1024).toFixed(1)} KB uploaded
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="ml-auto"
        disabled={state.syncing || state.network === "offline"}
        onClick={() => void runSync()}
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", state.syncing && "animate-spin")} />
        {state.syncing ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}
