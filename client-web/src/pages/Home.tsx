import { useState } from 'react';
import { ArrowRight, Wrench, LogOut, Truck, Calendar, Battery, Search, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import GoogleMapsProvider from '../components/GoogleMapsProvider';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
// import { useProgressiveLocation } from '../hooks/useProgressiveLocation';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

import { THEME } from '../theme';

// DUMB COMPONENT: Just displays what it's given
function PickupAddressDisplay({ address, onAddressChange }: { address: string, onAddressChange?: (val: string) => void }) {
    const [internalAddress, setInternalAddress] = useState<string>('');

    // Phase 46: Conflict Resolution - Removed Recursive Fetch
    // The Parent (Home.tsx) now handles all location logic via Hybrid Parallel Strategy.
    useEffect(() => {
        // Sync internal state if prop changes and is valid
        if (address && address !== 'Locating...' && address !== 'Searching GPS...') {
            setInternalAddress(address);
        }
    }, [address]);

    // Phase 27 & 28: Visible Text & Input Liberation
    const displayValue = internalAddress || (address === 'Locating...' ? 'Searching GPS...' : address) || '';

    return (
        <div className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm relative">
            {/* Status Dot: Green if ready, Blue Pulse if thinking */}
            <div className={`w-2 h-2 rounded-full ${(!displayValue || displayValue === 'Searching GPS...') ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_0_4px_rgba(59,130,246,0.1)]`}></div>
            <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pickup</p>
                {/* FORCE VISIBILITY: Input Field Override */}
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => {
                        setInternalAddress(e.target.value);
                        if (onAddressChange) onAddressChange(e.target.value);
                    }}
                    onFocus={() => {
                        // Phase 39: Fix the Trap - Auto-clear error/status text (including "Locating...")
                        if (["Denied", "Searching", "Signal Lost", "Permission Blocked", "Locating"].some(key => displayValue.includes(key))) {
                            setInternalAddress("");
                            if (onAddressChange) onAddressChange("");
                        }
                    }}
                    placeholder="Enter Pickup Location"
                    className="w-full text-sm font-bold text-slate-900 bg-white opacity-100 placeholder:text-gray-500 border-none focus:ring-0 p-0 pr-8"
                    disabled={false}
                />
            </div>
        </div>
    );
}

