// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Black & Gold Theme Styles
const emailStyles = `
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center; border-bottom: 2px solid #f59e0b; }
    .logo { color: #fff; font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0; }
    .logo span { color: #f59e0b; }
    .content { padding: 40px; }
    h1 { color: #fff; font-size: 24px; margin-bottom: 16px; font-weight: 700; }
    p { color: #94a3b8; line-height: 1.6; font-size: 16px; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #f59e0b; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin-top: 8px; }
    .button:hover { background-color: #d97706; }
    .footer { background-color: #0f172a; padding: 24px; text-align: center; color: #475569; font-size: 12px; }
    .divider { border-top: 1px solid #334155; margin: 32px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #cbd5e1; }
    .info-label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
`;

enum EmailType {
    APPLICATION_RECEIVED = 'application_received',
    APPLICATION_APPROVED = 'application_approved',
    APPLICATION_REJECTED = 'application_rejected',
    APPLICATION_NEEDS_REVISION = 'application_needs_revision',
    PORTAL_ACTIVE = 'portal_active',
    SUBSCRIPTION_OFFER = 'subscription_offer',
    CLIENT_SIGNUP = 'client_signup',
    CLIENT_SUSPENDED = 'client_suspended',
    CLIENT_REACTIVATED = 'client_reactivated',
}

interface EmailRequest {
    type: EmailType;
    email: string;
    data?: any;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { type, email, data } = await req.json() as EmailRequest;

        if (!email || !type) {
            throw new Error('Missing email or type');
        }

        let subject = '';
        let htmlContent = '';

