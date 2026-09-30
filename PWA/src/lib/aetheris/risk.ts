import type { PatientRecord, Risk, RiskDriver } from "./types";

type Input = Pick<PatientRecord, "age" | "symptoms" | "conditions" | "vitals">;

const SYMPTOM_WEIGHTS: Record<string, number> = {
  "Chest pain": 22,
  "Breathlessness": 20,
  "Severe bleeding": 26,
  "Unconscious / drowsy": 28,
  "Convulsions": 24,
  "Severe abdominal pain": 14,
  "High fever > 3 days": 12,
  "Persistent cough > 2 weeks": 11,
  "Vomiting / dehydration": 10,
  "Swelling of feet": 8,
  "Blurred vision": 7,
  "Headache": 4,
  "Diarrhoea": 6,
  "Body ache": 3,
};

const CONDITION_WEIGHTS: Record<string, number> = {
  Pregnancy: 10,
  Diabetes: 8,
  Hypertension: 8,
  "Heart disease": 12,
  Asthma: 8,
  Tuberculosis: 9,
  Anaemia: 5,
  "Kidney disease": 10,
};

/**
 * Deterministic on-device screening model (runs fully in the browser, no network).
 * Weighted clinical rules stand in for the exported ONNX model so the prototype
 * scores instantly on any low-end phone.
 */
export function assessRisk(input: Input): Risk {
  const drivers: RiskDriver[] = [];
  let score = 0;

  const add = (label: string, detail: string, weight: number) => {
    score += weight;
    drivers.push({ label, detail, weight });
  };

  const v = input.vitals;

  if (v.spo2 != null) {
    if (v.spo2 < 90) add("Low oxygen saturation", `SpO₂ ${v.spo2}% (< 90%)`, 30);
    else if (v.spo2 < 94) add("Borderline oxygen", `SpO₂ ${v.spo2}% (< 94%)`, 15);
  }
  if (v.systolic != null) {
    if (v.systolic >= 180) add("Severe hypertension", `Systolic ${v.systolic} mmHg (≥ 180)`, 24);
    else if (v.systolic >= 140) add("Raised blood pressure", `Systolic ${v.systolic} mmHg (≥ 140)`, 13);
    else if (v.systolic < 90) add("Low blood pressure", `Systolic ${v.systolic} mmHg (< 90)`, 22);
  }
  if (v.diastolic != null && v.diastolic >= 110) {
    add("High diastolic pressure", `Diastolic ${v.diastolic} mmHg (≥ 110)`, 10);
  }
  if (v.pulse != null) {
    if (v.pulse > 120) add("Tachycardia", `Pulse ${v.pulse} bpm (> 120)`, 16);
    else if (v.pulse < 50) add("Bradycardia", `Pulse ${v.pulse} bpm (< 50)`, 14);
  }
  if (v.respRate != null && v.respRate > 24) {
    add("Fast breathing", `Respiration ${v.respRate}/min (> 24)`, 15);
  }
  if (v.tempC != null) {
    if (v.tempC >= 39.5) add("Very high fever", `Temperature ${v.tempC} °C (≥ 39.5)`, 14);
    else if (v.tempC >= 38) add("Fever", `Temperature ${v.tempC} °C (≥ 38)`, 7);
  }
  if (v.glucose != null) {
    if (v.glucose >= 300) add("Very high blood sugar", `Glucose ${v.glucose} mg/dL (≥ 300)`, 16);
    else if (v.glucose <= 60) add("Low blood sugar", `Glucose ${v.glucose} mg/dL (≤ 60)`, 18);
    else if (v.glucose >= 200) add("High blood sugar", `Glucose ${v.glucose} mg/dL (≥ 200)`, 8);
  }

  for (const s of input.symptoms) {
    const w = SYMPTOM_WEIGHTS[s];
    if (w) add(s, "Reported symptom", w);
  }
  for (const c of input.conditions) {
    const w = CONDITION_WEIGHTS[c];
    if (w) add(c, "Existing condition", w);
  }

  if (input.age >= 65) add("Elderly patient", `Age ${input.age} (≥ 65)`, 9);
  else if (input.age <= 5) add("Young child", `Age ${input.age} (≤ 5)`, 10);

  const normalised = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-score / 55)))));
  const top = [...drivers].sort((a, b) => b.weight - a.weight).slice(0, 3);

  const band: Risk["band"] =
    normalised >= 75 ? "critical" : normalised >= 55 ? "high" : normalised >= 30 ? "moderate" : "low";

  const referral =
    band === "critical"
      ? "Refer now — arrange transport to district hospital"
      : band === "high"
        ? "Teleconsult a doctor today"
        : band === "moderate"
          ? "Review at PHC within 48 hours"
          : "Routine follow-up at next visit";

  return { score: normalised, band, drivers: top, referral };
}

export const SYMPTOM_OPTIONS = Object.keys(SYMPTOM_WEIGHTS);
export const CONDITION_OPTIONS = Object.keys(CONDITION_WEIGHTS);

export function bandLabel(band: Risk["band"]) {
  return band === "critical"
    ? "Critical"
    : band === "high"
      ? "High"
      : band === "moderate"
        ? "Moderate"
        : "Low";
}
