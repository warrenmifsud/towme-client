import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useProgressiveLocation } from '../hooks/useProgressiveLocation';
import { ArrowLeft, Wrench, Battery, Settings, Search, MapPin, Phone, Globe, Facebook, Instagram } from 'lucide-react';

interface Vendor {
    id: string;
    business_name: string;
    is_open: boolean;
    category_ids: string[];
    img_url?: string;
    lat?: number;
    long?: number;
    contact_number?: string;
    website_url?: string;
    social_facebook?: string;
    social_instagram?: string;
    business_summary?: string;
    shop_address?: string;
    distance?: number;
}

function VendorSkeleton() {
    return (
        <div className="glass-panel p-4 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-white/10 rounded"></div>
                        <div className="h-3 w-20 bg-white/5 rounded"></div>
                    </div>
                </div>
                <div className="h-6 w-16 bg-white/5 rounded-full"></div>
            </div>
            <div className="h-px bg-white/5 my-3"></div>
            <div className="space-y-2 mb-4">
                <div className="h-3 w-full bg-white/5 rounded"></div>
                <div className="h-3 w-2/3 bg-white/5 rounded"></div>
            </div>
            <div className="h-10 w-full bg-white/5 rounded-2xl"></div>
        </div>
    );
}

export default function Vendors() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('');
    const queryClient = useQueryClient();

    // Progressive Location Hook (Instant Load)
    const { location: userLocation } = useProgressiveLocation();

    // TanStack Query: Vendor Categories (Cached)
    const { data: categories = [] } = useQuery({
        queryKey: ['vendor-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendor_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // TanStack Query: Vendors (Cached)
    const { data: vendors = [] } = useQuery<Vendor[]>({
        queryKey: ['vendors'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendors')
                .select(`*, vendor_category_assignments (category_id)`)
                .eq('subscription_active', true);

            if (error) throw error;

            // Map to include category_ids
            return (data || []).map((v: any) => ({
                ...v,
                category_ids: v.vendor_category_assignments.map((a: any) => a.category_id)
            })) as Vendor[];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Set initial active tab when categories load
    useEffect(() => {
        if (!activeTab && categories.length > 0) {
            setActiveTab(categories[0].id);
        }
    }, [categories, activeTab]);

    // Real-time subscription for live updates
    useEffect(() => {
        const subscription = supabase
            .channel('vendors_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
                queryClient.invalidateQueries({ queryKey: ['vendors'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_categories' }, () => {
                queryClient.invalidateQueries({ queryKey: ['vendor-categories'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_category_assignments' }, () => {
                queryClient.invalidateQueries({ queryKey: ['vendors'] });
            })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [queryClient]);

    // High-performance sorting and filtering with cached location
    const processedVendors = useMemo(() => {
        let list = [...vendors];

        // 1. Calculate Distances (if user location available)
        if (userLocation) {
            list = list.map(v => ({
                ...v,
                distance: (v.lat && v.long) ? calculateDistance(userLocation.lat, userLocation.lng, v.lat, v.long) : undefined
            }));
            // 2. Sort by distance (nearest first)
            list.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        }

        // 3. Status Sort (Open first)
        list.sort((a, b) => (a.is_open === b.is_open ? 0 : a.is_open ? -1 : 1));

        return list;
    }, [vendors, userLocation]);

    const filteredVendors = useMemo(() =>
        processedVendors.filter(v => v.category_ids?.includes(activeTab)),
        [processedVendors, activeTab]);

    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    return (
        <div className="min-h-screen p-4 pb-24 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate('/')} className="px-5 py-3 glass-button rounded-2xl hover:bg-white/10 transition-colors flex items-center gap-3 group">
                    <ArrowLeft size={18} className="text-amber-500 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Go Back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-tight text-white">Find a <span className="text-amber-500">Pro</span></h1>
                    <p className="text-xs text-slate-500 font-medium">Verified partners near you</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl whitespace-nowrap transition-all duration-500 font-bold border ${activeTab === cat.id
                            ? 'bg-amber-500 border-amber-400 text-black shadow-gold-glow scale-105'
                            : 'bg-glass-100 border-white/5 text-slate-400 hover:bg-glass-200'
                            }`}
                    >
                        {cat.name.toLowerCase().includes('mechanic') ? <Wrench size={16} /> :
                            cat.name.toLowerCase().includes('battery') ? <Battery size={16} /> :
                                cat.name.toLowerCase().includes('part') ? <Settings size={16} /> :
                                    <Search size={16} />}
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-6">
                {vendors.length === 0 ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => <VendorSkeleton key={i} />)}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="text-center glass-panel p-12 animate-slide-up">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="text-slate-600" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No matches found</h3>
                        <p className="text-sm text-slate-500">Try selecting a different category.</p>
                    </div>
                ) : (
                    filteredVendors.map((vendor, idx) => (
                        <div
                            key={vendor.id}
                            className="glass-panel p-5 group hover:border-amber-500/30 transition-all duration-500 animate-slide-up"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-500 group-hover:scale-110 ${vendor.is_open ? 'bg-amber-500/10 text-amber-500 shadow-inner-gold' : 'bg-white/5 text-slate-600 opacity-50'}`}>
                                        {vendor.img_url ? <img src={vendor.img_url} className="w-full h-full object-cover rounded-2xl" /> : <span>🏢</span>}
                                    </div>
                                    <div>
                                        <h3 className={`font-black text-lg tracking-tight ${!vendor.is_open ? 'text-slate-500' : 'text-white'}`}>{vendor.business_name}</h3>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
                                            <MapPin size={12} className="text-amber-500/50" />
                                            <span className="truncate max-w-[200px]">{vendor.shop_address || 'Malta'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black border tracking-widest ${vendor.is_open
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-500/50'
                                    }`}>
                                    {vendor.is_open ? 'AVAILABLE' : 'OFFLINE'}
                                </div>
                            </div>

                            {vendor.business_summary && (
                                <p className="text-sm text-slate-400 leading-relaxed mb-6 px-1">
                                    {vendor.business_summary}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                {vendor.contact_number && (
                                    <a
                                        href={`tel:${vendor.contact_number}`}
                                        className="flex-[2] glass-button-gold py-4 text-sm uppercase tracking-tighter"
                                    >
                                        <Phone size={18} fill="currentColor" /> Call Store
                                    </a>
                                )}

                                <div className="flex gap-2">
                                    {vendor.website_url && (
                                        <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white hover:border-amber-500/30 transition-all duration-300">
                                            <Globe size={18} />
                                        </a>
                                    )}
                                    {(vendor.social_facebook || vendor.social_instagram) && (
                                        <div className="flex gap-2">
                                            {vendor.social_facebook && (
                                                <a href={vendor.social_facebook} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:bg-white/10 hover:text-blue-400 hover:border-blue-500/30 transition-all duration-300">
                                                    <Facebook size={18} />
                                                </a>
                                            )}
                                            {vendor.social_instagram && (
                                                <a href={vendor.social_instagram} target="_blank" rel="noopener noreferrer" className="p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:bg-white/10 hover:text-pink-400 hover:border-pink-500/30 transition-all duration-300">
                                                    <Instagram size={18} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {vendor.distance !== undefined && (
                                    <div className="ml-auto text-[10px] font-black text-amber-500/40 uppercase tracking-widest whitespace-nowrap">
                                        {vendor.distance.toFixed(1)} km away
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
