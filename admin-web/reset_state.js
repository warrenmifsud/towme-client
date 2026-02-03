
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../driver-web/.env');

let supabaseUrl = '';
let supabaseKey = '';

try {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key === 'VITE_SUPABASE_URL') supabaseUrl = value;
            if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
        }
    });
} catch (e) {
    console.error('Error reading .env:', e);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Could not find Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
    console.log('🧹 Cleaning up Map Artifacts...');

    // 1. Reset Drivers (Force Offline)
    const { error: driverError } = await supabase
        .from('driver_status')
        .update({ is_online: false })
        .neq('is_online', false); // Only update if true to save writes

    if (driverError) console.error('Driver Reset Error:', driverError);
    else console.log('✅ All Drivers set to Offline.');

    // 2. Cancel Stuck Jobs
    const { error: jobError } = await supabase
        .from('towing_requests')
        .update({ status: 'cancelled' })
        .in('status', ['pending', 'dispatched', 'en_route', 'accepted', 'in_progress', 'awaiting_payment']);

    if (jobError) console.error('Job Reset Error:', jobError);
    else console.log('✅ All Stuck Jobs Cancelled.');
}

reset();
