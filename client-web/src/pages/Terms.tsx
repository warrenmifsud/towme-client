import { useNavigate } from 'react-router-dom';
import { THEME } from '../theme';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: THEME.colors.brandNavy }}>
            {/* Header */}
            <header className="p-6 flex items-center gap-4 z-10 relative">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                >
                    <ArrowLeft />
                </button>
                <div className="text-2xl font-black tracking-tighter text-white">
                    TOW<span style={{ color: THEME.colors.primaryBrandColor }}>ME</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full p-6 z-10 relative">
                <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/10">
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-8">
                        Terms of Service
                    </h1>

                    <div className="space-y-8 text-slate-300 font-medium leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-white mb-4">Agreement</h2>
                            <p>
                                By using TowMe, you agree to provide accurate information for towing dispatch services.
                                Misuse of the platform or providing false information may result in account suspension.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-white mb-4">Service Scope</h2>
                            <p>
                                TowMe provides a specialized platform for managing towing requests and roadside assistance.
                                Users may request, track, and manage towing services through our dispatch system.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-8 text-center border-t border-white/5 z-10 relative bg-black/20">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                    &copy; 2026 TowMe. All Rights Reserved.
                </p>
            </footer>
        </div>
    );
}
