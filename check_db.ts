
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data: constraints, error: cError } = await supabase
        .rpc('get_constraints', {}) // Assuming this doesn't exist, I need raw SQL access via rpc or just check table data
    // Can't run arbitrary SQL via client usually.

    // Check for ANY application
    const { data: apps, error } = await supabase
        .from('driver_applications')
        .select('*')

    console.log('Apps found:', apps?.length)
    if (apps) {
        apps.forEach(app => {
            console.log(`ID: ${app.id}, Email: ${app.email}, Phone: ${app.phone}, Plate: ${app.tow_truck_registration_plate}, Status: ${app.status}`)
        })
    }

    // Check specific email
    const { data: specific } = await supabase
        .from('driver_applications')
        .select('*')
        .eq('email', 'warrenmifsud@gmail.com')

    console.log('Specific email found:', specific?.length)
}

check()
