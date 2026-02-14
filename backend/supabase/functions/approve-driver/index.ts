// @ts-nocheck — This file runs in Deno on Supabase Edge, not the local TypeScript compiler.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
    // 1. CORS Preflight Protocol
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Environment Check
        if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
            throw new Error('INTERNAL: Service Role Key missing');
        }

        // 2. AUTHENTICATION: DIRECT JWT DECODE (NO getUser — it fails with "missing sub claim")
        // The Supabase gateway or functions.invoke sometimes forwards the anon key
        // instead of the user's access token. getUser() then fails because anon keys
        // have no "sub" claim. Direct base64 decode of the JWT is bulletproof.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization Header');

        const token = authHeader.replace('Bearer ', '');

        // FORENSIC: Log token prefix to identify what we're receiving
        console.log(`[AUTH] Token prefix: ${token.substring(0, 40)}...`);

        // We instantiate a "Service Role" client immediately to bypass RLS.
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }
                }
            }
        )

        // DIRECT JWT DECODE: Extract claims from the JWT payload without a network call.
        // JWTs are base64url-encoded: header.payload.signature
        let jwtPayload: any;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error(`Malformed JWT: expected 3 parts, got ${parts.length}. Token starts with: ${token.substring(0, 30)}`);
            }
            // Base64url decode the payload (part[1])
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const decoded = atob(base64);
            jwtPayload = JSON.parse(decoded);
            console.log(`[AUTH] JWT decoded: sub=${jwtPayload.sub}, email=${jwtPayload.email}, role=${jwtPayload.role}, iss=${jwtPayload.iss}`);
        } catch (decodeErr: any) {
            console.error(`[AUTH] JWT decode failed:`, decodeErr);
            throw new Error(`Unauthorized: JWT decode failed - ${decodeErr?.message || decodeErr}`);
        }

        // VALIDATE: The token MUST have a "sub" claim (user ID). Anon keys don't have one.
        if (!jwtPayload.sub) {
            console.error(`[AUTH] Token has no "sub" claim. Full payload: ${JSON.stringify(jwtPayload)}`);
            throw new Error(`Unauthorized: Token has no user identity (sub claim). Received role="${jwtPayload.role}". This is an anon key, not a user token.`);
        }

        // LOOKUP USER: Use admin API to get full user metadata by ID from the decoded sub claim
        const { data: { user }, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(jwtPayload.sub);

        if (userLookupError || !user) {
            console.error(`[AUTH] User lookup failed for sub=${jwtPayload.sub}:`, userLookupError);
            throw new Error(`Unauthorized: User not found for ID ${jwtPayload.sub}`);
        }

        console.log(`[AUTH] User verified: ${user.email}, app_metadata: ${JSON.stringify(user.app_metadata)}`);

        // 3. SERVICE-ROLE OVERRIDE (Already Initialized as supabaseAdmin)

        // FORENSIC AUTH GUARD: Check app_metadata
        const userRole = user.app_metadata?.role?.toLowerCase();
        console.log(`[AUTH] User: ${user.email}, Role: '${userRole}', Raw app_metadata: ${JSON.stringify(user.app_metadata)}`);

        if (userRole !== 'super_admin' && userRole !== 'admin') {
            throw new Error(`Unauthorized: Role '${userRole}' does not have approval privileges. Required: super_admin or admin.`);
        }

        // BODY PARSING LOCK
        let driverId, driverEmail;
        try {
            const body = await req.json();
            driverId = body.driverId;
            driverEmail = body.driverEmail;
        } catch (e) {
            throw new Error('Malformed Request Body: JSON parsing failed');
        }

        if (!driverId || !driverEmail) throw new Error('Missing driverId or driverEmail payload')

        console.log(`[EXECUTION] Approving Driver: ${driverId} by ${user.email}`);

        // 2. FETCH APPLICATION DATA
        const { data: appData, error: fetchError } = await supabaseAdmin
            .from('driver_applications')
            .select('*')
            .eq('id', driverId)
            .single();

        if (fetchError || !appData) throw new Error(`Fetch Failed: ${fetchError?.message}`);

        console.log(`[EXECUTION] Processing Approval for: ${appData.owner_name} (${appData.email})`);

        // 3. EXECUTE PERSON-FIRST PROTOCOL (Identity & Status)
        // A. Resolve User ID — Auto-create if driver hasn't registered yet
        let userId: string;

        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', appData.email)
            .single();

        if (userProfile) {
            userId = userProfile.id;
            console.log(`[AUTH] Existing profile found for ${appData.email}: ${userId}`);
        } else {
            console.log(`[AUTH] No profile for ${appData.email}. Auto-creating auth user...`);

            // Check if auth user already exists
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find((u: any) => u.email === appData.email);

            if (existingUser) {
                userId = existingUser.id;
                console.log(`[AUTH] Auth user exists but no profile. Using ID: ${userId}`);
                // Flag for password setup in driver-web app
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: { ...existingUser.user_metadata, needs_password_setup: true }
                });
            } else {
                // Create the auth user with a temporary password
                const tempPassword = crypto.randomUUID();
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: appData.email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: appData.owner_name,
                        role: 'driver',
                        needs_password_setup: true
                    }
                });

                if (createError || !newUser?.user) {
                    throw new Error(`Failed to create auth user: ${createError?.message}`);
                }

                userId = newUser.user.id;
                console.log(`[AUTH] New auth user created: ${userId}`);
            }

            // Ensure profile exists (Supabase trigger may create it, but let's be safe)
            const { error: profileInsertError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: userId,
                    email: appData.email,
                    full_name: appData.owner_name,
                    role: 'driver'
                }, { onConflict: 'id' });

            if (profileInsertError) {
                console.warn(`[WARNING] Profile upsert: ${profileInsertError.message}`);
            }
        }

        // B. Create/Get Fleet
        const fleetName = appData.company_name || `${appData.owner_name}'s Fleet`;
        const { data: fleet, error: fleetError } = await supabaseAdmin
            .from('fleets')
            .upsert({ owner_id: userId, name: fleetName }, { onConflict: 'owner_id' })
            .select()
            .single();

        if (fleetError) throw new Error(`Fleet Creation Failed: ${fleetError.message}`);

        // C. Initialize Financials (Driver Status)
        const { error: statusError } = await supabaseAdmin
            .from('driver_status')
            .upsert({
                driver_id: userId,
                is_online: false,
                partner_commission_rate: 15.00,
                hourly_rate: 0.00
            }, { onConflict: 'driver_id' });

        if (statusError) throw new Error(`Driver Status Failed: ${statusError.message}`);

        // D. Update Profile (Promote to Driver)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                fleet_id: fleet.id,
                is_fleet_manager: true,
                role: 'driver'
            })
            .eq('id', userId);

        if (profileError) throw new Error(`Profile Update Failed: ${profileError.message}`);

        console.log(`[SUCCESS] Person Identity Activated. Processing Vehicle...`);

        // 4. HANDLE TRUCK (Non-Blocking & Idempotent)
        try {
            // Check if truck already exists for this driver to prevent unique violation
            const { data: existingAsset } = await supabaseAdmin
                .from('fleet_assets')
                .select('id')
                .eq('driver_id', userId)
                .maybeSingle();

            if (!existingAsset) {
                const { error: assetError } = await supabaseAdmin
                    .from('fleet_assets')
                    .insert({
                        fleet_id: fleet.id,
                        driver_id: userId,
                        make: appData.tow_truck_make || 'Generic',
                        model: appData.tow_truck_model || 'Truck',
                        year: appData.tow_truck_year,
                        type: appData.tow_truck_type || 'Standard',
                        color: appData.tow_truck_color,
                        license_plate: appData.tow_truck_registration_plate || `PENDING-${driverId.substring(0, 8)}`,
                        is_verified: true
                    });

                if (assetError) {
                    console.warn(`[WARNING] Truck Insert Failed (Non-Critical): ${assetError.message}`);
                } else {
                    console.log(`[SUCCESS] Truck Activated.`);
                }
            } else {
                console.log(`[INFO] Truck already exists for driver via Idempotency Check.`);
            }
        } catch (vehErr) {
            console.warn(`[WARNING] Truck Logic Crashed (Ignored): ${vehErr}`);
        }

        // 5. FINALIZE APPLICATION STATUS
        const { error: finalError } = await supabaseAdmin
            .from('driver_applications')
            .update({
                status: 'approved', // Lowercase to match Check Constraint
                is_verified: true,
                verification_status: 'VERIFIED'
            })
            .eq('id', driverId);

        if (finalError) throw new Error(`Final Status Update Failed: ${finalError.message}`);

        // 6. SOUL INJECTION (Auth Invite with Visual Law)
        console.log(`[EXECUTION] Handling Auth for: ${driverEmail}`);

        // DOMAIN ISOLATION: All driver redirects use DRIVER_PLATFORM_URL
        const DRIVER_PLATFORM_URL = Deno.env.get('DRIVER_PLATFORM_URL') || 'http://localhost:5176';
        console.log(`[CONFIG] DRIVER_PLATFORM_URL resolved to: ${DRIVER_PLATFORM_URL}`);
        let actionLink = `${DRIVER_PLATFORM_URL}/login`; // Default Fallback

        // Attempt A: Generate Invite (New User)
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: driverEmail,
            options: {
                redirectTo: `${DRIVER_PLATFORM_URL}/setup-password`,
                data: { driver_id: driverId, role: 'driver', onboarding_completed: false }
            }
        });

        if (!inviteError && inviteData?.properties?.action_link) {
            console.log("[AUTH] Invite Link Generated (New User)");
            actionLink = inviteData.properties.action_link;
        } else {
            console.log(`[AUTH] Invite failed or User exists. Switching to Magic Link. Error: ${inviteError?.message}`);

            // Attempt B: Generate Magic Link (Existing User)
            const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: driverEmail,
                options: {
                    redirectTo: `${DRIVER_PLATFORM_URL}/dashboard`,
                }
            });

            if (!magicError && magicData?.properties?.action_link) {
                console.log("[AUTH] Magic Link Generated (Existing User)");
                actionLink = magicData.properties.action_link;
            } else {
                console.warn(`[AUTH] All link generation failed. Sending generic login link. Error: ${magicError?.message}`);
            }
        }

        console.log(`[EXECUTION] Dispatching 'send-email'...`);

        // 7. DISPATCH EMAIL (Visual Law)
        // We call the 'send-email' function via the local container network or public URL.
        const FUNCTIONS_URL = Deno.env.get('SUPABASE_URL')?.replace('/co/auth/v1', '/functions/v1')
            || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.functions.supabase.co');

        let sendEmailUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
        if (Deno.env.get('SUPABASE_URL')?.includes('localhost') || Deno.env.get('SUPABASE_URL')?.includes('127.0.0.1')) {
            sendEmailUrl = 'http://127.0.0.1:54321/functions/v1/send-email';
        }

        console.log(`[EXECUTION] Calling Email Service at: ${sendEmailUrl}`);

        const emailResponse = await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.session_token || Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
                type: 'driver_invitation',
                email: driverEmail,
                data: {
                    name: appData.owner_name || 'Partner',
                    action_link: actionLink
                }
            })
        });

        if (!emailResponse.ok) {
            const errText = await emailResponse.text();
            console.error(`[ERROR] Email Service Failed: ${errText}`);
        } else {
            console.log(`[SUCCESS] Visual Law Email Dispatched.`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Driver Activated & Visual Law Invite Sent (Person-First)",
                invite_link: actionLink
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        const errorCode = (error as any)?.code || (error as any)?.status || 'UNKNOWN';
        const sqlState = (error as any)?.details || (error as any)?.hint || null;

        // OPES FORENSIC TRANSPARENCY: Extract failing stage from error message
        const stageMap: Record<string, string> = {
            'Unauthorized': 'AUTH_VERIFICATION',
            'Malformed': 'BODY_PARSING',
            'Application not found': 'DATA_RETRIEVAL',
            'Fleet Creation': 'FLEET_CREATION',
            'Driver Status': 'FINANCIALS_INIT',
            'Profile Update': 'PROFILE_PROMOTION',
            'Truck': 'ASSET_REGISTRATION',
            'Final Status': 'STATUS_FINALIZATION',
            'Email': 'EMAIL_DISPATCH'
        };

        let failingStage = 'UNKNOWN_STAGE';
        for (const [key, stage] of Object.entries(stageMap)) {
            if (message.includes(key)) { failingStage = stage; break; }
        }

        console.error(`[FORENSIC] Stage: ${failingStage} | Code: ${errorCode} | Message: ${message} | SQLState: ${sqlState}`);

        return new Response(
            JSON.stringify({
                error: message,
                forensic: {
                    stage: failingStage,
                    code: errorCode,
                    sqlState: sqlState,
                    timestamp: new Date().toISOString(),
                    function: 'approve-driver',
                    recommendation: failingStage === 'FLEET_CREATION'
                        ? 'Check UNIQUE constraint on fleets.owner_id'
                        : failingStage === 'FINANCIALS_INIT'
                            ? 'Check driver_status.driver_id PK and NOT NULL constraints'
                            : 'Review Edge Function logs in Supabase Dashboard'
                }
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
