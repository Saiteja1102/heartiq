import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a professional pharmacist and medical information assistant. When given a medicine name, return ONLY a valid JSON object with no markdown, no code fences, no extra text. The JSON must have exactly these fields: { name: string, category: string, description: string, uses: string[], sideEffects: string[], dosage: { adult: string, child: string, elderly: string }, warnings: string[], contraindications: string[], interactions: { drug: string, severity: 'Low'|'Medium'|'High', effect: string }[], alternatives: string[], storageInstructions: string, pregnancySafety: string }`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { medicineName } = await req.json();
    if (!medicineName || typeof medicineName !== "string") {
      return new Response(JSON.stringify({ error: "medicineName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROK_API_KEY = Deno.env.get("GROK_API_KEY");
    if (!GROK_API_KEY) throw new Error("GROK_API_KEY not configured");

    // Using xAI Grok (user's existing key). Model: grok-2-latest.
    const resp = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2-latest",
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Medicine: ${medicineName}` },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Grok error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI error (${resp.status})` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("groq-medicine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
