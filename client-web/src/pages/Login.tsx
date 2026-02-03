import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#050505] overflow-hidden relative font-sans">
            {/* macOS-style Depth Layers */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[160px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/5 rounded-full blur-[160px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)]"></div>
            </div>

            <div className="glass-panel w-full max-w-md p-12 relative z-10 animate-fade-in">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner-gold mb-6 group transition-transform hover:scale-110">
                        <LogIn className="text-amber-500 w-10 h-10 group-hover:rotate-12 transition-transform" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Sign <span className="text-amber-500">In</span></h1>

                    <div className="mt-6 flex flex-col items-center gap-2 w-full">
                        <span className="text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">Accessing</span>
                        <div className="px-6 py-2 bg-amber-500 rounded-2xl shadow-gold-glow text-black font-black text-sm tracking-widest uppercase transform rotate-[-2deg]">
                            TOW ME
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-[0.2em]">Elite Roadside Operations</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-slide-up">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-widest">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input pl-14"
                                placeholder="name@domain.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1 text-xs font-black uppercase tracking-widest">
                            <label className="text-slate-500">Password</label>
                            <a href="#" className="text-amber-500/60 hover:text-amber-500 transition-colors">Recover?</a>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors w-5 h-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input pl-14 pr-12"
                                placeholder="••••••••"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-lg flex items-center justify-center gap-3 shadow-gold-glow active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group uppercase tracking-tight"
                    >
                        {loading ? 'Authenticating...' : 'Login to account'}
                        {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        New user?{' '}
                        <Link to="/signup" className="text-amber-500 font-black hover:text-amber-400 transition-colors ml-1 uppercase tracking-tighter">sign up here.</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
