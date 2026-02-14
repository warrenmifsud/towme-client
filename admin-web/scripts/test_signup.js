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
    const email = `test.atomic.simple.${Date.now()}@gmail.com`;
    console.log("Trying to signup:", email);
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: "Password123!"
    });

    if (error) {
        console.error("Signup Failed:", error);
    } else {
        console.log("Signup Success:", data.user?.id);
    }
}

main();
