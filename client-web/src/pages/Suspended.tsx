import { useAuth } from '../contexts/AuthContext';
import { Calendar, AlertOctagon, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Suspended() {
    const { suspensionDetails, signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    if (!suspensionDetails) return null;

    const formattedDate = new Date(suspensionDetails.until).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-black overflow-hidden relative font-sans animate-fade-in">
            {/* Dark/Red Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-red-900/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-slate-900/20 rounded-full blur-[120px]"></div>
            </div>

            <div className="glass-panel w-full max-w-md p-10 relative z-10 bg-black/60 backdrop-blur-3xl border-red-500/10 shadow-[0_40px_100px_rgba(220,38,38,0.15)] rounded-[40px] text-center">
                <div className="w-24 h-24 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-10 shadow-lg">
                    <ShieldAlert className="text-red-500 w-12 h-12 animate-pulse" />
                </div>

                <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">Access Restricted</h1>
                <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 mb-10">Administrative Protocol Active</p>

                <div className="bg-white/5 border border-white/5 rounded-[32px] p-8 text-left mb-10 transition-all hover:bg-white/10">
                    <div className="flex items-start gap-5 mb-6">
                        <AlertOctagon className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] mb-2">Protocol Violation</p>
                            <p className="text-sm font-bold text-slate-200 leading-relaxed">{suspensionDetails.reason}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-5 pt-6 border-t border-white/5">
                        <Calendar className="w-6 h-6 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Restoration Date</p>
                            <p className="text-2xl font-black text-white tracking-tight">{formattedDate}</p>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 mb-10 leading-relaxed">
                    Access will be automatically re-initialized on the date shown. Contact Elite Support for appeals.
                </p>

                <button
                    onClick={handleSignOut}
                    className="w-full h-18 rounded-2xl bg-white/5 border border-white/5 text-slate-400 font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <LogOut size={16} />
                    De-Authorize Session
                </button>
            </div>
        </div>
    );
}
