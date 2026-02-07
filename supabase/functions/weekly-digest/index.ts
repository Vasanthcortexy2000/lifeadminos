import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Obligation {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  risk_level: string;
  domain: string | null;
}

function getWeekBoundaries() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Start of this week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // End of this week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  // Start of next week
  const startOfNextWeek = new Date(endOfWeek);
  startOfNextWeek.setDate(endOfWeek.getDate() + 1);
  startOfNextWeek.setHours(0, 0, 0, 0);
  
  // End of next week
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);
  
  return { startOfWeek, endOfWeek, startOfNextWeek, endOfNextWeek, now };
}

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

    // Fetch all obligations for user
    const { data: obligations, error: obError } = await supabase
      .from("obligations")
      .select("*")
      .eq("user_id", user.id);

    if (obError) throw obError;

    const { startOfWeek, endOfWeek, startOfNextWeek, endOfNextWeek, now } = getWeekBoundaries();

    // Categorize obligations
    const overdue: Obligation[] = [];
    const dueThisWeek: Obligation[] = [];
    const dueNextWeek: Obligation[] = [];
    const completedThisWeek: Obligation[] = [];
    const upcoming: Obligation[] = [];

    for (const ob of obligations || []) {
      if (ob.status === "completed") {
        // Check if completed this week (based on updated_at)
        const updatedAt = new Date(ob.updated_at);
        if (updatedAt >= startOfWeek && updatedAt <= endOfWeek) {
          completedThisWeek.push(ob);
        }
        continue;
      }

      if (!ob.deadline) {
        upcoming.push(ob);
        continue;
      }

      const deadline = new Date(ob.deadline);
      
      if (deadline < now) {
        overdue.push(ob);
      } else if (deadline >= startOfWeek && deadline <= endOfWeek) {
        dueThisWeek.push(ob);
      } else if (deadline >= startOfNextWeek && deadline <= endOfNextWeek) {
        dueNextWeek.push(ob);
      } else {
        upcoming.push(ob);
      }
    }

    // Sort by deadline
    const sortByDeadline = (a: Obligation, b: Obligation) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    };

    overdue.sort(sortByDeadline);
    dueThisWeek.sort(sortByDeadline);
    dueNextWeek.sort(sortByDeadline);

    // Generate summary stats
    const stats = {
      totalActive: (obligations || []).filter((o) => o.status !== "completed").length,
      overdueCount: overdue.length,
      dueThisWeekCount: dueThisWeek.length,
      dueNextWeekCount: dueNextWeek.length,
      completedThisWeekCount: completedThisWeek.length,
      highPriorityCount: (obligations || []).filter(
        (o) => o.risk_level === "high" && o.status !== "completed"
      ).length,
    };

    // Generate digest
    const digest = {
      generatedAt: new Date().toISOString(),
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      stats,
      sections: {
        overdue,
        dueThisWeek,
        dueNextWeek,
        completedThisWeek,
        upcoming: upcoming.slice(0, 5), // Limit upcoming to 5
      },
      message: generateMessage(stats),
    };

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateMessage(stats: {
  overdueCount: number;
  dueThisWeekCount: number;
  completedThisWeekCount: number;
}): string {
  if (stats.overdueCount > 0) {
    return `You have ${stats.overdueCount} item${stats.overdueCount > 1 ? "s" : ""} past due. Let's tackle ${stats.overdueCount === 1 ? "it" : "them"} first.`;
  }
  
  if (stats.completedThisWeekCount > 0 && stats.dueThisWeekCount === 0) {
    return `Great progress! You completed ${stats.completedThisWeekCount} item${stats.completedThisWeekCount > 1 ? "s" : ""} this week. Take a moment to appreciate that.`;
  }
  
  if (stats.dueThisWeekCount > 0) {
    return `You have ${stats.dueThisWeekCount} item${stats.dueThisWeekCount > 1 ? "s" : ""} due this week. You've got this.`;
  }
  
  return "You're all caught up. Nice work staying on top of things.";
}
