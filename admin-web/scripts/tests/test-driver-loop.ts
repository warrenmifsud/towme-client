
import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIG
const SUPABASE_URL = 'https://letjcjqppyxzqfthdqul.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDriverLoop() {
    console.log('🚀 Starting Test: Driver Registration (Public Submission)');

    const testEmail = `test.driver.${Date.now()}@proofoflife.com`;
    console.log(`ℹ️ Test Email: ${testEmail}`);

    // 1. Submit Application (Public Insert)
    const submissionData = {
        application_type: 'single',
        company_name: 'Proof of Life Logistics',
        owner_name: 'Test Driver',
        vat_number: 'MT-12345678',
        email: testEmail,
        phone: '+356 9999 9999',
        address: '123 Fake Street, Valletta',

        // Documents (Mock paths)
        driving_license_front_path: 'mock/path/dl_front.jpg',
        driving_license_back_path: 'mock/path/dl_back.jpg',
        id_card_front_path: 'mock/path/id_front.jpg',
        id_card_back_path: 'mock/path/id_back.jpg',
        insurance_policy_path: 'mock/path/insurance.pdf',

        // Vehicle Defaults (as per RegistrationV2)
        tow_truck_make: 'Pending',
        tow_truck_model: 'Pending',
        tow_truck_year: '2024',
        tow_truck_registration_plate: 'PENDING',
        tow_truck_color: 'Pending',
        services_offered: []
    };

    console.log('... Submitting Application payload...');
    const { error: insertError } = await supabase.from('driver_applications').insert(submissionData);

    if (insertError) {
        console.error('❌ Submission Failed:', insertError.message);
        process.exit(1);
    }
    console.log('✅ Application Submitted');

    // 2. Verify Database State
    // Since RLS allows public insert but maybe not select for anon (unless it's their own?), 
    // Wait, 20260201141000_allow_anon_driver_apps.sql allows anon SELECT using (true).
    // So we should be able to query it back.

    console.log('... Verifying Application in DB...');
    const { data: appCheck, error: fetchError } = await supabase
        .from('driver_applications')
        .select('status, email, id')
        .eq('email', testEmail)
        .single();

    if (fetchError) {
        console.error('❌ Verification Fetch Failed:', fetchError.message);
        process.exit(1);
    }

    if (appCheck && appCheck.email === testEmail) {
        console.log(`🎉 TEST PASSED: Application found with ID: ${appCheck.id}`);
        console.log(`   Status: ${appCheck.status}`);
    } else {
        console.error('❌ TEST FAILED: Application mismatch');
        process.exit(1);
    }
}

testDriverLoop();
