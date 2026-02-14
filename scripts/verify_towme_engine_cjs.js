
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from admin-web
dotenv.config({ path: path.resolve(__dirname, '../admin-web/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying Schema Expansion...');

    // 1. Check Fleets
    const { data: fleets, error: fleetsError } = await supabase.from('fleets').select('id').limit(1);
    if (fleetsError && fleetsError.code === '42P01') { // undefined_table
        console.error('❌ Table "fleets" does NOT exist.');
    } else {
        console.log('✅ Table "fleets" exists (or access denied, but table recognized).');
    }

    // 2. Check Fleet Assets
    const { data: assets, error: assetsError } = await supabase.from('fleet_assets').select('id').limit(1);
    if (assetsError && assetsError.code === '42P01') {
        console.error('❌ Table "fleet_assets" does NOT exist.');
    } else {
        console.log('✅ Table "fleet_assets" exists.');
    }

    // 3. Check Driver Status Columns (by trying to select them)
    const { error: dsError } = await supabase.from('driver_status').select('partner_commission_rate, hourly_rate').limit(1);
    if (dsError) {
        console.error('❌ Columns in "driver_status" might be missing:', dsError.message);
    } else {
        console.log('✅ Columns in "driver_status" exist.');
    }
}

verify();
