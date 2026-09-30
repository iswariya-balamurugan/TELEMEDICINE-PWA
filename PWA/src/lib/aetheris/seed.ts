import { saveRecord, type DraftInput } from "./store";

const blank = {
  hasMedia: false,
  notes: "",
  allergies: "",
  medications: "",
  worker: "ASHA Lakshmi",
};

const DEMO: DraftInput[] = [
  {
    ...blank,
    name: "Ramesh Kumar",
    age: 58,
    sex: "male",
    village: "Thottipalayam",
    symptoms: ["Chest pain", "Breathlessness"],
    conditions: ["Hypertension", "Diabetes"],
    medications: "Metformin 500mg",
    vitals: { spo2: 88, systolic: 186, diastolic: 112, pulse: 124, tempC: 37.2, respRate: 28, glucose: 260 },
    notes: "Pain started this morning while working in the field.",
  },
  {
    ...blank,
    name: "Kavitha S",
    age: 26,
    sex: "female",
    village: "Alandurai",
    symptoms: ["Swelling of feet", "Headache", "Blurred vision"],
    conditions: ["Pregnancy"],
    vitals: { spo2: 97, systolic: 152, diastolic: 98, pulse: 92, tempC: 37, respRate: 18, glucose: null },
    notes: "32 weeks pregnant, first antenatal visit this month.",
    hasMedia: true,
  },
  {
    ...blank,
    name: "Murugan P",
    age: 71,
    sex: "male",
    village: "Sadivayal",
    symptoms: ["Persistent cough > 2 weeks", "High fever > 3 days"],
    conditions: ["Tuberculosis"],
    vitals: { spo2: 93, systolic: 128, diastolic: 82, pulse: 98, tempC: 38.6, respRate: 22, glucose: null },
    notes: "Sputum sample collected, photo of chest X-ray attached.",
    hasMedia: true,
  },
  {
    ...blank,
    name: "Anitha R",
    age: 34,
    sex: "female",
    village: "Thottipalayam",
    symptoms: ["Body ache", "Headache"],
    conditions: [],
    vitals: { spo2: 99, systolic: 118, diastolic: 76, pulse: 78, tempC: 37.4, respRate: 16, glucose: null },
    notes: "Routine check, mild symptoms for two days.",
  },
  {
    ...blank,
    name: "Baby Selvi",
    age: 3,
    sex: "female",
    village: "Alandurai",
    symptoms: ["Diarrhoea", "Vomiting / dehydration", "High fever > 3 days"],
    conditions: [],
    vitals: { spo2: 95, systolic: 88, diastolic: 58, pulse: 132, tempC: 39.1, respRate: 30, glucose: null },
    notes: "ORS started on site.",
  },
];

export async function seedDemo() {
  for (const d of DEMO) await saveRecord(d);
}
