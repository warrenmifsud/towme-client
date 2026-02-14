
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://letjcjqppyxzqfthdqul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', 'warrenmifsud@gmail.com');

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profile Role Check:', data);
    }
}

listProfiles();
