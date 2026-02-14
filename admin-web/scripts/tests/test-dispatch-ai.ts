
import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIG
const SUPABASE_URL = 'https://letjcjqppyxzqfthdqul.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDispatchAI() {
    console.log('🚀 Starting Test: Dispatch AI & Assignment');

    const TEST_DRIVER_ID = 'b7895eff-3d3b-42ce-854b-eb58679489a1'; // Test User (Driver & Client)
    const DRIVER_LAT = 35.9000;
    const DRIVER_LNG = 14.5000;

    // 0. Fetch a valid Service Category
    console.log('... Fetching Service Category (service_categories)...');
    let { data: cat, error: catError } = await supabase.from('service_categories').select('id').limit(1).single();

    if (catError || !cat) {
        console.error('❌ Could not find any category in service_categories:', catError?.message);
        // Try fallback if needed, but this table should exist.
        process.exit(1);
    }
    const categoryId = cat.id;
    console.log(`✅ Using Category ID: ${categoryId}`);

    // 1. Set Driver Online & Location & Capabilities
    console.log(`... Setting Driver ${TEST_DRIVER_ID} to ONLINE at [${DRIVER_LAT}, ${DRIVER_LNG}]`);

    // We update 'driver_status' (using RLS bypass if anon, or assuming success)
    const { error: statusError } = await supabase
        .from('driver_status')
        .upsert({
            driver_id: TEST_DRIVER_ID,
            is_online: true,
            location: `POINT(${DRIVER_LNG} ${DRIVER_LAT})`,
            active_categories: [categoryId], // MUST match job category
            updated_at: new Date().toISOString()
        });

    if (statusError) {
        console.error('❌ Failed to update Driver Status:', statusError.message);
        process.exit(1);
    }
    console.log('✅ Driver Status Updated');

    // 2. Create a Job (Towing Request) nearby
    const PICKUP_LAT = 35.9001; // Very close
    const PICKUP_LNG = 14.5001;

    console.log(`... Creating Job at [${PICKUP_LAT}, ${PICKUP_LNG}]`);
    const { data: job, error: jobError } = await supabase
        .from('towing_requests')
        .insert({
            client_id: TEST_DRIVER_ID,
            pickup_location: `POINT(${PICKUP_LNG} ${PICKUP_LAT})`,
            pickup_lat: PICKUP_LAT,
            pickup_long: PICKUP_LNG,
            status: 'pending',
            search_radius_km: 5.0,
            category_id: categoryId // Critical
        })
        .select('id')
        .single();

    if (jobError) {
        console.error('❌ Failed to create Job:', jobError.message);
        process.exit(1);
    }
    const jobId = job.id;
    console.log(`✅ Job Created: ${jobId}`);

    // 3. Trigger Dispatch AI (RPC)
    console.log('... Invoking "dispatch_job" RPC...');
    const { data: dispatchResult, error: dispatchError } = await supabase.rpc('dispatch_job', {
        p_request_id: jobId
    });

    if (dispatchError) {
        console.error('❌ Dispatch RPC Failed:', dispatchError.message);
        process.exit(1);
    }

    console.log('ℹ️ Dispatch Result:', dispatchResult);

    // 4. Verify Outcome
    // Result format: { success: true, status: 'dispatched', driver_id: '...' }
    if (dispatchResult.success && dispatchResult.driver_id === TEST_DRIVER_ID) {
        console.log('🎉 TEST PASSED: Driver was correctly assigned!');
    } else {
        console.error('❌ TEST FAILED: Driver was NOT assigned.', dispatchResult);
        process.exit(1);
    }

    // Cleanup
    await supabase.from('towing_requests').delete().eq('id', jobId);
    console.log('🧹 Cleanup: Job Deleted');
}

testDispatchAI();
