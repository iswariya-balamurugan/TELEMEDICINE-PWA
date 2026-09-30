import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, ShieldCheck, Sparkles, Trash2, UserPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntakeForm } from "@/components/aetheris/IntakeForm";
import { NetworkBar } from "@/components/aetheris/NetworkBar";
import { PatientCard } from "@/components/aetheris/PatientCard";
import { UnlockGate } from "@/components/aetheris/UnlockGate";
import { resetDemo, simulateDoctorEdit } from "@/lib/aetheris/store";
import { seedDemo } from "@/lib/aetheris/seed";
import { useAetheris } from "@/lib/aetheris/useAetheris";

const TITLE = "Aetheris — offline-first rural telemedicine";
const DESCRIPTION =
  "Health workers record symptoms, history and vitals with no signal. Risk is scored on the phone and urgent cases sync to doctors first.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <UnlockGate>
      <HomeContent />
    </UnlockGate>
  );
}

function HomeContent() {
  const state = useAetheris();

  return (
    <div className="space-y-8 px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      <section className="hero-gradient overflow-hidden rounded-3xl px-6 py-10 text-sidebar-foreground sm:px-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1 text-xs font-semibold">
          <Zap className="h-3.5 w-3.5" /> Works with no signal
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold sm:text-4xl">
          Record a patient anywhere, get a <span className="text-gradient-accent">risk score instantly</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-sm/relaxed opacity-90">
          Everything is saved encrypted on the phone. When any signal returns, the most urgent patients
          are uploaded first and shown to the doctor at the top of the queue.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link to="/sync">See the sync queue</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/dashboard">Doctor dashboard</Link>
          </Button>
        </div>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, label: "On-device scoring", value: "0 ms network" },
            { icon: ShieldCheck, label: "Local storage", value: "AES-256-GCM" },
            { icon: Database, label: "Records on device", value: `${state.records.length}` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-sidebar-accent/70 p-4">
              <s.icon className="h-4 w-4" />
              <dd className="mt-2 font-display text-xl font-semibold">{s.value}</dd>
              <dt className="text-xs opacity-80">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <NetworkBar />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">New patient visit</h2>
        </div>
        <IntakeForm />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">On this device</h2>
          <span className="text-sm text-muted-foreground">{state.records.length} record(s)</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => void seedDemo()}>
              Add 5 demo patients
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void resetDemo()}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          </div>
        </div>

        {state.records.length === 0 ? (
          <p className="surface-panel p-6 text-sm text-muted-foreground">
            No patients saved yet. Fill the form above, or load demo patients to try the sync queue.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.records.map((r) => (
              <PatientCard key={r.id} record={r}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => void simulateDoctorEdit(r.id)}
                >
                  Simulate doctor editing the cloud copy
                </Button>
              </PatientCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
