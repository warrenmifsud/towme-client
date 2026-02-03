import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { RegistrationModal } from '../components/RegistrationModal';
import React from 'react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRegistration, setShowRegistration] = useState(false);
    const [editApplicationId, setEditApplicationId] = useState<string | null>(null);
    const navigate = useNavigate();

    // Check for edit params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const id = params.get('id');

        if (action === 'edit' && id) {
            setEditApplicationId(id);
            setShowRegistration(true);
        }
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden">
                {/* Ambient Mesh Glow (Matching Admin Body) */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[50px] -z-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-600/10 rounded-full blur-[50px] -z-10"></div>

                <h2 className="text-3xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 animate-slide-up">
                    TowMe Vendor
                </h2>
                <p className="text-center text-slate-400 mb-8 text-sm uppercase tracking-widest animate-slide-up delay-100">Premium Partner Access</p>

                {error && (
                    <div className="bg-red-500/10 text-red-200 p-3 rounded-lg mb-4 text-sm border border-red-500/30 animate-fade-in">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="animate-slide-up delay-200">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="glass-input pl-10 py-3"
                                placeholder="vendor@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="animate-slide-up delay-300">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input pl-10 py-3"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="animate-slide-up delay-300 space-y-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="glass-button w-full py-3 text-slate-950 uppercase tracking-wider text-sm font-bold hover:scale-[1.02]"
                        >
                            {loading ? 'Authenticating...' : 'Access Portal'}
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#020617] px-2 text-slate-600">Or</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowRegistration(true)}
                            className="w-full py-3 text-amber-500 uppercase tracking-wider text-sm font-bold hover:text-amber-400 transition-colors"
                        >
                            Register as Partner
                        </button>
                    </div>
                </form>
            </div>

            <RegistrationModal
                isOpen={showRegistration}
                onClose={() => {
                    setShowRegistration(false);
                    setEditApplicationId(null);
                    // Clear params
                    window.history.replaceState({}, '', window.location.pathname);
                }}
                applicationId={editApplicationId}
            />
        </div>
    );
}
