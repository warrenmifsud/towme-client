import { useState, useEffect } from 'react';
import { LayoutDashboard, Layers, Users, MapPin, Truck, ChevronRight, Command, Store, Settings, ShieldCheck, CreditCard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import BRAND_SETTINGS from '../config/brand_settings.json';

interface GlassLayoutProps {
    children: React.ReactNode;
}

export function GlassLayout({ children }: GlassLayoutProps) {
    const [pendingVendors, setPendingVendors] = useState(0);
    const [isAdminV2Eligible, setIsAdminV2Eligible] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchPendingCount();
        checkAdminEligibility();

        const subscription = supabase
            .channel('vendor_badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_applications' }, () => {
                fetchPendingCount();
            })
            .subscribe();

        const driverSubscription = supabase
            .channel('driver_badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_applications' }, () => {
                fetchPendingCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
            supabase.removeChannel(driverSubscription);
        };
    }, []);

    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Redirect to login if no session
            window.location.href = '/login';
        }
    }

    async function fetchPendingCount() {
        // Vendor Count
        const { count: vendorCount } = await supabase
            .from('vendor_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .eq('is_read', false); // Only count unread

        setPendingVendors(vendorCount || 0);

        // Driver Count Moved to Admin V2
    }

    async function checkAdminEligibility() {
        if (!BRAND_SETTINGS.features.NEW_ERA_ENABLED) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role && ['admin', 'super_admin', 'manager'].includes(profile.role)) {
            setIsAdminV2Eligible(true);
        }
    }

    return (
        <div className="min-h-screen text-theme-primary flex font-sans selection:bg-[#F9A825]/30 transition-colors duration-500">
            {/* Sidebar - Liquid Glass Effect */}
            <aside className="w-72 m-4 flex flex-col fixed h-[calc(100vh-2rem)] glass-panel z-50 overflow-hidden border-white/5">
                {/* Ambient Glow in Sidebar */}


                <div className="flex items-center gap-4 mb-10 px-4 pt-4 relative z-10">
                    <div className="w-12 h-12 surface-inner rounded-2xl shadow-xl flex items-center justify-center group cursor-pointer hover:scale-105 transition-transform duration-500">
                        <Truck size={24} className="text-[#F9A825] drop-shadow-[0_0_8px_rgba(249,168,37,0.5)]" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-theme-primary">TowMe</h1>
                        <p className="text-[9px] font-bold text-[#F9A825] uppercase tracking-[0.2em] opacity-80">Admin Console</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 px-2 relative z-10 overflow-y-auto">
                    <div className="px-4 pb-2 text-[10px] font-black text-theme-secondary/70 uppercase tracking-widest">Operations</div>
                    <NavItem icon={<LayoutDashboard size={20} />} label="Overview" to="/" />
                    <NavItem icon={<Command size={20} />} label="Mission Control" to="/dispatch" />
                    <NavItem icon={<MapPin size={20} />} label="Live Fleet Map" to="/fleet-map" />


                    {isAdminV2Eligible && (
                        <div className="mt-6 mb-2">
                            <div className="px-4 pb-2 text-[10px] font-black text-[#F9A825] uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1A1C2E]"></span>
                                Admin V2
                            </div>
                            <NavItem
                                icon={<ShieldCheck size={20} className="text-[#F9A825]" />}
                                label="Request Console"
                                to="/admin/v2/requests"
                            />
                            <NavItem
                                icon={<CreditCard size={20} className="text-[#F9A825]" />}
                                label="Financials"
                                to="/admin/v2/financials"
                            />
                        </div>
                    )}

                    <div className="px-4 pb-2 mt-6 text-[10px] font-black text-theme-secondary/70 uppercase tracking-widest">Management</div>
                    <NavItem icon={<Users size={20} />} label="Clients" to="/clients" />
                    <NavItem icon={<Store size={20} />} label="Partners" to="/vendors" />
                    <NavItem
                        icon={<Store size={20} />}
                        label="Vendor Requests"
                        to="/vendor-applications"
                        badge={pendingVendors > 0 ? pendingVendors : undefined}
                    />
                    <NavItem
                        icon={<Store size={20} />}
                        label="Vendor Requests"
                        to="/vendor-applications"
                        badge={pendingVendors > 0 ? pendingVendors : undefined}
                    />
                    {/* Partner Requests moved to Admin V2 */}
                    <NavItem icon={<Layers size={20} />} label="Service Matrix" to="/categories" />

                    <div className="px-4 pb-2 mt-6 text-[10px] font-black text-theme-secondary/70 uppercase tracking-widest">System</div>
                    <NavItem icon={<Settings size={20} />} label="Vendor Settings" to="/vendor-settings" />
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="surface-inner p-3 flex items-center gap-3 cursor-pointer group hover:bg-white/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-[#F9A825] flex items-center justify-center shadow-sm text-white font-bold text-sm">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-100 truncate group-hover:text-[#F9A825] transition-colors">Admin User</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">System Op</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:text-[#F9A825] transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-80 p-8 relative z-0">
                {/* Ambient Background Light for Content Area */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#F9A825]/5 rounded-full blur-[120px] pointer-events-none"></div>

                {/* SINGLE SHELL ENFORCEMENT: All pages inherit this structure */}
                <div className="max-w-7xl mx-auto relative z-10">
                    {/* Global Content Wrapper - Enforces uniform spacing */}
                    <div className="page-spacing">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, to, badge }: { icon: React.ReactNode; label: string; to: string; badge?: number }) {
    const location = useLocation();
    const active = location.pathname === to;

    return (
        <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
            ? 'bg-gradient-to-r from-[#F9A825]/10 to-transparent border border-[#F9A825]/20 shadow-[0_0_20px_rgba(249,168,37,0.1)]'
            : 'hover:bg-white/5 border border-transparent hover:border-white/5'
            }`}>
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F9A825] shadow-sm"></div>}
            <span className={`transition-colors duration-300 ${active ? 'text-[#F9A825] drop-shadow-[0_0_5px_rgba(249,168,37,0.5)]' : 'text-theme-secondary group-hover:text-[#F9A825]/70'}`}>{icon}</span>
            <span className={`font-bold tracking-wide text-sm transition-colors duration-300 flex-1 ${active ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>{label}</span>

            {badge !== undefined && (
                <div className="bg-[#F9A825] text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    +{badge}
                </div>
            )}
        </Link>
    );
}
