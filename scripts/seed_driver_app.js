
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../admin-web/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSeed() {
    const { count } = await supabase.from('driver_applications').select('*', { count: 'exact', head: true });

    console.log(`Found ${count} driver applications.`);

    if (count === 0) {
        console.log('Seeding mock application...');
        const { error } = await supabase.from('driver_applications').insert({
            company_name: 'Mock Towing Ltd',
            owner_name: 'Mario Rossi',
            email: 'mario@mock.com',
            phone: '+356 99123456',
            address: '123, Triq ir-Repubblika, Valletta',
            vat_number: 'MT12345678',
            tow_truck_registration_plate: 'ABC 123',
            tow_truck_make: 'Iveco',
            tow_truck_model: 'Daily',
            tow_truck_year: '2020',
            tow_truck_color: 'White',
            tow_truck_types: ['Flatbed'],
            services_offered: ['Towing'],
            status: 'pending',
            application_type: 'single',
            driving_license_front_expiry: '2025-12-31'
        });
        if (error) console.error('Error seeding:', error);
        else console.log('Seeded successfully.');
    }
}

checkAndSeed();
