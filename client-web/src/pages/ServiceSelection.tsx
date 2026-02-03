import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ChevronRight, LogOut, MapPin, X, Crosshair, Loader, Loader2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getIcon } from '../lib/serviceIcons';
import { useAuth } from '../contexts/AuthContext';
import { useProgressiveLocation } from '../hooks/useProgressiveLocation';
import VehicleManager from '../components/VehicleManager';
import ProfessionalsTab from '../components/ProfessionalsTab';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
import MapControl from '../components/MapControl';
import { PaymentModal } from '../components/PaymentModal';

interface Category {
    id: string;
    name: string;
    base_price: number;
    description: string;
    icon_name: string;
}

const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };
const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = "DEMO_MAP_ID";

// Map Control Options (Static to prevent re-renders)
const MAP_TYPE_CONTROL_OPTIONS = { position: 2 }; // TOP_CENTER
const ZOOM_CONTROL_OPTIONS = { position: 8 };     // RIGHT_CENTER

// Helper: Calculate Arrival Time from "X mins" string
function calculateArrivalTime(durationText: string): string {
    if (!durationText) return '--:--';
    const now = new Date();
    // Parse "15 mins" or "1 hour 5 mins"
    // Simple heuristic: extract all numbers, sum them up as minutes? 
    // Google API usually returns "15 mins", "1 hour 5 mins".

    let minutesToAdd = 0;
    const parts = durationText.split(' ');

    for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes('hour')) {
            minutesToAdd += parseInt(parts[i - 1]) * 60;
        } else if (parts[i].includes('min')) {
            minutesToAdd += parseInt(parts[i - 1]);
        }
    }

    // Fallback if parsing fails but there is a number
    if (minutesToAdd === 0 && /\d+/.test(durationText)) {
        minutesToAdd = parseInt(durationText.match(/\d+/)![0]);
    }

    now.setMinutes(now.getMinutes() + minutesToAdd);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ServiceSelection() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    // Progressive Location Hook (Instant Load)
    const { location: userGpsLocation, isLoading: locating, error: geoError, refetch: refetchLocation } = useProgressiveLocation();

    // Core State: The PIN location (Ground Truth)
    const [pickupLocation, setPickupLocation] = useState(MALTA_CENTER);
    const [pickupAddress, setPickupAddress] = useState<string>('');
    const [pickupEta, setPickupEta] = useState<string | null>(null);

    // Sync user GPS location to pickup location on initial load
    const hasInitialSync = useRef(false);
    const [cameraTarget, setCameraTarget] = useState<google.maps.LatLngLiteral | undefined>(undefined);

    useEffect(() => {
        if (userGpsLocation && !hasInitialSync.current) {
            setPickupLocation(userGpsLocation);
            setCameraTarget(userGpsLocation); // Pan camera to user location
            hasInitialSync.current = true;
        }
    }, [userGpsLocation]);

    // Geocoding Library
    const geocodingLib = useMapsLibrary('geocoding');
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

    useEffect(() => {
        if (!geocodingLib) return;
        setGeocoder(new geocodingLib.Geocoder());
    }, [geocodingLib]);

    // Reverse Geocode Effect
    useEffect(() => {
        if (!geocoder || !pickupLocation) return;

        // Debounce slightly to avoid too many requests while dragging
        const timeoutId = setTimeout(() => {
            geocoder.geocode({ location: pickupLocation }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    // Use the full formatted address for better clarity
                    setPickupAddress(results[0].formatted_address);
                } else {
                    setPickupAddress(`Lat: ${pickupLocation.lat.toFixed(5)}, Lng: ${pickupLocation.lng.toFixed(5)}`);
                }
            });
        }, 150); // Small debounce to allow "Idle" to settle completely

        return () => clearTimeout(timeoutId);
    }, [geocoder, pickupLocation]);

    // UI State
    const [activeTab, setActiveTab] = useState<'services' | 'vehicles' | 'professionals'>('services');
    const [showDestinationModal, setShowDestinationModal] = useState(false);
    const [destination, setDestination] = useState<google.maps.places.PlaceResult | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

    // Payment State
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

    const destCoords = useMemo(() => {
        if (!destination?.geometry?.location) return null;
        return {
            lat: destination.geometry.location.lat(),
            lng: destination.geometry.location.lng()
        };
    }, [destination]);

    // Permission Modal State
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    // Show permission modal if there's a location error
    useEffect(() => {
        if (geoError && geoError.includes('Permission')) {
            setShowPermissionModal(true);
        }
    }, [geoError]);

    // Performance Caching
    const lastEtaLocation = useRef<google.maps.LatLngLiteral | null>(null);
    const [isCalculatingEta, setIsCalculatingEta] = useState(false);

    // Helper: Haversine distance in meters
    const getHaversineDistance = (p1: google.maps.LatLngLiteral, p2: google.maps.LatLngLiteral) => {
        const R = 6371e3; // Earth radius in meters
        const φ1 = p1.lat * Math.PI / 180;
        const φ2 = p2.lat * Math.PI / 180;
        const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
        const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // TanStack Query: Service Categories (Cached for Instant Load)
    const { data: categories = [], isLoading: loading } = useQuery({
        queryKey: ['service-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_live_service_prices')
                .select('*')
                .or('is_active.eq.true,is_active.is.null')
                .order('base_price', { ascending: true });

            if (error) throw error;
            return data as Category[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Manual Re-Locate
    const handleLocateMe = () => {
        hasInitialSync.current = false; // Allow re-snap
        refetchLocation();
    };


    // ETA Calculation Effect
    useEffect(() => {
        if (!pickupLocation || !window.google) return;

        // Proximity Cache: Don't recalculate if moved less than 50 meters
        if (lastEtaLocation.current) {
            const dist = getHaversineDistance(pickupLocation, lastEtaLocation.current);
            if (dist < 50) return;
        }

        const calculateEta = async () => {
            setIsCalculatingEta(true);
            try {
                // 1. Fetch Nearest Online Driver via RPC (High Performance)
                const { data: nearestDrivers, error } = await supabase.rpc('get_nearest_online_drivers', {
                    lat: pickupLocation.lat,
                    lng: pickupLocation.lng,
                    lim: 1
                });

                if (error || !nearestDrivers || nearestDrivers.length === 0) {
                    if (!pickupEta) setPickupEta('15-20 mins');
                    return;
                }

                const driver = nearestDrivers[0];
                const driverLoc = driver.location && (driver.location as any).coordinates ? {
                    lat: (driver.location as any).coordinates[1],
                    lng: (driver.location as any).coordinates[0]
                } : null;

                if (!driverLoc) {
                    // Fallback if location parsing fails
                    console.warn("Could not parse driver location:", driver);
                    if (!pickupEta) setPickupEta('15-20 mins');
                    return;
                }

                // 2. Get Actual Driving Time
                const service = new google.maps.DistanceMatrixService();
                service.getDistanceMatrix({
                    origins: [driverLoc],
                    destinations: [pickupLocation],
                    travelMode: google.maps.TravelMode.DRIVING,
                }, (response, status) => {
                    if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
                        const duration = response.rows[0].elements[0].duration.text;
                        setPickupEta(duration);
                        lastEtaLocation.current = pickupLocation;
                    } else if (!pickupEta) {
                        setPickupEta('~15 mins');
                    }
                });

            } catch (err) {
                console.error("ETA Error:", err);
                if (!pickupEta) setPickupEta('~15 mins');
            } finally {
                setIsCalculatingEta(false);
            }
        };

        // onCameraIdle signals the user has STOPPED moving, so we can calculate immediately without further debounce.
        calculateEta();
    }, [pickupLocation, window.google]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleInitialSelect = () => {
        if (selectedService && selectedVehicleId) {
            setShowDestinationModal(true);
        }
    };



    const handlePaymentSuccess = async () => {
        if (!pendingRequestId) return;

        try {
            // 1. Update Request Status
            const { error: updateError } = await supabase
                .from('towing_requests')
                .update({ status: 'pending' })
                .eq('id', pendingRequestId);

            if (updateError) throw updateError;

            // 2. Create Payment Record (Optional log, but good for history)
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    request_id: pendingRequestId,
                    amount: paymentAmount,
                    status: 'succeeded'
                });

            if (paymentError) console.error('Error logging payment:', paymentError);

            // 3. Trigger Auto-Dispatch (Round-Robin)
            console.log('Payment Confirmed. Triggering Auto-Dispatch for:', pendingRequestId);
            await supabase.rpc('dispatch_job', { p_request_id: pendingRequestId });

            // 4. Navigate
            setShowPaymentModal(false);
            navigate(`/tracking/${pendingRequestId}`);

        } catch (err) {
            console.error('Error finalizing payment:', err);
            alert('Payment succeeded but we could not update the request. Please contact support.');
        }
    };

    const handleFinalSubmit = async () => {
        if (!selectedService || !selectedVehicleId || !destination) return;

        // Validation: Ensure pickupLocation is valid
        if (!pickupLocation || typeof pickupLocation.lat !== 'number' || typeof pickupLocation.lng !== 'number') {
            alert("Invalid Pickup Location. Please move the pin slightly.");
            return;
        }

        setSubmitting(true);
        try {
            const destLat = destination.geometry?.location?.lat();
            const destLng = destination.geometry?.location?.lng();
            const destAddress = destination.formatted_address || destination.name;

            // Ensure pickupAddress is human-readable if possible
            let finalPickupAddress = pickupAddress;
            if (geocoder && (!finalPickupAddress || finalPickupAddress.includes('Lat:'))) {
                try {
                    const geoResult = await new Promise<string>((resolve) => {
                        geocoder.geocode({ location: pickupLocation }, (results, status) => {
                            if (status === 'OK' && results?.[0]) resolve(results[0].formatted_address);
                            else resolve(finalPickupAddress);
                        });
                    });
                    finalPickupAddress = geoResult;
                } catch (e) {
                    console.warn("Final geocode failed", e);
                }
            }

            // 1. Create Request (Awaiting Payment)
            const { data: request, error } = await supabase
                .from('towing_requests')
                .insert({
                    client_id: user?.id,
                    category_id: selectedService,
                    vehicle_id: selectedVehicleId,
                    pickup_lat: pickupLocation.lat,
                    pickup_long: pickupLocation.lng,
                    pickup_location: `POINT(${pickupLocation.lng} ${pickupLocation.lat})`,
                    pickup_address: finalPickupAddress || `Lat: ${pickupLocation.lat.toFixed(5)}, Lng: ${pickupLocation.lng.toFixed(5)}`,
                    dropoff_lat: destLat,
                    dropoff_long: destLng,
                    dropoff_address: destAddress,
                    search_radius_km: 5.0,
                    status: 'awaiting_payment'
                })
                .select()
                .single();

            if (error) throw error;
            setPendingRequestId(request.id);

            // 2. Create Payment Intent (MOCK for Demo)
            const paymentData = {
                clientSecret: 'mock_secret',
                amount: 40.00
            };

            // 3. Open Payment Modal
            setClientSecret(paymentData.clientSecret);
            setPaymentAmount(paymentData.amount);
            setShowPaymentModal(true);
            setShowDestinationModal(false);

        } catch (err: any) {
            console.error('Error initiating request:', err);
            alert(`Error initiating request: ${err.message || JSON.stringify(err)}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker', 'routes', 'geometry']}>
            <div className="h-[100dvh] w-full relative bg-slate-950 text-white font-sans overflow-hidden flex flex-col">

                {/* --- TOP SECTION: MAP (55% Height) --- */}
                <div className="h-[55%] w-full relative z-0 group">
                    {GOOGLE_MAPS_API_KEY ? (
                        <>
                            <Map
                                defaultCenter={MALTA_CENTER}
                                defaultZoom={15}
                                mapId={MAP_ID}
                                disableDefaultUI={true}
                                zoomControl={true}
                                mapTypeControl={true}
                                mapTypeControlOptions={MAP_TYPE_CONTROL_OPTIONS}
                                zoomControlOptions={ZOOM_CONTROL_OPTIONS}
                                gestureHandling={'greedy'}
                                reuseMaps={true}
                                onCameraChanged={(ev) => {
                                    if (!destination) {
                                        setIsCalculatingEta(true);
                                        // Debounce state update to prevent re-renders while dragging
                                        const cleanup = setTimeout(() => {
                                            setPickupLocation(ev.detail.center);
                                            // The effect will handle setIsCalculatingEta(false) after fetch
                                        }, 100);
                                        // Store timeout ID to clear on next move (simple debounce closure)
                                        // Actually, we need a ref for this to work across renders if we were re-rendering. 
                                        // But since we are NOT setting state here immediately, this component instance persists.
                                        // We need a ref to hold the timeout.
                                        if ((window as any)._mapDebounce) clearTimeout((window as any)._mapDebounce);
                                        (window as any)._mapDebounce = cleanup;
                                    }
                                }}
                            >
                                {/* USER GPS LOCATION (Blue Dot) */}
                                {userGpsLocation && (
                                    <AdvancedMarker position={userGpsLocation} zIndex={15}>
                                        <div className="relative flex items-center justify-center">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-20 relative" />
                                            <div className="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping z-10" />
                                        </div>
                                    </AdvancedMarker>
                                )}

                                {/* Destination Marker & Route (Only if destination selected) */}
                                {destCoords && (
                                    <>
                                        {/* Original Pickup Point Marker (Locked) - replaces static pin */}
                                        <AdvancedMarker position={pickupLocation}>
                                            <div className="relative flex flex-col items-center">
                                                {/* Time Bubble */}
                                                <div className="bg-[#108c44] text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white relative overflow-hidden">
                                                    {isCalculatingEta && (
                                                        <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                                    )}
                                                    <span className="text-lg font-bold leading-none">
                                                        {pickupEta ? pickupEta.split(' ')[0] : '--'}
                                                    </span>
                                                    <span className="text-[10px] font-medium leading-none mt-0.5">min</span>
                                                </div>
                                                {/* Stem/Stick */}
                                                <div className="w-1 h-4 bg-[#108c44]"></div>
                                                {/* Base Dot */}
                                                <div className="w-4 h-4 rounded-full bg-white border-[4px] border-[#108c44] shadow-sm"></div>
                                            </div>
                                        </AdvancedMarker>

                                        {/* CUSTOM DESTINATION MARKER (Blue Bubble like image) */}
                                        {/* CUSTOM DESTINATION MARKER (Blue Bubble like image) */}
                                        <AdvancedMarker position={destCoords} zIndex={20}>
                                            <div className="relative flex flex-col items-center">
                                                {/* Arrival Bubble */}
                                                <div className="bg-[#4F46E5] text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white">
                                                    <span className="text-[10px] font-bold leading-none mb-0.5">Arrive</span>
                                                    <span className="text-sm font-bold leading-none">{routeInfo ? calculateArrivalTime(routeInfo.duration) : '--:--'}</span>
                                                </div>
                                                {/* Stem/Stick */}
                                                <div className="w-1 h-4 bg-[#4F46E5]"></div>
                                                {/* Base Dot */}
                                                <div className="w-4 h-4 rounded-full bg-white border-[4px] border-[#4F46E5] shadow-sm"></div>
                                            </div>
                                        </AdvancedMarker>
                                        <Directions
                                            origin={pickupLocation}
                                            destination={destCoords}
                                            onRouteCalculated={setRouteInfo}
                                        />
                                    </>
                                )}
                            </Map>
                            {/* Controlled Camera Updates */}
                            {cameraTarget && <MapControl center={cameraTarget} />}

                            {/* --- STATIC CENTER PIN OVERLAY (The "Bolt" Pin) --- */}
                            {/* --- STATIC CENTER PIN OVERLAY (Green Bubble like image) --- */}
                            {!destination && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] z-10 pointer-events-none">
                                    <div className="relative flex flex-col items-center group">
                                        {/* Time Bubble */}
                                        <div className="bg-[#108c44] text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white transition-transform duration-200 group-hover:-translate-y-1 relative overflow-hidden">
                                            {isCalculatingEta && (
                                                <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                            )}
                                            <span className="text-lg font-bold leading-none">
                                                {pickupEta ? pickupEta.split(' ')[0] : '--'}
                                            </span>
                                            <span className="text-[10px] font-medium leading-none mt-0.5">min</span>
                                        </div>
                                        {/* Stem/Stick */}
                                        <div className="w-1 h-4 bg-[#108c44]"></div>
                                        {/* Base Dot */}
                                        <div className="w-4 h-4 rounded-full bg-white border-[4px] border-[#108c44] shadow-sm"></div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                            <div className="text-center p-8 glass-panel max-w-xs border-white/5">
                                <MapPin className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">MAPS_OFFLINE</p>
                            </div>
                        </div>
                    )}

                    {/* Navbar (Overlaid on Map) */}
                    <div className="absolute top-0 left-0 w-full p-6 z-20 flex items-center justify-between pointer-events-none">
                        <Link to="/" className="p-4 rounded-2xl glass-button border-white/5 pointer-events-auto hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-amber-500" />
                        </Link>
                        <div className="flex-1 px-4 text-center">
                            <h1 className="text-xs font-black tracking-[0.3em] uppercase text-white/40 shadow-sm">Pickup Location</h1>
                        </div>
                        <button onClick={handleSignOut} className="p-4 rounded-2xl glass-button border-white/5 text-red-500/50 hover:text-red-500 pointer-events-auto transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Locate Button (Moved to float on map) */}
                    <button
                        onClick={handleLocateMe}
                        className={`
                            absolute bottom-6 right-6 z-20 w-12 h-12 glass-panel rounded-full flex items-center justify-center 
                            transition-all active:scale-95 shadow-lg border border-white/10 bg-black/80 backdrop-blur-md
                            ${locating ? 'text-amber-500 animate-pulse' : 'text-amber-500 hover:text-white'}
                            ${geoError ? 'border-red-500 text-red-500' : ''}
                        `}
                    >
                        {locating ? <Loader size={24} className="animate-spin" /> : <Crosshair size={24} />}
                    </button>
                </div>

                {/* --- BOTTOM SECTION: CONTENT PANEL (45% Height) --- */}
                <div className="h-[45%] w-full bg-slate-900/60 backdrop-blur-3xl rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.25)] flex flex-col relative z-20 -mt-6 border-t border-white/15">

                    {/* TABS HEADER */}
                    <div className="flex items-center justify-center p-2 border-b border-white/5 mt-2">
                        <div className="flex bg-black/20 rounded-xl p-1 w-full max-w-xs backdrop-blur-md">
                            <button
                                onClick={() => setActiveTab('services')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                    ${activeTab === 'services' ? 'bg-white/10 text-white shadow-glass border border-white/10' : 'text-slate-400 hover:text-white'}
                                `}
                            >
                                Services
                            </button>
                            <button
                                onClick={() => setActiveTab('vehicles')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                    ${activeTab === 'vehicles' ? 'bg-white/10 text-white shadow-glass border border-white/10' : 'text-slate-400 hover:text-white'}
                                `}
                            >
                                My Vehicles
                            </button>
                            <button
                                onClick={() => setActiveTab('professionals')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all
                                    ${activeTab === 'professionals' ? 'bg-white/10 text-white shadow-glass border border-white/10' : 'text-slate-400 hover:text-white'}
                                `}
                            >
                                Pros
                            </button>
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-hidden relative">

                        {/* SERVICE SELECTION TAB */}
                        <div className={`absolute inset-0 p-6 pt-4 flex flex-col transition-opacity duration-300 ${activeTab === 'services' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-shimmer" />)}
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-20 scrollbar-hide">
                                    {categories.map((service) => {
                                        const Icon = getIcon(service.icon_name);
                                        const isSelected = selectedService === service.id;
                                        return (
                                            <div
                                                key={service.id}
                                                onClick={() => setSelectedService(service.id)}
                                                className={`
                                                    relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center
                                                    ${isSelected
                                                        ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }
                                                `}
                                            >
                                                <div className={`
                                                    w-32 h-20 rounded-xl flex items-center justify-center mr-4 shrink-0 backdrop-blur-sm overflow-hidden
                                                    ${isSelected ? 'bg-white/5 text-amber-500' : 'bg-white/5 text-slate-300'}
                                                `}>
                                                    <Icon className="w-full h-full object-contain" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>{service.name}</h3>
                                                    <p className="text-[10px] text-slate-400 truncate">{service.description}</p>
                                                </div>
                                                <div className="text-right pl-2">
                                                    <span className={`block font-black text-lg ${isSelected ? 'text-amber-500' : 'text-slate-300'}`}>€{service.base_price}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Sticky Action Button */}
                            <div className="absolute bottom-6 left-6 right-6">
                                <button
                                    disabled={!selectedService}
                                    onClick={() => {
                                        if (!selectedVehicleId) {
                                            setActiveTab('vehicles');
                                        } else {
                                            handleInitialSelect();
                                        }
                                    }}
                                    className={`
                                        w-full h-14 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center transition-all shadow-lg
                                        ${selectedService
                                            ? 'bg-amber-500 text-black hover:scale-[1.02]'
                                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {!selectedVehicleId ? 'Select Vehicle Next' : 'Request Towing'}
                                    <ChevronRight className="ml-2 w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* VEHICLES TAB */}
                        <div className={`absolute inset-0 p-6 pt-4 overflow-y-auto transition-opacity duration-300 ${activeTab === 'vehicles' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <VehicleManager onSelect={setSelectedVehicleId} selectedId={selectedVehicleId} />

                            {selectedVehicleId && (
                                <div className="mt-8">
                                    <button
                                        onClick={() => setActiveTab('services')}
                                        className="w-full py-4 text-xs font-bold text-amber-500 uppercase tracking-widest hover:text-white"
                                    >
                                        Back to Services
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* PROFESSIONALS TAB */}
                        <div className={`absolute inset-0 pb-0 overflow-hidden transition-opacity duration-300 ${activeTab === 'professionals' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <ProfessionalsTab location={pickupLocation} />
                        </div>

                    </div>
                </div>

                {/* Overlays (Error, Permissions, Destination Modal) */}
                {geoError && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-md">
                        {geoError}
                    </div>
                )}

                {showPermissionModal && (
                    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fade-in text-center">
                        <MapPin className="text-amber-500 w-12 h-12 mb-4" />
                        <h2 className="text-xl font-black text-white mb-2">Location Required</h2>
                        <p className="text-slate-400 text-xs mb-6 max-w-[200px]">We need your location to send help.</p>
                        <button onClick={() => { setShowPermissionModal(false); refetchLocation(); }} className="bg-amber-500 text-black font-black text-xs px-8 py-3 rounded-xl">Enable Location</button>
                    </div>
                )}

                {showDestinationModal && (
                    <div className="absolute inset-0 z-50 flex flex-col justify-end sm:justify-center pointer-events-none">
                        {/* Backdrop - Transparent to see map clearly (Task 6) */}
                        <div
                            className="absolute inset-0 bg-transparent pointer-events-auto transition-opacity"
                            onClick={() => setShowDestinationModal(false)}
                        />

                        <div className="w-full sm:max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl p-6 rounded-t-[32px] sm:rounded-3xl border-t sm:border border-white/15 shadow-2xl relative pointer-events-auto animate-slide-up sm:animate-fade-in group pb-10 sm:pb-6 max-h-[40vh] overflow-y-auto">

                            {/* Drag Handle (Mobile) */}
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />

                            <button onClick={() => setShowDestinationModal(false)} className="absolute top-6 right-6 text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>

                            <h2 className="text-xl font-black text-white mb-1">Where to?</h2>
                            {pickupAddress && (
                                <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
                                    <MapPin size={12} className="text-amber-500" />
                                    <span className="truncate max-w-[300px]">From: {pickupAddress}</span>
                                </div>
                            )}

                            <PlaceAutocomplete onPlaceSelect={setDestination} />

                            {destination && (
                                <div className="mt-6 space-y-3">
                                    {/* Route Info Card */}
                                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex justify-between items-center">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Dropoff</p>
                                            <p className="text-sm font-medium text-white truncate leading-tight">{destination.name || destination.formatted_address}</p>
                                        </div>
                                        {routeInfo ? (
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-black text-white leading-none">{routeInfo.duration}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{routeInfo.distance}</p>
                                            </div>
                                        ) : (
                                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                                        )}
                                    </div>

                                    {/* Pickup Optimization Info (Task 3 Placeholder - to be real data soon) */}
                                    <div className="px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Estimated Pickup</p>
                                            <p className="text-xs text-white">
                                                {pickupEta ? <span className="font-bold">{pickupEta}</span> : "Calculating..."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={!destination || submitting}
                                onClick={handleFinalSubmit}
                                className={`w-full h-14 rounded-xl font-black text-sm uppercase tracking-wider transition-all mt-6 shadow-lg
                                ${destination && !submitting
                                        ? 'bg-amber-500 text-black hover:scale-[1.02] hover:bg-amber-400'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {submitting ? <Loader2 className="animate-spin mx-auto text-black" /> : 'Confirm Towing Request'}
                            </button>
                        </div>
                    </div>
                )}

                {showPaymentModal && clientSecret && (
                    <PaymentModal
                        clientSecret={clientSecret}
                        amount={paymentAmount}
                        onSuccess={handlePaymentSuccess}
                        onClose={() => setShowPaymentModal(false)}
                    />
                )}

            </div>
        </APIProvider >
    );
}

// Sub-component to handle Directions Rendering
function Directions({ origin, destination, onRouteCalculated }: {
    origin: google.maps.LatLngLiteral;
    destination: google.maps.LatLngLiteral;
    onRouteCalculated: (info: { distance: string; duration: string }) => void;
}) {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

    // Use refs to track the last calculated route to avoid redundant updates
    const lastRouteRef = useRef<string>('');

    useEffect(() => {
        if (!routesLibrary || !map) return;

        const service = new routesLibrary.DirectionsService();
        const renderer = new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#D4AF37', // TowMe Gold
                strokeWeight: 6,
                strokeOpacity: 0.8
            }
        });

        setDirectionsService(service);
        setDirectionsRenderer(renderer);

        return () => {
            renderer.setMap(null);
        };
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || !origin || !destination) return;

        const routeKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`;
        if (routeKey === lastRouteRef.current) return;

        directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
                const leg = result.routes[0].legs[0];
                const info = {
                    distance: leg.distance?.text || '',
                    duration: leg.duration?.text || ''
                };

                lastRouteRef.current = routeKey;
                onRouteCalculated(info);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }, [directionsService, directionsRenderer, origin, destination, onRouteCalculated]);

    return null;
}
