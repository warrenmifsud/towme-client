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
        // 1. Initialize ISOLATED Admin Client (SERVICE ROLE ONLY — never polluted with caller token)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!serviceRoleKey) {
            throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is not configured in Edge Function environment');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            global: {
                headers: {
                    Authorization: `Bearer ${serviceRoleKey}`
                }
            }
        });

        // 2. Auth Check — Use SEPARATE client for caller verification to avoid poisoning admin client
        const authHeader = req.headers.get('Authorization')!;
        const callerToken = authHeader.replace('Bearer ', '');

        // Verify caller using the admin client's admin API (does NOT pollute auth state)
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(
            // First, decode the JWT to get the user ID without polluting auth state
            // We use getUser on a throwaway verification
            (await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
                global: { headers: { Authorization: `Bearer ${callerToken}` } }
            }).auth.getUser()).data.user?.id ?? ''
        );

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session token', forensic: { stage: 'AUTH_CHECK', code: '401', callerToken: callerToken.substring(0, 20) + '...' } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
        }

        console.log(`[TERMINATE] Caller Verified: ${user.email} (ID: ${user.id})`);

        // Strict Admin Role Check
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return new Response(JSON.stringify({ error: `Forbidden: Role '${profile?.role || 'none'}' is not authorized`, forensic: { stage: 'ROLE_CHECK', code: '403', user_id: user.id, role: profile?.role || 'none' } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
        }

        // 3. Parse Request
        const { driverId, reason } = await req.json();
        if (!driverId) throw new Error('Driver ID is required');

        console.log(`[TERMINATE] Initiating HARD DELETE protocol for Driver ID: ${driverId}`);

        // 4. Get Driver Application Details
        const { data: driverApp } = await supabaseAdmin
            .from('driver_applications')
            .select('email, owner_name')
            .eq('id', driverId)
            .single();

        if (!driverApp) {
            console.warn(`[TERMINATE] Driver Application ${driverId} not found. Attempting partial cleanup.`);
        } else {
            console.log(`[TERMINATE] Target Identity: ${driverApp.email}`);
        }

        // SAFETY: PREVENT SELF-TERMINATION
        if (driverApp?.email && driverApp.email.toLowerCase() === user.email?.toLowerCase()) {
            throw new Error("SAFETY BLOCK: You cannot terminate your own account. If you need to remove this application, contact support or use manual SQL.");
        }

        // 5. Find Linked Auth User (The "Ghost")
        let targetAuthId = null;
        if (driverApp?.email) {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            if (listError) {
                console.error(`[TERMINATE] listUsers failed:`, listError);
            } else {
                const targetUser = users.find((u: any) => u.email === driverApp.email);
                if (targetUser) {
                    targetAuthId = targetUser.id;
                    console.log(`[TERMINATE] Found Linked Auth User: ${targetAuthId}`);
                } else {
                    console.warn(`[TERMINATE] No auth user found for email: ${driverApp.email}`);
                }
            }
        }

        // 5.5 REFERENTIAL INTEGRITY PRE-CHECK: Active Assignments
        if (targetAuthId) {
            const { data: activeJobs, error: jobCheckError } = await supabaseAdmin
                .from('service_requests')
                .select('id, status')
                .eq('assigned_driver_id', targetAuthId)
                .in('status', ['pending', 'accepted', 'in_progress', 'en_route']);

            if (!jobCheckError && activeJobs && activeJobs.length > 0) {
                return new Response(
                    JSON.stringify({
                        error: `Cannot terminate: Driver has ${activeJobs.length} active job(s)`,
                        forensic: {
                            stage: 'REFERENTIAL_INTEGRITY_CHECK',
                            code: 'FK_ACTIVE_JOBS',
                            active_jobs: activeJobs.map((j: any) => ({ id: j.id, status: j.status })),
                            driver_id: targetAuthId,
                            timestamp: new Date().toISOString(),
                            function: 'terminate-driver',
                            recommendation: 'Reassign active jobs before termination'
                        }
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                );
            }
        }

        // 6. EXECUTE CASCADE DELETE
        // A. Unassign Assets (Fleet Assets) — DECOUPLE, DON'T DELETE
        if (targetAuthId) {
            const { error: assetError } = await supabaseAdmin
                .from('fleet_assets')
                .update({ driver_id: null, status: 'ORPHANED' })
                .eq('driver_id', targetAuthId);
            if (assetError) console.error("Asset Decouple Failed:", assetError);
            else console.log("[TERMINATE] Assets Decoupled → ORPHANED (ready for reassignment).");

            // B. Delete Driver Status (PK is driver_id, NOT id)
            const { error: statusError } = await supabaseAdmin
                .from('driver_status')
                .delete()
                .eq('driver_id', targetAuthId);
            if (statusError) console.error(`[TERMINATE] Status Delete Failed (driver_id: ${targetAuthId}):`, statusError);
            else console.log("[TERMINATE] Driver Status Purged.");

            // C. Delete Profile (this might cascade, but explicit is safer)
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', targetAuthId);
            if (profileError) console.error("Profile Delete Failed:", profileError);
            else console.log("[TERMINATE] Public Profile Purged.");

            // D. Delete Auth User (The Root) — Using ISOLATED admin client with service_role
            console.log(`[TERMINATE] Executing auth.admin.deleteUser(${targetAuthId}) with service_role...`);
            const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthId);
            if (authDeleteError) {
                console.error(`[TERMINATE] Auth Delete Failed for ${targetAuthId}:`, JSON.stringify(authDeleteError));
                // Don't throw — continue with application cleanup
                console.warn(`[TERMINATE] Proceeding with application deletion despite auth delete failure.`);
            } else {
                console.log("[TERMINATE] Auth Identity Annihilated.");
            }
        }

        // E. Delete Driver Application (The Source)
        const { error: appDeleteError } = await supabaseAdmin
            .from('driver_applications')
            .delete()
            .eq('id', driverId);

        if (appDeleteError) throw appDeleteError;
        console.log(`[TERMINATE] Driver Application Data Purged: ${driverId}`);

        // 7. Audit Log (Post-Mortem)
        await supabaseAdmin.from('admin_audit_logs').insert({
            admin_email: user.email,
            action: 'TERMINATE_DRIVER',
            target: `Driver: ${driverApp?.owner_name || 'Unknown'} (${driverApp?.email || 'Unknown'})`,
            metadata: {
                reason: reason || 'Manual Hard Delete',
                auth_deleted: !!targetAuthId,
                driver_id: driverId
            }
        });

        return new Response(
            JSON.stringify({ success: true, message: 'Driver PERMANENTLY Deleted. Email released for re-use.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        const errorCode = error?.code || error?.status || 'UNKNOWN';
        const sqlState = error?.details || error?.hint || null;

        // OPES FORENSIC TRANSPARENCY
        const stageMap: Record<string, string> = {
            'Unauthorized': 'AUTH_CHECK',
            'Forbidden': 'ROLE_CHECK',
            'Driver ID is required': 'INPUT_VALIDATION',
            'SAFETY BLOCK': 'SELF_TERMINATION_GUARD',
            'Asset': 'ASSET_UNASSIGN',
            'Status Delete': 'STATUS_DELETE',
            'Profile Delete': 'PROFILE_DELETE',
            'Auth Delete': 'AUTH_DELETE',
            'Application': 'APP_DELETE'
        };

        let failingStage = 'UNKNOWN_STAGE';
        const msg = error?.message || 'Unknown error';
        for (const [key, stage] of Object.entries(stageMap)) {
            if (msg.includes(key)) { failingStage = stage; break; }
        }

        console.error(`[FORENSIC] Stage: ${failingStage} | Code: ${errorCode} | Msg: ${msg} | SQLState: ${sqlState}`);

        return new Response(
            JSON.stringify({
                error: msg,
                forensic: {
                    stage: failingStage,
                    code: errorCode,
                    sqlState: sqlState,
                    timestamp: new Date().toISOString(),
                    function: 'terminate-driver',
                    recommendation: failingStage === 'STATUS_DELETE'
                        ? 'driver_status PK is driver_id, not id'
                        : failingStage === 'AUTH_DELETE'
                            ? 'Check if user has active sessions or is protected'
                            : failingStage === 'ROLE_CHECK'
                                ? 'Caller must have admin or super_admin role in profiles table'
                                : 'Review Edge Function logs in Supabase Dashboard'
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
