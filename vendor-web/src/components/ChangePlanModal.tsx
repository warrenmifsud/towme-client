import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Check } from 'lucide-react';

interface ChangePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlanId?: string;
    onPlanUpdate: () => void;
}

export function ChangePlanModal({ isOpen, onClose, currentPlanId, onPlanUpdate }: ChangePlanModalProps) {
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
            setSelectedPlanId(currentPlanId || null);
        }
    }, [isOpen, currentPlanId]);

    async function fetchPlans() {
        setFetching(true);
        const { data } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (data) setPlans(data);
        setFetching(false);
    }

    async function handleUpdatePlan() {
        if (!selectedPlanId || selectedPlanId === currentPlanId) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('subscriptions')
                .update({
                    plan_id: selectedPlanId,
                    cancel_at_period_end: false // Reset cancellation if they upgrade/downgrade
                })
                .eq('user_id', user.id);

            if (error) throw error;

            alert('Subscription plan updated successfully!');
            onPlanUpdate();
            onClose();
        } catch (err: any) {
            alert('Failed to update plan: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-2xl relative animate-slide-up p-8">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Change Subscription Plan</h2>
                <p className="text-slate-400 text-sm mb-8">Choose a plan that best fits your business needs.</p>

                {fetching ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {plans.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-slate-500">No subscription plans found available.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {plans.map(plan => {
                                    const isSelected = selectedPlanId === plan.id;
                                    const isCurrent = currentPlanId === plan.id;

                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`rounded-xl border p-5 cursor-pointer transition-all duration-300 relative overflow-hidden group ${isSelected
                                                ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {/* Current Plan Badge */}
                                            {isCurrent && (
                                                <div className="absolute top-3 right-3 bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    CURRENT
                                                </div>
                                            )}

                                            <div className="relative z-10 h-full flex flex-col justify-between">
                                                <div>
                                                    <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{plan.name}</h3>
                                                    <p className="text-slate-400 text-xs leading-relaxed">{plan.description}</p>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                                                    <div>
                                                        <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>€{plan.price.toFixed(2)}</span>
                                                        <span className="text-[10px] text-slate-500 block">/ month</span>
                                                    </div>

                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-slate-600'}`}>
                                                        {isSelected && <Check size={14} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {plans.length > 0 && (
                            <button
                                onClick={handleUpdatePlan}
                                disabled={loading || selectedPlanId === currentPlanId}
                                className="glass-button w-full py-3 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                                {loading ? 'Updating Plan...' : (selectedPlanId === currentPlanId ? 'Current Plan Selected' : 'Confirm Change')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
