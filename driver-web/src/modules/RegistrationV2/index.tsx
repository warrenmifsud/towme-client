import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Step1Identity from './steps/Step1Identity';
import Step2Business from './steps/Step2Business';
import Step3Documents from './steps/Step3Documents';
import Step4Bank from './steps/Step4Bank';

interface RegistrationV2Props {
    type: 'partner' | 'fleet';
    onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// VISUAL ALERT COMPONENT — Forensic Red Card & Orange Success
// ═══════════════════════════════════════════════════════════
function VisualAlert({ type, message, onDismiss }: { type: 'error' | 'reactivation'; message: string; onDismiss: () => void }) {
    const isError = type === 'error';
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onDismiss}></div>
            <div
                className="w-full max-w-md relative z-10 rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl border-2 animate-fade-in"
                style={{
                    background: isError ? '#FFFFFF' : '#FFFFFF',
                    borderColor: isError ? '#DC2626' : '#F9A825',
                    boxShadow: isError
                        ? '0 0 40px rgba(220, 38, 38, 0.3)'
                        : '0 0 40px rgba(249, 168, 37, 0.3)'
                }}
            >
                {isError ? (
                    <ShieldAlert size={56} style={{ color: '#DC2626' }} className="mb-4" />
                ) : (
                    <CheckCircle2 size={56} style={{ color: '#F9A825' }} className="mb-4 animate-bounce" />
                )}
                <h3
                    className="text-xl font-black mb-3 tracking-tight"
                    style={{ color: isError ? '#DC2626' : '#F9A825' }}
                >
                    {isError ? 'REGISTRATION ISSUE' : 'RE-APPLICATION ACCEPTED'}
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">{message}</p>
                <button
                    onClick={onDismiss}
                    className="mt-6 px-8 py-2.5 rounded-full text-white text-sm font-bold tracking-wide transition-all duration-300 hover:scale-105"
                    style={{ background: isError ? '#DC2626' : '#F9A825' }}
                >
                    {isError ? 'UNDERSTOOD' : 'CONTINUE'}
                </button>
            </div>
            {/* W.M Coding Credit Anchor */}
            <div
                className="fixed bottom-6 right-6 z-[10000] px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default"
                style={{
                    background: '#1A1C2E',
                    color: '#F9A825',
                    boxShadow: '0 2px 8px rgba(249, 168, 37, 0.2)'
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(249, 168, 37, 0.4)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(249, 168, 37, 0.2)'; }}
            >
                Powered by W.M Coding
            </div>
        </div>
    );
}

export default function RegistrationV2({ type, onClose }: RegistrationV2Props) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isReapplication, setIsReapplication] = useState(false);
    const [alertState, setAlertState] = useState<{ type: 'error' | 'reactivation'; message: string } | null>(null);
    const [data, setData] = useState<any>({
        application_type: type === 'partner' ? 'single' : 'fleet',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        profile_picture: '',
        company_name: '',
        vat_number: '',
        address: '',
        bank_name: '',
        account_holder: '',
        iban: '',
        id_card_front: '',
        id_card_back: '',
        driving_license_front: '',
        driving_license_front_expiry: '',
        driving_license_back: '',
        driving_license_back_expiry: '',
        insurance_policy: '',
        insurance_policy_expiry: ''
    });

    const updateData = (newData: any) => {
        setData((prev: any) => ({ ...prev, ...newData }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            console.log("Initiating Professional Registration Protocol...");

            const submissionPayload = {
                p_company_name: data.company_name,
                p_owner_name: `${data.first_name} ${data.last_name}`.trim(),
                p_vat_number: data.vat_number,
                p_email: data.email,
                p_phone: data.phone,
                p_address: data.address,
                p_application_type: data.application_type,

                p_tow_truck_registration_plate: 'PENDING',
                p_tow_truck_make: 'Pending Setup',
                p_tow_truck_model: 'Pending Setup',
                p_tow_truck_year: new Date().getFullYear().toString(),
                p_tow_truck_type: 'Standard',
                p_tow_truck_color: 'Pending',
                p_services_offered: [],

                p_id_card_front_path: data.id_card_front || null,
                p_id_card_back_path: data.id_card_back || null,
                p_driving_license_front_path: data.driving_license_front || null,
                p_driving_license_back_path: data.driving_license_back || null,
                p_insurance_policy_path: data.insurance_policy || null,

                p_id_card_front_expiry: null,
                p_id_card_back_expiry: null,
                p_driving_license_front_expiry: data.driving_license_front_expiry || null,
                p_driving_license_back_expiry: data.driving_license_back_expiry || null,
                p_insurance_policy_expiry: data.insurance_policy_expiry || null
            };

            console.log("Payload Prepared:", submissionPayload);

            // CALL RPC
            const { data: response, error } = await supabase.rpc('register_driver_application', submissionPayload);

            if (error) {
                console.error("RPC Error:", error);
                throw new Error("System Communication Error: " + error.message);
            }

            // ═══ FORENSIC ERROR MANDATE ═══
            // Red Card (#DC2626) for active session collision
            if (response && !response.success) {
                if (response.error === 'DUPLICATE_APPLICATION') {
                    const forensicMsg = `Active session found for ${response.duplicate_email || data.email}. Status: ${(response.current_status || 'unknown').toUpperCase()}`;
                    console.error("FORENSIC RED CARD:", forensicMsg);
                    setAlertState({ type: 'error', message: `Registration Issue: ${forensicMsg}` });
                    return;
                }
                setAlertState({ type: 'error', message: response.message || "Registration Failed." });
                return;
            }

            // ═══ VISUAL LAW: Re-application Orange/White Alert ═══
            if (response?.reapplication) {
                console.log("RE-APPLICATION ACCEPTED:", response.message);
                setIsReapplication(true);
                setAlertState({
                    type: 'reactivation',
                    message: 'RE-APPLICATION RECEIVED & RESET TO PENDING'
                });
                // Still trigger email and set success after alert
            }

            console.log("Registration Successful:", response);

            // Trigger Welcome Email
            console.log("Triggering Welcome Email...");
            await supabase.functions.invoke('send-email', {
                body: {
                    type: 'application_received',
                    email: data.email,
                    data: {
                        first_name: data.first_name,
                        application_type: 'driver'
                    }
                }
            });

            setSuccess(true);
            // If re-application, don't auto-close — wait for alert dismissal
            if (!response?.reapplication) {
                setTimeout(() => {
                    onClose();
                }, 3000);
            }

        } catch (err: any) {
            console.error("Submission Error:", err);
            setAlertState({
                type: 'error',
                message: err.message || "An unexpected error occurred."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ═══ VISUAL ALERT OVERLAY ═══
    if (alertState) {
        return (
            <VisualAlert
                type={alertState.type}
                message={alertState.message}
                onDismiss={() => {
                    setAlertState(null);
                    if (alertState.type === 'reactivation') {
                        // On re-application success dismissal, close the modal
                        onClose();
                    }
                }}
            />
        );
    }

    // ═══ SUCCESS STATE ═══
    if (success && !isReapplication) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] p-12 flex flex-col items-center text-center relative z-10 shadow-2xl">
                    <CheckCircle2 size={64} className="text-[#F9A825] mb-6 animate-bounce" />
                    <h3 className="text-3xl font-black text-slate-900 mb-2">Welcome Aboard!</h3>
                    <p className="text-slate-500 text-sm">Your application has been received. <br /> Please check your email for the next steps.</p>
                </div>
                {/* W.M Coding Credit Anchor */}
                <div
                    className="fixed bottom-6 right-6 z-[60] px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default"
                    style={{
                        background: '#1A1C2E',
                        color: '#F9A825',
                        boxShadow: '0 2px 8px rgba(249, 168, 37, 0.2)'
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(249, 168, 37, 0.4)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(249, 168, 37, 0.2)'; }}
                >
                    Powered by W.M Coding
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s === step ? 'w-8 bg-amber-500' : s < step ? 'w-2 bg-green-500' : 'w-2 bg-slate-800'}`} />
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Step {step}/4</span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto">
                    {step === 1 && <Step1Identity data={data} updateData={updateData} onNext={nextStep} />}
                    {step === 2 && <Step2Business data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
                    {step === 3 && <Step3Documents data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
                    {step === 4 && <Step4Bank data={data} updateData={updateData} onSubmit={handleSubmit} isSubmitting={isSubmitting} onBack={prevStep} />}
                </div>
            </div>
        </div>
    );
}
