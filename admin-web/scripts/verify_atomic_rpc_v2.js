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
    console.log("🚀 Starting Atomic RPC V2 Negative Verification...");

    const timestamp = Date.now();
    const testEmail = `negative_v2_${timestamp}@example.com`;

    // 1. Submit Driver Application
    console.log(`\n1️⃣ Submitting Application (Email: ${testEmail})...`);
    const { data: appData, error: appError } = await supabase
        .from('driver_applications')
        .insert({
            company_name: `Negative Test Towing V2`,
            owner_name: "Negative Driver V2",
            vat_number: `VAT-V2-${timestamp}`,
            email: testEmail,
            phone: "+356 9999 8888",
            address: "123 Negative V2 Street",
            tow_truck_types: ["Flatbed"],
            tow_truck_make: "Isuzu",
            tow_truck_model: "NQR",
            tow_truck_year: "2024",
            tow_truck_registration_plate: `NV2-${timestamp.toString().slice(-4)}`,
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

    // 2. Call Atomic RPC V2
    console.log(`\n2️⃣ Executing 'approve_driver_application_v2' RPC...`);

    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_driver_application_v2', {
        app_id: appData.id
    });

    if (rpcError) {
        console.log("ℹ️  RPC Error (Expected):", rpcError.message);

        if (rpcError.message.includes('Profile not found')) {
            console.log("\n✅ NEGATIVE AUDIT PASSED: RPC V2 blocked Ghost Driver (No Profile).");
        } else {
            console.log("\n⚠️  NEGATIVE AUDIT UNCERTAIN: Unexpected error message.");
        }
    } else {
        console.error("❌ NEGATIVE AUDIT FAILED: RPC succeeded but Profile should not exist!");
    }
}

main().catch(console.error);
