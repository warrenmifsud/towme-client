import { useState, useEffect, useRef } from 'react';

import { supabase } from '../lib/supabase';
import { X, MapPin, Store, User, FileText, Mail, Loader2 } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId?: string | null;
}

export function RegistrationModal({ isOpen, onClose, applicationId }: RegistrationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-slide-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-600 mb-2">
                        {applicationId ? 'Update Application' : 'TowMe Partner Registration'}
                    </h2>
                    <p className="text-slate-400 text-sm mb-8">
                        {applicationId ? 'Please review the requested changes and update your application.' : 'Join our network of premium service providers.'}
                    </p>

                    {GOOGLE_MAPS_API_KEY ? (
                        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                            <RegistrationForm onClose={onClose} applicationId={applicationId} />
                        </APIProvider>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center text-red-200">
                            <h3 className="font-bold text-lg mb-2">Configuration Error</h3>
                            <p>Google Maps API Key is missing. Please contact the administrator.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RegistrationForm({ onClose, applicationId }: { onClose: () => void, applicationId?: string | null }) {
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [offers, setOffers] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        business_legal_name: '',
        representative_name: '',
        email: '',
        shop_name: '',
        shop_address: '',
        business_summary: '',
        contact_number: '',
        website_url: '',
        social_facebook: '',
        social_instagram: ''
    });
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    // Google Maps Places Autocomplete
    const placesLibrary = useMapsLibrary('places');
    const [placesService, setPlacesService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [placesSessionToken, setPlacesSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showPredictions, setShowPredictions] = useState(false);
    const geocoder = useRef<google.maps.Geocoder | null>(null);

    useEffect(() => {
        if (!placesLibrary) return;
        setPlacesService(new placesLibrary.AutocompleteService());
        setPlacesSessionToken(new placesLibrary.AutocompleteSessionToken());
        geocoder.current = new google.maps.Geocoder();
    }, [placesLibrary]);

    // Fetch Plans and Offers
    useEffect(() => {
        async function fetchPlans() {
            const { data: plansData } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (plansData) setPlans(plansData);

            // Fetch active offers for new users
            const { data: offersData } = await supabase
                .from('subscription_offers')
                .select('*')
                .eq('is_active', true)
                .eq('apply_to_new_users', true);

            if (offersData) setOffers(offersData);
        }
        fetchPlans();
    }, []);

    // Fetch existing data if editing
    useEffect(() => {
        if (applicationId) {
            async function fetchApp() {
                setLoading(true);
                const { data } = await supabase
                    .from('vendor_applications')
                    .select('*')
                    .eq('id', applicationId)
                    .single();

                if (data) {
                    setFormData({
                        business_legal_name: data.business_legal_name,
                        representative_name: data.representative_name,
                        email: data.email,
                        shop_name: data.shop_name,
                        shop_address: data.shop_address,
                        business_summary: data.business_summary || '',
                        contact_number: data.contact_number || '',
                        website_url: data.website_url || '',
                        social_facebook: data.social_facebook || '',
                        social_instagram: data.social_instagram || ''
                    });
                    if (data.shop_lat && data.shop_long) {
                        setCoords({ lat: data.shop_lat, lng: data.shop_long });
                    }
                    if (data.rejection_reason) {
                        setRejectionReason(data.rejection_reason);
                    }
                    if (data.subscription_plan_id) {
                        setSelectedPlanId(data.subscription_plan_id);
                    }
                }
                setLoading(false);
            }
            fetchApp();
        }
    }, [applicationId]);

    const handleAddressInput = (value: string) => {
        setFormData(prev => ({ ...prev, shop_address: value }));

        if (!placesService || !value) {
            setPredictions([]);
            return;
        }

        placesService.getPlacePredictions({
            input: value,
            sessionToken: placesSessionToken || undefined
        }, (results: google.maps.places.AutocompletePrediction[] | null) => {
            setPredictions(results || []);
            setShowPredictions(true);
        });
    };

    const handleSelectPrediction = (placeId: string, description: string) => {
        setFormData(prev => ({ ...prev, shop_address: description }));
        setShowPredictions(false);

        if (geocoder.current) {
            geocoder.current.geocode({ placeId }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    setCoords({ lat: location.lat(), lng: location.lng() });
                }
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPlanId) {
            alert("Please select a subscription plan to proceed.");
            return;
        }

        setLoading(true);

        try {

            if (applicationId) {
                // UPDATE existing
                const { error: updateError } = await supabase
                    .from('vendor_applications')
                    .update({
                        ...formData,
                        shop_lat: coords?.lat,
                        shop_long: coords?.lng,
                        status: 'pending', // Reset to pending for review
                        rejection_reason: null // Clear rejection reason
                    })
                    .eq('id', applicationId);

                if (updateError) throw updateError;
            } else {
                // Find applicable offer
                const planOffer = offers.find(o => o.plan_id === selectedPlanId) || offers.find(o => !o.plan_id);

                // INSERT new
                const { error: insertError } = await supabase.from('vendor_applications').insert({
                    ...formData,
                    shop_lat: coords?.lat,
                    shop_long: coords?.lng,
                    status: 'pending',
                    subscription_agreed: true,
                    subscription_plan_id: selectedPlanId,
                    offer_id: planOffer?.id
                });

                if (insertError) throw insertError;
            }

            // Trigger Email Notification (Non-blocking)
            // For updates, we might want a 'updates_submitted' email, but 'application_received' is fine or we can skip
            if (!applicationId) {
                const selectedPlan = plans.find(p => p.id === selectedPlanId);
                const planOffer = offers.find(o => o.plan_id === selectedPlanId) || offers.find(o => !o.plan_id);
                supabase.functions.invoke('send-email', {
                    body: {
                        type: 'application_received',
                        email: formData.email,
                        data: {
                            subscription_price: planOffer ? planOffer.discount_price : selectedPlan?.price
                        }
                    }
                });
            }

            alert(applicationId ? 'Application Updated Successfully! It is now back in review.' : 'Application Submitted Successfully! Please check your email for confirmation.');
            onClose();

        } catch (err: any) {
            console.error('Error submitting application:', err);
            alert('Failed to submit application: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {rejectionReason && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl animate-fade-in mb-6">
                    <h4 className="text-red-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2 mb-2">
                        <Loader2 className="animate-pulse" size={14} /> Action Required
                    </h4>
                    <p className="text-red-200 text-sm">{rejectionReason}</p>
                    <p className="text-red-200/50 text-xs mt-2 font-mono">Please update your application to address these issues.</p>
                </div>
            )}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Business Legal Name</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-slate-500" size={18} />
                            <input
                                required
                                name="business_legal_name"
                                value={formData.business_legal_name}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="Legal Entity Ltd."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Representative Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-500" size={18} />
                            <input
                                required
                                name="representative_name"
                                value={formData.representative_name}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="Full Name"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Contact Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            required
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="glass-input pl-10"
                            placeholder="partners@business.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Shop Name (Public)</label>
                    <div className="relative">
                        <Store className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            required
                            name="shop_name"
                            value={formData.shop_name}
                            onChange={handleChange}
                            className="glass-input pl-10"
                            placeholder="Joe's Auto Parts"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Contact Number</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500">📞</span>
                            <input
                                required
                                name="contact_number"
                                value={formData.contact_number}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="+356 1234 5678"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Website (Optional)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500">🌐</span>
                            <input
                                name="website_url"
                                value={formData.website_url}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Facebook (Optional)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500">f</span>
                            <input
                                name="social_facebook"
                                value={formData.social_facebook}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="Facebook Page URL"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Instagram (Optional)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-500">📸</span>
                            <input
                                name="social_instagram"
                                value={formData.social_instagram}
                                onChange={handleChange}
                                className="glass-input pl-10"
                                placeholder="Instagram Profile URL"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Shop Location</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            required
                            value={formData.shop_address}
                            onChange={(e) => handleAddressInput(e.target.value)}
                            className="glass-input pl-10"
                            placeholder="Start typing specific address..."
                            autoComplete="off"
                        />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showPredictions && predictions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 glass-panel bg-slate-900 border border-white/10 max-h-60 overflow-y-auto">
                            {predictions.map((prediction) => (
                                <button
                                    key={prediction.place_id}
                                    type="button"
                                    onClick={() => handleSelectPrediction(prediction.place_id, prediction.description)}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-slate-300 transition-colors border-b border-white/5 last:border-0"
                                >
                                    {prediction.description}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Business Summary</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-3 text-slate-500" size={18} />
                        <textarea
                            required
                            name="business_summary"
                            value={formData.business_summary}
                            onChange={handleChange}
                            className="glass-input pl-10 min-h-[100px] py-3"
                            placeholder="Briefly describe your services and products..."
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2 block">Subscription Plan Selection</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map(plan => {
                            const isSelected = selectedPlanId === plan.id;
                            const planOffer = offers.find(o => o.plan_id === plan.id) || offers.find(o => !o.plan_id);
                            const price = planOffer ? planOffer.discount_price : plan.price;

                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`rounded - xl border p - 4 cursor - pointer transition - all duration - 300 relative overflow - hidden group ${isSelected
                                            ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                        } `}
                                >
                                    {/* Glow Effect */}
                                    {isSelected && (
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                    )}

                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`font - bold text - base ${isSelected ? 'text-white' : 'text-slate-300'} `}>{plan.name}</h3>
                                                {planOffer && (
                                                    <span className={`bg - green - 500 / 20 text - green - 400 text - [10px] px - 2 py - 0.5 rounded - full font - bold ${isSelected ? 'animate-pulse' : ''} `}>OFFER</span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{plan.description}</p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                                            <div className="text-right">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-bold text-white">€{price.toFixed(2)}</span>
                                                    {planOffer && (
                                                        <span className="text-xs text-slate-500 line-through">€{plan.price.toFixed(2)}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-500 block">/ month</span>
                                            </div>

                                            {/* Checkbox Visual */}
                                            <div className={`w - 5 h - 5 rounded border flex items - center justify - center transition - colors ${isSelected ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-slate-600'
                                                } `}>
                                                {isSelected && <X size={14} className="rotate-45" strokeWidth={4} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="glass-button w-full py-3 flex items-center justify-center gap-2 group"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                {loading ? 'Submitting Application...' : 'Submit Registration'}
            </button>
        </form>
    );
}
