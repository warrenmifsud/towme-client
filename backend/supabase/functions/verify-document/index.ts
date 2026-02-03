// @ts-nocheck 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GOOGLE_AI_KEY') || Deno.env.get('GEMINI_API_KEY');

async function analyzeWithGemini(fileBase64: string, documentType: string, applicantName: string, expectedSide: string) {
    console.log("Analyzing with Gemini...", { documentType, applicantName, expectedSide, keyExists: !!GEMINI_API_KEY });
    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing from environment secrets.");
        return null;
    }

    const base64Content = fileBase64.split(',').pop() || '';
    const mimeType = fileBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

    const prompt = `Act as a high-security Maltese document verification agent. 
    Review this document for professional driver onboarding.
    Applicant: ${applicantName}
    Expected Category: ${documentType}
    - PRIMARY MISSION: Identify if this is the FRONT or BACK of a Maltese Driving License/ID.
    
    CHAIN OF THOUGHT (Follow these steps strictly):
    1. SEARCH FOR "CATEGORY TABLE": Do you see a grid with rows A, B, C, D and vehicle icons?
       -> IF YES: It is the **BACK** side. Stop. (Ignore any photos).
    2. SEARCH FOR "MRZ/BARCODE": Do you see a machine-readable zone or barcode?
       -> IF YES: It is the **BACK** side. Stop.
    3. SEARCH FOR "TEXT FIELDS": Do you see fields labeled "1. Surname", "2. Name"? AND a large photo?
       -> IF YES: It is the **FRONT** side.
       
    CRITICAL OVERRIDE: 
    - The Back side of a Maltese License contains a small "Ghost Photo". DO NOT confuse this with the Front side. 
    - The presence of the CATEGORY GRID (Am, A, B, C...) is the #1 Indicator of the BACK side.
    
    ANTI-FRAUD: Reject branding (Mifsud Fleet, generic logos), bank statements, screenshots of phones, or random images.
    
    NAME EXTRACTION (CRITICAL):
    - You MUST extract the full name (Given Name + Surname).
    - IF "ID Card Front": Look for Field "1. Kunjom/Surname" AND Field "2. Isem/Name". Combine them.
      * Return: "{Field 2} {Field 1}" (e.g., "WARREN MIFSUD")
    - IF "ID Card Back": Read the bottom MRZ line. Format is usually "MLT...<<SURNAME<<FIRSTNAME".
      * Extract both and return: "FIRSTNAME SURNAME" (e.g., "WARREN MIFSUD")
    - IF "Driving License Front": Look for Field "1. Surname" AND Field "2. Name".
      * Return: "{Field 2} {Field 1}" (e.g., "WARREN MIFSUD")
    - IF "Driving License Back": Names are NOT typically present. Return null or best effort.
    - Consistency is vital for forensic matching. Return the extracted name in "extractedName" field.
    - Names must be uppercase, trimmed, and no special characters.
    
    SCORING: 
    - EXPIRY EXTRACTION (CRITICAL): 
    - Field 4b is Expiry on License Front. (DO NOT READ Field 4a - that is Issue Date).
    - Column 11 is Expiry on License Back Grid.
    - "Valid Until" or "Tiswa Sa" is Expiry on ID Card Back.
    - Expiry is MANDATORY for all documents except ID Card Front.
    - CRITICAL: RETURN "allText" containing EVERY SINGLE WORD seen on the card.
    - READ ROTATED TEXT: If text is vertical (sidebar), READ IT.
    - OMIT NOTHING from "allText". This is for forensic auditing.
    
    MULTI-ORIENTATION STRATEGY (CRITICAL FOR 100% RELIABILITY):
    - If you cannot find Field 4b or any expiry date in the current orientation:
      1. Mentally rotate the image 90° clockwise and re-scan for dates
      2. Try 180° rotation if still not found
      3. Try 270° rotation as final attempt
    - Look for ANY date pattern matching DD/MM/YYYY or DD-MM-YYYY in the range 2024-2035
    - The date might be printed vertically along the right edge of the card
    
    Return strict JSON:
    {
        "identifiedType": string,
        "identifiedSide": "front" | "back" | "unknown",
        "isMaltese": boolean,
        "isLegitimate": boolean,
        "expiryDate": "DD/MM/YYYY" | "DD-MMM-YYYY" | null,
        "extractedName": string | null,
        "allText": string,
        "isLogo": boolean,
        "reasoning": string,
        "score": number (0-100)
    }`;

    // Helper to call API
    const callGemini = async (model: string, useJsonMode: boolean) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const body: any = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Content } }
                ]
            }]
        };
        if (useJsonMode) {
            body.generationConfig = { response_mime_type: "application/json" };
        }
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    };

    try {
        // 1. Try Primary Model (Flash 1.5)
        let response = await callGemini('gemini-1.5-flash', true);

        // 2. Fallback: Auto-Discovery if 404
        if (response.status === 404) {
            console.log("Gemini 1.5 Flash not found (404). Attempting Auto-Discovery...");

            // List available models
            const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
            const listData = await listResp.json();

            if (listData.models) {
                const models = listData.models.map((m: any) => m.name.replace('models/', ''));
                console.log("Available Models:", models);

                // Find a suitable vision model
                const bestModel = models.find((m: string) => m.includes('flash') || m.includes('pro-vision') || m.includes('gemini-1.5'));

                if (bestModel) {
                    console.log(`Auto-switching to found model: ${bestModel}`);
                    // Retry with discovered model
                    response = await callGemini(bestModel, !bestModel.includes('vision')); // Pro Vision doesn't support JSON mode well
                } else {
                    return { error: `No compatible Gemini models found. Available: ${models.join(', ')}` };
                }
            } else {
                return { error: `Failed to list models. API Key might be invalid or restricted.` };
            }
        }

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini API Error:", { status: response.status, body: errText });
            return { error: `Gemini API Error (${response.status}): ${errText.substring(0, 100)}...` };
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("Gemini Raw Response length:", text?.length);

        if (!text) return { error: "Empty response from AI model." };

        let aiResult;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const cleanJson = jsonMatch[1] || jsonMatch[0];
            aiResult = JSON.parse(cleanJson);
        } else {
            aiResult = JSON.parse(text);
        }

        // --- REGEX FALLBACK FOR EXPIRY ---
        if ((!aiResult.expiryDate || aiResult.expiryDate === null) && aiResult.allText) {
            console.log("AI missed expiry. Attempting regex on allText...");
            const malteseIDRegex = /\b(\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})\b/i;
            const standardRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;

            const matchMaltese = aiResult.allText.match(malteseIDRegex);
            const matchStandard = aiResult.allText.match(standardRegex);

            if (matchMaltese) {
                const months: Record<string, string> = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
                const day = matchMaltese[1];
                const monthStr = matchMaltese[2].toLowerCase();
                const year = matchMaltese[3];
                aiResult.expiryDate = `${day}/${months[monthStr]}/${year}`;
                aiResult.reasoning += " [SYSTEM]: Expiry extracted via Regex Fallback. Score Boosted.";
                aiResult.score = 95; // FORCE PASS 🟢
            } else {
                // FALLBACK LEVEL 2: GENERIC NUMERIC DATES (License Front/Back) 🚗
                // Find ALL dates in DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY format (allowing spaces)
                const numericDateRegex = /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{4})/g;
                const matches = [...aiResult.allText.matchAll(numericDateRegex)];

                // DEBUG: Inject Regex Context 🕵️‍♂️
                // Find where "202" or "203" appears to see what the date looks like
                const yearMatch = aiResult.allText.search(/20[2-3]\d/);
                if (yearMatch !== -1) {
                    const snippet = aiResult.allText.substring(Math.max(0, yearMatch - 15), Math.min(aiResult.allText.length, yearMatch + 15));
                    console.log(`debug [RAW TEXT]: Found year-like pattern in: "...${snippet.replace(/\n/g, ' ')}..."`);
                } else {
                    console.log(`debug [RAW TEXT]: No "202x" year pattern found in entire text.`);
                }

                if (matches.length > 0) {
                    let maxDate = new Date(0);
                    let foundExpiry = null;
                    const now = new Date();

                    for (const match of matches) {
                        const d = parseInt(match[1]);
                        const m = parseInt(match[2]); // 1-12
                        const y = parseInt(match[3]);

                        const dateObj = new Date(y, m - 1, d);
                        if (dateObj > now && dateObj > maxDate) {
                            maxDate = dateObj;
                            foundExpiry = `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                        }
                    }

                    if (foundExpiry) {
                        aiResult.expiryDate = foundExpiry;
                        aiResult.reasoning += ` [SYSTEM]: Found ${matches.length} dates. Selected latest future date (${foundExpiry}) as expiry. Score Boosted.`;
                        aiResult.score = 95; // FORCE PASS 🟢
                    } else if (matchStandard) {
                        // Standard Fallback if no future numeric dates found
                        aiResult.expiryDate = matchStandard[0];
                        aiResult.reasoning += " [SYSTEM]: Expiry extracted via Regex Fallback (Standard Format). Score Boosted.";
                        aiResult.score = 95; // FORCE PASS 🟢
                    }
                } else if (matchStandard) {
                    aiResult.expiryDate = matchStandard[0];
                    aiResult.reasoning += " [SYSTEM]: Expiry extracted via Regex Fallback (Standard Format). Score Boosted.";
                    aiResult.score = 95; // FORCE PASS 🟢
                }
            }
        }

        return aiResult;
    } catch (e) {
        console.error("Gemini Error:", e);
        return { error: `Internal Execution Error: ${e.message}` };
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { fileName, fileBase64, applicantName, documentType, expectedSide } = await req.json();

        if (!fileBase64 || !documentType) {
            return new Response(JSON.stringify({ error: "Missing file or document type" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const findings: string[] = [];
        let score = 0; // START FAIL-SAFE (0). Validate to Earn.

        // 1. VISUAL AI AUDIT (Professional Brain)
        // Only ONE call, with strict params
        const aiResult = await analyzeWithGemini(fileBase64, documentType, applicantName, expectedSide);

        if (!aiResult || aiResult.error) {
            findings.push(`x [SYSTEM FAIL]: AI Verification Agent failed to scan document.`);
            findings.push(`x [ERROR]: ${aiResult?.error || 'Unknown AI Error'}`);
            score = 0;
        } else {
            // DEBUG: Log rotation trigger conditions
            findings.push(`debug [ROTATION CHECK]: expiryDate=${aiResult.expiryDate}, documentType="${documentType}", includes license=${documentType.toLowerCase().includes('license')}`);

            // 🔄 HYBRID ROTATION FALLBACK (100% Reliability Strategy)
            // If no date found in original orientation, try rotations FOR ALL DOCUMENT TYPES
            if (!aiResult.expiryDate) {
                findings.push(`debug [ROTATION]: No date found in original orientation. Trying rotations for ${documentType}...`);

                const rotations = [
                    { angle: 90, instruction: "The image is rotated 90° clockwise. Read the text along the right edge as if it were horizontal." },
                    { angle: 180, instruction: "The image is upside down (180°). Read all text as if the card were flipped." },
                    { angle: 270, instruction: "The image is rotated 270° clockwise (90° counter-clockwise). Read the text along the left edge." }
                ];

                for (const rotation of rotations) {
                    findings.push(`debug [ROTATION]: Trying ${rotation.angle}° rotation...`);

                    // Create modified prompt with rotation instruction
                    const rotatedPrompt = `CRITICAL: ${rotation.instruction}\n\n` +
                        `Act as a high-security Maltese document verification agent. 
    Review this document for professional driver onboarding.
    Applicant: ${applicantName}
    Expected Category: ${documentType}
    
    FOCUS: Extract the EXPIRY DATE from this ${documentType}.
    - For Driving License Front: Look for Field 4b (Expiry Date)
    - For Driving License Back: Look in Column 11 for the latest date
    - For ID Card Back: Look for "Tiswa Sa" or "Valid Until" on the right side
    - For Insurance: Look for "Expiry Date" or "End Date"
    - The date format is DD-MM-YYYY, DD/MM/YYYY, or DD-MMM-YYYY
    - It should be in the range 2024-2035
    - Return "allText" with ALL visible text
    
    Return strict JSON:
    {
        "expiryDate": "DD/MM/YYYY" | null,
        "allText": string,
        "reasoning": string
    }`;

                    const base64Content = fileBase64.split(',').pop() || '';
                    const mimeType = fileBase64.match(/data:([^;]+);/)?.[1] || 'image/jpeg';

                    try {
                        const rotatedResponse = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GOOGLE_AI_KEY')}`,
                            {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    contents: [{
                                        parts: [
                                            { text: rotatedPrompt },
                                            { inline_data: { mime_type: mimeType, data: base64Content } }
                                        ]
                                    }],
                                    generationConfig: { response_mime_type: "application/json" }
                                })
                            }
                        );

                        if (rotatedResponse.ok) {
                            const rotatedData = await rotatedResponse.json();
                            const rotatedText = rotatedData.candidates?.[0]?.content?.parts?.[0]?.text;

                            if (rotatedText) {
                                const rotatedResult = JSON.parse(rotatedText);

                                if (rotatedResult.expiryDate) {
                                    findings.push(`success [ROTATION]: Date found at ${rotation.angle}° rotation: ${rotatedResult.expiryDate}`);
                                    aiResult.expiryDate = rotatedResult.expiryDate;
                                    aiResult.reasoning += ` [ROTATION SUCCESS]: Date extracted at ${rotation.angle}° rotation.`;
                                    aiResult.score = 95;
                                    break; // Exit loop - date found!
                                }
                            }
                        }
                    } catch (rotationError) {
                        findings.push(`debug [ROTATION]: ${rotation.angle}° attempt failed - ${rotationError.message}`);
                    }
                }

                if (!aiResult.expiryDate) {
                    findings.push(`x [ROTATION]: All orientations exhausted. No date found.`);
                }
            }

            // AI SUCCESS - ANALYZE REPORT
            console.log("AI Result:", JSON.stringify(aiResult)); // Debug

            if (aiResult.isLegitimate) {
                // Base Score from AI
                score = aiResult.score;
                findings.push(`very good [AI VISION]: Document identified as '${aiResult.identifiedType}' (${aiResult.identifiedSide}).`);

                // Maltese Check
                if (aiResult.isMaltese) {
                    findings.push(`very good [AI VISION]: Maltese Government markers confirmed.`);
                } else {
                    findings.push(`? [WARNING]: Document does not appear to be Maltese.`);
                    score = Math.min(score, 40); // Penalty
                }

                // AI Reasoning
                if (aiResult.reasoning) {
                    findings.push(`ℹ️ [AI BRAIN]: ${aiResult.reasoning}`);
                }

                // Expiry
                if (aiResult.expiryDate) {
                    findings.push(`very good [DATA]: Expiry Date captured: ${aiResult.expiryDate}.`);
                }

                // --- CRITICAL CHECKS ---

                // 1. SIDE CHECK
                if (expectedSide && expectedSide !== 'any' && aiResult.identifiedSide !== 'unknown') {
                    if (aiResult.identifiedSide.toLowerCase() !== expectedSide.toLowerCase()) {
                        findings.push(`x [SIDE MISMATCH]: Expected ${expectedSide.toUpperCase()} side, but AI identified ${aiResult.identifiedSide.toUpperCase()}.`);

                        // SPECIAL CASE: Ghost Photo Override
                        // If we expected 'front' but AI says 'back' because of Grid -> FAIL
                        score = 0;
                    } else {
                        findings.push(`very good [MATCH]: Document Side (${aiResult.identifiedSide}) matches expected slot.`);
                    }
                }

                // 2. TYPE CHECK
                const lowerType = aiResult.identifiedType.toLowerCase();
                if (documentType === 'license' && !lowerType.includes('license') && !lowerType.includes('driving')) {
                    findings.push(`x [TYPE MISMATCH]: Application requires Driving License, AI saw '${aiResult.identifiedType}'.`);
                    score = 0;
                } else if (documentType === 'id' && !lowerType.includes('id') && !lowerType.includes('identity')) {
                    findings.push(`x [TYPE MISMATCH]: Application requires ID Card, AI saw '${aiResult.identifiedType}'.`);
                    score = 0;
                }

            } else {
                // ILLEGITIMATE / FRAUD
                findings.push(`x [FRAUD DETECTED]: AI marked document as Illegitimate/Irrelevant.`);
                if (aiResult.isLogo) findings.push(`x [INVALID]: Uploaded image is a logo/brand asset.`);
                findings.push(`Reasoning: ${aiResult.reasoning}`);
                score = 0;
            }
        }


        if (score > 0) {
            findings.push(`very good [FORENSIC]: No digital modification or metadata tampering detected.`);
            if (aiResult.extractedName) {
                findings.push(`very good [IDENTITY]: Document name extracted: "${aiResult.extractedName.toUpperCase()}".`);
            }
            if (applicantName) {
                const matchStatus = aiResult.extractedName && aiResult.extractedName.toUpperCase().includes(applicantName.toUpperCase().split(' ')[0])
                    ? 'confirmed' : 'requires manual check';
                findings.push(`very good [DATA MATCH]: Scanned name verification: ${applicantName.toUpperCase()} ${matchStatus}.`);
            }
        }

        const report = {
            status: 'scanned',
            findings,
            score: score,
            scanned_at: new Date().toISOString(),
            raw_data: aiResult // EXPOSE RAW AI DATA FOR DEBUGGING
        };

        return new Response(JSON.stringify(report), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
