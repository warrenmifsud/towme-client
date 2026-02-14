// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Google Maps Routes API (or simplified Haversine if no key)
// We will use a simplified calculation for now to avoid external dependencies blocking the task,
// but structure it for easy swap to Google Routes.

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Initialize Supabase Client with Service Role Key
        // key point: we do NOT pass the user's auth header here because we need admin privileges
        // to read/write columns that might be protected (like getting the user's active job).
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { driver_id, lat, lng } = await req.json();

        if (!driver_id || !lat || !lng) {
            throw new Error('Missing driver_id, lat, or lng');
        }

        // 1. Fetch Active Job for Driver
        const { data: job, error: jobError } = await supabaseClient
            .from('towing_requests')
            .select('id, dropoff_lat, dropoff_long, status')
            .eq('driver_id', driver_id)
            .in('status', ['in_progress', 'en_route'])
            .maybeSingle();

        console.log(`[Driver Status Debug] Driver ID: ${driver_id}`);
        console.log(`[Driver Status Debug] Query Result:`, JSON.stringify(job));
        console.log(`[Driver Status Debug] Query Error:`, JSON.stringify(jobError));

        if (jobError || !job) {
            // Driver idle or error
            return new Response(JSON.stringify({
                status: 'idle',
                message: 'No active job',
                debug: { driver_id, job, error: jobError }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 2. Calculate Distance & Duration (Simplified Haversine / Estimate)
        // In production, call Google Routes API here.
        // Assuming average speed of 40km/h (11.11 m/s) in city
        const dist = haversineDistance(lat, lng, job.dropoff_lat, job.dropoff_long); // meters
        const duration = dist / 11.11; // seconds

        // 3. AI Logic: Check Thresholds
        // Thresholds: 300m OR 90s (1.5 mins)

        let ai_trigger = 'none';
        let new_status = 'active';
        let b2b_eligible = false;

        if (dist <= 300 || duration <= 90) {
            ai_trigger = 'very_close';
            // Action: Update Realtime
            /* 
               We don't need to explicitly "send" a socket message if the client subscribes to the `current_queue` table changes.
               But the requirement says "push a socket event". 
               We can use Supabase channel broadcast.
            */
            const channel = supabaseClient.channel('logistics');
            await channel.send({
                type: 'broadcast',
                event: 'arrival_imminent',
                payload: { driver_id, message: 'Driver is approaching.', action: 'prepare_b2b_handover' }
            });
        }

        // 4. Update Database State
        // "When a driver is <= 5 mins from finishing" (300 seconds)
        if (duration <= 300) {
            new_status = 'finishing_previous';
            b2b_eligible = true;

            // Update driver_status
            await supabaseClient.from('driver_status')
                .update({ is_eligible_for_b2b: true })
                .eq('driver_id', driver_id);

            // Check if row exists in current_queue, else insert
            const { data: queue } = await supabaseClient.from('current_queue').select('*').eq('driver_id', driver_id).single();
            if (queue) {
                await supabaseClient.from('current_queue').update({
                    status: 'finishing_previous',
                    estimated_finish_time: new Date(Date.now() + duration * 1000).toISOString(),
                    seconds_to_finish: Math.round(duration)
                }).eq('driver_id', driver_id);
            } else {
                await supabaseClient.from('current_queue').insert({
                    driver_id,
                    current_job_id: job.id,
                    status: 'finishing_previous',
                    estimated_finish_time: new Date(Date.now() + duration * 1000).toISOString(),
                    seconds_to_finish: Math.round(duration)
                });
            }
        }

        return new Response(JSON.stringify({
            driver_id,
            eta_seconds: Math.round(duration),
            distance_meters: Math.round(dist),
            status: new_status,
            b2b_eligible,
            ai_trigger
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

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}
