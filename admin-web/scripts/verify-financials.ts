
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config({ path: envPath });
}

// --- INITIALIZATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ RMC FATAL ERROR: Supabase Environment Variables Missing.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFinancialUnificationAudit() {
    console.log("\n🚀 FINANCIAL-UNIFICATION: PHASE 59 AUDIT...");
    console.log("------------------------------------------------");

    // --- ZONE A: CONFIG CHECK ---
    process.stdout.write("⚙️  ZONE A: Platform Configurator... ");
    const { data: config, error: configError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'financial_config')
        .single();

    if (configError) {
        console.log("❌ FAILED (Table Missing?)");
    } else {
        console.log(`✅ LINKED (Comm: ${config.value.commission_rate}%)`);
    }

    // --- ZONE C: LEDGER CHECK ---
    process.stdout.write("📜 ZONE C: Global Transaction History... ");
    // Check if columns exist by trying to select them
    const { data: ledger, error: ledgerError } = await supabase
        .from('financial_ledger')
        .select('id, job_id, commission_amount, net_amount');

    if (ledgerError) {
        console.log("❌ FAILED");
        console.log(`   Error: ${ledgerError.message}`);
    } else {
        console.log("✅ CONNECTED");
        if (ledger.length === 0) console.log("   (State: Zero-Simulation Active - Empty)");
    }

    // --- VISUAL STRUCUTRE CHECK ---
    process.stdout.write("🎨 VISUAL: 3-Zone Stack & Empty States... ");
    const targetPath = path.join(__dirname, '../src/modules/AdminV2/components/FinancialSettings.tsx');
    if (fs.existsSync(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf8');
        const hasZoneA = content.includes('Zone A: Platform Configurator');
        const hasZoneB = content.includes('Zone B: Payout Sentinel');
        const hasZoneC = content.includes('Zone C: Global Transaction History');
        const hasEmpty = content.includes('No Historical Records Found');

        if (hasZoneA && hasZoneB && hasZoneC && hasEmpty) {
            console.log("✅ VERIFIED (All Zones Present)");
        } else {
            console.log("⚠️  PARTIAL / MISSING ZONES");
            if (!hasZoneA) console.log("   Missing Zone A");
            if (!hasZoneB) console.log("   Missing Zone B");
            if (!hasZoneC) console.log("   Missing Zone C");
        }
    } else {
        console.log("❌ FILE NOT FOUND");
    }

    console.log("------------------------------------------------");
    console.log("🏁 UNIFICATION COMPLETE.");
}

runFinancialUnificationAudit();
