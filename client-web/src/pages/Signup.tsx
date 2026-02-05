import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, User, ArrowRight, AlertCircle, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        contact_number: contactNumber,
                        role: 'client'
                    },
                },
            });

            if (error) throw error;

            // Send confirmation email via Resend
            await supabase.functions.invoke('send-email', {
                body: {
                    type: 'client_signup',
                    email: email,
                    data: {
                        full_name: fullName
                    }
                }
            });

            alert('Signup successful! Check your email for confirmation.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-white overflow-hidden relative font-sans">
            <div className="w-full max-w-md p-12 relative z-10 animate-fade-in border border-slate-100 rounded-[40px] shadow-2xl bg-white">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner-gold mb-6 group transition-transform hover:scale-110">
                        <UserPlus className="text-amber-500 w-10 h-10 group-hover:rotate-12 transition-transform" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter text-center">Create Account</h1>

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <span className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">Registration for</span>
                        <div className="px-6 py-2 bg-amber-500 rounded-2xl shadow-gold-glow text-black font-black text-sm tracking-widest uppercase transform rotate-[-2deg]">
                            TOW ME
                        </div>
                        <p className="text-slate-500 text-xs font-bold text-center mt-2 max-w-[250px]">
                            Never get stranded when you need roadside assistance.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-slide-up">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="glass-input pl-14 h-14"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Contact Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                <input
                                    type="tel"
                                    required
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    className="glass-input pl-14 h-14"
                                    placeholder="+356 •••• ••••"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="glass-input pl-14 h-14"
                                    placeholder="operator@system.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input pl-14 pr-12 h-14"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`glass-input pl-14 h-14 ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-lg flex items-center justify-center gap-3 shadow-gold-glow active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-tight mt-8"
                    >
                        {loading ? 'Initializing Account...' : 'Create Account'}
                        {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        Returning user?{' '}
                        <Link to="/login" className="text-amber-500 font-black hover:text-amber-400 transition-colors ml-1 uppercase tracking-tighter">sign in here.</Link>
                    </p>
                </div>

                <div className="mt-8 flex items-center justify-center gap-4 opacity-20 hover:opacity-100 transition-opacity">
                    <ShieldCheck size={14} className="text-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Encrypted Deployment</span>
                </div>
            </div>
        </div>
    );
}
