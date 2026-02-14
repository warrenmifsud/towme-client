import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Searching for test users...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .ilike('email', '%test%')
        .limit(5);

    if (error) {
        console.error("Error finding profiles:", error);
    } else {
        console.log("Found profiles:", profiles);
    }
}

main();
