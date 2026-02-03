
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDispatch() {
    console.log("🔍 Starting Dispatch Debugger...");

    // 1. Get Last Request
    const { data: request, error: reqError } = await supabase
        .from('towing_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (reqError) {
        console.error("❌ Failed to get request:", reqError);
        return;
    }

    console.log(`\n📄 Request ID: ${request.id}`);
    console.log(`   Status: ${request.status}`);
    console.log(`   Pickup: ${request.pickup_lat}, ${request.pickup_long}`);
    console.log(`   Location(Geo): ${request.pickup_location}`);

    // 2. Check Online Drivers
    const { data: drivers, error: driverError } = await supabase
        .from('driver_status')
        .select('*')
        .eq('is_online', true);

    if (driverError) {
        console.error("❌ Failed to get drivers:", driverError);
        return;
    }

    console.log(`\n🏎️  Online Drivers Found: ${drivers.length}`);
    drivers.forEach(d => {
        console.log(`   - Driver ${d.driver_id.substring(0, 8)}... | Online: ${d.is_online} | Busy: ???`);
        console.log(`     LastLat: ${d.last_lat}, LastLng: ${d.last_lng}`);
        console.log(`     Location(Geo): ${d.location}`);

        // Manual Distance Check (Haversine approx)
        if (d.last_lat && request.pickup_lat) {
            const R = 6371; // km
            const dLat = (request.pickup_lat - d.last_lat) * Math.PI / 180;
            const dLon = (request.pickup_long - d.last_lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(d.last_lat * Math.PI / 180) * Math.cos(request.pickup_lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;
            console.log(`     📏 Distance: ${dist.toFixed(2)} km`);
        }
    });

    // 3. Dry Run Dispatch
    console.log("\n🚀 Triggering dispatch_job RPC...");
    const { data: dispatchResult, error: dispatchError } = await supabase.rpc('dispatch_job', { p_request_id: request.id });

    if (dispatchError) {
        console.error("❌ RPC Error:", dispatchError);
    } else {
        console.log("✅ RPC Result:", dispatchResult);
    }
}

debugDispatch();
