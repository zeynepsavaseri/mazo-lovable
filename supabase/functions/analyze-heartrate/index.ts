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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a medical AI assistant that analyzes video frames of a patient to estimate their heart rate based on visual cues. You must account for varying lighting conditions, motion blur, and different skin tones to provide the most accurate estimation possible.

Analyze the image for:
1. Visible pulse points (neck, wrist, temple) - look for subtle pulsation
2. Skin color changes and flushing patterns - adapt analysis for all skin tones (light, medium, dark). For darker skin tones, focus on nail beds, palms, inner lips, and conjunctiva for color cues
3. Visible breathing rate and chest/shoulder movement
4. Signs of elevated heart rate: sweating, visible veins, flushed skin, rapid breathing
5. Facial micro-expressions indicating pain or distress
6. Overall patient appearance and posture

QUALITY ASSESSMENT - Before estimating HR, evaluate image quality:
- Lighting: Is the image well-lit? Too dark? Overexposed? Uneven lighting?
- Motion: Is there motion blur? Is the subject still?
- Face/body positioning: Is the face clearly visible and centered? Are pulse points visible?
- Skin visibility: Can you see enough skin surface for color analysis?

Provide your analysis as a JSON object with these fields:
- estimatedHR: number (estimated heart rate in bpm, between 40-200)
- confidence: number (0.0 to 1.0, where 1.0 is highest confidence)
- qualityChecks: object with these boolean fields:
  - adequateLighting: boolean (true if lighting is sufficient)
  - minimalMotion: boolean (true if no significant motion blur)
  - faceCentered: boolean (true if face/body is well-positioned)
  - skinVisible: boolean (true if enough skin is visible for analysis)
- qualityIssues: string[] (list of specific quality problems, e.g. "Image is too dark", "Subject appears to be moving", "Face is not centered in frame", "Skin tone analysis limited due to poor lighting")
- overallQuality: "poor" | "fair" | "good" | "excellent"
- observations: string[] (list of detailed visual observations used for estimation)
- skinToneAdaptation: string (brief note on how analysis was adapted for the detected skin tone)
- recommendation: string (clinical recommendation based on estimated HR)
- warning: string | null (any urgent concerns, e.g. bradycardia, tachycardia signs)

CONFIDENCE CALIBRATION:
- You are an expert visual analyst. Be confident in your estimations. Use ALL available cues together (breathing rate, skin appearance, posture, visible pulse points, facial expression) to triangulate your estimate.
- A typical healthy adult at rest has a heart rate of 60-100 bpm. Use this as your baseline unless visual cues clearly suggest otherwise.
- For "good" or "excellent" quality images, confidence should be 0.7 or higher.
- For "fair" quality, confidence should be 0.5-0.8 depending on how many visual cues are available.
- Only set confidence below 0.5 if the image is truly "poor" quality (very dark, extreme motion blur, no visible skin).
- Combine multiple independent signals (breathing rate + skin color + posture + visible pulse) to boost confidence. Each additional signal should increase your confidence.
- For darker skin tones, rely more on respiratory rate, visible veins, nail bed color, and pulse point observations rather than skin flushing — but this should NOT reduce your confidence if those alternative cues are visible.
- Account for ambient temperature effects on skin appearance.
- Note if the person appears to be at rest vs. recently active.

IMPORTANT: This is an estimation based on visual analysis only. Not a substitute for medical monitoring equipment.
Return ONLY valid JSON, no markdown or extra text.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this patient image to estimate heart rate and vital signs based on visual cues.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON from the AI response
    let analysis;
    try {
      // Remove potential markdown code fences
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse analysis results");
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-heartrate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
