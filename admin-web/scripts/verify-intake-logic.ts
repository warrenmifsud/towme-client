import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local if available
// Adjusted path to look in project root (one level up from scripts)
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config({ path: envPath });
}

// --- INITIALIZATION ---
// Adjusted for Vite project structure
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ RMC FATAL ERROR: Supabase Environment Variables Missing.");
    console.error("   Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_ equivalents) are set in .env or .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTierZeroAudit() {
    console.log("\n🚀 GOC-SENTINEL: INITIATING TIER-ZERO AUDIT...");
    console.log("------------------------------------------------");

    // --- PHASE 1: FETCH CHECK ---
    process.stdout.write("📡 PHASE 1: Live Database Connection... ");
    const { data: fetchTest, error: fetchError } = await supabase
        .from('driver_applications')
        .select('id, status')
        .limit(1);

    if (fetchError) {
        console.log("❌ FAILED");
        console.error(`   Error: ${fetchError.message}`);
        process.exit(1);
    } else {
        console.log("✅ CONNECTED");
    }

    // --- PHASE 2: WRITE PERMISSION CHECK ---
    process.stdout.write("✍️  PHASE 2: Write/Mutation Permissions... ");
    if (fetchTest && fetchTest.length > 0) {
        const testId = fetchTest[0].id;
        // Attempt a non-destructive update (updating formatted timestamp to check write access)
        // Using a phantom column or just checking if we can select for update would be safer, 
        // but the mandate requests a dry run update. 
        // We will update updated_at if it exists, or just valid column. 
        // driver_applications has created_at, let's try to update a safe field or just verify we can access.
        // Actually, RLS might block updates if not owner/admin. The script runs as ANON key unless we have a service role. 
        // If ANON key is used, it simulates client-side.
        // We will try to update 'status' to its CURRENT value to test permission without changing data.
        const currentStatus = fetchTest[0].status;

        const { error: writeError } = await supabase
            .from('driver_applications')
            .update({ status: currentStatus }) // No-op update to test RLS
            .eq('id', testId);

        if (writeError) {
            console.log("❌ DENIED");
            console.error(`   Error: ${writeError.message}`);
            console.error("   Action: Check RLS Policies in Supabase.");
        } else {
            console.log("✅ AUTHORIZED");
        }
    } else {
        console.log("⚠️  SKIPPED (No records found to test update)");
    }

    // --- PHASE 3: VISUAL LAW AUDIT ---
    process.stdout.write("🎨 PHASE 3: Visual Law (#F9A825) Scan... ");

    // Target the specific file: src/pages/DriverApplications.tsx (ADJUSTED FROM PROMPT)
    const targetPath = path.join(__dirname, '../src/pages/DriverApplications.tsx');

    if (fs.existsSync(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf8');
        const hasOrange = content.includes('#F9A825') || content.includes('BRAND.primary');
        const hasLegacyGreen = content.includes('#00BFA5');

        if (hasOrange && !hasLegacyGreen) {
            console.log("✅ COMPLIANT");
        } else {
            console.log("❌ VIOLATION DETECTED");
            if (!hasOrange) console.error("   Error: #F9A825 ({BRAND.primary}) not found in code.");
            if (hasLegacyGreen) console.error("   Error: Forbidden Green (#00BFA5) detected.");
        }
    } else {
        console.log("⚠️  FILE NOT FOUND");
        console.log(`   Expected at: ${targetPath}`);
    }

    console.log("------------------------------------------------");
    console.log("🏁 SENTINEL AUDIT COMPLETE.");
}

runTierZeroAudit();
