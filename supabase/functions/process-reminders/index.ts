import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calm, reassuring reminder messages based on type and risk
function getReminderMessage(type: string, riskLevel: string, title: string, daysUntil: number): string {
  const absDay = Math.abs(daysUntil);
  
  if (type === 'overdue') {
    return `"${title}" was due ${absDay} day${absDay !== 1 ? 's' : ''} ago. Would you like help getting this sorted?`;
  }
  
  if (type === 'day_of') {
    return `"${title}" is due today. You've got this.`;
  }
  
  // pre_due reminders
  if (riskLevel === 'high') {
    if (daysUntil === 7) return `Just a heads up: "${title}" is coming up in a week. Plenty of time to prepare.`;
    if (daysUntil === 3) return `"${title}" is due in 3 days. A good time to start if you haven't already.`;
    return `"${title}" is due tomorrow. You're nearly there.`;
  }
  
  if (riskLevel === 'medium') {
    if (daysUntil === 3) return `"${title}" is coming up in 3 days. No rush, just keeping you in the loop.`;
    return `"${title}" is due tomorrow. You've got this.`;
  }
  
  // low risk
  return `Friendly reminder: "${title}" is due soon. Take your time.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing pending reminders...');

    // Get all pending reminders where reminder_time has passed
    const now = new Date().toISOString();
    const { data: pendingReminders, error: fetchError } = await supabase
      .from('reminders')
      .select(`
        id,
        user_id,
        obligation_id,
        reminder_time,
        type
      `)
      .eq('sent', false)
      .lte('reminder_time', now);

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingReminders?.length || 0} pending reminders`);

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get obligation details for each reminder
    const obligationIds = [...new Set(pendingReminders.map(r => r.obligation_id))];
    const { data: obligations, error: obligationsError } = await supabase
      .from('obligations')
      .select('id, title, risk_level, deadline, status')
      .in('id', obligationIds);

    if (obligationsError) {
      console.error('Error fetching obligations:', obligationsError);
      throw obligationsError;
    }

    const obligationMap = new Map(obligations?.map(o => [o.id, o]) || []);
    
    let processedCount = 0;
    const nudgesToCreate: Array<{
      user_id: string;
      obligation_id: string;
      message: string;
      tone: string;
    }> = [];
    const reminderIdsToMark: string[] = [];

    for (const reminder of pendingReminders) {
      const obligation = obligationMap.get(reminder.obligation_id);
      
      // Skip if obligation doesn't exist or is completed
      if (!obligation || obligation.status === 'completed') {
        reminderIdsToMark.push(reminder.id);
        continue;
      }

      // Calculate days until due
      const daysUntil = obligation.deadline 
        ? Math.ceil((new Date(obligation.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      // Determine tone based on risk level and urgency
      let tone = 'gentle';
      if (reminder.type === 'overdue' || (obligation.risk_level === 'high' && daysUntil <= 1)) {
        tone = 'firm';
      }

      const message = getReminderMessage(
        reminder.type,
        obligation.risk_level,
        obligation.title,
        daysUntil
      );

      nudgesToCreate.push({
        user_id: reminder.user_id,
        obligation_id: reminder.obligation_id,
        message,
        tone,
      });

      reminderIdsToMark.push(reminder.id);
      processedCount++;
    }

    // Create nudges in batch
    if (nudgesToCreate.length > 0) {
      const { error: nudgeError } = await supabase
        .from('nudges')
        .insert(nudgesToCreate);

      if (nudgeError) {
        console.error('Error creating nudges:', nudgeError);
        throw nudgeError;
      }
    }

    // Mark reminders as sent
    if (reminderIdsToMark.length > 0) {
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ sent: true })
        .in('id', reminderIdsToMark);

      if (updateError) {
        console.error('Error updating reminders:', updateError);
        throw updateError;
      }
    }

    console.log(`Processed ${processedCount} reminders, created ${nudgesToCreate.length} nudges`);

    return new Response(
      JSON.stringify({ 
        processed: processedCount, 
        nudgesCreated: nudgesToCreate.length,
        message: 'Reminders processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing reminders:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
