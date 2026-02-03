import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, CheckCircle2, XCircle, FileText, Truck, Building2, User, Phone, MapPin, Mail } from 'lucide-react';
import GlassDropdown from '../components/GlassDropdown';

interface Driver {
    id: string;
    full_name: string;
    email: string;
    is_driver: boolean;
    driver_categories: string[];
}

interface ServiceCategory {
    id: string;
    name: string;
}

interface Application {
    id: string;
    created_at: string;
    application_type: 'single' | 'fleet';
    company_name: string;
    owner_name: string;
    vat_number: string;
    email: string;
    phone: string;
    address: string;
    tow_truck_types: string[];
    status: 'pending' | 'approved' | 'rejected' | 'contacted';
}

export default function Drivers() {
    const [activeTab, setActiveTab] = useState<'drivers' | 'applications'>('drivers');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        fetchCategories();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'drivers') {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('is_driver', true);
                if (error) throw error;
                setDrivers(data || []);
            } else {
                const { data, error } = await supabase
                    .from('driver_applications')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setApplications(data || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchCategories() {
        const { data } = await supabase.from('service_categories').select('id, name');
        setCategories(data || []);
    }

    const toggleCategory = async (driverId: string, currentCategories: string[], categoryId: string) => {
        let newCategories;
        if (currentCategories.includes(categoryId)) {
            newCategories = currentCategories.filter(id => id !== categoryId);
        } else {
            newCategories = [...currentCategories, categoryId];
        }

        const { error } = await supabase
            .from('profiles')
            .update({ driver_categories: newCategories })
            .eq('id', driverId);

        if (!error) fetchData();
    };

    const updateApplicationStatus = async (id: string, status: string) => {
        await supabase.from('driver_applications').update({ status }).eq('id', id);
        fetchData();
    };

    return (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-theme-primary">
                        Fleet Management
                    </h2>
                    <p className="text-theme-secondary mt-1 font-medium">Manage active drivers and review new partnerships</p>
                </div>

                <div className="glass-panel p-1 flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'drivers'
                            ? 'bg-orange-500 text-slate-950 shadow-lg'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'}`}
                    >
                        <Truck size={16} strokeWidth={2.5} />
                        Active Fleet
                    </button>
                    <button
                        onClick={() => setActiveTab('applications')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'applications'
                            ? 'bg-orange-500 text-slate-950 shadow-lg'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'}`}
                    >
                        <FileText size={16} strokeWidth={2.5} />
                        New Applications
                        {applications.filter(a => a.status === 'pending').length > 0 && (
                            <span className="bg-red-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-red-400/50 shadow-lg shadow-red-500/20">
                                {applications.filter(a => a.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="text-center py-20 text-theme-secondary font-bold uppercase tracking-widest text-xs flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-amber-500 animate-spin"></div>
                    Loading Fleet Data...
                </div>
            ) : (
                <>
                    {activeTab === 'drivers' && (
                        <div className="grid grid-cols-1 gap-6">
                            {drivers.map((driver) => (
                                <div key={driver.id} className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:border-amber-500/30 transition-all group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center text-amber-500 font-black text-xl shadow-lg group-hover:scale-105 transition-transform">
                                            {driver.full_name?.[0] || 'D'}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-theme-primary group-hover:text-amber-400 transition-colors">{driver.full_name}</h3>
                                            <p className="text-theme-secondary text-sm font-medium">{driver.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 max-w-xl">
                                        <p className="text-[10px] text-theme-secondary font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Shield size={12} className="text-amber-500" />
                                            Assigned Service Categories
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => {
                                                const isAssigned = driver.driver_categories?.includes(cat.id);
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => toggleCategory(driver.id, driver.driver_categories || [], cat.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isAssigned
                                                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                                                            : 'surface-inner text-theme-secondary hover:border-white/10 hover:text-theme-primary'
                                                            }`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${driver.is_driver
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                            }`}>
                                            {driver.is_driver ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <XCircle size={14} strokeWidth={2.5} />}
                                            {driver.is_driver ? 'ACTIVE' : 'SUSPENDED'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {drivers.length === 0 && (
                                <div className="glass-panel p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                                    <Truck size={48} className="text-slate-800" />
                                    <p className="font-medium">No active drivers found within the fleet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'applications' && (
                        <div className="grid grid-cols-1 gap-6">
                            {applications.map((app) => (
                                <div key={app.id} className="glass-panel p-6 hover:border-amber-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg border border-white/10 ${app.application_type === 'fleet'
                                                ? 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-amber-500/20 text-slate-950'
                                                : 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-amber-500/20'}`}>
                                                {app.application_type === 'fleet' ? <Building2 size={28} /> : <Truck size={28} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-xl font-bold text-theme-primary tracking-tight">{app.company_name}</h3>
                                                    <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-md border ${app.application_type === 'fleet'
                                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300'}`}>
                                                        {app.application_type === 'fleet' ? 'Fleet Operator' : 'Sole Owner'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 text-sm flex items-center gap-2 font-medium">
                                                    <User size={14} className="text-slate-600" /> {app.owner_name}
                                                    <span className="text-slate-700">•</span>
                                                    VAT: {app.vat_number}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <GlassDropdown
                                                value={app.status}
                                                onChange={(value) => updateApplicationStatus(app.id, value)}
                                                options={[
                                                    { value: 'pending', label: 'Pending Review', color: 'amber' },
                                                    { value: 'contacted', label: 'Contacted', color: 'blue' },
                                                    { value: 'approved', label: 'Approved', color: 'green' },
                                                    { value: 'rejected', label: 'Rejected', color: 'red' }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 surface-inner rounded-2xl mb-4 group-hover:border-white/10 transition-colors">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-theme-secondary font-medium">
                                                <Mail size={16} className="text-slate-600" />
                                                {app.email}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-theme-secondary font-medium">
                                                <Phone size={16} className="text-slate-600" />
                                                {app.phone}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-theme-secondary font-medium">
                                                <MapPin size={16} className="text-slate-600" />
                                                {app.address}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Vehicle Types</p>
                                            <div className="flex flex-wrap gap-2">
                                                {app.tow_truck_types?.map((type, i) => (
                                                    <span key={i} className="surface-badge text-slate-400">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right text-[10px] text-theme-secondary font-bold uppercase tracking-widest">
                                        Received: {new Date(app.created_at).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            ))}
                            {applications.length === 0 && (
                                <div className="glass-panel p-20 text-center text-theme-secondary flex flex-col items-center gap-4">
                                    <FileText size={48} className="text-theme-secondary" />
                                    <p className="font-medium">No pending applications.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
