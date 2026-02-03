import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Setup Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 2. Authenticate User
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // 3. Parse Request
        const { service_id, request_id } = await req.json()
        if (!service_id) throw new Error('Service ID is required')

        // 4. Get Service Price (Live View)
        const { data: service, error: serviceError } = await supabaseClient
            .from('v_live_service_prices')
            .select('base_price, name')
            .eq('id', service_id)
            .single()

        if (serviceError || !service) throw new Error('Service not found')

        // 5. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 6. Create Payment Intent
        // Amount in cents (eur 40.00 -> 4000)
        const amountInCents = Math.round(service.base_price * 100)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                request_id: request_id || 'pending_creation',
                service_name: service.name,
                user_id: user.id
            },
        })

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                amount: service.base_price
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
    }
})