import ServiceSelection from './ServiceSelection';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'MENU' | 'INPUT' | 'MAP'>('MENU');
    const [destination, setDestination] = useState<google.maps.places.PlaceResult | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [pickupAddress, setPickupAddress] = useState<string>('');
    // Phase 33: Restore State for Crash Fix


    // HOISTED LOGIC: Fetch location in background immediately
    // Phase 33: Silence Ghost Hook
    // const { location } = useProgressiveLocation();
    const location = null; // null override while disabled
    const geocodingLib = useMapsLibrary('geocoding');
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    // Phase 45 ref removed: const gpsLocked = useRef(false);

    // Initialize Geocoder
    useEffect(() => {
        if (geocodingLib && !geocoderRef.current) {
            geocoderRef.current = new geocodingLib.Geocoder();
        }
    }, [geocodingLib]);


    // Phase 53: Hybrid Parallel Strategy (Route Priority)
    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            // Fetch all address types (do not filter yet)
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // STRATEGY: Drivers need the STREET name (Route), not the Building Legal Address.
                // 1. Look for the "Route" (Street Name) result.
                const routeResult = data.results.find((r: any) => r.types.includes("route"));

                // 2. Fallback to specific building if no street name found.
                const bestResult = routeResult || data.results[0];

                let finalAddress = bestResult.formatted_address;

                // Clean up text (Remove Country/Postcodes for clean UI)
                finalAddress = finalAddress.replace(", Malta", "").replace(/\d{4}/g, "").trim();

                // Update State
                setPickupAddress(finalAddress);
            }
        } catch (error) {
            console.error("Geocoding Error:", error);
        }
    };

    // Phase 53: Hybrid Fetcher (Uber-Style Speed)
    const getSmartLocation = () => {
        setPickupAddress("Locating...");

        // TRACK 1: THE FAST TRACK (Google WiFi Location) - <500ms
        // This runs instantly so the user is never staring at "Searching..."
        const fetchFastPath = async () => {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    }
                );
                const data = await response.json();
                if (data.location) {
                    console.log("⚡ Fast Path (WiFi) Loaded");
                    reverseGeocode(data.location.lat, data.location.lng);
                }
            } catch (e) {
                console.warn("Fast path failed", e);
            }
        };

        // TRACK 2: THE ACCURATE TRACK (Device GPS) - 5-10 Seconds
        // This runs in the background and "refines" the location when ready.
        const fetchAccuratePath = () => {
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("🛰️ Accurate Path (GPS) Loaded");
                    // This overwrites the Fast Path with better data
                    reverseGeocode(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    console.warn("GPS Access failed or timed out. Staying with Fast Path data.");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        };

        // EXECUTE BOTH SIMULTANEOUSLY
        fetchFastPath();     // Instant gratification
        fetchAccuratePath(); // Precision refinement
    };

    // Phase 48: Auto-Execute
    useEffect(() => {
        getSmartLocation();
    }, []);



    // Background Geocoding
    useEffect(() => {
        if (!location || !geocoderRef.current) return;

        // Debounce to prevent thrashing
        const timeoutId = setTimeout(() => {
            geocoderRef.current?.geocode({ location }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    // Priority: Route > Neighborhood > Non-Plus-Code
                    // Discard "Plus Codes" (e.g. XC4F+3J6)
                    const bestResult = results.find(r => r.types.includes('route'))
                        || results.find(r => r.types.includes('neighborhood'))
                        || results.find(r => !r.formatted_address?.includes('+') || r.formatted_address.length > 15)
                        || results[0];

                    const formatted = bestResult.formatted_address;
                    if (formatted !== pickupAddress) {
                        setPickupAddress(formatted);
                        console.log('Home: Address Resolved ->', formatted);
                    }
                }
            });
        }, 800); // Debounce

        return () => clearTimeout(timeoutId);
    }, [location, geocodingLib]);

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (place.geometry && place.geometry.location) {
            // Data Correction: Discard Plus Codes
            if (place.formatted_address && place.formatted_address.includes('+') && place.formatted_address.length < 15) {
                // If it looks like a code, fallback to name or clear it to force user to be specific
                console.warn('Discarding Plus Code:', place.formatted_address);
                if (place.name && !place.name.includes('+')) {
                    place.formatted_address = place.name;
                }
            }
            setDestination(place);
            setViewMode('MAP');
            // navigate('/services', { state: { destination: place } }); // OLD LOGIC
        }
    };

    return (
        <div className="h-screen flex flex-col relative animate-fade-in overflow-hidden" style={{ backgroundColor: THEME.colors.appBg }}>
            {/* HEADER */}
            <header
                className="flex justify-between items-center p-6 relative z-20 shadow-md"
                style={{ backgroundColor: THEME.colors.brandNavy }}
            >
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black tracking-tighter" style={{ color: THEME.colors.white }}>
                        TOW<span style={{ color: THEME.colors.primaryBrandColor }}>ME</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            supabase.auth.signOut();
                            navigate('/login');
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <LogOut size={18} />
                    </button>
                    {/* Phase 70: Avatar DOM Finalization */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-[#F9A825] bg-[#1A1C2E] relative shrink-0">
                        {/* Safe Avatar Check */}
                        {user?.user_metadata?.avatar_url ? (
                            <img
                                src={user.user_metadata.avatar_url}
                                alt="User Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        {/* Fallback (Visible if no avatar or error) */}
                        <span className={`text-sm font-bold text-white ${user?.user_metadata?.avatar_url ? 'hidden' : ''}`}>
                            {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'ME').toUpperCase()}
                        </span>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative z-20 p-6">

                {/* MENU VIEW */}
                {viewMode === 'MENU' && (
                    <div className="flex-1 flex flex-col animate-fade-in">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-slate-900 leading-tight">
                                Let's get you <br />
                                <span style={{ color: THEME.colors.primaryBrandColor }}>moving.</span>
                            </h2>
                        </div>

                        {/* 3-Card Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* Card 1: Towing (Active) */}
                            <button
                                onClick={() => {
                                    console.log('Handoff Data:', pickupAddress);
                                    setSelectedCategory('Towing');
                                    setViewMode('INPUT');
                                }}
                                className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-6 group hover:scale-[1.02] transition-transform active:scale-[0.98]"
                            >
                                <div
                                    className="w-16 h-16 rounded-xl flex items-center justify-center transition-colors"
                                    style={{
                                        backgroundColor: `${THEME.colors.primaryBrandColor}1A`, // 10% opacity
                                        color: THEME.colors.primaryBrandColor
                                    }}
                                >
                                    <Truck size={32} strokeWidth={1.5} />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="text-xl font-black" style={{ color: THEME.colors.brandNavy }}>Towing Service</h3>
                                    <p className="text-sm text-slate-500 font-medium">Breakdown? We're here.</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-black transition-colors">
                                    <ArrowRight size={16} />
                                </div>
                            </button>

                            {/* Card 2: Schedule (Placeholder) */}
                            <button className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-6 opacity-60 cursor-not-allowed">
                                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                    <Calendar size={32} strokeWidth={1.5} />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="text-xl font-bold text-slate-300">Schedule</h3>
                                    <p className="text-sm text-slate-400 font-medium">Coming Soon</p>
                                </div>
                            </button>

                            {/* Card 3: Battery (Placeholder) */}
                            <button className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-6 opacity-60 cursor-not-allowed">
                                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                    <Battery size={32} strokeWidth={1.5} />
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="text-xl font-bold text-slate-300">Battery Jump</h3>
                                    <p className="text-sm text-slate-400 font-medium">Coming Soon</p>
                                </div>
                            </button>
                        </div>

                        {/* Utility Bar */}
                        <div className="mt-auto pt-8">
                            <button
                                className="w-full py-4 text-sm font-bold flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
                            >
                                <Wrench size={16} style={{ color: THEME.colors.primaryBrandColor }} />
                                Find Mechanics & Parts
                            </button>
                        </div>
                    </div>
                )}

                {/* INPUT VIEW */}
                {viewMode === 'INPUT' && (
                    <div className="absolute inset-0 z-50 flex flex-col animate-slide-up">
                        {/* White Panel Overlay */}
                        <div className="flex-1 bg-white rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                            {/* Back Button */}
                            <button
                                onClick={() => setViewMode('MENU')}
                                className="absolute top-6 left-6 p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 back-button"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <style>{`
                                .back-button:hover { color: ${THEME.colors.brandNavy} !important; }
                            `}</style>

                            <h2 className="mt-12 text-2xl font-black mb-8" style={{ color: THEME.colors.brandNavy }}>
                                Where keeps you <br />
                                <span style={{ color: THEME.colors.primaryBrandColor }}>moving?</span>
                            </h2>

                            <GoogleMapsProvider apiKey={GOOGLE_MAPS_API_KEY}>
                                <div className="space-y-4">
                                    {/* Pickup Static Input -> Now pure display component, no side effects */}
                                    <PickupAddressDisplay
                                        address={pickupAddress || "Locating..."}
                                        onAddressChange={setPickupAddress}
                                    />

                                    {/* Dropoff Autocomplete */}
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: THEME.colors.primaryBrandColor }}>
                                            <Search size={20} />
                                        </div>
                                        <div className="[&>input]:bg-white [&>input]:border-2 [&>input]:text-black [&>input]:placeholder-slate-400 [&>input]:pl-12 [&>input]:h-16 [&>input]:rounded-2xl [&>input]:shadow-lg"
                                            style={{
                                                // Using a style block or style injection for child input border color is tricky here with tailwind arbitrary variants.
                                                // I'll stick to replacing the class 'border-primary' with a style if possible, but here it's nested children.
                                                // I will rely on the verify step or use a <style> block for the input.
                                            }}>
                                            <style>{`
                                                .pac-target-input { border-color: ${THEME.colors.primaryBrandColor} !important; }
                                            `}</style>
                                            <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} />
                                        </div>
                                    </div>
                                </div>
                            </GoogleMapsProvider>

                            <p className="mt-6 text-center text-xs text-slate-400 font-medium">
                                We'll calculate the best route for your tow.
                            </p>
                        </div>
                    </div>
                )}

                {/* MAP VIEW (Full Screen Reveal) */}
                {viewMode === 'MAP' && (
                    <div className="absolute inset-0 z-50 animate-slide-up" style={{ backgroundColor: THEME.colors.brandNavy }}>
                        <ServiceSelection
                            destination={destination}
                            categoryFilter={selectedCategory}
                            pickupAddress={pickupAddress}
                            onBack={() => setViewMode('MENU')}
                        />
                    </div>
                )}
            </main>

            {/* Background elements */}
            <div
                className="absolute top-1/4 -right-20 w-80 h-80 rounded-full blur-[100px] -z-0"
                style={{ backgroundColor: `${THEME.colors.primaryBrandColor}0D` }} // 5% opacity
            ></div>
            <div
                className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full blur-[100px] -z-0"
                style={{ backgroundColor: `${THEME.colors.primaryBrandColor}1A` }} // 10% opacity
            ></div>
        </div>
    );
}
