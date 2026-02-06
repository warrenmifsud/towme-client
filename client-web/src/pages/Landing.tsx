import { useNavigate } from 'react-router-dom';
import { THEME } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // If user is logged in, send them straight to the App
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: THEME.colors.brandNavy }}>
            {/* Header */}
            <header className="p-6 flex justify-between items-center z-10 relative">
                <div className="text-3xl font-black tracking-tighter text-white">
                    TOW<span style={{ color: THEME.colors.primaryBrandColor }}>ME</span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all hover:opacity-90"
                    style={{
                        backgroundColor: THEME.colors.primaryBrandColor,
                        color: THEME.colors.white
                    }}
                >
                    Log In
                </button>
            </header>

            {/* Hero Section */}
            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
                <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
                    <span style={{ color: THEME.colors.primaryBrandColor }}>TowMe</span>
                </h1>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-medium">
                    TowMe provides professional roadside assistance and towing management services.
                </p>

                <div className="flex flex-col gap-4 w-full max-w-sm">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 rounded-xl text-lg font-bold uppercase tracking-widest shadow-lg transition-transform active:scale-[0.98] hover:opacity-95"
                        style={{
                            backgroundColor: THEME.colors.primaryBrandColor,
                            color: THEME.colors.white
                        }}
                    >
                        Get Started
                    </button>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-8 text-center border-t border-white/5 z-10 relative bg-black/20">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
                    &copy; 2026 TowMe. All Rights Reserved.
                </p>
                <div className="flex justify-center gap-6 text-xs font-bold uppercase tracking-wider">
                    <a href="/privacy" className="text-slate-400 hover:text-white transition-colors" style={{ color: THEME.colors.primaryBrandColor }}>Privacy Policy</a>
                    <a href="/terms" className="text-slate-400 hover:text-white transition-colors" style={{ color: THEME.colors.primaryBrandColor }}>Terms of Service</a>
                </div>
            </footer>

            {/* Background Ambience */}
            <div
                className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none"
                style={{ backgroundColor: THEME.colors.primaryBrandColor }}
            ></div>
            <div
                className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none"
                style={{ backgroundColor: THEME.colors.primaryBrandColor }}
            ></div>
        </div>
    );
}
