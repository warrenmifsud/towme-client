import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/OFFICIAL TowMe Logo.png';

export default function AdminResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        // SESSION RECOVERY LISTENER: Detects PASSWORD_RECOVERY event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 AUTH STATE CHANGE:', {
                event,
                user_email: session?.user?.email || 'NO_SESSION',
                timestamp: new Date().toISOString(),
            });

            if (event === 'PASSWORD_RECOVERY') {
                console.log('✅ PASSWORD_RECOVERY session detected. Reset form unlocked.');
                setSessionReady(true);
            }
        });

        // Also check if we already have a session (user clicked the link and session was established)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                console.log('✅ Existing session found:', session.user?.email);
                setSessionReady(true);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('[VALIDATION] Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('[VALIDATION] Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.error('🔴 FORENSIC PASSWORD UPDATE FAILURE:', {
                    error_code: error.code,
                    error_status: error.status,
                    error_message: error.message,
                    timestamp: new Date().toISOString(),
                });
                throw error;
            }

            console.log('✅ PASSWORD UPDATED SUCCESSFULLY. Session refreshed.');
            setSuccess(true);

            // Direct Database Write + Session Refresh: Navigate to login after 2.5s
            setTimeout(() => {
                navigate('/login');
            }, 2500);
        } catch (err: any) {
            const forensicMsg = `[${err.status || 'UNKNOWN'}] ${err.code || 'NO_CODE'}: ${err.message}`;
            console.error('🔴 FORENSIC CATCH:', forensicMsg);
            setError(forensicMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 selection:bg-[#F9A825]/30">
            {/* Brand Header */}
            <div className="mb-10 flex flex-col items-center">
                <img
                    src={logo}
                    alt="TowMe Official"
                    className="w-48 h-48 mb-6 object-contain hover:scale-105 transition-transform duration-500"
                />
                <h1 className="text-3xl font-semibold text-[#F9A825] tracking-tight antialiased">
                    Admin Portal
                </h1>
                <p className="text-sm text-slate-400 mt-2 tracking-wide">
                    CREDENTIAL RECOVERY
                </p>
            </div>

            {/* Reset Card */}
            <div className="w-full max-w-md bg-white border border-slate-100 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F9A825]"></div>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-[#F9A825]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#F9A825]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Secure Password Reset</h2>
                    <p className="text-sm text-slate-500 mt-2 px-4">
                        This link is intended strictly for the recovery of your <strong className="text-[#F9A825]">Administrative Credentials</strong> on the TowMe Command Portal.
                    </p>
                </div>

                {success ? (
                    <div className="bg-[#F9A825]/10 border border-[#F9A825]/30 rounded-xl p-6 text-center">
                        <div className="w-12 h-12 bg-[#F9A825]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#F9A825]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </div>
                        <p className="text-lg font-bold text-[#F9A825]">Password Updated Successfully</p>
                        <p className="text-sm text-slate-500 mt-2">Session refreshed. Redirecting to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F9A825] transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-[#F9A825] focus:ring-0 transition-all font-medium text-slate-900 placeholder:text-slate-400 !outline-none"
                                    placeholder="New Password"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F9A825] transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-[#F9A825] focus:ring-0 transition-all font-medium text-slate-900 placeholder:text-slate-400 !outline-none"
                                    placeholder="Confirm Password"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs font-bold text-white bg-[#F9A825] p-3 rounded-lg flex items-center gap-2 shadow-lg">
                                <div className="w-1 h-4 bg-white rounded-full"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !sessionReady}
                            className="w-full bg-[#F9A825] hover:bg-[#E59610] text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating Credentials...
                                </span>
                            ) : !sessionReady ? 'Establishing Recovery Session...' : 'Reset Administrative Password'}
                        </button>

                        {!sessionReady && (
                            <p className="text-xs text-center text-slate-400">
                                Waiting for recovery session from email link...
                            </p>
                        )}
                    </form>
                )}
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Secured by TowMe Intelligence
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="w-1 h-1 bg-[#F9A825] rounded-full"></span>
                    <span className="text-[9px] text-slate-400">Administrative Credentials Only</span>
                    <span className="w-1 h-1 bg-[#F9A825] rounded-full"></span>
                </div>
                {/* Powered by W.M Coding — Visual Law Signature */}
                <p className="fixed bottom-6 right-6 text-[9px] text-slate-300 font-medium hover:text-[#F9A825] hover:scale-105 transition-all duration-300 cursor-default">
                    Powered by W.M Coding
                </p>
            </div>
        </div>
    );
}
