import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem('cookiesAccepted');
        if (!hasAccepted) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookiesAccepted', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 z-50 animate-slide-up max-w-[400px]">
            <div className="glass-panel p-6 flex flex-col items-center text-center gap-5 bg-black/80 backdrop-blur-3xl border-amber-500/20 shadow-gold-glow rounded-[32px]">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                    <Cookie size={28} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Privacy Protocol</h4>
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest px-2">
                        We utilize cookies to optimize your elite roadside experience and calibrate performance metrics.
                    </p>
                </div>
                <div className="flex w-full gap-3">
                    <button
                        onClick={handleAccept}
                        className="flex-1 py-4 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all active:scale-95 shadow-gold-glow"
                    >
                        Initialize
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="px-6 py-4 bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}
