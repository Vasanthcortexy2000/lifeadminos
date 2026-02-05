 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const { token } = await req.json();
     
     if (!token || typeof token !== 'string') {
       return new Response(
         JSON.stringify({ error: 'Invalid token' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     console.log('Looking up share token:', token.substring(0, 8) + '...');
 
     // Look up the share record
     const { data: shareData, error: shareError } = await supabase
       .from('obligation_shares')
       .select('obligation_id, revoked, expires_at')
       .eq('share_token', token)
       .maybeSingle();
 
     if (shareError) {
       console.error('Share lookup error:', shareError);
       throw shareError;
     }
 
     if (!shareData) {
       return new Response(
         JSON.stringify({ error: 'invalid_or_expired', message: 'This link is invalid or has expired' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (shareData.revoked) {
       return new Response(
         JSON.stringify({ error: 'revoked', message: 'This link has been revoked' }),
         { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
       return new Response(
         JSON.stringify({ error: 'expired', message: 'This link has expired' }),
         { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Fetch the obligation details
     const { data: obligation, error: obligationError } = await supabase
       .from('obligations')
       .select('id, title, description, deadline, risk_level, status, consequence, steps, domain, source_document, created_at')
       .eq('id', shareData.obligation_id)
       .maybeSingle();
 
     if (obligationError) {
       console.error('Obligation lookup error:', obligationError);
       throw obligationError;
     }
 
     if (!obligation) {
       return new Response(
         JSON.stringify({ error: 'not_found', message: 'The obligation no longer exists' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Found shared obligation:', obligation.id);
 
     return new Response(
       JSON.stringify({ obligation }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Error getting shared obligation:', errorMessage);
     return new Response(
       JSON.stringify({ error: 'server_error', message: 'Unable to load this obligation' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });