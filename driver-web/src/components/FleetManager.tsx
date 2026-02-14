import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Truck, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

export const FleetManager = () => {
    const [loading, setLoading] = useState(true);
    const [fleet, setFleet] = useState<any>(null);
    const [assets, setAssets] = useState<any[]>([]);

    useEffect(() => {
        loadFleetData();
    }, []);

    const loadFleetData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Profile & Fleet ID
            const { data: profile } = await supabase.from('profiles').select('fleet_id').eq('id', user.id).single();

            if (profile?.fleet_id) {
                // 2. Get Fleet Details
                const { data: fleetData } = await supabase.from('fleets').select('*').eq('id', profile.fleet_id).single();
                setFleet(fleetData);

                // 3. Get Assets
                const { data: assetData } = await supabase.from('fleet_assets').select('*').eq('fleet_id', profile.fleet_id);
                setAssets(assetData || []);
            }
        } catch (error) {
            console.error('Fleet Manager Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#F9A825]" /></div>;

    if (!fleet) return (
        <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200">
            <Building2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-900">No Fleet Assigned</h3>
            <p className="text-red-600">Your account is not linked to a fleet. Please contact support.</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-slide-up p-4">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black tracking-tighter text-[#1A1C2E] mb-2">{fleet.name}</h2>
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                        Active Fleet
                    </span>
                    <span className="text-slate-400 text-xs font-medium">ID: {fleet.id}</span>
                </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 gap-4">
                {assets.map(asset => (
                    <div key={asset.id} className="bg-white p-4 border border-slate-100 rounded-xl shadow-sm hover:border-[#F9A825]/30 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-[#F9A825] transition-colors">
                                <Truck size={20} />
                            </div>
                            {asset.is_verified ? (
                                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                    <ShieldCheck size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Verified</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                    <AlertCircle size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">Pending</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-lg font-bold text-[#1A1C2E]">{asset.make} {asset.model}</h3>
                        <p className="text-slate-500 text-sm mb-4">{asset.todo_truck_year}</p>

                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">License Plate</p>
                            <p className="font-mono text-lg font-bold text-[#1A1C2E] tracking-wider bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                                {asset.license_plate}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
