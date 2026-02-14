import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Save, AlertCircle, DollarSign, Percent, Clock } from 'lucide-react';
import BRAND_SETTINGS from '../../../config/brand_settings.json';

interface CompensationProfileProps {
    driverId: string;
    onUpdate?: () => void;
}

export const CompensationProfile: React.FC<CompensationProfileProps> = ({ driverId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State
    const [payoutType, setPayoutType] = useState<'COMMISSION' | 'FIXED_WAGE'>('COMMISSION');
    const [commissionRate, setCommissionRate] = useState<number>(BRAND_SETTINGS.financials.commission_rate * 100);
    const [hourlyRate, setHourlyRate] = useState<number>(0.0);

    useEffect(() => {
        fetchProfile();
    }, [driverId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('driver_status')
                .select('payout_type, partner_commission_rate, hourly_rate')
                .eq('driver_id', driverId)
                .single();

            if (error) throw error;

            if (data) {
                setPayoutType(data.payout_type as any || 'COMMISSION');
                setCommissionRate(data.partner_commission_rate ?? 15.0);
                setHourlyRate(data.hourly_rate ?? 0.0);
            }
        } catch (err: any) {
            console.error('Error fetching compensation profile:', err);
            // Default to defaults if columns missing (pre-migration safety)
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const { error } = await supabase
                .from('driver_status')
                .update({
                    payout_type: payoutType,
                    partner_commission_rate: commissionRate,
                    hourly_rate: hourlyRate
                })
                .eq('driver_id', driverId);

            if (error) throw error;

            if (onUpdate) onUpdate();
            alert('Compensation Profile Updated');
        } catch (err: any) {
            console.error('Error saving profile:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse h-48 bg-slate-50 rounded-xl" />;

    return (
        <div className="bg-white border text-left border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h3 className="text-[#1A1C2E] font-bold text-sm uppercase tracking-wide">Compensation Profile</h3>
                    <p className="text-xs text-slate-400">Financial Structure & Rates</p>
                </div>
                <div className="p-2 bg-green-50 rounded-full">
                    <DollarSign className="w-4 h-4 text-green-600" />
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* GOLD STANDARD PAYOUT TOGGLE */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Payout Structure</label>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${payoutType === 'COMMISSION' ? 'bg-[#F9A825]/10 text-[#F9A825]' : 'bg-slate-100 text-slate-500'}`}>
                            {payoutType === 'COMMISSION' ? 'Performance Based' : 'Fixed Rate'}
                        </span>
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex relative">
                        {/* Sliding Background (Visual refinement would need Framer Motion, using conditional classes for now) */}
                        <button
                            onClick={() => setPayoutType('COMMISSION')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${payoutType === 'COMMISSION'
                                ? 'bg-white shadow-sm text-[#1A1C2E] ring-1 ring-black/5'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Percent className={`w-4 h-4 ${payoutType === 'COMMISSION' ? 'text-[#F9A825]' : 'text-slate-400'}`} />
                            Commission
                        </button>
                        <button
                            onClick={() => setPayoutType('FIXED_WAGE')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${payoutType === 'FIXED_WAGE'
                                ? 'bg-white shadow-sm text-[#1A1C2E] ring-1 ring-black/5'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Clock className={`w-4 h-4 ${payoutType === 'FIXED_WAGE' ? 'text-[#F9A825]' : 'text-slate-400'}`} />
                            Fixed Wage
                        </button>
                    </div>

                    {/* VISUAL SPLIT PREVIEW */}
                    <div className="pt-2">
                        <div className="h-4 w-full rounded-full overflow-hidden flex">
                            <div
                                style={{ width: payoutType === 'COMMISSION' ? `${100 - commissionRate}%` : '100%' }}
                                className="h-full bg-emerald-500 transition-all duration-500 relative group"
                            >
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/90 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Driver</span>
                            </div>
                            <div
                                style={{ width: payoutType === 'COMMISSION' ? `${commissionRate}%` : '0%' }}
                                className="h-full bg-[#1A1C2E] transition-all duration-500 relative group"
                            >
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#F9A825] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">TowMe</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mt-1">
                            <span>Driver Net: {payoutType === 'COMMISSION' ? `${100 - commissionRate}%` : '100%'}</span>
                            <span>TowMe: {payoutType === 'COMMISSION' ? `${commissionRate}%` : '0%'}</span>
                        </div>
                    </div>
                </div>

                {/* RATE INPUTS */}
                <div className="grid grid-cols-1 gap-4">
                    {payoutType === 'COMMISSION' ? (
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Partner Commission Rate (%)</label>
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                                    step="0.1"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 pr-10 font-bold text-[#1A1C2E] outline-none group-focus-within:border-[#F9A825] transition-colors"
                                />
                                <Percent className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-[10px] text-slate-400">Platform Fee deduction rate.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Hourly Wage (€)</label>
                            <div className="relative group">
                                <span className="absolute left-3 top-3.5 font-bold text-slate-400">€</span>
                                <input
                                    type="number"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
                                    step="0.5"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 pl-8 font-bold text-[#1A1C2E] outline-none group-focus-within:border-[#F9A825] transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Base rate per online hour.</p>
                        </div>
                    )}
                </div>

                {/* ERROR */}
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* SAVE ACTION */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-[#1A1C2E] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#1A1C2E]/90 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                    {!saving && <Save className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
};
