import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Power, CreditCard, Store, Tag, Settings, FileText } from 'lucide-react';
import { ChangePlanModal } from '../components/ChangePlanModal';

interface Vendor {
    id: string;
    business_name: string;
    type: 'mechanic' | 'battery' | 'parts';
    is_open: boolean;
    subscription_active: boolean;
    contact_number?: string;
    website_url?: string;
    social_facebook?: string;
    social_instagram?: string;
    business_summary?: string;
}

interface Subscription {
    id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    plan_id: string;
    plan: {
        id: string;
        name: string;
        price: number;
        features: string[];
    };
}

interface Category {
    id: string;
    name: string;
}

export default function Dashboard() {
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'subscription' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pendingAppData, setPendingAppData] = useState<any>(null);

    // Categories State
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [showChangePlanModal, setShowChangePlanModal] = useState(false);

    useEffect(() => {
        fetchVendorProfile();
    }, []);

    // Fetch categories when vendor is loaded
    useEffect(() => {
        if (vendor) {
            fetchCategories();
            fetchSubscription();
        }
    }, [vendor]);

    async function fetchVendorProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            setErrorMsg(error.message);
        }
        if (data) {
            setVendor(data);
        } else {
            // Fetch application data to pre-fill profile data
            const { data: appData } = await supabase
                .from('vendor_applications')
                .select('*')
                .ilike('email', user.email || '')
                .eq('status', 'approved')
                .single();

            if (appData) {
                setPendingAppData(appData);
            }
        }
        setLoading(false);
    }

    async function fetchSubscription() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(name, price, features)')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error fetching subscription:', error);
        }
        if (data) {
            setSubscription(data as any);
        }
    }

    async function cancelSubscription() {
        if (!subscription) return;
        if (!confirm('Are you sure you want to end your subscription? You will still have access until the end of your current billing period.')) return;
        setUpdating(true);

        const { error } = await supabase
            .from('subscriptions')
            .update({ cancel_at_period_end: true })
            .eq('id', subscription.id);

        if (!error) {
            setSubscription({ ...subscription, cancel_at_period_end: true });
        }
        setUpdating(false);
    }

    async function reactivateSubscription() {
        if (!subscription) return;
        setUpdating(true);

        const { error } = await supabase
            .from('subscriptions')
            .update({ cancel_at_period_end: false })
            .eq('id', subscription.id);

        if (!error) {
            setSubscription({ ...subscription, cancel_at_period_end: false });
        }
        setUpdating(false);
    }

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    async function fetchCategories() {
        if (!vendor) return;

        // 1. Fetch All Categories
        const { data: allCats } = await supabase.from('vendor_categories').select('*');
        if (allCats) setAvailableCategories(allCats);

        // 2. Fetch Selected Assignments
        const { data: assignments } = await supabase
            .from('vendor_category_assignments')
            .select('category_id')
            .eq('vendor_id', vendor.id);

        if (assignments) {
            setSelectedCategoryIds(new Set(assignments.map(a => a.category_id)));
        }
        setLoadingCategories(false);
    }

    async function toggleCategory(categoryId: string) {
        if (!vendor) return;

        // Optimistic UI Update
        const newSet = new Set(selectedCategoryIds);
        const isAdding = !newSet.has(categoryId);

        if (isAdding) {
            newSet.add(categoryId);
            // Insert
            await supabase.from('vendor_category_assignments').insert({
                vendor_id: vendor.id,
                category_id: categoryId
            });
        } else {
            newSet.delete(categoryId);
            // Delete
            await supabase.from('vendor_category_assignments')
                .delete()
                .eq('vendor_id', vendor.id)
                .eq('category_id', categoryId);
        }

        setSelectedCategoryIds(newSet);
    }

    async function toggleStatus() {
        if (!vendor) return;

        // Task 3: Check subscription status before opening
        if (!vendor.is_open) {
            if (!subscription || subscription.status !== 'active') {
                setErrorMsg("No active subscription. Please update your billing information or subscribe to open your store.");
                // Potentially switch to subscription tab
                setActiveTab('subscription');
                return;
            }
        }

        setUpdating(true);
        setErrorMsg(null);

        const newStatus = !vendor.is_open;
        const { error } = await supabase
            .from('vendors')
            .update({ is_open: newStatus })
            .eq('id', vendor.id);

        if (!error) {
            setVendor({ ...vendor, is_open: newStatus });
        } else {
            setErrorMsg(error.message);
        }
        setUpdating(false);
    }

    async function handleLogout() {
        await supabase.auth.signOut();
    }

    // Profile Management
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        business_summary: '',
        contact_number: '',
        website_url: '',
        social_facebook: '',
        social_instagram: ''
    });

    useEffect(() => {
        if (vendor) {
            setProfileForm({
                business_summary: vendor.business_summary || '',
                contact_number: vendor.contact_number || '',
                website_url: vendor.website_url || '',
                social_facebook: vendor.social_facebook || '',
                social_instagram: vendor.social_instagram || ''
            });
        }
    }, [vendor]);

    async function updateProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!vendor) return;
        setUpdating(true);

        const { error } = await supabase
            .from('vendors')
            .update(profileForm)
            .eq('id', vendor.id);

        if (!error) {
            setVendor({ ...vendor, ...profileForm });
            setIsEditingProfile(false);
        } else {
            setErrorMsg(error.message);
        }
        setUpdating(false);
    }

    // Simple onboarding if no profile exists
    async function createProfile(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setUpdating(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('vendors').insert({
            user_id: user.id,
            business_name: pendingAppData?.shop_name || 'New Vendor',
            shop_name: pendingAppData?.shop_name || 'New Vendor',
            shop_address: pendingAppData?.shop_address,
            lat: pendingAppData?.shop_lat,
            long: pendingAppData?.shop_long,
            type: new FormData(e.currentTarget).get('type'),
            email: user.email,
            is_open: false,
            subscription_active: true
        }).select().single();

        if (error) {
            console.error('Error creating profile:', error);
            setErrorMsg(error.message);
        } else if (data) {
            setVendor(data);
        }
        setUpdating(false);
    }

    if (loading) return <div className="p-8">Loading profile...</div>;

    if (!vendor) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950">
                <div className="glass-panel p-10 max-w-md w-full relative overflow-hidden animate-slide-up">
                    {/* Background Accents */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-amber-glow">
                            <Store className="text-amber-500" size={32} />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-2 text-white text-center">Complete Vendor Profile</h2>
                    <p className="text-slate-400 text-sm text-center mb-8 uppercase tracking-widest">Final Step to Partner Access</p>

                    {errorMsg && (
                        <div className="bg-red-500/10 text-red-200 p-4 rounded-xl mb-6 text-xs border border-red-500/30 font-medium">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={createProfile} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 pl-1">Business Name</label>
                            <input
                                name="business_name"
                                className="glass-input ring-1 ring-white/5 focus:ring-amber-500/30 opacity-60 cursor-not-allowed select-none"
                                value={pendingAppData?.shop_name || ''}
                                readOnly
                                placeholder="Loading from application..."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 pl-1">Business Type</label>
                            <div className="relative group">
                                <select
                                    name="type"
                                    className="glass-input appearance-none ring-1 ring-white/5 focus:ring-amber-500/30 cursor-pointer pr-10"
                                    required
                                >
                                    <option value="mechanic" className="bg-slate-900">Mechanic Service</option>
                                    <option value="battery" className="bg-slate-900">Battery Solutions</option>
                                    <option value="parts" className="bg-slate-900">Car Parts & Logistics</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-amber-500 transition-colors">
                                    <Tag size={16} />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={updating}
                            className="glass-button w-full py-4 text-amber-500 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:scale-[1.02] shadow-lg shadow-amber-500/5 mt-4"
                        >
                            {updating ? 'Initializing...' : 'CREATE VENDOR PROFILE'}
                        </button>

                        <button
                            onClick={handleLogout}
                            type="button"
                            className="text-[10px] font-bold text-slate-600 hover:text-white transition-all w-full mt-4 uppercase tracking-[0.3em]"
                        >
                            Sign Out Account
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6 pb-20 animate-fade-in">
            <header className="flex justify-between items-center mb-6 animate-slide-up">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
                        TOW<span className="text-amber-500">ME</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-l border-white/10 pl-2">Vendor</span>
                    </h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="p-1 bg-amber-500/10 rounded border border-amber-500/20">
                            <Store className="text-amber-500" size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{vendor.business_name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
                    >
                        Store
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'subscription' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}
                    >
                        Subscription
                    </button>
                    <button onClick={handleLogout} className="p-2 ml-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {errorMsg && (
                <div className="max-w-md mx-auto mb-6 bg-red-500/10 text-red-200 p-4 rounded-xl text-xs border border-red-500/30 font-medium flex items-center gap-3 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    {errorMsg}
                </div>
            )}

            <main className="max-w-md mx-auto space-y-6">
                {activeTab === 'dashboard' && (
                    <>
                        {/* Status Card */}
                        <div className="glass-panel p-8 flex flex-col items-center gap-6 relative overflow-hidden group animate-slide-up delay-100 ring-1 ring-white/5">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50"></div>

                            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 relative ${vendor.is_open
                                ? 'bg-green-500/10 border-2 border-green-500/30'
                                : 'bg-red-500/5 border-2 border-red-500/20'}`}>

                                {/* Glow Ring */}
                                <div className={`absolute inset-0 rounded-full blur-xl opacity-40 transition-all duration-700 ${vendor.is_open ? 'bg-green-400' : 'bg-red-500'}`}></div>

                                <Power size={48} className={`relative z-10 transition-colors duration-500 ${vendor.is_open ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-red-400'}`} />
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className={`text-3xl font-bold tracking-tight ${vendor.is_open ? 'text-green-400' : 'text-slate-400'}`}>
                                    {vendor.is_open ? 'ONLINE' : 'OFFLINE'}
                                </h2>
                                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
                                    Store Visibility: <span className={vendor.is_open ? 'text-green-400' : 'text-red-400'}>{vendor.is_open ? 'Visible' : 'Hidden'}</span>
                                </p>
                            </div>

                            <button
                                onClick={toggleStatus}
                                disabled={updating}
                                className={`w-full py-4 text-lg font-bold rounded-xl transition-all duration-300 border backdrop-blur-sm ${vendor.is_open
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                    : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:scale-[1.02]'}`}
                            >
                                {updating ? 'Updating Status...' : (vendor.is_open ? 'CLOSE STORE' : 'OPEN STORE')}
                            </button>
                        </div>

                        {/* Category Management */}
                        <div className="glass-panel p-6 animate-slide-up delay-150">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Tag size={20} />
                                </div>
                                <h3 className="font-bold text-slate-200">Service Categories</h3>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {loadingCategories ? (
                                    <div className="text-sm text-slate-500">Loading categories...</div>
                                ) : availableCategories.map(cat => {
                                    const isSelected = selectedCategoryIds.has(cat.id);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            disabled={updating}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${isSelected
                                                ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:bg-white/10'
                                                }`}
                                        >
                                            {cat.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'profile' && (
                    <div className="glass-panel p-6 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                    <FileText size={20} />
                                </div>
                                <h3 className="font-bold text-slate-200">Business Profile</h3>
                            </div>
                            <button
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className="text-xs font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider"
                            >
                                {isEditingProfile ? 'Cancel' : 'Edit Details'}
                            </button>
                        </div>

                        {isEditingProfile ? (
                            <form onSubmit={updateProfile} className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Business Summary</label>
                                    <textarea
                                        value={profileForm.business_summary}
                                        onChange={e => setProfileForm({ ...profileForm, business_summary: e.target.value })}
                                        className="glass-input w-full min-h-[100px] text-sm"
                                        placeholder="Describe your services..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Contact Number</label>
                                        <input
                                            value={profileForm.contact_number}
                                            onChange={e => setProfileForm({ ...profileForm, contact_number: e.target.value })}
                                            className="glass-input w-full text-sm"
                                            placeholder="+356..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Website</label>
                                        <input
                                            value={profileForm.website_url}
                                            onChange={e => setProfileForm({ ...profileForm, website_url: e.target.value })}
                                            className="glass-input w-full text-sm"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Facebook</label>
                                        <input
                                            value={profileForm.social_facebook}
                                            onChange={e => setProfileForm({ ...profileForm, social_facebook: e.target.value })}
                                            className="glass-input w-full text-sm"
                                            placeholder="Profile URL"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Instagram</label>
                                        <input
                                            value={profileForm.social_instagram}
                                            onChange={e => setProfileForm({ ...profileForm, social_instagram: e.target.value })}
                                            className="glass-input w-full text-sm"
                                            placeholder="Profile URL"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="w-full py-3 bg-amber-500 text-slate-900 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors"
                                >
                                    {updating ? 'Saving...' : 'Save Profile Changes'}
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {vendor.business_summary || 'No summary provided.'}
                                </p>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Contact</div>
                                        <div className="text-sm text-white">{vendor.contact_number || '---'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Website</div>
                                        <a href={vendor.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate block">
                                            {vendor.website_url || '---'}
                                        </a>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Socials</div>
                                        <div className="flex gap-2">
                                            {vendor.social_facebook && (
                                                <a href={vendor.social_facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-white text-xs underline">
                                                    Facebook
                                                </a>
                                            )}
                                            {vendor.social_instagram && (
                                                <a href={vendor.social_instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-white text-xs underline">
                                                    Instagram
                                                </a>
                                            )}
                                            {!vendor.social_facebook && !vendor.social_instagram && (
                                                <span className="text-xs text-slate-600">None</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Subscription Info Card */}
                        <div className="glass-panel p-8 relative overflow-hidden ring-1 ring-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>

                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 shadow-amber-glow">
                                        <CreditCard size={32} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-white">
                                            {subscription?.plan?.name || 'Loading Plan...'}
                                        </h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mt-1 font-medium">Subscription Billing</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-white">€{subscription?.plan?.price?.toFixed(2) || '0.00'}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Per Month</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <button
                                    onClick={() => setShowChangePlanModal(true)}
                                    className="w-full py-4 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(245,158,11,0.1)] group"
                                >
                                    <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                    Manage Subscription Plan
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Status</div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${subscription?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <span className={`text-sm font-bold uppercase ${subscription?.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                            {subscription?.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Next Billing Date</div>
                                    <div className="text-sm font-bold text-white">
                                        {formatDate(subscription?.current_period_end)}
                                    </div>
                                </div>
                            </div>

                            {subscription?.cancel_at_period_end ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-amber-200 leading-relaxed font-medium">
                                            Your subscription will end on <span className="text-white font-bold">{formatDate(subscription.current_period_end)}</span>.
                                            You will continue to have access until then.
                                        </p>
                                    </div>
                                    <button
                                        onClick={reactivateSubscription}
                                        disabled={updating}
                                        className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                                    >
                                        {updating ? 'Processing...' : 'Reactivate Subscription'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={cancelSubscription}
                                    disabled={updating || !subscription}
                                    className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)] text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                                >
                                    {updating ? 'Processing...' : 'End Subscription'}
                                </button>
                            )}
                        </div>

                        {subscription?.plan?.features && subscription.plan.features.length > 0 && (
                            <div className="glass-panel p-6 bg-blue-500/5 border-blue-500/10">
                                <h4 className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <Tag size={12} /> {subscription.plan.name} Benefits
                                </h4>
                                <ul className="space-y-3">
                                    {subscription.plan.features.map((benefit: string, i: number) => (
                                        <li key={i} className="flex items-center gap-3 text-xs text-slate-400">
                                            <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                            {benefit}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <ChangePlanModal
                isOpen={showChangePlanModal}
                onClose={() => setShowChangePlanModal(false)}
                currentPlanId={subscription?.plan_id}
                onPlanUpdate={fetchSubscription}
            />
        </div>
    );
}
