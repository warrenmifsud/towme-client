// @ts-nocheck — Runs in Deno on Supabase Edge
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMMANDER_EMAIL = 'warrenmifsud@gmail.com';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { status, files_changed, areas, branch, commit_hash, timestamp, error_message } = await req.json();

        const isSuccess = status === 'SUCCESS';
        const statusColor = isSuccess ? '#4ade80' : '#ef4444';
        const statusIcon = isSuccess ? '✅' : '❌';
        const statusLabel = isSuccess ? 'VAULT SYNCED' : 'SYNC FAILED';

        const subject = `${statusIcon} TowMe Sync — ${statusLabel} [${timestamp || new Date().toISOString()}]`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>${subject}</title>
                </head>
                <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; color: #334155; margin: 0; padding: 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                        
                        <!-- HEADER -->
                        <div style="background-color: #FFFFFF; padding: 24px 32px; text-align: center; border-bottom: 4px solid #F9A825;">
                            <h2 style="color: #1e293b; font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0;">
                                Tow<span style="color: #F9A825;">Me</span> 
                                <span style="font-size: 14px; color: #94a3b8; font-weight: 400; margin-left: 8px;">SYNC SENTINEL</span>
                            </h2>
                        </div>

                        <!-- STATUS BADGE -->
                        <div style="padding: 32px; text-align: center;">
                            <div style="display: inline-block; background: ${isSuccess ? '#F0FDF4' : '#FEF2F2'}; border: 2px solid ${statusColor}; padding: 12px 32px; border-radius: 999px;">
                                <span style="color: ${statusColor}; font-size: 16px; font-weight: 800; letter-spacing: 1px;">${statusIcon} ${statusLabel}</span>
                            </div>
                        </div>

                        <!-- DETAILS -->
                        <div style="padding: 0 32px 32px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; width: 140px;">Timestamp</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #1e293b; font-size: 14px; font-weight: 500;">${timestamp || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Branch</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #1e293b; font-size: 14px;">${branch || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Files Changed</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #F9A825; font-size: 18px; font-weight: 800;">${files_changed || '0'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Areas</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #1e293b; font-size: 14px;">${areas || 'N/A'}</td>
                                </tr>
                                ${commit_hash ? `
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Commit</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-family: monospace; color: #F9A825; font-size: 14px;">${commit_hash}</td>
                                </tr>` : ''}
                                ${error_message ? `
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #ef4444; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Error</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; color: #ef4444; font-size: 14px;">${error_message}</td>
                                </tr>` : ''}
                            </table>
                        </div>

                        <!-- FOOTER -->
                        <div style="background-color: #F1F5F9; padding: 20px; text-align: center;">
                            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                                Sovereign Sync Sentinel — Antigravity Auto-Vault<br/>
                                <span style="color: #F9A825; font-weight: 600;">Powered by W.M Coding</span>
                            </p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const emailResult = await resend.emails.send({
            from: 'TowMe Sentinel <onboarding@resend.dev>',
            to: [COMMANDER_EMAIL],
            subject: subject,
            html: htmlContent,
        });

        console.log(`[SENTINEL] Email dispatched: ${JSON.stringify(emailResult)}`);

        return new Response(JSON.stringify({ success: true, email: emailResult }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error(`[SENTINEL] Failed:`, error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
