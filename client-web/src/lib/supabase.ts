import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const projectRef = 'letjcjqppyxzqfthdqul'; // Mifsud Towing Project Ref

auth: {
    autoRefreshToken: true,
        persistSession: true,
            detectSessionInUrl: true,
                flowType: 'pkce',
    },
});
