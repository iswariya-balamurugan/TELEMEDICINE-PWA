import { useMemo, useState } from "react";
import { Camera, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CONDITION_OPTIONS, SYMPTOM_OPTIONS, assessRisk } from "@/lib/aetheris/risk";
import { saveRecord } from "@/lib/aetheris/store";
import type { Sex, Vitals } from "@/lib/aetheris/types";
import { RiskMeter } from "./RiskBadge";

const EMPTY_VITALS: Vitals = {
  spo2: null,
  systolic: null,
  diastolic: null,
  pulse: null,
  tempC: null,
  respRate: null,
  glucose: null,
};

const VITAL_FIELDS: { key: keyof Vitals; label: string; unit: string; step?: string }[] = [
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "pulse", label: "Pulse", unit: "bpm" },
  { key: "systolic", label: "Systolic BP", unit: "mmHg" },
  { key: "diastolic", label: "Diastolic BP", unit: "mmHg" },
  { key: "respRate", label: "Respiration", unit: "/min" },
  { key: "tempC", label: "Temperature", unit: "°C", step: "0.1" },
  { key: "glucose", label: "Blood sugar", unit: "mg/dL" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function IntakeForm() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [village, setVillage] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [notes, setNotes] = useState("");
  const [vitals, setVitals] = useState<Vitals>(EMPTY_VITALS);
  const [hasMedia, setHasMedia] = useState(false);
  const [saving, setSaving] = useState(false);

  const risk = useMemo(
    () => assessRisk({ age: Number(age) || 0, symptoms, conditions, vitals }),
    [age, symptoms, conditions, vitals],
  );

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const reset = () => {
    setName("");
    setAge("");
    setVillage("");
    setSymptoms([]);
    setConditions([]);
    setAllergies("");
    setMedications("");
    setNotes("");
    setVitals(EMPTY_VITALS);
    setHasMedia(false);
  };

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const record = await saveRecord({
            name: name.trim(),
            age: Number(age) || 0,
            sex,
            village: village.trim() || "Unknown",
            symptoms,
            conditions,
            allergies: allergies.trim(),
            medications: medications.trim(),
            notes: notes.trim(),
            vitals,
            hasMedia,
            worker: "ASHA Lakshmi",
          });
          toast.success(`${record.name} saved on this device`, {
            description: `Risk ${record.risk.score}% — ${record.risk.referral}`,
          });
          reset();
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-6">
        <div className="surface-panel space-y-4 p-5">
          <h2 className="text-lg font-semibold">Patient</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="village">Village / hamlet</Label>
              <Input id="village" value={village} onChange={(e) => setVillage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <div className="flex gap-2">
                {(["female", "male", "other"] as Sex[]).map((s) => (
                  <Chip key={s} active={sex === s} onClick={() => setSex(s)}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel space-y-3 p-5">
          <h2 className="text-lg font-semibold">Symptoms today</h2>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((s) => (
              <Chip
                key={s}
                active={symptoms.includes(s)}
                onClick={() => toggle(symptoms, setSymptoms, s)}
              >
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div className="surface-panel space-y-4 p-5">
          <h2 className="text-lg font-semibold">Medical history</h2>
          <div className="flex flex-wrap gap-2">
            {CONDITION_OPTIONS.map((c) => (
              <Chip
                key={c}
                active={conditions.includes(c)}
                onClick={() => toggle(conditions, setConditions, c)}
              >
                {c}
              </Chip>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Sulfa drugs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medications">Current medication</Label>
              <Input
                id="medications"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g. Metformin 500mg"
              />
            </div>
          </div>
        </div>

        <div className="surface-panel space-y-4 p-5">
          <h2 className="text-lg font-semibold">Vitals</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {VITAL_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>
                  {f.label} <span className="text-muted-foreground">({f.unit})</span>
                </Label>
                <Input
                  id={f.key}
                  type="number"
                  step={f.step}
                  value={vitals[f.key] ?? ""}
                  onChange={(e) =>
                    setVitals({
                      ...vitals,
                      [f.key]: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel space-y-4 p-5">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What the patient described, what you advised…"
          />
          <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Camera className="h-4 w-4 text-muted-foreground" />
              Photo / scan attached
            </div>
            <Switch checked={hasMedia} onCheckedChange={setHasMedia} />
          </div>
          <p className="text-xs text-muted-foreground">
            Photos are large, so they wait for a 3G/4G signal while the text record goes first.
          </p>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn(
            "surface-panel p-5",
            risk.band === "critical" && "risk-ring-critical",
          )}
        >
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            On-device screening
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-5xl font-semibold">{risk.score}</span>
            <span className="pb-2 text-sm text-muted-foreground">% risk</span>
          </div>
          <p className="mt-1 text-sm font-medium">{risk.referral}</p>
          <div className="mt-4">
            <RiskMeter risk={risk} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Screening aid only — scored instantly on this phone with no internet. A doctor makes the
            final call.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={saving || !name || !age}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Encrypting…" : "Save offline"}
        </Button>
      </div>
    </form>
  );
}
