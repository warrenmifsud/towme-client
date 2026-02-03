
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

async function testDispatch() {
    console.log("🧪 Starting Manual Dispatch Test...");

    // 1. Create a Fake Pending Request
    // Uses MALTA Center coordinates
    const testLat = 35.8989;
    const testLng = 14.5146;

    console.log("📍 Creating Test Request at:", testLat, testLng);

    const { data: request, error: createError } = await supabase
        .from('towing_requests')
        .insert({
            pickup_lat: testLat,
            pickup_long: testLng,
            pickup_location: `POINT(${testLng} ${testLat})`,
            status: 'pending',
            category_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Random uuid, dispatch ignores it now?
            // Need a valid category ID? Probably not if we removed the check. 
            // But let's try to get one.
        })
        .select()
        .single();

    // If insert fails due to constraints, we might need minimal valid data
    if (createError) {
        // Try to fetch a category first
        const { data: cat } = await supabase.from('service_categories').select('id').limit(1).single();
        if (cat) {
            const { data: request2, error: createError2 } = await supabase
                .from('towing_requests')
                .insert({
                    pickup_lat: testLat,
                    pickup_long: testLng,
                    pickup_location: `POINT(${testLng} ${testLat})`,
                    status: 'pending',
                    category_id: cat.id
                })
                .select()
                .single();

            if (createError2) {
                console.error("❌ Link Failed:", createError2);
                return;
            }
            runDispatch(request2);
        } else {
            console.error("❌ Create Failed (No Categories?):", createError);
        }
    } else {
        runDispatch(request);
    }
}

async function runDispatch(request) {
    console.log(`✅ Request Created: ${request.id}`);

    // 2. Check Online Drivers (Are there any?)
    const { data: drivers } = await supabase.from('driver_status').select('driver_id, is_online, last_lat, last_lng').eq('is_online', true);
    console.log(`🏎️  Online Drivers: ${drivers?.length || 0}`);
    if (drivers) {
        drivers.forEach(d => console.log(`   - Driver: ${d.driver_id} @ ${d.last_lat},${d.last_lng}`));
    }

    // 3. Trigger Dispatch
    console.log("🚀 Running dispatch_job...");
    const { data: result, error: rpcError } = await supabase.rpc('dispatch_job', { p_request_id: request.id });

    if (rpcError) console.error("❌ RPC Failed:", rpcError);
    else console.log("🏁 RPC Result:", result);

    // cleanup
    // await supabase.from('towing_requests').delete().eq('id', request.id);
}

testDispatch();
