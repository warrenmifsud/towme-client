import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req: Request) => {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
        apiVersion: '2022-11-15',
        httpClient: Stripe.createFetchHttpClient(),
    })

    const signature = req.headers.get('Stripe-Signature')

    // Create Supabase Admin Client
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        if (!signature) throw new Error('Missing Stripe-Signature')

        const body = await req.text()
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
            undefined,
            cryptoProvider
        )

        console.log(`🔔 Event received: ${event.type}`)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any
            const userId = session.metadata.userId
            const subscriptionId = session.subscription

            // Activate subscription in database
            const { error } = await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    status: 'active',
                    stripe_subscription_id: subscriptionId,
                    current_period_end: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
                })

            if (error) throw error
            console.log(`✅ Subscription activated for user: ${userId}`)
        }

        if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as any
            const status = subscription.status // 'active', 'past_due', 'canceled', 'unpaid'

            const { error } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    status: status === 'active' ? 'active' : 'inactive',
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
                })
                .eq('stripe_subscription_id', subscription.id)

            if (error) throw error
            console.log(`ℹ️ Subscription ${subscription.id} updated to: ${status}`)
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (error: any) {
        console.error(`Error: ${error.message}`)
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
    }
})
