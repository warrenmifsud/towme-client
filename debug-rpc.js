#!/usr/bin/env node

/**
 * RPC Debugger - Comprehensive diagnostic tool for Supabase RPC 404 errors
 * 
 * This script will:
 * 1. Test the RPC function directly via Supabase client
 * 2. Check function existence and permissions in the database
 * 3. Verify the exact error response from Supabase
 * 4. Test with different parameter combinations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from client-web/.env
dotenv.config({ path: join(__dirname, 'client-web', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 RPC Debugger - Starting Diagnostics\n');
console.log('='.repeat(80));

// Validate environment
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
    process.exit(1);
}

console.log('✅ Environment Configuration:');
console.log(`   Supabase URL: ${supabaseUrl}`);
console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
console.log('='.repeat(80) + '\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test coordinates (London area)
const testLat = 51.5074;
const testLng = -0.1278;

async function runDiagnostics() {
    console.log('📋 Test 1: Direct RPC Call with Default Parameters\n');

    try {
        const { data, error } = await supabase.rpc('get_nearest_online_drivers', {
            lat: testLat,
            lng: testLng,
            lim: 5
        });

        if (error) {
            console.error('❌ RPC Error:', error);
            console.error('   Code:', error.code);
            console.error('   Message:', error.message);
            console.error('   Details:', error.details);
            console.error('   Hint:', error.hint);
        } else {
            console.log('✅ RPC Success!');
            console.log('   Data:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Test 2: Verify Database Connection\n');

    try {
        const { data, error } = await supabase.from('service_categories').select('count');

        if (error) {
            console.error('❌ Cannot connect to database:', error.message);
        } else {
            console.log('✅ Database connection successful');
        }
    } catch (err) {
        console.log('⚠️  Database connection test failed:', err.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Test 3: Query Database Schema for Function\n');

    try {
        const { data, error } = await supabase
            .from('pg_proc')
            .select('*')
            .ilike('proname', 'get_nearest_online_drivers');

        if (error) {
            console.error('❌ Schema query error:', error.message);
        } else if (data && data.length > 0) {
            console.log('✅ Function found in pg_proc');
            console.log('   Count:', data.length);
        } else {
            console.log('⚠️  Function not found in pg_proc');
        }
    } catch (err) {
        console.log('⚠️  Cannot query pg_proc (RLS may be blocking)');
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Test 4: Test with Integer Parameter\n');

    try {
        const { data, error } = await supabase.rpc('get_nearest_online_drivers', {
            lat: testLat,
            lng: testLng,
            lim: 1  // Explicitly integer
        });

        if (error) {
            console.error('❌ RPC Error with integer:', error.message);
        } else {
            console.log('✅ RPC Success with integer parameter!');
            console.log('   Data:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('❌ Exception:', err.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Test 5: Raw HTTP Request to PostgREST\n');

    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/rpc/get_nearest_online_drivers`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    lat: testLat,
                    lng: testLng,
                    lim: 5
                })
            }
        );

        console.log('   HTTP Status:', response.status, response.statusText);
        console.log('   Headers:', Object.fromEntries(response.headers.entries()));

        const text = await response.text();
        console.log('   Response Body:', text);

        if (!response.ok) {
            console.error('❌ HTTP Error:', response.status);
        } else {
            console.log('✅ HTTP Request successful');
        }
    } catch (err) {
        console.error('❌ Fetch Exception:', err.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Test 6: List All Available RPC Functions\n');

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });

        const text = await response.text();

        // Look for RPC functions in the response
        if (text.includes('get_nearest_online_drivers')) {
            console.log('✅ Function is listed in API schema');
        } else {
            console.log('❌ Function NOT listed in API schema');
        }

        // Try to extract RPC endpoints
        const rpcMatches = text.match(/\/rpc\/\w+/g);
        if (rpcMatches) {
            console.log('   Available RPC endpoints:', [...new Set(rpcMatches)].slice(0, 10));
        }
    } catch (err) {
        console.error('❌ Schema fetch error:', err.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('📋 Summary & Recommendations\n');

    console.log('If you see 404 errors above, possible causes:');
    console.log('1. ⚠️  Function signature mismatch (parameter types)');
    console.log('2. ⚠️  Missing GRANT EXECUTE permissions');
    console.log('3. ⚠️  PostgREST cache not refreshed');
    console.log('4. ⚠️  Function in wrong schema (not public)');
    console.log('5. ⚠️  Database connection using wrong project');
    console.log('\nNext steps:');
    console.log('- Check the Supabase SQL Editor for the function definition');
    console.log('- Verify permissions with: SELECT * FROM information_schema.routine_privileges WHERE routine_name = \'get_nearest_online_drivers\';');
    console.log('- Try restarting the PostgREST server in Supabase dashboard');
    console.log('='.repeat(80));
}

runDiagnostics().catch(console.error);
