import { createClient } from '@supabase/supabase-js';

// TEMPORARY: Hardcoding keys to bypass Vite environment loading issue
const supabaseUrl = 'https://letjcjqppyxzqfthdqul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

// if (!supabaseUrl || !supabaseKey || supabaseKey === 'your-anon-key') {
//    console.error('CRITICAL: Supabase API Keys are missing or invalid in .env!', { supabaseUrl, hasKey: !!supabaseKey });
// }

export const supabase = createClient(supabaseUrl, supabaseKey);
