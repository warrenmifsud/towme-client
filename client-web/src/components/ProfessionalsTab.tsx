import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Wrench, Battery, Settings, Search, MapPin, Phone, Globe, Facebook, Instagram } from 'lucide-react';

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

interface ProfessionalsTabProps {
    location: { lat: number; lng: number };
}

function VendorSkeleton() {
    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 animate-pulse">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10"></div>
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
            </div>
        </div>
    );
}

export default function ProfessionalsTab({ location }: ProfessionalsTabProps) {
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        const subscription = supabase
            .channel('vendors_tab_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => fetchData())
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    const fetchData = async () => {
        // distinct loading state not always needed for re-fetches but good for initial
        if (vendors.length === 0) setLoading(true);
        try {
            const [catsRes, vendorsRes] = await Promise.all([
                supabase.from('vendor_categories').select('*').order('name', { ascending: true }),
                supabase.from('vendors').select(`*, vendor_category_assignments (category_id)`).eq('subscription_active', true)
            ]);

            if (catsRes.data) {
                setCategories(catsRes.data);
                if (!activeCategory && catsRes.data.length > 0) setActiveCategory(catsRes.data[0].id);
            }

            if (vendorsRes.data) {
                const mapped = vendorsRes.data.map((v: any) => ({
                    ...v,
                    category_ids: v.vendor_category_assignments.map((a: any) => a.category_id)
                }));
                setVendors(mapped);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const processedVendors = useMemo(() => {
        let list = [...vendors];

        // 1. Calculate Distances relative to map selection
        if (location) {
            list = list.map(v => ({
                ...v,
                distance: (v.lat && v.long) ? calculateDistance(location.lat, location.lng, v.lat, v.long) : undefined
            }));
            // 2. Sort by distance (nearest first)
            list.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        }

        // 3. Status Sort (Open first)
        list.sort((a, b) => (a.is_open === b.is_open ? 0 : a.is_open ? -1 : 1));

        return list;
    }, [vendors, location]);

    const filteredVendors = useMemo(() =>
        processedVendors.filter(v => v.category_ids?.includes(activeCategory)),
        [processedVendors, activeCategory]);

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
        <div className="h-full flex flex-col">
            {/* Categories Header */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide px-6 pt-4 flex-shrink-0">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 text-xs font-bold border ${activeCategory === cat.id
                            ? 'bg-amber-500 border-amber-400 text-black shadow-lg scale-105'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        {cat.name.toLowerCase().includes('mechanic') ? <Wrench size={14} /> :
                            cat.name.toLowerCase().includes('battery') ? <Battery size={14} /> :
                                cat.name.toLowerCase().includes('part') ? <Settings size={14} /> :
                                    <Search size={14} />}
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4 scrollbar-hide">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <VendorSkeleton key={i} />)}
                    </div>
                ) : filteredVendors.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="text-slate-600" size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">No pros found</h3>
                        <p className="text-xs text-slate-500">Try a different category.</p>
                    </div>
                ) : (
                    filteredVendors.map((vendor) => (
                        <div
                            key={vendor.id}
                            className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-amber-500/30 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3 self-start">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${vendor.is_open ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-slate-600 opacity-50'}`}>
                                        {vendor.img_url ? <img src={vendor.img_url} className="w-full h-full object-cover rounded-xl" /> : <span>🏢</span>}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm leading-tight ${!vendor.is_open ? 'text-slate-500' : 'text-white'}`}>{vendor.business_name}</h3>
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-1">
                                            <MapPin size={10} className="text-amber-500/50" />
                                            <span className="truncate max-w-[150px]">{vendor.shop_address || 'Malta'}</span>
                                        </div>
                                    </div>
                                </div>

                                {vendor.distance !== undefined && (
                                    <div className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest whitespace-nowrap bg-black/20 px-2 py-1 rounded-lg">
                                        {vendor.distance.toFixed(1)} km
                                    </div>
                                )}
                            </div>

                            {/* Status & Summary */}
                            <div className="flex items-center justify-between mb-3">
                                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black border tracking-widest ${vendor.is_open
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-500/50'
                                    }`}>
                                    {vendor.is_open ? 'OPEN' : 'CLOSED'}
                                </div>
                            </div>

                            {vendor.business_summary && (
                                <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                                    {vendor.business_summary}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {vendor.contact_number && (
                                    <a
                                        href={`tel:${vendor.contact_number}`}
                                        className="flex-1 bg-amber-500 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg"
                                    >
                                        <Phone size={14} fill="currentColor" /> Call
                                    </a>
                                )}

                                <div className="flex gap-2">
                                    {vendor.website_url && (
                                        <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
                                            <Globe size={14} />
                                        </a>
                                    )}
                                    {vendor.social_facebook && (
                                        <a href={vendor.social_facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-blue-400 transition-colors">
                                            <Facebook size={14} />
                                        </a>
                                    )}
                                    {vendor.social_instagram && (
                                        <a href={vendor.social_instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-slate-400 hover:text-pink-400 transition-colors">
                                            <Instagram size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
