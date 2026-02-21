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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an emergency department AI triage system. Analyze this patient and provide triage assessment.

Patient: ${submission.name}, DOB: ${submission.date_of_birth || "unknown"}, Gender: ${submission.gender || "unknown"}, Weight: ${submission.weight || "unknown"}kg
Allergies: ${submission.allergies || "None reported"}
Chief Complaint: ${submission.chief_complaint}
Symptom Onset: ${submission.symptom_onset || "unknown"}
Pain Score: ${submission.pain_score}/10
Symptoms: ${(submission.symptoms || []).join(", ") || "None listed"}
Medical History: ${(submission.medical_history || []).join(", ") || "None listed"}
Medications: ${submission.medications || "None listed"}
Wearable Heart Rate: ${submission.wearable_heart_rate || "not provided"} bpm

Assess the triage level and provide clinical analysis.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an ER triage AI. Provide accurate clinical triage assessments." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_assessment",
              description: "Provide triage assessment for the patient",
              parameters: {
                type: "object",
                properties: {
                  ai_triage_level: { type: "string", enum: ["high", "moderate", "low"], description: "Triage priority level" },
                  ai_summary: { type: "string", description: "Clinical summary in 2-3 sentences" },
                  red_flags: { type: "array", items: { type: "string" }, description: "Critical red flags identified (short phrases)" },
                  risk_signals: { type: "array", items: { type: "string" }, description: "Risk signals to monitor (short phrases)" },
                  missing_questions: { type: "array", items: { type: "string" }, description: "Important follow-up questions the nurse should ask" },
                },
                required: ["ai_triage_level", "ai_summary", "red_flags", "risk_signals", "missing_questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_assessment" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const assessment = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(assessment), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ai_triage_level: "moderate",
      ai_summary: "Unable to generate AI assessment. Manual triage required.",
      red_flags: [],
      risk_signals: [],
      missing_questions: [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Triage error:", error);
    return new Response(JSON.stringify({
      ai_triage_level: "moderate",
      ai_summary: "AI assessment unavailable. Please perform manual triage.",
      red_flags: [],
      risk_signals: [],
      missing_questions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
