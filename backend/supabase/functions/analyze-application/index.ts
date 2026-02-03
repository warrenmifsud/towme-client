// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { application, apiKey } = await req.json();

        // 1. Initialize Agent Context
        const findings: string[] = [];
        let score = 100;
        let riskLevel = 'LOW';

        // 2. Data Completeness Check
        if (!application.business_summary || application.business_summary.length < 50) {
            findings.push("⚠️ Business summary is very short. Professional vendors usually provide more detail.");
            score -= 15;
        } else {
            findings.push("✅ Detailed business summary provided.");
        }

        if (application.email && application.email.endsWith('@gmail.com')) {
            findings.push("ℹ️ Using a generic Gmail address instead of a business domain.");
            score -= 5;
        } else {
            findings.push("✅ Professional email domain detected.");
        }

        // 3. Heuristic Analysis (Rule-Based AI)
        const allCaps = (str: string) => str === str.toUpperCase() && str.length > 5;
        if (allCaps(application.business_summary) || allCaps(application.shop_name)) {
            findings.push("⚠️ Text contains excessive capitalization (shouting).");
            score -= 10;
        }

        // 4. Location Verification (Google Maps)
        let locationData = null;
        if (application.shop_address && apiKey) {
            try {
                const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(application.shop_address)}&key=${apiKey}`);
                const geoData = await geoRes.json();

                if (geoData.status === 'OK' && geoData.results.length > 0) {
                    const result = geoData.results[0];
                    locationData = {
                        formatted_address: result.formatted_address,
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng,
                        location_type: result.geometry.location_type
                    };

                    if (result.geometry.location_type === 'ROOFTOP') {
                        findings.push("✅ Address verified: Exact building location found.");
                    } else if (result.geometry.location_type === 'RANGE_INTERPOLATED') {
                        findings.push("✅ Address verified: Street address logic is valid.");
                    } else {
                        findings.push(`⚠️ Address is imprecise (${result.geometry.location_type}). Try adding a street number.`);
                        score -= 10;
                    }
                } else {
                    findings.push("❌ Google Maps could not find this address.");
                    score -= 30;
                    riskLevel = 'HIGH';
                }
            } catch (e) {
                findings.push("⚠️ automated location check failed (API error).");
            }
        } else {
            findings.push("⚠️ No API Key provided for location check.");
        }

        // 5. Final Report Generation
        if (score < 60) riskLevel = 'HIGH';
        else if (score < 80) riskLevel = 'MEDIUM';

        const report = {
            analyzed_at: new Date().toISOString(),
            score,
            risk_level: riskLevel,
            findings,
            location_verified: !!locationData,
            location_data: locationData,
            raw_data_summary: `Analyzed ${Object.keys(application).length} fields`
        };

        return new Response(JSON.stringify(report), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
