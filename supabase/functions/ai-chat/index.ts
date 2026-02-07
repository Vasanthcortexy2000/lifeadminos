import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's obligations for context
    const { data: obligations, error: obError } = await supabase
      .from("obligations")
      .select("title, description, deadline, status, risk_level, domain, consequence")
      .eq("user_id", user.id)
      .order("deadline", { ascending: true });

    if (obError) throw obError;

    // Build context from obligations
    const now = new Date();
    const activeObligations = (obligations || []).filter(o => o.status !== "completed");
    const overdue = activeObligations.filter(o => o.deadline && new Date(o.deadline) < now);
    const upcoming = activeObligations.filter(o => {
      if (!o.deadline) return false;
      const deadline = new Date(o.deadline);
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return deadline >= now && deadline <= sevenDays;
    });

    const obligationsContext = `
Current Date: ${now.toLocaleDateString()}

User's Obligations Summary:
- Total active: ${activeObligations.length}
- Overdue: ${overdue.length}
- Due in next 7 days: ${upcoming.length}

${overdue.length > 0 ? `Overdue Items:
${overdue.map(o => `- "${o.title}" (${o.risk_level} priority) - was due ${o.deadline}`).join("\n")}` : ""}

${upcoming.length > 0 ? `Upcoming This Week:
${upcoming.map(o => `- "${o.title}" (${o.risk_level} priority) - due ${o.deadline}`).join("\n")}` : ""}

All Active Obligations:
${activeObligations.slice(0, 15).map(o => 
  `- "${o.title}" | Priority: ${o.risk_level} | Due: ${o.deadline || "No deadline"} | Domain: ${o.domain || "general"}${o.consequence ? ` | Consequence: ${o.consequence}` : ""}`
).join("\n")}
`.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a helpful, calm, and supportive assistant for a personal obligation tracking app called LifeAdmin OS. Your role is to help users understand and manage their obligations, deadlines, and tasks.

You have access to the user's obligations and can answer questions about:
- What's due soon or overdue
- Which items are high priority
- Specific obligations by name or domain (visa, work, health, finance, study, housing, legal)
- General advice on managing their responsibilities

Be concise, warm, and reassuring. If they seem stressed, acknowledge it and offer practical next steps. Never make up obligations that aren't in their data.

${obligationsContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const aiResponse = await response.json();
    const reply = aiResponse.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
