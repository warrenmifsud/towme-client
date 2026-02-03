import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Tag, Loader2, CreditCard, Gift, Save, Check, Users, X } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    color_hex: string;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    description: string;
    subscriber_count?: number;
}

interface Offer {
    id: string;
    name: string;
    discount_price: number;
    duration_months: number;
    is_active: boolean;
    apply_to_new_users: boolean;
    apply_to_current_users: boolean;
    plan_id?: string;
}

export default function VendorSettings() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [activeTab, setActiveTab] = useState<'categories' | 'plans' | 'offers'>('categories');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Task 2: View Users State
    const [viewingPlanUsers, setViewingPlanUsers] = useState<{ planName: string, users: any[] } | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (activeTab === 'categories') fetchCategories();
        if (activeTab === 'plans') fetchPlans();
        if (activeTab === 'offers') fetchOffers();
    }, [activeTab]);

    async function fetchCategories() {
        setLoading(true);
        const { data } = await supabase
            .from('vendor_categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (data) setCategories(data);
        setLoading(false);
    }

    async function fetchPlans() {
        setLoading(true);
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*, subscriptions(count)')
            .order('price', { ascending: true });

        if (error) console.error('Error fetching plans:', error);
        if (data) {
            setPlans(data.map(p => ({
                ...p,
                subscriber_count: p.subscriptions ? p.subscriptions[0].count : 0
            })));
        }
        setLoading(false);
    }

    async function fetchOffers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('subscription_offers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching offers:', error);
        if (data) setOffers(data);
        setLoading(false);
    }

    async function handleViewUsers(plan: Plan) {
        setLoadingUsers(true);
        try {
            // 1. Fetch user IDs from subscriptions
            const { data: subs, error: subError } = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('plan_id', plan.id);

            if (subError) throw subError;

            if (!subs || subs.length === 0) {
                setViewingPlanUsers({ planName: plan.name, users: [] });
                setLoadingUsers(false);
                return;
            }

            const userIds = subs.map(s => s.user_id);

            // 2. Fetch vendor details for those IDs
            const { data: vendors, error: vendorError } = await supabase
                .from('vendors')
                .select('business_name, email') // Note: email is in vendors table based on createProfile function in Dashboard.tsx
                .in('user_id', userIds);

            if (vendorError) throw vendorError;

            // Map to expected format
            const mappedUsers = vendors?.map(v => ({
                shop_name: v.business_name,
                email: v.email
            })) || [];

            setViewingPlanUsers({ planName: plan.name, users: mappedUsers });

        } catch (err: any) {
            console.error('Error viewing users:', err);
            alert('Error fetching users: ' + err.message);
        } finally {
            setLoadingUsers(false);
        }
    }

    async function handleUpdatePlan(plan: Plan) {
        setUpdating(true);
        const { error } = await supabase
            .from('subscription_plans')
            .update({ price: plan.price })
            .eq('id', plan.id);

        if (error) alert('Error updating plan: ' + error.message);
        setUpdating(false);
    }

    async function handleToggleOffer(offer: Offer) {
        setUpdating(true);
        const { error } = await supabase
            .from('subscription_offers')
            .update({ is_active: !offer.is_active })
            .eq('id', offer.id);

        if (!error) {
            setOffers(offers.map(o => o.id === offer.id ? { ...o, is_active: !o.is_active } : o));
        }
        setUpdating(false);
    }

    async function handleOfferSetting(offer: Offer, field: 'apply_to_new_users' | 'apply_to_current_users') {
        const newValue = !offer[field];
        setUpdating(true);
        const { error } = await supabase
            .from('subscription_offers')
            .update({ [field]: newValue })
            .eq('id', offer.id);

        if (!error) {
            setOffers(offers.map(o => o.id === offer.id ? { ...o, [field]: newValue } : o));
        }
        setUpdating(false);
    }

    async function handleCreateOffer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const planId = formData.get('plan_id') as string;
        const applyToCurrent = formData.get('apply_to_current_users') === 'on';

        const newOffer = {
            name: formData.get('name') as string,
            discount_price: parseFloat(formData.get('discount_price') as string),
            duration_months: parseInt(formData.get('duration_months') as string),
            is_active: true,
            apply_to_new_users: true,
            apply_to_current_users: applyToCurrent,
            plan_id: planId || null
        };

        setUpdating(true);
        const { data, error } = await supabase
            .from('subscription_offers')
            .insert(newOffer)
            .select()
            .single();

        if (error) {
            alert('Error creating offer: ' + error.message);
        } else if (data) {
            setOffers([data, ...offers]);

            // Task 5: Notify vendors if applying to current users
            if (applyToCurrent) {
                notifyVendorsOfOffer(data, planId);
            }

            e.currentTarget.reset();
        }
        setUpdating(false);
    }

    async function notifyVendorsOfOffer(offer: any, planId: string | null) {
        // Fetch vendors on this plan (or all if planId is null)
        let query = supabase.from('subscriptions').select('user_id, plan:subscription_plans(name, price), profiles(email, shop_name)');
        if (planId) {
            query = query.eq('plan_id', planId);
        }

        const { data: subs } = await query;
        if (!subs) return;

        for (const sub of subs) {
            const profile = (sub as any).profiles;
            const plan = (sub as any).plan;
            if (profile?.email) {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'subscription_offer',
                        email: profile.email,
                        data: {
                            shop_name: profile.shop_name,
                            plan_name: plan?.name,
                            offer_name: offer.name,
                            original_price: plan?.price,
                            discount_price: offer.discount_price,
                            duration_months: offer.duration_months
                        }
                    }
                });
            }
        }
    }

    async function handleCreatePlan(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newPlan = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            description: formData.get('description') as string,
            features: (formData.get('features') as string).split(',').map(f => f.trim())
        };

        setUpdating(true);
        const { data, error } = await supabase
            .from('subscription_plans')
            .insert(newPlan)
            .select()
            .single();

        if (error) {
            alert('Error creating plan: ' + error.message);
        } else if (data) {
            setPlans([...plans, data]);
            e.currentTarget.reset();
        }
        setUpdating(false);
    }

    async function handleAddCategory(e: React.FormEvent) {
        e.preventDefault();
        if (!newCategory.trim()) return;

        const { data, error } = await supabase
            .from('vendor_categories')
            .insert({ name: newCategory.trim() })
            .select()
            .single();

        if (error) {
            alert('Error adding category: ' + error.message);
        } else if (data) {
            setCategories([...categories, data]);
            setNewCategory('');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This will remove the category from all vendors.')) return;

        const { error } = await supabase
            .from('vendor_categories')
            .delete()
            .eq('id', id);

        if (!error) {
            setCategories(categories.filter(c => c.id !== id));
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-theme-primary">Vendor Settings</h2>
                    <p className="text-theme-secondary mt-1">Manage service categories and system configurations</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-amber-500 text-slate-900' : 'text-theme-secondary hover:text-theme-primary'}`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'plans' ? 'bg-amber-500 text-slate-900' : 'text-theme-secondary hover:text-theme-primary'}`}
                    >
                        Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('offers')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'offers' ? 'bg-amber-500 text-slate-900' : 'text-theme-secondary hover:text-theme-primary'}`}
                    >
                        Offers
                    </button>
                </div>
            </header>

            <div className="max-w-4xl">
                {activeTab === 'categories' && (
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Tag size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-theme-primary">Service Categories</h3>
                                <p className="text-xs text-theme-secondary">Define business types for vendors</p>
                            </div>
                        </div>

                        {/* Add Form */}
                        <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                            <input
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="e.g. Mechanic, Electrician..."
                                className="glass-input flex-1"
                            />
                            <button
                                type="submit"
                                disabled={!newCategory.trim()}
                                className="glass-button w-12 flex items-center justify-center disabled:opacity-50"
                            >
                                <Plus size={20} />
                            </button>
                        </form>

                        {/* List */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                <div className="text-center py-4 text-slate-500 flex justify-center">
                                    <Loader2 className="animate-spin" />
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="text-center py-4 text-slate-500 text-sm">
                                    No categories defined yet.
                                </div>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                        <span className="text-theme-primary font-medium">{cat.name}</span>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <CreditCard size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-theme-primary">Subscription Plans</h3>
                                <p className="text-xs text-theme-secondary">Manage pricing for vendor packages</p>
                            </div>
                        </div>

                        {/* Add Plan Form */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                            <h4 className="text-sm font-bold text-theme-primary mb-4 uppercase tracking-widest">Add New Plan</h4>
                            <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Plan Name</label>
                                    <input name="name" required placeholder="Pro Elite" className="glass-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Price (€)</label>
                                    <input name="price" required type="number" step="0.01" placeholder="25.00" className="glass-input" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Description</label>
                                    <input name="description" required placeholder="For large fleets..." className="glass-input" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Features (comma separated)</label>
                                    <input name="features" required placeholder="Feature 1, Feature 2..." className="glass-input" />
                                </div>
                                <button type="submit" disabled={updating} className="glass-button bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center justify-center gap-2 font-bold py-3.5 disabled:opacity-50">
                                    <Plus size={18} /> {updating ? 'ADDING...' : 'ADD PLAN'}
                                </button>
                            </form>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {loading ? (
                                <div className="col-span-2 text-center py-10">
                                    <Loader2 className="animate-spin mx-auto text-slate-500" />
                                </div>
                            ) : plans.length === 0 ? (
                                <div className="col-span-2 text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                                    <p className="text-slate-500 text-sm italic">No subscription plans found. Please ensure migrations are applied.</p>
                                </div>
                            ) : plans.map(plan => (
                                <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                                    <h4 className="font-bold text-lg text-theme-primary mb-1">{plan.name}</h4>
                                    <p className="text-xs text-slate-500 mb-6">{plan.description}</p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Monthly Price (€)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={plan.price}
                                                    onChange={(e) => setPlans(plans.map(p => p.id === plan.id ? { ...p, price: parseFloat(e.target.value) } : p))}
                                                    className="glass-input text-lg font-bold"
                                                />
                                                <button
                                                    onClick={() => handleUpdatePlan(plan)}
                                                    disabled={updating}
                                                    className="glass-button w-12 flex items-center justify-center text-amber-500 bg-amber-500/10 disabled:opacity-50"
                                                >
                                                    <Save size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Users size={14} />
                                            <span className="text-xs font-bold uppercase tracking-widest">{plan.subscriber_count || 0} Active Users</span>
                                        </div>
                                        <button
                                            onClick={() => handleViewUsers(plan)}
                                            disabled={loadingUsers}
                                            className="text-[10px] font-bold text-amber-500 hover:text-theme-primary transition-colors uppercase tracking-widest disabled:opacity-50"
                                        >
                                            {loadingUsers ? 'Loading...' : 'View Users'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Users List Modal */}
                        {viewingPlanUsers && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                                <div className="glass-panel w-full max-w-lg relative animate-slide-up max-h-[80vh] flex flex-col">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="font-bold text-theme-primary text-lg">{viewingPlanUsers.planName} Subscribers</h3>
                                        <button
                                            onClick={() => setViewingPlanUsers(null)}
                                            className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto custom-scrollbar">
                                        {viewingPlanUsers.users.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 italic">No active subscribers found for this plan.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {viewingPlanUsers.users.map((user, i) => (
                                                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-slate-300">
                                                            {user.shop_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-theme-primary">{user.shop_name || 'Unknown Shop'}</div>
                                                            <div className="text-xs text-slate-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/5 bg-white/5 text-center text-[10px] text-slate-500 uppercase tracking-widest">
                                        Total: {viewingPlanUsers.users.length} Users
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'offers' && (
                    <div className="space-y-6">
                        {/* New Offer Form */}
                        <div className="glass-panel p-6 border-green-500/10 bg-green-500/5">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                    <Gift size={20} />
                                </div>
                                <h3 className="font-bold text-theme-primary">Create New Offer</h3>
                            </div>

                            <form onSubmit={handleCreateOffer} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Offer Name</label>
                                    <input name="name" required placeholder="Winter Promo" className="glass-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Price (€)</label>
                                    <input name="discount_price" required type="number" step="0.01" placeholder="12.00" className="glass-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Months</label>
                                    <input name="duration_months" required type="number" placeholder="3" className="glass-input" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Target Plan</label>
                                    <select name="plan_id" className="glass-input text-xs">
                                        <option value="">All Plans</option>
                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" name="apply_to_current_users" className="accent-amber-500" />
                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Email Current Users</span>
                                    </label>
                                    <button type="submit" disabled={updating} className="glass-button w-full bg-green-500/10 text-green-400 border-green-500/30 flex items-center justify-center gap-2 font-bold py-3.5 disabled:opacity-50">
                                        <Plus size={18} /> {updating ? 'SENDING...' : 'CREATE'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Offers List */}
                        <div className="glass-panel p-6">
                            <h3 className="font-bold text-theme-primary mb-6">Active & Past Offers</h3>
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>
                                ) : offers.length === 0 ? (
                                    <p className="text-center py-10 text-slate-500 text-sm italic">No offers found.</p>
                                ) : offers.map(offer => (
                                    <div key={offer.id} className={`p-5 rounded-2xl border transition-all ${offer.is_active ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-60'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-theme-primary text-lg">{offer.name}</h4>
                                                <p className="text-xs text-green-400 font-medium mt-1">€{offer.discount_price.toFixed(2)} / month for {offer.duration_months} months</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleOffer(offer)}
                                                disabled={updating}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 ${offer.is_active ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}
                                            >
                                                {offer.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>

                                        <div className="flex gap-4 border-t border-white/5 pt-4 mt-2">
                                            <button
                                                onClick={() => handleOfferSetting(offer, 'apply_to_new_users')}
                                                disabled={updating}
                                                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${offer.apply_to_new_users ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'text-slate-500 border-white/10'}`}
                                            >
                                                {offer.apply_to_new_users ? <Check size={12} /> : null} New Users
                                            </button>
                                            <button
                                                onClick={() => handleOfferSetting(offer, 'apply_to_current_users')}
                                                disabled={updating}
                                                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${offer.apply_to_current_users ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'text-slate-500 border-white/10'}`}
                                            >
                                                {offer.apply_to_current_users ? <Check size={12} /> : null} Current Users
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
