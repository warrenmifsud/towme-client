
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDrivers() {
    const { data, error } = await supabase.from('driver_status').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log('Driver Status Rows:', data);
    }
}

checkDrivers();
