import { useEffect, useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // Adjust path if needed
import { TowMeLogo } from '../../components/TowMeLogo';
import SovereignLogout from './components/SovereignLogout';

export const AdminV2Layout = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('AdminV2: No user found');
            setIsLoading(false);
            return;
        }

        setUserEmail(user.email || '');

        // RBAC Check
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_fleet_manager')
            .eq('id', user.id)
            .single();

        console.log('AdminV2: User Role Check', { email: user.email, role: profile?.role });

        if (profile?.role) {
            setUserRole(profile.role);
        }

        // Expanded RBAC for Phase 35 (Fleet Managers)
        const isFleetManager = (profile as any)?.is_fleet_manager || false;

        // OMNI-ACCESS PROTOCOL (Case-Insensitive Check)
        const userRole = (profile?.role || '').toLowerCase();
        const isAuthorizedUser = userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager' || (userRole === 'driver' && isFleetManager);

        console.log('AdminV2: RBAC Decision Matrix', { userRole, isAuthorizedUser, originalRole: profile?.role });

        if (isAuthorizedUser) {
            setIsAuthorized(true);
            // Safety net: Treat 'admin' as authorized but log it
            if (userRole === 'admin') console.log('AdminV2: Admin Role Detected. Granting Access.');
        } else {
            console.warn(`[GOC Security] Denied. Role '${userRole}' != 'super_admin/admin'`);
            // if (!isSuperAdmin) return <Navigate to="/unauthorized" replace />; // (Commented out until unauthorized route exists)
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            {/* Pure White Header (Visual Law Compliant) */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-6 z-50 shadow-sm border-b border-neutral-200">
                <div className="flex items-center gap-3">
                    {/* Orange Anchor Logo */}
                    <TowMeLogo className="w-10 h-10" />
                    <div>
                        <h1 className="text-slate-900 font-bold text-lg tracking-tight leading-none">Admin<span className="text-[#F9A825]">Portal</span></h1>
                        <span className="text-slate-400 text-[10px] uppercase tracking-widest font-medium">V2 • Official</span>
                    </div>
                </div>

                <div className="ml-12 flex items-center gap-6">
                    <NavLink
                        to="/admin/v2/intake"
                        className={({ isActive }) => `text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-[#F9A825] bg-[#F9A825]/5 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Driver Intake
                    </NavLink>
                    <NavLink
                        to="/admin/v2/assets"
                        className={({ isActive }) => `text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-[#F9A825] bg-[#F9A825]/5 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Fleet Assets
                    </NavLink>
                    {/* Financial Check: Only show if Super Admin */}
                    {['super_admin'].includes(userRole || '') && (
                        <NavLink
                            to="/admin/v2/financials"
                            className={({ isActive }) => `text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-[#F9A825] bg-[#F9A825]/5 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Financials
                        </NavLink>
                    )}
                    <NavLink
                        to="/admin/v2/security"
                        className={({ isActive }) => `text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-[#F9A825] bg-[#F9A825]/5 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Security
                    </NavLink>
                    <NavLink
                        to="/admin/v2/live-ops"
                        className={({ isActive }) => `text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-[#F9A825] bg-[#F9A825]/5 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Live Ops
                    </NavLink>
                </div>

                <div className="ml-auto flex items-center gap-6">
                    {/* Sovereign Logout: Nuclear Session Flush */}
                    <SovereignLogout />

                    {/* Navigation Bridge */}
                    <a
                        href="/dispatch"
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all group"
                    >
                        <div className="p-1 bg-[#F9A825]/10 rounded flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F9A825" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wide group-hover:text-[#F9A825] transition-colors">
                            Return to Dispatcher View
                        </span>
                    </a>

                    <div className="h-8 w-px bg-slate-200"></div>

                    <div className="text-right hidden md:block">
                        <p className="text-slate-900 text-sm font-medium">{userEmail}</p>
                        <p className="text-slate-400 text-[10px] bg-slate-50 px-2 py-0.5 rounded uppercase tracking-wider font-bold border border-slate-100 mt-1 inline-block">
                            {userRole?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
                <Outlet />
            </main>

            {/* Footer Area (Clean) */}
        </div>
    );
};
