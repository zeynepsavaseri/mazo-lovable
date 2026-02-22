import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const submission = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `You are a clinical decision support tool that helps nurses prioritize patients. You do NOT diagnose. You identify patterns and flag risks.

Rules:
- Never use diagnostic language (no "heart attack", "stroke", "meningitis" etc.)
- Use pattern language: "high-risk symptom cluster", "concerning vital sign pattern", "symptom combination requiring urgent evaluation"
- Always explain WHY something was flagged and WHICH specific symptoms triggered it
- Include a confidence level for the triage level

Patient:
Name: ${submission.name}
DOB: ${submission.date_of_birth || "unknown"}
Gender: ${submission.gender || "unknown"}
Weight: ${submission.weight || "unknown"}kg
Allergies: ${submission.allergies || "None reported"}
Chief Complaint: ${submission.chief_complaint}
Symptom Onset: ${submission.symptom_onset || "unknown"}
Pain Score: ${submission.pain_score}/10
Symptoms: ${(submission.symptoms || []).join(", ") || "None listed"}
Medical History: ${(submission.medical_history || []).join(", ") || "None listed"}
Medications: ${submission.medications || "None listed"}
Heart Rate: ${submission.wearable_heart_rate || "not provided"} bpm
SpO2: ${submission.wearable_spo2 || "not provided"}%

Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Exactly this structure:
{
  "ai_triage_level": "high" | "moderate" | "low",
  "ai_summary": "2-3 sentence clinical summary using pattern language only",
  "red_flags": ["flag with which symptom triggered it"],
  "risk_signals": ["risk factor and why it elevates concern"],
  "missing_questions": ["critical question nurse should ask"],
  "confidence_level": "high" | "moderate" | "low",
  "triggered_by": ["specific symptom or vital that drove triage level"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiData = await response.json();
    let text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace(/```json|```/g, "").trim();
    const assessment = JSON.parse(text);

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Triage error:", error);
    return new Response(JSON.stringify({
      ai_triage_level: "moderate",
      ai_summary: "AI assessment unavailable. Please perform manual triage.",
      red_flags: [],
      risk_signals: [],
      missing_questions: [],
      confidence_level: null,
      triggered_by: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});