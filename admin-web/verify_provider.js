import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://letjcjqppyxzqfthdqul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldGpjanFwcHl4enFmdGhkcXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjY5MTcsImV4cCI6MjA4NTI0MjkxN30.CZp5flGIrof23lDLyMfF3dymcbHGPIwAzHVWaziOdMg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching latest client...");
    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching clients:", error);
        return;
    }

    if (!clients || clients.length === 0) {
        console.error("No clients found.");
        return;
    }

    const client = clients[0];
    console.log(`Found client: ${client.email} (ID: ${client.id})`);
    console.log(`Current Provider: ${client.provider}`);

    console.log("Updating provider to 'google'...");
    const { error: updateError } = await supabase
        .from('clients')
        .update({ provider: 'google' })
        .eq('id', client.id);

    if (updateError) {
        console.error("Error updating provider:", updateError);
    } else {
        console.log("Successfully updated provider to 'google'.");
    }
}

run();
