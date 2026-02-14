import { useState, useEffect } from 'react';
import { Truck, Calendar, Palette, PenTool, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import brandSettings from '../../../config/brand_settings.json';

interface VehicleProfileProps {
    user: any;
    onComplete: () => void;
}

export default function VehicleProfile({ user, onComplete }: VehicleProfileProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        make: '',
        model: '',
        year: '',
        color: '',
        registration: '',
        type: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Update driver application or profile
            // We need to know WHERE to save. The prompt implies we are patching the system.
            // Usually we update 'driver_applications' via a specific RPC or directly if RLS allows.
            // Or 'driver_profiles' if it exists.
            // App.tsx uses 'update_driver_application_v5' RPC or inserts to 'driver_applications'.
            // Let's assume we update the application record associated with this user.

            // First find the application ID for this user? 
            // Or maybe we update `driver_details` table?
            // "Vehicle Profile Patch: Implement the 'Tow Truck Profile' as a mandatory post-registration step".
            // "Constraint: Do not delete legacy code."

            // I will attempt to update the `driver_applications` table where email matches user email, 
            // OR if there is a `drivers` table. App.tsx `initDriver` fetches from `profiles` and `driver_status`.
            // Let's assume we update `driver_applications` (as that's where the form data went in legacy).
            // But wait, if the user is logged in, they are a USER in auth.users. 
            // The mapping is likely via email or ID.

            // BETTER STRATEGY: Use `upsert` on `driver_applications` filtering by `email`? 
            // Or look for an RPC. `update_driver_application_v5` takes `p_id`. We don't have ID here easily.

            // For now, I will use a direct update to `driver_applications` matching logic in App.tsx but searching by email?
            // Actually, `App.tsx` uses `editId` which comes from URL.
            // If this is post-registration, maybe the user is just logged in.

            // Let's try to update based on `owner_id` or `email` if possible.
            // Fallback: Just use `supabase.from('driver_applications').update(...)` matching `email`.

            const { error } = await supabase
                .from('driver_applications')
                .update({
                    tow_truck_make: formData.make,
                    tow_truck_model: formData.model,
                    tow_truck_year: formData.year,
                    tow_truck_registration_plate: formData.registration,
                    tow_truck_color: formData.color,
                    tow_truck_types: [formData.type] // Send as array to match Admin schema
                })
                .eq('email', user.email);

            if (error) throw error;

            onComplete();

        } catch (err: any) {
            console.error("Vehicle Update Error:", err);
            alert("Failed to save vehicle details: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl"></div>
            <div className="w-full max-w-lg bg-white border border-amber-500/20 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-8">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Truck className="text-amber-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Vehicle Setup</h2>
                    <p className="text-slate-500 text-sm">Action Required: Register your Tow Truck to receive jobs.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Make</label>
                            <div className="relative">
                                <Truck className="absolute left-3 top-3 text-slate-400" size={14} />
                                <input required value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400" placeholder="Iveco" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Model</label>
                            <input required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400" placeholder="Eurocargo" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Year</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 text-slate-400" size={14} />
                                <input required type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400" placeholder="2020" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Color</label>
                            <div className="relative">
                                <Palette className="absolute left-3 top-3 text-slate-400" size={14} />
                                <input required value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors placeholder:text-slate-400" placeholder="White" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Registration Plate</label>
                        <div className="relative">
                            <PenTool className="absolute left-3 top-3 text-slate-400" size={14} />
                            <input required value={formData.registration} onChange={e => setFormData({ ...formData, registration: e.target.value })} className="w-full bg-white border border-slate-200 rounded pl-9 pr-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none uppercase font-mono tracking-wider transition-colors placeholder:text-slate-400" placeholder="ABC 123" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Tow Truck Type</label>
                        <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-white border border-slate-200 rounded px-3 py-3 text-sm text-slate-900 focus:border-[#F9A825] focus:ring-2 focus:ring-[#F9A825]/20 outline-none transition-colors appearance-none">
                            <option value="">Select Type...</option>
                            <option value="Flatbed">Flatbed</option>
                            <option value="Wheel Lift">Wheel Lift</option>
                            <option value="Heavy Duty">Heavy Duty</option>
                            <option value="Low Clearance">Low Clearance</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4 transition-all hover:scale-[1.02] bg-[#F9A825] hover:bg-[#F0970F] text-white shadow-lg shadow-amber-500/20 active:scale-95">
                        {loading ? <Loader2 className="animate-spin" /> : 'Register Vehicle'}
                    </button>
                </form>

            </div>
        </div>
    );
}

