
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from admin-web
dotenv.config({ path: path.resolve(__dirname, '../admin-web/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMapGuard() {
    console.log('🛡️  Testing Invisible Map Guard...');

    // Attempt to fetch unverified assets as Anon
    // The policy "Map view verified assets only" should filter out is_verified=false
    // So querying for is_verified=false should return 0 rows (or error if policy is restrictive, but likely 0 rows).

    const { data, error } = await supabase
        .from('fleet_assets')
        .select('*')
        .eq('is_verified', false);

    if (error) {
        console.error('❌ Error querying fleet_assets:', error);
    } else {
        if (data.length === 0) {
            console.log('✅ Invisible Map Guard Active: Anonymous client received 0 unverified assets.');
        } else {
            console.error('🚨 SECURITY BREACH: Anonymous client received unverified assets!', data);
            process.exit(1);
        }
    }
}

verifyMapGuard();
