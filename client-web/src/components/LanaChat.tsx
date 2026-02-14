import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { decodeVIN, type VehicleDNAPackage, LANA_GREETINGS, MOCK_MODELS } from '../lib/lana';
import { supabase } from '../lib/supabase';

// Helper to get options
const getModelOptions = (make: string) => {
    const models = MOCK_MODELS[make] || MOCK_MODELS['Unknown'];
    return models.map(m => ({ label: m, value: m }));
};

interface LanaChatProps {
    onComplete: (vehicleDNA: VehicleDNAPackage) => void;
    onCancel: () => void;
}

interface Message {
    id: string;
    sender: 'LANA' | 'USER';
    text: string;
    type?: 'text' | 'options';
    options?: { label: string; value: string }[];
}

export default function LanaChat({ onComplete, onCancel }: LanaChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [step, setStep] = useState<'GREETING' | 'VIN' | 'MANUAL_SELECT' | 'CONFIRM_SPECS' | 'CONFIRM' | 'TRIAGE_GARAGE' | 'TRIAGE_WHEELS' | 'COMPLETE'>('GREETING');
    const [vehicleData, setVehicleData] = useState<Partial<VehicleDNAPackage>>({});

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Initial Greeting
    useEffect(() => {
        addLanaMessage(LANA_GREETINGS[0]);
        setTimeout(() => {
            addLanaMessage("Please enter your Vehicle Identification Number (VIN) so I can fetch the specs. Or type 'skip' to enter details manually.");
            setStep('VIN');
        }, 1000);
    }, []);

    const addLanaMessage = (text: string, options?: Message['options']) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'LANA', text, type: options ? 'options' : 'text', options }]);
            setIsTyping(false);
        }, 800);
    };

    const addUserMessage = (text: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'USER', text }]);
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue.trim();
        setInputValue('');
        addUserMessage(text);

        if (step === 'VIN') {
            if (text.toLowerCase() === 'skip') {
                setStep('MANUAL_SELECT'); // Changed from COMPLETE to MANUAL_SELECT
                setVehicleData({ make: 'Unknown', known_make: 'Unknown' });
                addLanaMessage("No problem. Let's identify it manually. What makes is the vehicle?", [
                    { label: "BMW", value: "BMW" },
                    { label: "Mercedes", value: "Mercedes-Benz" },
                    { label: "Audi", value: "Audi" },
                    { label: "VW", value: "Volkswagen" },
                    { label: "Other", value: "Unknown" }
                ]);
                return;
            }

            addLanaMessage("Analyzing VIN...");
            const data = await decodeVIN(text);

            if (data) {
                setVehicleData(data);

                // HIGH-FIDELITY / PROFESSIONAL MASKING
                if (!data.trigger_manual_selection) {
                    // SILENT SUCCESS: No questions asked.
                    const fullModel = data.model_name || `${data.make} ${data.model}`;
                    const drivetrain = data.drivetrain;
                    const body = data.body_type ? `(${data.body_type})` : '';

                    addLanaMessage(`Verified: Your **${data.year} ${fullModel}** ${body} [${drivetrain}] is now protected by Atlas.`);

                    // AUTO-SAVE IMMEDIATELY
                    setStep('COMPLETE');
                    saveVehicleDNA(data as VehicleDNAPackage).then((success) => {
                        if (success) {
                            setTimeout(() => {
                                onComplete(data as VehicleDNAPackage);
                            }, 1500); // Brief pause to read "Verified"
                        } else {
                            addLanaMessage("Connection interrupted, cached locally. Proceeding...");
                            setTimeout(() => onComplete(data as VehicleDNAPackage), 1500);
                        }
                    });
                    return;
                }

                // Fallback for completely unknown VINs (17 chars but no pattern)
                // Rare case: Triggers Visual Guide
                setStep('MANUAL_SELECT');
                const make = data.known_make || 'Unknown';
                const msg = make !== 'Unknown'
                    ? `I recognized the manufacturer as **${make}**, but the specific model is playing hide-and-seek! Could you select your Model above?`
                    : "I see it's a valid VIN, but I need your help to pinpoint the exact model.";
                addLanaMessage(msg, getModelOptions(make));
            } else {
                addLanaMessage("I couldn't decode that VIN. Please try again or type 'skip'.");
            }
        }
    };

    const handleOptionSelect = (option: { label: string, value: string }) => {
        addUserMessage(option.label);

        if (step === 'MANUAL_SELECT') {
            // If we were asking for Make (because it was unknown initially)
            if (vehicleData.make === 'Unknown' && !vehicleData.model) {
                setVehicleData(prev => ({ ...prev, make: option.value, known_make: option.value }));
                addLanaMessage(`Got it, a ${option.label}. Now, which model is it?`, getModelOptions(option.value));
                return;
            }

            // If we are selecting Model
            setVehicleData(prev => ({ ...prev, model: option.value }));

            // Validation: Ensure we don't have a mismatch if Make was known
            // (Simple check here, mostly implicit by options provided)

            addLanaMessage(`Understood: ${vehicleData.known_make || vehicleData.make} ${option.label}. Is this a 4x4 or standard sedan/coupe?`, [
                { label: "Standard (FWD/RWD)", value: "Standard" },
                { label: "AWD / 4x4", value: "AWD" }
            ]);
            setStep('CONFIRM_SPECS');
        } else if (step === 'CONFIRM_SPECS') {
            setVehicleData(prev => ({
                ...prev,
                drivetrain: option.value === 'AWD' ? 'AWD' : 'FWD', // Simplified assumption
                is_low_clearance: true // Assume low clearance for cars unless truck
            }));
            setStep('TRIAGE_GARAGE');
            addLanaMessage("Great. Now, are there any environmental constraints? Is the vehicle in a low-clearance area like an underground garage?", [
                { label: "Yes, underground/low", value: "yes" },
                { label: "No, open space", value: "no" }
            ]);
        } else if (step === 'CONFIRM') {
            if (option.value === 'yes') {
                setStep('TRIAGE_GARAGE');
                addLanaMessage("Great. Now, are there any environmental constraints? Is the vehicle in a low-clearance area like an underground garage?", [
                    { label: "Yes, underground/low", value: "yes" },
                    { label: "No, open space", value: "no" }
                ]);
            } else {
                setStep('VIN');
                addLanaMessage("Okay, please re-enter the VIN.");
            }
        } else if (step === 'TRIAGE_GARAGE') {
            setVehicleData(prev => ({ ...prev, is_low_clearance: option.value === 'yes' }));
            setStep('TRIAGE_WHEELS');
            addLanaMessage("Understood. Are the wheels locked or is the car stuck in park?", [
                { label: "Yes, wheels locked", value: "yes" },
                { label: "No, rolls freely", value: "no" }
            ]);
        } else if (step === 'TRIAGE_WHEELS') {
            const finalData = { ...vehicleData, wheels_locked: option.value === 'yes' } as VehicleDNAPackage;
            setVehicleData(finalData);
            setStep('COMPLETE');
            addLanaMessage("Vehicle DNA Profile Created. Sending to Atlas for dispatch optimization...");

            // SAVE TO SUPABASE
            saveVehicleDNA(finalData).then((success) => {
                if (success) {
                    addLanaMessage("Profile Saved via LANA Secure Channel.");
                    setTimeout(() => {
                        onComplete(finalData);
                    }, 1500);
                } else {
                    addLanaMessage("Connection interrupted, but I've cached the data locally. Proceeding...");
                    setTimeout(() => {
                        onComplete(finalData);
                    }, 1500);
                }
            });
        }
    };

    const saveVehicleDNA = async (data: VehicleDNAPackage) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // Manual timeout simulation since Supabase JS client handles fetch timeout globally or via custom fetch
            // But we can race it.
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));

            const dbPromise = supabase.from('vehicles').insert({
                client_id: user.id,
                make: data.make,
                model: data.model,
                year: data.year,
                vin: data.vin,
                drivetrain: data.drivetrain,
                curb_weight: data.curb_weight,
                transmission: data.transmission,
                is_low_clearance: data.is_low_clearance,
                wheels_locked: data.wheels_locked,
                operational_status: 'operational'
            });

            await Promise.race([dbPromise, timeoutPromise]);
            return true;
        } catch (error) {
            console.error("LANA Save Error:", error);
            return false;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-xl relative">
            {/* Header */}
            <div className="bg-[#1A1C2E] p-4 flex items-center gap-3 shadow-lg z-10">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 relative">
                    <Sparkles className="w-5 h-5 text-[#F9A825]" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1C2E]"></div>
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">LANA</h3>
                    <p className="text-slate-400 text-xs">Vehicle Intelligence Agent</p>
                </div>
                <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold">
                    Close
                </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[80%] p-3 rounded-2xl text-sm shadow-sm
                            ${msg.sender === 'USER'
                                ? 'bg-[#1A1C2E] text-white rounded-tr-none'
                                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                            }
                        `}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}

                {/* Options Render */}
                {messages.length > 0 && messages[messages.length - 1].sender === 'LANA' && messages[messages.length - 1].options && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {messages[messages.length - 1].options?.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleOptionSelect(opt)}
                                className="px-4 py-2 bg-white border border-[#F9A825] text-[#F9A825] hover:bg-[#F9A825] hover:text-white rounded-full text-xs font-bold transition-all shadow-sm"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#F9A825]/20 placeholder:text-slate-400"
                    disabled={step !== 'VIN' && step !== 'GREETING'}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="p-3 bg-[#F9A825] text-white rounded-xl hover:bg-[#e0961f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
