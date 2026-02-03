import { useState, useEffect } from 'react';
import { LayoutDashboard, Layers, Users, MapPin, Truck, ChevronRight, Command, Store, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface GlassLayoutProps {
    children: React.ReactNode;
}

export function GlassLayout({ children }: GlassLayoutProps) {
    const [pendingVendors, setPendingVendors] = useState(0);
    const [pendingDrivers, setPendingDrivers] = useState(0);

    useEffect(() => {
        fetchPendingCount();

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

    async function fetchPendingCount() {
        // Vendor Count
        const { count: vendorCount } = await supabase
            .from('vendor_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .eq('is_read', false); // Only count unread

        setPendingVendors(vendorCount || 0);

        // Driver Count (Single Partners)
        const { count: driverCount } = await supabase
            .from('driver_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .eq('application_type', 'single');

        setPendingDrivers(driverCount || 0);
    }

    return (
        <div className="min-h-screen text-theme-primary flex font-sans selection:bg-amber-500/30 transition-colors duration-500">
            {/* Sidebar - Liquid Glass Effect */}
            <aside className="w-72 m-4 flex flex-col fixed h-[calc(100vh-2rem)] glass-panel z-50 overflow-hidden border-white/5">
                {/* Ambient Glow in Sidebar */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none"></div>

                <div className="flex items-center gap-4 mb-10 px-4 pt-4 relative z-10">
                    <div className="w-12 h-12 surface-inner rounded-2xl shadow-xl flex items-center justify-center group cursor-pointer hover:scale-105 transition-transform duration-500">
                        <Truck size={24} className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-theme-primary">TowMe</h1>
                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em] opacity-80">Admin Console</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 px-2 relative z-10 overflow-y-auto">
                    <div className="px-4 pb-2 text-[10px] font-black text-theme-secondary/70 uppercase tracking-widest">Operations</div>
                    <NavItem icon={<LayoutDashboard size={20} />} label="Overview" to="/" />
                    <NavItem icon={<Command size={20} />} label="Mission Control" to="/dispatch" />
                    <NavItem icon={<MapPin size={20} />} label="Live Fleet Map" to="/fleet-map" />
                    <NavItem icon={<Truck size={20} />} label="Dispatch Queue" to="/drivers" />

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
                        icon={<Truck size={20} />} // Or UserCheck
                        label="Partner Requests"
                        to="/driver-applications"
                        badge={pendingDrivers > 0 ? pendingDrivers : undefined}
                    />
                    <NavItem icon={<Layers size={20} />} label="Service Matrix" to="/categories" />

                    <div className="px-4 pb-2 mt-6 text-[10px] font-black text-theme-secondary/70 uppercase tracking-widest">System</div>
                    <NavItem icon={<Settings size={20} />} label="Vendor Settings" to="/vendor-settings" />
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="surface-inner p-3 flex items-center gap-3 cursor-pointer group hover:bg-white/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg text-slate-950 font-bold text-sm">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-100 truncate group-hover:text-amber-400 transition-colors">Admin User</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">System Op</p>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-500 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-80 p-8 relative z-0">
                {/* Ambient Background Light for Content Area */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none"></div>

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
            ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
            : 'hover:bg-white/5 border border-transparent hover:border-white/5'
            }`}>
            {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>}
            <span className={`transition-colors duration-300 ${active ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]' : 'text-theme-secondary group-hover:text-amber-200'}`}>{icon}</span>
            <span className={`font-bold tracking-wide text-sm transition-colors duration-300 flex-1 ${active ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>{label}</span>

            {badge !== undefined && (
                <div className="bg-amber-500 text-[10px] font-black text-slate-900 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">
                    +{badge}
                </div>
            )}
        </Link>
    );
}
