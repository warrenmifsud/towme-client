import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, MapPin, Mail, Circle, Loader2 } from 'lucide-react';
import PageContainer from '../components/PageContainer';

interface Vendor {
    id: string;
    business_name: string;
    shop_name: string; // From our migration
    shop_address: string;
    email: string;
    type: 'mechanic' | 'battery' | 'parts';
    is_open: boolean;
    subscription_active: boolean;
    created_at: string;
}

export default function Vendors() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendors();
    }, []);

    async function fetchVendors() {
        // We select * because we added columns in migration. 
        // If migration didn't run, this might miss data, but code is correct per logic.
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching vendors:', error);
        } else if (data) {
            setVendors(data);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-theme-secondary">
                <Loader2 className="animate-spin mr-2" /> Loading active vendors...
            </div>
        );
    }

    return (
        <PageContainer
            title="Active Vendors"
            subtitle="Manage registered service providers"
            actions={
                <div className="glass-panel px-4 py-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-theme-primary">{vendors.length}</span>
                    <span className="text-xs font-bold text-theme-secondary uppercase tracking-widest">Total</span>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map(vendor => (
                    <div key={vendor.id} className="glass-panel p-6 hover:border-amber-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="surface-icon-container text-slate-400 group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
                                <Store size={24} />
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${vendor.is_open ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-700'}`}>
                                <Circle size={6} fill="currentColor" />
                                {vendor.is_open ? 'Online' : 'Offline'}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-theme-primary mb-1">{vendor.shop_name || vendor.business_name}</h3>
                        <p className="text-xs text-theme-secondary uppercase tracking-widest mb-4">{vendor.type}</p>

                        <div className="space-y-3">
                            {/* Location */}
                            <div className="flex items-start gap-3 text-sm text-theme-secondary">
                                <MapPin size={16} className="text-theme-secondary/50 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{vendor.shop_address || 'No address set'}</span>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-3 text-sm text-theme-secondary">
                                <Mail size={16} className="text-theme-secondary/50 shrink-0" />
                                <span className="truncate">{vendor.email || 'No email'}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                            <div className={`text-xs font-bold ${vendor.subscription_active ? 'text-green-500' : 'text-red-500'}`}>
                                {vendor.subscription_active ? 'SUBSCRIPTION ACTIVE' : 'SUBSCRIPTION INACTIVE'}
                            </div>
                        </div>
                    </div>
                ))}

                {vendors.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-500">
                        <div className="w-16 h-16 rounded-full surface-icon-container mx-auto mb-4">
                            <Store size={32} />
                        </div>
                        <p>No active vendors found.</p>
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
