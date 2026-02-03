import { MapPin, ArrowRight, Wrench, ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="p-6 h-screen flex flex-col relative animate-fade-in overflow-hidden">
            <header className="flex justify-between items-center mb-12">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        TOW<span className="text-amber-500">ME</span>
                    </h1>
                    <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">TowMe Operations Active</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            supabase.auth.signOut();
                            navigate('/login');
                        }}
                        className="p-3 rounded-2xl glass-button border-white/5 text-red-500/50 hover:text-red-500 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                    <div className="w-12 h-12 rounded-2xl bg-glass-200 border border-white/5 flex items-center justify-center shadow-glass transition-transform hover:scale-110">
                        <span className="text-xl">👤</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10">
                <div className="glass-panel p-10 w-full max-w-sm border-white/5 relative group">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-amber-500/5 rounded-3xl blur-2xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner-gold relative">
                        <MapPin className="w-12 h-12 text-amber-500" />
                        <div className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full border-4 border-black animate-pulse"></div>
                    </div>

                    <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Stranded?</h2>
                    <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                        Instant roadside assistance. <br />
                        <span className="text-slate-400">Available across Malta 24/7.</span>
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/services')}
                            className="glass-button-gold w-full py-5 text-base font-black flex items-center justify-center group uppercase tracking-tight"
                        >
                            Request Tow Now
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </button>

                        <button
                            onClick={() => navigate('/vendors')}
                            className="glass-button w-full py-4 text-sm font-bold flex items-center justify-center gap-3 border-white/5 bg-white/5 hover:bg-white/10"
                        >
                            <Wrench size={16} className="text-amber-500" />
                            Find Mechanics & Parts
                        </button>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-10 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <div className="flex items-center gap-1">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-black uppercase">Verified</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Background elements */}
            <div className="absolute top-1/4 -right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] -z-0"></div>
            <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-600/5 rounded-full blur-[100px] -z-0"></div>
        </div>
    );
}
