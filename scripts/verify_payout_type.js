
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
    console.log('Verifying payout_type in driver_status...');

    // Try to select payout_type
    const { data, error } = await supabase
        .from('driver_status')
        .select('payout_type')
        .limit(1);

    if (error) {
        console.error('❌ Error selecting payout_type:', error.message);
        if (error.code === '42703') { // undefined_column
            console.error('   -> The column "payout_type" DOES NOT exist.');
        }
    } else {
        console.log('✅ Column "payout_type" exists.');
    }
}

verify();