        switch (type) {
            case EmailType.APPLICATION_RECEIVED:
                subject = 'Partner Application Received - TowMe';
                htmlContent = `
                    <h1>Application Received</h1>
                    <p>Thank you for your interest in joining the TowMe Partner Network. We have received your application and it is currently under review by our administration team.</p>
                    
                    <div class="divider"></div>
                    
                    <div style="background: #334155; padding: 20px; border-radius: 8px;">
                        <p style="margin: 0; color: #e2e8f0; font-size: 14px;"><strong>Status:</strong> <span style="color: #f59e0b;">Pending Review</span></p>
                        <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">We usually respond within 24-48 hours.</p>
                    </div>

                    <p style="margin-top: 24px;">Subscription Selected: <strong style="color: #fff;">€${data?.subscription_price || '8.00'} / month</strong></p>
                `;
                break;

            case EmailType.APPLICATION_APPROVED:
                subject = 'Welcome to TowMe - Application Approved';
                htmlContent = `
                    <h1 style="color: #4ade80;">Application Approved!</h1>
                    <p>Congratulations! Your business <strong>${data?.shop_name}</strong> has been verified and accepted into our Partner Network.</p>
                    <p>You can now access your Vendor Portal to manage your profile, view requests, and update your status.</p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5173/register?email=${encodeURIComponent(email)}" class="button">Create Your Account</a>
                    </div>
                    
                    <p style="font-size: 14px; text-align: center;">Or copy this link: <br/><span style="color: #f59e0b;">http://localhost:5173/register?email=${encodeURIComponent(email)}</span></p>
                `;
                break;

            case EmailType.APPLICATION_REJECTED:
                subject = 'Update on your Partner Application';
                htmlContent = `
                    <h1>Application Status Update</h1>
                    <p>Thank you for your interest in TowMe. After careful review of your application for <strong>${data?.shop_name}</strong>, we regret to inform you that we cannot accept your registration at this time.</p>
                    
                    ${data?.rejection_reason ? `
                    <div style="background: #ef444410; border: 1px solid #ef444430; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <p style="margin: 0; color: #f87171; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Reason for Rejection</p>
                        <p style="margin: 8px 0 0 0; color: #cbd5e1;">${data.rejection_reason}</p>
                    </div>
                    ` : ''}

                    <p>This decision is final, but you are welcome to re-apply in the future if your business circumstances change.</p>
                `;
                break;

            case EmailType.APPLICATION_NEEDS_REVISION:
                subject = 'Action Required: Update your Application';

                // Parse reasons: Extract lines starting with "- "
                const updates = data?.rejection_reason?.match(/- (.*)/g)?.map(s => s.substring(2)) || [data?.rejection_reason];

                const reasonListHtml = updates.map(reason => `
                    <div style="display: flex; gap: 12px; margin-bottom: 12px; align-items: start;">
                        <div style="background: #ef444420; color: #ef4444; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">!</div>
                        <p style="margin: 0; color: #cbd5e1; font-size: 14px;">${reason}</p>
                    </div>
                `).join('');

                htmlContent = `
                    <h1 style="color: #f59e0b;">Action Required</h1>
                    <p>Hi <strong>${data?.shop_name}</strong>,</p>
                    <p>We are reviewing your application, but we need you to update a few details before we can proceed.</p>
                    
                    <div style="background: #1e293b; border: 1px solid #334155; padding: 24px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Requested Changes</p>
                        ${reasonListHtml}
                    </div>

                    <p>Please click the button below to review these items and update your application. Your form will be pre-filled.</p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://localhost:5173/?action=edit&id=${data?.application_id}" class="button" style="background-color: #ef4444; color: #fff;">Update Application</a>
                    </div>
                `;
                break;

            case EmailType.PORTAL_ACTIVE:
                subject = 'Your Vendor Portal is Active';
                htmlContent = `
                    <h1 style="color: #4ade80;">Registration Complete</h1>
                    <p>Welcome aboard, <strong>${data?.shop_name}</strong>! Your vendor portal account has been successfully created.</p>
                    <p>You can now log in to receive jobs, manage your profile, and track your earnings.</p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5173/login" class="button">Access Portal</a>
                    </div>

                    <p style="font-size: 14px; text-align: center;">Need help? Contact our support team directly from the portal.</p>
                `;
                break;

            case EmailType.SUBSCRIPTION_OFFER:
                subject = `Special Offer: ${data?.offer_name || 'New Promotion'}`;
                htmlContent = `
                    <h1 style="color: #f59e0b;">Special Offer Just for You!</h1>
                    <p>Hi ${data?.shop_name || 'Partner'}, we have a new promotional offer for your current <strong>${data?.plan_name}</strong> subscription.</p>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
                        <h2 style="color: #fff; margin: 0; font-size: 20px;">${data?.offer_name}</h2>
                        <div style="margin: 16px 0;">
                            <span style="color: #94a3b8; text-decoration: line-through; font-size: 18px;">€${data?.original_price}</span>
                            <span style="color: #4ade80; font-size: 32px; font-weight: 900; margin-left: 12px;">€${data?.discount_price}</span>
                            <span style="color: #94a3b8; font-size: 14px;">/ month</span>
                        </div>
                        <p style="color: #cbd5e1; margin: 0; font-size: 14px;">Valid for the next ${data?.duration_months} months</p>
                    </div>

                    <p>This offer is available to you as a current subscriber. Log in to your dashboard to claim it.</p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5173/login" class="button">Claim Offer Now</a>
                    </div>
                `;
                break;

            case EmailType.CLIENT_SIGNUP:
                subject = 'Welcome to Tow Me - Registration Confirmed';
                htmlContent = `
                    <h1 style="color: #f59e0b;">Welcome to Tow Me!</h1>
                    <p>Hi <strong>${data?.full_name}</strong>,</p>
                    <p>Thank you for joining <strong>Tow Me</strong>. Your account has been successfully created.</p>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 24px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0; color: #e2e8f0; font-size: 16px;"><strong>Never Get Stranded Again.</strong></p>
                        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">Our network of professional tow truck drivers is ready to assist you 24/7.</p>
                    </div>

                    <p>We may have sent a separate verification link to ensure your email security. Please check for that if you haven't verified yet.</p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5175/login" style="display: inline-block; background-color: #f59e0b; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">Access Your Account</a>
                    </div>
                `;
                break;

            case EmailType.CLIENT_SUSPENDED:
                subject = 'Important: Account Suspended';
                htmlContent = `
                    <h1 style="color: #ef4444;">Account Suspended</h1>
                    <p>Hi <strong>${data?.full_name}</strong>,</p>
                    <p>Your account access has been temporarily suspended.</p>

                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 24px; border-radius: 12px; margin: 24px 0;">
                         <p style="margin: 0; color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Reason for Suspension</p>
                         <p style="margin: 8px 0 16px 0; color: #e2e8f0;">${data?.reason}</p>
                         
                         <p style="margin: 0; color: #fca5a5; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Suspended Until</p>
                         <p style="margin: 8px 0 0 0; color: #e2e8f0; font-size: 18px; font-weight: bold;">${data?.until_date}</p>
                    </div>

                    <p>You will automatically regain access on the date above. If you believe this is an error, please contact support.</p>
                `;
                break;

            case EmailType.CLIENT_REACTIVATED:
                subject = 'Account Reactivated';
                htmlContent = `
                    <h1 style="color: #4ade80;">Welcome Back!</h1>
                    <p>Hi <strong>${data?.full_name}</strong>,</p>
                    <p>Good news! Your account suspension has been lifted early.</p>

                    <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); padding: 24px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0; color: #e2e8f0;">Your access has been fully restored. You can now log in and request services immediately.</p>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="http://localhost:5175/login" style="display: inline-block; background-color: #f59e0b; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">Log In Now</a>
                    </div>
                `;
                break;
        }

        // Wrap content in main structural template
        const finalHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${subject}</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 class="logo">Tow<span>Me</span></h2>
                        </div>
                        <div class="content">
                            ${htmlContent}
                        </div>
                        <div class="footer">
                            &copy; 2026 TowMe Elite Roadside Network. All rights reserved.<br/>
                            This is an automated message.
                        </div>
                    </div>
                </body>
            </html>
        `;

        const dataRes = await resend.emails.send({
            from: 'TowMe <onboarding@resend.dev>', // User must verify domain or use this test sender
            to: [email],
            subject: subject,
            html: finalHtml,
        });

        return new Response(JSON.stringify(dataRes), {
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
