
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

async function checkDrivers() {
    console.log("🔍 Checking Online Drivers...");

    const { data: drivers, error } = await supabase
        .from('driver_status')
        .select('*')
        .eq('is_online', true);

    if (error) {
        console.error("❌ Error fetching drivers:", error);
    } else {
        console.log(`🏎️  Online Drivers Found: ${drivers.length}`);
        if (drivers.length === 0) {
            console.log("⚠️  NO DRIVERS ONLINE! Dispatch will fail.");
        }
        drivers.forEach(d => {
            console.log(`   - Driver ID: ${d.driver_id}`);
            console.log(`     Lat: ${d.last_lat}, Lng: ${d.last_lng}`);
            console.log(`     Location (Geo): ${d.location}`);
            console.log(`     Updated At: ${d.updated_at}`);

            // Check BUSY status
            supabase
                .from('towing_requests')
                .select('id, status')
                .eq('driver_id', d.driver_id)
                .in('status', ['dispatched', 'en_route', 'in_progress', 'accepted'])
                .then(({ data: activeJobs, error: jobError }) => {
                    if (jobError) console.error(`     ❌ Error checking busy status:`, jobError);
                    else {
                        if (activeJobs && activeJobs.length > 0) {
                            console.log(`     ⛔ BUSY: Driver has ${activeJobs.length} active jobs!`);
                            activeJobs.forEach(j => console.log(`        - Job: ${j.id} [${j.status}]`));
                        } else {
                            console.log(`     ✅ FREE: No active jobs found.`);

                            // Test RPC with driver's own coords
                            const lat = d.last_lat || 35.9;
                            const lng = d.last_lng || 14.5;
                            console.log(`     🧪 Probing DB for nearest driver to (${lat}, ${lng})...`);

                            supabase.rpc('get_available_driver', {
                                p_lat: lat,
                                p_lng: lng,
                                p_excluded_ids: []
                            }).then(({ data, error }) => {
                                if (error) console.error("     ❌ RPC Fail:", error);
                                else {
                                    console.log("     🏁 RPC Response:", data);
                                    if (data && data.length > 0) console.log("     🎉 FOUND DRIVER ID:", data[0].driver_id);
                                    else console.log("     💀 NO DRIVER FOUND!");
                                }
                            });
                        }
                    }
                });
        });
    }
}

checkDrivers();
