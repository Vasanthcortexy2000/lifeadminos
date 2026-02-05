 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 interface PushNotificationPayload {
   user_id: string;
   title: string;
   body: string;
   data?: Record<string, string>;
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     // Only allow internal calls (service role)
     const authHeader = req.headers.get('Authorization');
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     
     const isServiceRoleCall = authHeader?.includes(supabaseServiceKey);
     if (!isServiceRoleCall) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized - internal use only' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
     const payload: PushNotificationPayload = await req.json();
 
     console.log('Sending push notification to user:', payload.user_id);
 
     // Get user's push token
     const { data: profile, error: profileError } = await supabase
       .from('profiles')
       .select('push_token, push_enabled')
       .eq('user_id', payload.user_id)
       .maybeSingle();
 
     if (profileError) {
       console.error('Error fetching profile:', profileError);
       throw profileError;
     }
 
     if (!profile?.push_enabled || !profile?.push_token) {
       console.log('Push not enabled or no token for user:', payload.user_id);
       return new Response(
         JSON.stringify({ sent: false, reason: 'push_not_enabled' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Get FCM server key from secrets
     const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
     
     if (!fcmServerKey) {
       console.log('FCM_SERVER_KEY not configured - skipping push notification');
       return new Response(
         JSON.stringify({ sent: false, reason: 'fcm_not_configured' }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Send via Firebase Cloud Messaging
     const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
       method: 'POST',
       headers: {
         'Authorization': `key=${fcmServerKey}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         to: profile.push_token,
         notification: {
           title: payload.title,
           body: payload.body,
           sound: 'default',
         },
         data: payload.data || {},
         priority: 'high',
       }),
     });
 
     const fcmResult = await fcmResponse.json();
     console.log('FCM response:', fcmResult);
 
     if (fcmResult.success === 1) {
       return new Response(
         JSON.stringify({ sent: true }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     } else {
       // Token might be invalid - clear it
       if (fcmResult.results?.[0]?.error === 'NotRegistered') {
         await supabase
           .from('profiles')
           .update({ push_token: null, push_enabled: false })
           .eq('user_id', payload.user_id);
       }
 
       return new Response(
         JSON.stringify({ sent: false, error: fcmResult.results?.[0]?.error }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Error sending push notification:', errorMessage);
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });