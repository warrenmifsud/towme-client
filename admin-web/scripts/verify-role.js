
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Use Service Role if available for admin checks, otherwise Anon (might differ in capabilities)
const client = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function verifyRole() {
    const email = 'warrenmifsud@gmail.com';
    console.log(`Verifying role for: ${email}`);

    // Check auth.users (requires service role usually, or check public profiles)
    // We will check public.profiles as that's what the app uses

    const { data: profiles, error } = await client
        .from('profiles')
        .select('email, role')
        .eq('email', email);

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (profiles && profiles.length > 0) {
        const user = profiles[0];
        console.log(`User Found: ${user.email}`);
        console.log(`Role: ${user.role}`);

        if (user.role === 'super_admin') {
            console.log('✅ VERIFICATION SUCCESS: User is Super Admin');
        } else {
            console.error('❌ VERIFICATION FAILED: User is NOT Super Admin');
        }
    } else {
        console.error('❌ User not found in profiles table');
    }
}

verifyRole();
