
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load Environment (Simpler path resolution)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL: Missing Supabase Environment Variables.");
    // Don't exit hard, allows checking if code is correct even if env is missing (though audit fails)
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function runSecurityAudit() {
    console.log("\n🛡️  SECURITY NEXUS: PHASE 60 AUDIT...");
    console.log("------------------------------------------------");

    // 1. Check Table Existence (admin_audit_logs)
    process.stdout.write("🗄️  Schema: admin_audit_logs... ");
    if (!supabaseUrl) {
        console.log("⚠️  SKIPPED (No Env)");
    } else {
        const { error } = await supabase.from('admin_audit_logs').select('id').limit(1);

        if (error) {
            if (error.code === '42P01') { // Undefined table
                console.log("❌ FAILED (Table Missing - Migration Pending)");
            } else {
                console.log(`❌ ERROR: ${error.message}`);
            }
        } else {
            console.log("✅ LIVE (Table Exists)");
        }
    }

    console.log("------------------------------------------------");
    console.log("🏁 AUDIT COMPLETE.");
}

runSecurityAudit();
