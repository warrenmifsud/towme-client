import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

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
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    // PHASE 203: Google Identity Services (GIS) Initialization
    useEffect(() => {
        const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
        if (!GOOGLE_CLIENT_ID) return;

        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (!(window as any).google) return;
            (window as any).google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async (response: any) => {
                    setLoading(true);
                    try {
                        const { error } = await supabase.auth.signInWithIdToken({
                            provider: 'google',
                            token: response.credential,
                        });
                        if (error) throw error;
                        navigate('/dashboard');
                    } catch (err: any) {
                        setError(err.message || "Google Sign-in failed");
                    } finally {
                        setLoading(false);
                    }
                }
            });
            const buttonContainer = document.getElementById("googlePluginButton");
            if (buttonContainer) {
                (window as any).google.accounts.id.renderButton(buttonContainer, {
                    theme: "outline", size: "large", width: Math.min(400, buttonContainer.offsetWidth), text: "continue_with"
                });
            }
        };

        return () => {
            if (document.body.contains(script)) document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
            <div className="w-full max-w-md p-8 flex flex-col items-center">
                {/* Circular Logo */}
                <div className="w-24 h-24 rounded-full bg-[#1A1C2E] flex items-center justify-center mb-8 shrink-0">
                    <span className="text-white font-bold text-xl">TOW<span className="text-[#F9A825]">ME</span></span>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <input
                            className="w-full p-3 border border-[#F9A825] rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F9A825]/20"
                            placeholder="Email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <input
                            className="w-full p-3 border border-[#F9A825] rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F9A825]/20 pr-10"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F9A825]"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <div className="flex justify-end">
                        <a href="#" className="text-xs font-bold text-[#F9A825] hover:opacity-80">Forgot Password?</a>
                    </div>

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 bg-[#F9A825] text-white py-3 font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? 'LOGGING IN...' : 'LOG IN'}
                    </button>

                    {/* Google Button */}
                    <div id="googlePluginButton" className="w-full flex justify-center mt-4"></div>
                </form>

                <div className="mt-8 text-sm text-slate-500">
                    Don't have an account? <Link to="/signup" className="text-[#F9A825] font-bold hover:opacity-80">Create Account</Link>
                </div>
            </div>
        </div>
    );
}
