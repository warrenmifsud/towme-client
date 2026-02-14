import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
export default function SovereignLogout() {
    const [loading, setLoading] = useState(false);

    // Light-Theme Transformation: Explicit styles used in render.

    const executeLogout = async () => {
        setLoading(true);

        // 1. The Supabase Flush
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Logout Fracture:', error);

        // 2. The Nuclear Storage Wipe (Kills the "Ghost" Cache)
        localStorage.clear();
        sessionStorage.clear();

        // 3. The Hard Redirect (Bypassing React Router to force a refresh)
        window.location.href = '/login';
    };

    return (
        <button
            onClick={executeLogout}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all group hover:shadow-md hover:-translate-y-0.5"
        // Inline styles are removed in favor of Tailwind classes to match AdminV2Layout exactly, as per "perfect mirror" instruction.
        // Using logic from AdminV2Layout for consistency.
        >
            <div className="p-1 bg-[#F9A825]/10 rounded flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F9A825" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
            </div>
            <span className="text-xs font-bold text-slate-900 tracking-wide group-hover:text-[#F9A825] transition-colors uppercase">
                {loading ? 'PURGING...' : 'LOGOUT'}
            </span>
        </button>
    );
}
