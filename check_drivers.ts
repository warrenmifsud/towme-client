import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDrivers() {
    console.log('Checking driver_status table...');
    const { data, error } = await supabase
        .from('driver_status')
        .select(`
            driver_id,
            is_online,
            location,
            profiles:driver_id (full_name)
        `);

    if (error) {
        console.error('Database Error:', error);
        return;
    }

    console.log('Driver Data Found:', JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
        data.forEach((d: any) => {
            console.log(`Driver ID: ${d.driver_id}`);
            console.log(`Is Online: ${d.is_online}`);
            console.log(`Location Type: ${typeof d.location}`);
            console.log(`Location Value:`, d.location);
            console.log(`Profile Name: ${d.profiles?.full_name}`);
        });
    } else {
        console.log('No rows found in driver_status.');
    }
}

checkDrivers();
