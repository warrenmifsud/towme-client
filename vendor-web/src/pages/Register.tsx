import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Loader2, UserPlus, Check, Building2, MapPin, User, AlertCircle } from 'lucide-react';

export default function Register() {
    const [searchParams] = useSearchParams();
    const emailParam = searchParams.get('email') || '';

    // Application Data State
    const [appData, setAppData] = useState<any>(null);
    const [fetchingApp, setFetchingApp] = useState(true);

    // Form State
    const [email, setEmail] = useState(emailParam);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Fetch Application Details
    useEffect(() => {
        if (emailParam) {
            async function fetchApp() {
                const { data } = await supabase
                    .from('vendor_applications')
                    .select('*')
                    .eq('email', emailParam)
                    .eq('status', 'approved')
                    .single();

                if (data) {
                    setAppData(data);
                    setEmail(data.email); // Ensure email matches
                }
                setFetchingApp(false);
            }
            fetchApp();
        } else {
            setFetchingApp(false);
        }
    }, [emailParam]);

    async function handleSignUp(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!appData) {
            setError("No approved application found for this email. Please contact support.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Create Auth User
            // The database trigger 'on_auth_user_created' will automatically 
            // create the vendor profile in the 'vendors' table using data from the approved application.
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) {
                if (signUpError.message.includes("User already registered")) {
                    setError("Account already exists. Please try logging in directly. If you cannot log in, contact support to reset your profile.");
                    setLoading(false);
                    return;
                }
                throw signUpError;
            }

            if (!authData.user) throw new Error("Failed to create user");

            // 2. Send Notification Email
            // We still trigger the email from here using the application data we have in state
            await supabase.functions.invoke('send-email', {
                body: {
                    type: 'portal_active',
                    email: email,
                    data: {
                        shop_name: appData.shop_name
                    }
                }
            });

            // Successful signup
            alert('Account created successfully! Your profile has been automated. Welcome to the TowMe Partner Network.');
            navigate('/login');

        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (fetchingApp) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-8 relative overflow-hidden">
                {/* Ambient Mesh Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[50px] -z-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-[50px] -z-10"></div>

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 animate-pulse">
                        <UserPlus size={32} />
                    </div>
                </div>

                <h2 className="text-3xl font-bold mb-2 text-center text-white animate-slide-up">
                    Finalize Registration
                </h2>

                <div className="mt-4 mb-8 flex flex-col items-center gap-2">
                    <span className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">Registration for</span>
                    <div className="px-6 py-2 bg-amber-500 rounded-2xl shadow-gold-glow text-black font-black text-sm tracking-widest uppercase transform rotate-[-2deg]">
                        TOW ME
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-200 p-4 rounded-xl mb-6 text-sm border border-red-500/30 flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <div>{error}</div>
                    </div>
                )}

                {/* Application Summary Card */}
                {appData && (
                    <div className="bg-slate-900/50 border border-white/10 rounded-xl p-5 mb-8 animate-slide-up delay-150">
                        <div className="flex items-center gap-2 mb-3">
                            <Check size={16} className="text-green-500" />
                            <span className="text-xs font-bold text-green-500 uppercase tracking-widest">Application Verified</span>
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1">{appData.shop_name}</h3>
                        <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Building2 size={14} /> {appData.business_legal_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <User size={14} /> {appData.representative_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <MapPin size={14} /> {appData.shop_address}
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="animate-slide-up delay-200">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-green-500 transition-colors" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input pl-10 py-3 disabled:opacity-50"
                                placeholder="vendor@example.com"
                                required
                                readOnly={!!appData} // Read-only if we found the app
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up delay-300">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Create Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-green-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input pl-10 py-3"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-green-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="glass-input pl-10 py-3"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="glass-button w-full py-3 text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 uppercase tracking-wider text-sm font-bold hover:scale-[1.02] mt-6 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                    </button>

                    <div className="text-center mt-4">
                        <a href="/login" className="text-xs text-slate-500 hover:text-white transition-colors">
                            Already have an account? Log In
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
