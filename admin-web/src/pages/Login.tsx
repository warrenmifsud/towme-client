import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/OFFICIAL TowMe Logo.png';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetMode, setResetMode] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('🔴 FORENSIC LOGIN FAILURE:', {
                    email_attempted: email,
                    error_code: error.code,
                    error_status: error.status,
                    error_message: error.message,
                    error_name: error.name,
                    timestamp: new Date().toISOString(),
                });
                throw error;
            }

            // OMNI-ACCESS PROTOCOL: Role-Based Redirection
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const userRole = (profile?.role || '').toLowerCase();
                console.log('Login: Detected Role', userRole);

                if (['super_admin', 'admin'].includes(userRole)) {
                    navigate('/admin/v2/intake');
                    return;
                }
            }

            navigate('/');
        } catch (err: any) {
            const forensicMsg = `[${err.status || 'UNKNOWN'}] ${err.code || 'NO_CODE'}: ${err.message}`;
            console.error('🔴 FORENSIC CATCH:', forensicMsg);
            setError(forensicMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/admin-reset-password`,
            });

            if (error) {
                console.error('🔴 FORENSIC RESET EMAIL FAILURE:', {
                    email_attempted: email,
                    error_code: error.code,
                    error_status: error.status,
                    error_message: error.message,
                    timestamp: new Date().toISOString(),
                });
                throw error;
            }
            setResetSent(true);
        } catch (err: any) {
            const forensicMsg = `[${err.status || 'UNKNOWN'}] ${err.code || 'NO_CODE'}: ${err.message}`;
            console.error('🔴 FORENSIC CATCH (reset):', forensicMsg);
            setError(forensicMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 selection:bg-[#F9A825]/30">
            {/* Brand Header */}
            <div className="mb-10 flex flex-col items-center">
                {/* Official Circular Logo - Enlarged for Dominance (Phase 22) */}
                <img
                    src={logo}
                    alt="TowMe Official"
                    className="w-48 h-48 mb-6 object-contain hover:scale-105 transition-transform duration-500"
                />
                {/* Admin Portal Typography - Phase 22 Directive: Solid Gold */}
                <h1 className="text-3xl font-semibold text-[#F9A825] tracking-tight antialiased">
                    Admin Portal
                </h1>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white border border-slate-100 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F9A825]"></div>

                {resetMode ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-[#F9A825]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#F9A825]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Recovery Protocol</h2>
                            <p className="text-sm text-slate-500 mt-2 px-4">
                                Enter your registered email. We'll send a secure link to restore access.
                            </p>
                        </div>

                        {resetSent ? (
                            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                                <p className="text-sm font-bold text-green-700">Recovery Link Sent.</p>
                                <p className="text-xs text-green-600 mt-1">Check your inbox securely.</p>
                                <button
                                    onClick={() => { setResetMode(false); setResetSent(false); }}
                                    className="text-xs font-bold text-[#F9A825] mt-4 hover:underline"
                                >
                                    Return to Login
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleReset} className="space-y-6">
                                <div className="space-y-1">
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F9A825] transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-[#F9A825] focus:ring-0 transition-all font-medium text-slate-900 placeholder:text-slate-400 !outline-none"
                                            placeholder="Email Address"
                                            required
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
                                    disabled={loading}
                                    className="w-full bg-[#F9A825] hover:bg-[#E59610] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </span>
                                    ) : 'Send Reset Link'}
                                </button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => setResetMode(false)}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel Recovery
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F9A825] transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-[#F9A825] focus:ring-0 transition-all font-medium text-slate-900 placeholder:text-slate-400 !outline-none"
                                    placeholder="Email"
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F9A825] transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-[#F9A825] focus:ring-0 transition-all font-medium text-slate-900 placeholder:text-slate-400 !outline-none"
                                    placeholder="Password"
                                    required
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
                            disabled={loading}
                            className="w-full bg-[#F9A825] hover:bg-[#E59610] text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </span>
                            ) : 'Sign In'}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => setResetMode(true)}
                                className="text-xs font-bold text-[#F9A825] hover:text-[#E59610] transition-colors"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Authorized Personnel Only
                </p>
                <p className="text-[9px] text-slate-300 mt-1 opacity-50">
                    ID: {new Date().getFullYear()}.TOW.SECURE
                </p>
            </div>
        </div>
    );
}
