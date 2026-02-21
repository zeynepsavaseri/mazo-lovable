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
    const { patientName, dateOfBirth } = await req.json();

    if (!patientName) {
      return new Response(
        JSON.stringify({ found: false, error: "Patient name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ found: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to simulate retrieving patient records from hospital database
    const prompt = `You are a hospital medical records system. A returning patient named "${patientName}"${dateOfBirth ? ` (DOB: ${dateOfBirth})` : ""} has checked in. 

Generate realistic but fictional previous medical records for this patient. Return a JSON object with these fields:
- found: true
- medicalHistory: array of conditions (2-4 items from: Hypertension, Diabetes, Heart disease, Asthma/COPD, Kidney disease, etc.)
- medications: string listing current medications with dosages
- allergies: string listing known allergies
- lastVisitDate: a date string of their last visit (within last 2 years)
- lastVisitReason: brief reason for last visit

Keep it medically realistic and concise.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a hospital medical records retrieval system. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_patient_records",
              description: "Return the patient's previous medical records",
              parameters: {
                type: "object",
                properties: {
                  found: { type: "boolean" },
                  medicalHistory: { type: "array", items: { type: "string" } },
                  medications: { type: "string" },
                  allergies: { type: "string" },
                  lastVisitDate: { type: "string" },
                  lastVisitReason: { type: "string" },
                },
                required: ["found", "medicalHistory", "medications", "allergies", "lastVisitDate", "lastVisitReason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_patient_records" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ found: false, error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const records = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(records), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error retrieving records:", error);
    return new Response(
      JSON.stringify({ found: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
