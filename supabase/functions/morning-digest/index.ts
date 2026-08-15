// Supabase Edge Function: morning-digest
// Invoked on schedule via pg_cron or HTTP POST
// Dispatches daily morning digest push notifications via Expo Push API

// @ts-ignore Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno URL import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Declare Deno global for standard TS linters
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: "high" | "default";
  badge?: number;
}

interface TaskRecord {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch users who have enabled morning digest and have a push token
    const { data: usersWithSettings, error: userError } = await supabase
      .from("user_settings")
      .select("user_id, morning_digest_enabled, morning_digest_time, push_token")
      .eq("morning_digest_enabled", true)
      .not("push_token", "is", null);

    if (userError) {
      throw userError;
    }

    if (!usersWithSettings || usersWithSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active users with morning digest and push tokens found." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const pushMessages: PushMessage[] = [];

    // 2. For each user, query their pending/in_progress tasks for today
    for (const setting of usersWithSettings) {
      if (!setting.push_token) continue;

      const { data: todayTasks, error: taskError } = await supabase
        .from("tasks")
        .select("id, title, priority, status, due_date")
        .eq("user_id", setting.user_id)
        .neq("status", "done")
        .gte("due_date", startOfToday.toISOString())
        .lte("due_date", endOfToday.toISOString())
        .order("priority", { ascending: false });

      if (taskError) {
        console.error(`Error fetching tasks for user ${setting.user_id}:`, taskError);
        continue;
      }

      if (todayTasks && todayTasks.length > 0) {
        const count = todayTasks.length;
        const taskTitles = (todayTasks as TaskRecord[])
          .slice(0, 3)
          .map((t: TaskRecord) => t.title)
          .join(" • ");
        const remaining = count > 3 ? ` (+${count - 3} more)` : "";

        pushMessages.push({
          to: setting.push_token,
          sound: "default",
          title: `Partner: Morning Orbit (${count} task${count > 1 ? "s" : ""})`,
          body: `Today's Focus: ${taskTitles}${remaining}`,
          data: { screen: "Home", type: "morning_digest", taskCount: count },
          priority: "high",
          badge: count,
        });
      }
    }

    // 3. Dispatch to Expo Push Notification API
    if (pushMessages.length > 0) {
      const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pushMessages),
      });

      const expoData = await expoResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          digestsDispatched: pushMessages.length,
          expoResponse: expoData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "No tasks due today for active users.",
        digestsDispatched: 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
