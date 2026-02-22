export interface TriageData {
  ai_triage_level: string | null;
  confidence_level: string | null;
  red_flags: string[];
  risk_signals: string[];
  missing_questions: string[];
  triggered_by: string[];
}

export function calculateRiskScore(t: TriageData): number {
  let score = 0;

  // Base score from triage level (0-50) — this is the primary driver
  if (t.ai_triage_level === "high") score += 50;
  else if (t.ai_triage_level === "moderate") score += 25;
  else if (t.ai_triage_level === "low") score += 5;

  // Confidence modifies the base score (0-20)
  if (t.confidence_level === "high") score += 15;
  else if (t.confidence_level === "moderate") score += 8;
  else if (t.confidence_level === "low") score += 2;

  // Red flags — reduced weight, capped lower
  score += Math.min(t.red_flags.length * 3, 15);

  // Risk signals — minimal weight
  score += Math.min(t.risk_signals.length * 2, 10);

  // Missing questions — bigger penalty for incomplete info
  score -= Math.min(t.missing_questions.length * 3, 15);

  return Math.max(0, Math.min(Math.round(score), 100));
}

export function riskLabel(score: number): string {
  if (score >= 70) return "Critical";
  if (score >= 45) return "High";
  if (score >= 20) return "Moderate";
  return "Low";
}

export function riskColor(score: number): string {
  if (score >= 75) return "text-red-500";
  if (score >= 45) return "text-orange-500";
  if (score >= 20) return "text-yellow-500";
  return "text-green-500";
}

export function riskBgColor(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 45) return "bg-orange-500";
  if (score >= 20) return "bg-yellow-500";
  return "bg-green-500";
}