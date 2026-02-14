
import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIG (Local Dev or Remote - using env vars if available or hardcoded for this test)
const SUPABASE_URL = 'https://letjcjqppyxzqfthdqul.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testApproveDriverFn() {
    console.log('🚀 Starting Test: Contextual Verify of approve-driver Edge Function');

    // 1. Create a Pending Application
    const testEmail = `verify.${Date.now()}@visual-law.com`;
    console.log(`... Creating Target Application for ${testEmail}`);

    const { data: app, error: appError } = await supabase
        .from('driver_applications')
        .insert({
            application_type: 'single',
            company_name: 'Visual Law Corp',
            owner_name: 'Isabella Orange',
            vat_number: 'MT-9999',
            email: testEmail,
            phone: '+356 9999 9999',
            address: '1 Visual Way',
            status: 'pending',
            tow_truck_make: 'Ford',
            tow_truck_model: 'F-650',
            tow_truck_year: '2025',
            tow_truck_registration_plate: `VL-${Date.now().toString().slice(-4)}`,
            tow_truck_color: 'White',
            tow_truck_types: ['Standard'], // Array required by schema
            services_offered: []
        })
        .select('id')
        .single();

    if (appError) {
        console.error('❌ Failed to create application:', appError);
        process.exit(1);
    }
    const appId = app.id;
    console.log(`✅ Application Created: ${appId}`);

    // 2. Invoke 'approve-driver' Function
    console.log(`... Invoking 'approve-driver' for ${appId}`);

    // We need a session, or at least to pass the ID if the function protects against ANON but allows via logic checks.
    // The previous audit showed it checks for admin role.
    // For this test, we are using ANON key, which might fail RLS/Auth checks inside the function if it requires `auth.uid()`.
    // However, the function uses `supabaseAdmin` for internal ops?
    // Let's try invoking. If it returns 401/403, we know it's permissions.

    // LOGIN AS ADMIN (Simulated with Test Account if possible, or just try to invoke)
    // Using a known test admin if possible, or relying on function to handle it.
    // Actually, `approve-driver` usually requires an authenticated user.

    const { data: funcData, error: funcError } = await supabase.functions.invoke('approve-driver', {
        body: {
            driverId: appId,
            driverEmail: testEmail
        }
    });

    if (funcError) {
        console.error('❌ Edge Function Failed:', funcError);
        if (funcError.context && typeof funcError.context.json === 'function') {
            try {
                const errBody = await funcError.context.json();
                console.error('❌ Error Body:', JSON.stringify(errBody, null, 2));
            } catch (e) {
                console.error('❌ Could not parse error body');
            }
        }
    } else {
        console.log('✅ Edge Function Response:', funcData);
    }

    // 3. Verify Final State
    const { data: finalApp } = await supabase
        .from('driver_applications')
        .select('status, verification_status, is_verified')
        .eq('id', appId)
        .single();

    console.log('Final Application State:', finalApp);

    if (finalApp?.status === 'approved') {
        console.log('🎉 SUCCESS: Driver Approved via Edge Function');
    } else {
        console.error('❌ FAILURE: Driver status not updated');
    }

    // Cleanup
    // await supabase.from('driver_applications').delete().eq('id', appId);
}

testApproveDriverFn();
