import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, AlertTriangle, Filter, Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AddAssetModal } from './AddAssetModal';

const BRAND = { primary: '#F9A825', white: '#FFFFFF', text: '#1A1C2E' };

interface VehicleAsset {
    id: string;
    plate: string;
    vin: string;
    status: string;
    vehicle_class: string;
    driver_name?: string;
    driver_id?: string | null;
    location_name?: string;
    is_orphaned: boolean;
}

export const AssetAudit = () => {
    const [vehicles, setVehicles] = useState<VehicleAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOrphaned, setShowOrphaned] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchFleet = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('fleet_assets')
                .select(`
            id,
            license_plate,
            vin,
            make,
            model,
            is_verified,
            driver_id,
            status
        `);

            if (error) throw error;

            const mappedVehicles = data?.map(v => {
                const assetStatus = v.status || (v.driver_id ? 'ASSIGNED' : 'AVAILABLE');
                const isOrphaned = assetStatus === 'ORPHANED' || (!v.driver_id && v.is_verified);

                return {
                    id: v.id,
                    plate: v.license_plate,
                    vin: v.vin || 'N/A',
                    status: assetStatus,
                    vehicle_class: `${v.make} ${v.model}`,
                    driver_name: v.driver_id ? 'ASSIGNED' : (isOrphaned ? 'ORPHANED' : 'UNASSIGNED'),
                    driver_id: v.driver_id,
                    location_name: 'Home Base',
                    is_orphaned: isOrphaned
                };
            }) || [];

            setVehicles(mappedVehicles);

        } catch (err) {
            console.error("Fleet Sync Failed", err);
            setVehicles([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchFleet(); }, []);

    const filteredVehicles = showOrphaned
        ? vehicles
        : vehicles.filter(v => v.status !== 'ORPHANED' && v.status !== 'AVAILABLE');

    const orphanCount = vehicles.filter(v => v.is_orphaned).length;

    return (
        <div className="p-6 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold uppercase" style={{ color: BRAND.text }}>
                    Global Fleet Assets | <span style={{ color: BRAND.primary }}>TowMe Command</span>
                </h1>
                <div className="flex items-center gap-3">
                    {orphanCount > 0 && (
                        <div style={{
                            background: '#FFF8E1', border: '1.5px solid #F9A825', borderRadius: 8,
                            padding: '6px 12px', fontSize: 11, fontWeight: 800, color: '#E65100',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <AlertTriangle size={14} /> {orphanCount} ORPHANED
                        </div>
                    )}
                    <button
                        onClick={() => setShowOrphaned(!showOrphaned)}
                        className="p-2 border rounded shadow-sm hover:bg-gray-50 flex items-center gap-1"
                        style={{
                            fontSize: 10, fontWeight: 800,
                            color: showOrphaned ? BRAND.primary : '#999',
                            borderColor: showOrphaned ? BRAND.primary : '#E5E5E5'
                        }}
                    >
                        <Filter size={14} /> {showOrphaned ? 'ALL' : 'ACTIVE'}
                    </button>
                    <button onClick={fetchFleet} className="p-2 bg-white border rounded shadow-sm hover:bg-gray-50">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8,
                            background: BRAND.primary, color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                            boxShadow: '0 3px 12px rgba(249,168,37,0.3)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={14} /> ADD ASSET
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3">Vehicle / VIN</div>
                    <div className="col-span-2">Class</div>
                    <div className="col-span-3">Current Driver / Lana Territory</div>
                    <div className="col-span-3 text-right">Telemetry Actions</div>
                </div>

                {filteredVehicles.length === 0 && !loading ? (
                    <div className="p-20 text-center">
                        <div style={{ color: BRAND.primary, fontSize: 40, marginBottom: 12 }}>⬡</div>
                        <div style={{ color: BRAND.text, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>NO FLEET ASSETS REGISTERED</div>
                        <div style={{ color: '#888', fontSize: 12 }}>Add physical vehicles to begin fleet operations.</div>
                    </div>
                ) : (
                    filteredVehicles.map((v) => (
                        <div key={v.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b last:border-0 hover:bg-[#FFFBF2]">
                            <div className="col-span-1">
                                <div className={`h-2.5 w-2.5 rounded-full ${v.status === 'ASSIGNED' ? 'bg-green-500'
                                    : v.status === 'ORPHANED' ? 'bg-amber-500'
                                        : 'bg-gray-300'
                                    }`} />
                            </div>
                            <div className="col-span-3">
                                <div className="font-bold text-sm text-[#1A1C2E]">{v.plate}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{v.vin}</div>
                            </div>
                            <div className="col-span-2 text-xs font-bold text-gray-600 uppercase">{v.vehicle_class}</div>
                            <div className="col-span-3">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${v.driver_name === 'ORPHANED' ? 'text-amber-600' : 'text-[#1A1C2E]'
                                        }`}>
                                        {v.driver_name}
                                    </span>
                                    {v.is_orphaned && (
                                        <span style={{
                                            background: '#F9A825', color: '#fff', fontSize: 8, fontWeight: 900,
                                            padding: '2px 6px', borderRadius: 4, letterSpacing: '0.1em'
                                        }}>
                                            REASSIGNMENT REQUIRED
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-400">Lana-Sector: {v.location_name}</div>
                            </div>
                            <div className="col-span-3 flex justify-end gap-2">
                                <button className="p-2 text-gray-400 hover:text-[#F9A825]"><MapPin size={16} /></button>
                                <button
                                    className="px-3 py-1.5 rounded text-[10px] font-bold uppercase"
                                    disabled={!v.driver_id}
                                    style={{
                                        backgroundColor: v.driver_id ? BRAND.primary : '#E5E5E5',
                                        color: v.driver_id ? '#fff' : '#999',
                                        cursor: v.driver_id ? 'pointer' : 'not-allowed',
                                        opacity: v.driver_id ? 1 : 0.6
                                    }}
                                >
                                    {v.driver_id ? 'Track Asset' : 'No Driver'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AddAssetModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAssetAdded={fetchFleet}
            />
        </div>
    );
};

