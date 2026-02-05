
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, email, name, company_name } = await req.json() as any
        const RESEND_API_KEY = 're_i9mrzmkg_DZfa1rLJCE7nY2A2qvpvuDcC' // User provided

        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing Supabase Environment Variables")
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        // WHITE GLOVE THEME CSS
        // Container
        const containerStyle = `
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 48px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
        // Text
        const headingStyle = `
        color: #1e293b;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 16px;
        margin-top: 0;
        letter-spacing: -0.5px;
    `
        const bodyTextStyle = `
        color: #475569;
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 24px;
    `
        const smallTextStyle = `
        color: #94a3b8;
        font-size: 14px;
        margin-top: 32px;
    `
        // Button
        const buttonStyle = `
        display: inline-block;
        background-color: #f59e0b;
        color: #0f172a;
        padding: 14px 28px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);
    `
        // Logo (Dark Text version for White Background)
        const logoBlock = `
        <div style="text-align: center; margin-bottom: 40px;">
            <span style="font-size: 32px; font-weight: 900; color: #1e293b; letter-spacing: -1px;">Tow</span><span style="font-size: 32px; font-weight: 900; color: #f59e0b; letter-spacing: -1px;">Me</span>
        </div>
    `

        let subject = ''
        let htmlContent = ''

        if (action === 'approve') {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: email,
                options: {
                    redirectTo: 'https://driver-web.vercel.app/'
                }
            })

            if (linkError) throw linkError

            const actionLink = linkData.action_link

            subject = 'Welcome to TowMe - Application Approved'
            htmlContent = `
            <div style="background-color: #f8fafc; padding: 40px 0;">
                <div style="${containerStyle}">
                    ${logoBlock}
                    <h1 style="${headingStyle}">Welcome on board, ${name}.</h1>
                    <p style="${bodyTextStyle}">
                        We are thrilled to inform you that your application for <strong>${company_name}</strong> has been approved. You are now part of our elite network of towing professionals.
                    </p>
                    <p style="${bodyTextStyle}">
                        To finalize your account and access the Driver Dashboard, please verify your identity and set your secure password below.
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${actionLink}" style="${buttonStyle}">Access Your Dashboard</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

                    <p style="${smallTextStyle}">
                        If the button above doesn't work, copy and paste this link into your browser:<br/>
                        <a href="${actionLink}" style="color: #64748b; text-decoration: underline;">${actionLink}</a>
                    </p>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                     <p style="color: #94a3b8; font-size: 12px; font-family: sans-serif;">&copy; ${new Date().getFullYear()} TowMe. All rights reserved.</p>
                </div>
            </div>
        `
        } else if (action === 'profile_created') {
            subject = 'Profile Active - Welcome to the Fleet'
            htmlContent = `
            <div style="background-color: #f8fafc; padding: 40px 0;">
                <div style="${containerStyle}">
                    ${logoBlock}
                    <h1 style="${headingStyle}">You're All Set!</h1>
                    <p style="${bodyTextStyle}">
                        Hello <strong>${name}</strong>,
                    </p>
                    <p style="${bodyTextStyle}">
                        Your profile has been successfully activated and your password is secure. You have full access to the platform.
                    </p>
                    <p style="${bodyTextStyle}">
                        You can now start accepting jobs, managing your fleet, and growing your business with TowMe.
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://driver-web.vercel.app" style="${buttonStyle}">Open Driver Portal</a>
                    </div>
                </div>
                 <div style="text-align: center; margin-top: 24px;">
                     <p style="color: #94a3b8; font-size: 12px; font-family: sans-serif;">&copy; ${new Date().getFullYear()} TowMe. All rights reserved.</p>
                </div>
            </div>
        `
        } else {
            throw new Error("Invalid action type")
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'TowMe <onboarding@resend.dev>',
                to: [email],
                subject: subject,
                html: htmlContent,
            }),
        })

        const data = await res.json()

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: res.status,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
