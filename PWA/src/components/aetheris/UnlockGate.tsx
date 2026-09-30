import { useEffect, useState, type ReactNode } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAetheris } from "@/lib/aetheris/useAetheris";
import { setNetwork, unlockAndLoad } from "@/lib/aetheris/store";

export function UnlockGate({ children }: { children: ReactNode }) {
  const { ready } = useAetheris();
  const [pin, setPin] = useState("1234");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setNetwork("2g");
    const off = () => setNetwork("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="surface-panel w-full max-w-md p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold">Unlock field device</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Patient records on this phone are encrypted. Enter your field PIN to open them — nothing is
          sent anywhere.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await unlockAndLoad(pin);
            } catch {
              setError("Could not unlock. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="pin">Field PIN</Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="font-mono text-lg tracking-widest"
            />
            <p className="text-xs text-muted-foreground">Demo PIN: 1234</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || pin.length < 4}>
            {busy ? "Deriving key…" : "Unlock"}
          </Button>
        </form>
        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          AES-256-GCM, key derived on the device with PBKDF2 (120,000 rounds). A stolen phone reveals
          only ciphertext.
        </p>
      </div>
    </div>
  );
}
