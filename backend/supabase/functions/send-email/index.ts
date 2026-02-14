// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// 1. VISUAL LAW: BRAND SETTINGS (Source of Truth)
// Derived from: admin-web/src/config/brand_settings.json
const BRAND = {
    colors: {
        primary: "#F9A825", // Solid Neutral Light Orange
        secondary: "#1A1C2E", // Midnight Blue (Used for dark mode/contrast, NOT headers)
        background: "#FFFFFF", // Pure White
        text: "#334155", // Slate 700
        textLight: "#64748b" // Slate 500
    },
    features: {
        NEW_ERA_ENABLED: true
    }
};

// 2. VISUAL LAW: EMAIL THEME
const emailStyles = `
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; color: ${BRAND.colors.text}; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${BRAND.colors.background}; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
    .header { background-color: ${BRAND.colors.background}; padding: 32px; text-align: center; border-bottom: 4px solid ${BRAND.colors.primary}; }
    .logo { color: #1e293b; font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0; }
    .logo span { color: ${BRAND.colors.primary}; }
    .content { padding: 40px; }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 16px; font-weight: 700; }
    p { color: ${BRAND.colors.textLight}; line-height: 1.6; font-size: 16px; margin-bottom: 24px; }
    .button { display: inline-block; background-color: ${BRAND.colors.primary}; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin-top: 8px; }
    .button:hover { filter: brightness(110%); }
    .footer { background-color: #F1F5F9; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
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
    DRIVER_INVITATION = 'driver_invitation',
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
                const isDriver = data?.application_type === 'driver';
                subject = isDriver ? 'Driver Partner Application Received' : 'Partner Application Received - TowMe';
                const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'short', day: '2-digit' });

                htmlContent = `
                    <h1 style="color: #1A1C2E;">${isDriver ? 'Driver Application Received' : 'Application Received'}</h1>
                    <p style="color: #475569;">Thank you for your interest in joining the TowMe Partner Network. We have received your application on <strong>${today}</strong> and it is currently under review by our administration team.</p>
                    
                    <div class="divider" style="border-top: 1px solid #e2e8f0;"></div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #1e293b; font-size: 14px;"><strong>Status:</strong> <span style="color: #F9A825; font-weight: bold;">Pending Review</span></p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">We usually respond within 24-48 hours.</p>
                    </div>

                ${!isDriver && data?.subscription_price ? `
                    <p style="margin-top: 24px; color: #475569;">Subscription Selected: <strong style="color: #0f172a;">€${data?.subscription_price} / month</strong></p>
                    ` : ''}
                    
                     <div style="text-align: center; margin: 32px 0;">
                        <!-- Placeholder for confirmation link if needed, currently just a status update -->
                        <span style="display: inline-block; background-color: #f1f5f9; color: #94a3b8; padding: 10px 20px; border-radius: 8px; font-size: 14px;">Application ID: ${data?.application_id || 'Pending'}</span>
                    </div>
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
                subject = 'TowMe Driver Application — Status Update';
                const resubLink = data?.resubmission_link || 'https://localhost:5176';
                htmlContent = `
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: ${BRAND.colors.primary}; font-size: 22px; font-weight: 800; margin: 0;">TowMe</h1>
                        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Driver Application Update</p>
                    </div>
                    <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear <strong>${data?.name || 'Applicant'}</strong>,</p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">After careful review of your driver application, we regret to inform you that we are unable to approve your registration at this time.</p>
                    
                    ${data?.rejection_reason ? `
                    <div style="background: #FFF5F5; border: 2px solid #FCA5A5; padding: 20px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0; color: #DC2626; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Reason for Decision</p>
                        <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500; line-height: 1.5;">${data.rejection_reason}</p>
                    </div>
                    ` : ''}

                    <div style="background: #FFFBEB; border: 2px solid ${BRAND.colors.primary}; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
                        <p style="margin: 0 0 12px 0; color: #92400E; font-size: 14px; font-weight: 600;">You may re-apply once you've addressed the above.</p>
                        <a href="${resubLink}" style="display: inline-block; background: ${BRAND.colors.primary}; color: #FFFFFF; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;">RE-APPLY NOW</a>
                    </div>

                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">If you believe this is an error, please contact <a href="mailto:support@towme.mt" style="color: ${BRAND.colors.primary};">support@towme.mt</a></p>
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

            case EmailType.DRIVER_INVITATION:
                subject = 'Action Required: Activate your Driver Account';
                htmlContent = `
                    <h1 style="color: #f59e0b;">Welcome to the Fleet!</h1>
                    <p>Hi <strong>${data?.name || 'Partner'}</strong>,</p>
                    <p>Your application has been <strong>APPROVED</strong>. You are now an official TowMe Driver Partner.</p>
                    
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 24px; border-radius: 12px; margin: 24px 0;">
                        <p style="margin: 0; color: #1e293b; font-size: 16px;"><strong>Next Step: Create Your Password</strong></p>
                        <p style="margin: 8px 0 0 0; color: #475569; font-size: 14px;">Click the button below to set your secure password and access the Driver Portal.</p>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${data?.action_link}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">Activate Account</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px;">Link expires in 24 hours.</p>
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
