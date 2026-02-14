import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error("❌ .env file not found at", envPath);
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("🚀 Starting Atomic RPC Negative Verification...");

    const timestamp = Date.now();
    const testEmail = `negative_test_${timestamp}@example.com`;

    // 1. Submit Driver Application (Public)
    console.log(`\n1️⃣ Submitting Application (Email: ${testEmail})...`);
    const { data: appData, error: appError } = await supabase
        .from('driver_applications')
        .insert({
            company_name: `Negative Test Towing`,
            owner_name: "Negative Driver",
            vat_number: `VAT-${timestamp}`,
            email: testEmail,
            phone: "+356 9999 8888",
            address: "123 Negative Street",
            tow_truck_types: ["Flatbed"],
            tow_truck_make: "Isuzu",
            tow_truck_model: "NQR",
            tow_truck_year: "2024",
            tow_truck_registration_plate: `NEG-${timestamp.toString().slice(-4)}`,
            tow_truck_color: "Black",
            payout_type: "COMMISSION",
            payout_rate: 15.0,
            application_type: "single",
            status: "pending"
        })
        .select()
        .single();

    if (appError) {
        console.error("❌ Application Submission Failed:", appError.message);
        return;
    }
    console.log("✅ Application Submitted:", appData.id);

    // 2. Call Atomic RPC
    console.log(`\n2️⃣ Executing 'approve_driver_application' RPC...`);

    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_driver_application', {
        app_id: appData.id
    });

    if (rpcError) {
        console.log("ℹ️  RPC Error (Expected):", rpcError.message);

        if (rpcError.message.includes('Profile not found')) {
            console.log("\n✅ NEGATIVE AUDIT PASSED: RPC blocked Ghost Driver (No Profile).");
        } else {
            console.log("\n⚠️  NEGATIVE AUDIT UNCERTAIN: Unexpected error message.");
        }
    } else {
        console.error("❌ NEGATIVE AUDIT FAILED: RPC succeeded but Profile should not exist!");
    }
}

main().catch(console.error);
