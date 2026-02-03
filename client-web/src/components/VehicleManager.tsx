import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Car, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    license_plate: string;
    color: string;
}

interface VehicleManagerProps {
    onSelect: (vehicleId: string) => void;
    selectedId: string | null;
}

export default function VehicleManager({ onSelect, selectedId }: VehicleManagerProps) {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // New Vehicle Form
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [plate, setPlate] = useState('');
    const [color, setColor] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (!user) return;

        const controller = new AbortController();
        fetchVehicles(controller.signal);

        return () => {
            controller.abort();
        };
    }, [user]);

    const fetchVehicles = async (signal?: AbortSignal) => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('client_id', user?.id)
                .order('created_at', { ascending: false })
                .abortSignal(signal as any); // Type cast if needed, or pass via generic if Supabase supports it directly in this version

            if (error) throw error;
            if (signal?.aborted) return;

            setVehicles(data || []);

            // Auto-select the first vehicle if none selected
            if (data && data.length > 0 && !selectedId) {
                onSelect(data[0].id);
            }
        } catch (err: any) {
            // Robust check for AbortError (sometimes wrapped by Supabase or different browser implementations)
            const isAbort =
                err.name === 'AbortError' ||
                err.message?.includes('AbortError') ||
                err.message?.includes('aborted');

            if (isAbort) return;

            console.error('Error fetching vehicles:', err);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .insert([{
                    client_id: user?.id,
                    make,
                    model,
                    license_plate: plate,
                    color
                }])
                .select();

            if (error) throw error;

            const newVehicle = data[0];
            setVehicles([newVehicle, ...vehicles]);
            onSelect(newVehicle.id);
            setShowAdd(false);
            resetForm();
        } catch (err) {
            alert('Failed to add vehicle');
        } finally {
            setAdding(false);
        }
    };

    const resetForm = () => {
        setMake('');
        setModel('');
        setPlate('');
        setColor('');
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-white">Your Vehicles</h3>
                {!showAdd && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-full"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add New
                    </button>
                )}
            </div>

            {showAdd ? (
                <div className="glass-panel p-5 space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-blue-400 uppercase tracking-wider">New Vehicle Details</h4>
                        <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400">Cancel</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Make</label>
                            <input value={make} onChange={e => setMake(e.target.value)} className="glass-input text-sm p-3" placeholder="Toyota" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Model</label>
                            <input value={model} onChange={e => setModel(e.target.value)} className="glass-input text-sm p-3" placeholder="Camry" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Plate Number</label>
                            <input value={plate} onChange={e => setPlate(e.target.value)} className="glass-input text-sm p-3" placeholder="ABC-123" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Color</label>
                            <input value={color} onChange={e => setColor(e.target.value)} className="glass-input text-sm p-3" placeholder="Silver" />
                        </div>
                    </div>

                    <button
                        onClick={handleAddVehicle}
                        disabled={adding || !make || !model}
                        className="w-full py-3 bg-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Save Vehicle</>}
                    </button>
                </div>
            ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                    {vehicles.length === 0 ? (
                        <div className="w-full py-6 bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 italic">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">No vehicles registered yet</p>
                        </div>
                    ) : (
                        vehicles.map(vehicle => {
                            const isSelected = selectedId === vehicle.id;
                            return (
                                <div
                                    key={vehicle.id}
                                    onClick={() => onSelect(vehicle.id)}
                                    className={`
                                        min-w-[180px] p-6 rounded-[32px] border transition-all duration-500 relative overflow-hidden group cursor-pointer
                                        ${isSelected
                                            ? 'bg-amber-500/10 border-amber-500/40 shadow-gold-glow scale-[1.05] z-10'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                                        }
                                    `}
                                >
                                    <div className={`
                                        w-12 h-12 rounded-2xl flex items-center justify-center mb-5
                                        ${isSelected ? 'bg-amber-500 text-black shadow-gold-glow' : 'bg-slate-900 text-slate-600'}
                                    `}>
                                        <Car className="w-6 h-6" />
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className={`font-black text-sm tracking-tight transition-colors ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                            {vehicle.make} {vehicle.model}
                                        </h4>
                                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">
                                            {vehicle.license_plate || 'Registry'}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <CheckCircle2 className="absolute top-6 right-6 w-4 h-4 text-amber-500 animate-in zoom-in duration-500" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
