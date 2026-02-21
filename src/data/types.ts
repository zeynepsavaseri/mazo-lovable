export type TriageLevel = "high" | "moderate" | "low";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  symptomOnset: string;
  painScore: number;
  symptoms: string[];
  medicalHistory: string[];
  medications: string[];
  vitalSigns: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    oxygenSat: number;
  };
  timeWaiting: number;
  aiTriageLevel: TriageLevel;
  redFlags: string[];
  riskSignals: string[];
  missingQuestions: string[];
  aiSummary: string;
  nurseDecision: "accept" | "override" | null;
  timestamp: Date;
}

export interface PatientIntakeForm {
  chiefComplaint: string;
  symptomOnset: string;
  painScore: number;
  symptoms: string[];
  medicalHistory: string[];
  medications: string[];
  wearableData?: {
    heartRate?: number;
    steps?: number;
    sleepHours?: number;
  };
}
