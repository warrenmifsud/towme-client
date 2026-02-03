// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find suspended users whose suspension has expired
    const now = new Date().toISOString();
    const { data: expiredSuspensions, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'suspended')
      .lt('suspended_until', now);

    if (fetchError) throw fetchError;

    if (!expiredSuspensions || expiredSuspensions.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired suspensions found.', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Found ${expiredSuspensions.length} expired suspensions. Reactivating...`);
    const results = [];

    // 2. Process each user (Reactivate & Notify)
    for (const client of expiredSuspensions) {
      // A. Update Status
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          status: 'active',
          suspension_reason: null,
          suspended_until: null
        })
        .eq('id', client.id);

      if (updateError) {
        console.error(`Failed to reactivate client ${client.id}:`, updateError);
        results.push({ id: client.id, status: 'failed', error: updateError.message });
        continue;
      }

      // B. Send Email Notification
      // We invoke the 'send-email' function directly or via fetch if internal invoke isn't easy here.
      // Using fetch to call the public endpoint of the other function (or same project internal URL)
      // Ideally we just replicate the email payload logic or call the function via supabase.

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'client_reactivated',
          email: client.email,
          data: {
            full_name: client.full_name
          }
        }
      });

      if (emailError) {
        console.error(`Failed to send email to ${client.email}:`, emailError);
      }

      results.push({ id: client.id, status: 'reactivated', email_sent: !emailError });
    }

    return new Response(JSON.stringify({
      message: 'Processed expired suspensions.',
      count: expiredSuspensions.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
