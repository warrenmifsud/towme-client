
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables from admin-web/.env file
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../admin-web/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log('Seeding dummy fleet asset...');

    // 1. Get or Create a Fleet
    const { data: fleet, error: fleetError } = await supabase
        .from('fleets')
        .select('id')
        .limit(1)
        .single();

    let fleetId = fleet?.id;

    if (!fleetId) {
        console.log("No fleet found, creating one...");
        // In a real scenario, we'd need a profile ID.
        // For now, let's try to find ANY profile to be the owner for this test.
        const { data: owner } = await supabase.from('profiles').select('id').limit(1).single();

        if (!owner) {
            console.error("No profiles found to own fleet. Cannot seed.");
            return;
        }

        const { data: newFleet, error: createError } = await supabase
            .from('fleets')
            .insert({ name: 'Test Fleet Alpha', owner_id: owner.id })
            .select()
            .single();

        if (createError) {
            console.error("Error creating fleet:", createError);
            return;
        }
        fleetId = newFleet.id;
    }

    // 2. Insert Asset
    const { error } = await supabase
        .from('fleet_assets')
        .insert({
            fleet_id: fleetId,
            make: 'Ford',
            model: 'F-450 Super Duty',
            license_plate: 'TEST-999',
            vin: '1FDOWTESTVIN12345',
            is_verified: false
        });

    if (error) {
        console.error('Error seeding asset:', error);
    } else {
        console.log('✅ Dummy Asset Seeded: TEST-999');
    }
}

seed();
