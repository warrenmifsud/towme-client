import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, LogOut, MapPin, X, Crosshair, Loader, Loader2, Clock } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getIcon } from '../lib/serviceIcons';
import { useAuth } from '../contexts/AuthContext';
import { useProgressiveLocation } from '../hooks/useProgressiveLocation';
import VehicleManager from '../components/VehicleManager';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
import MapControl from '../components/MapControl';
import { PaymentModal } from '../components/PaymentModal';
import TripHeader from '../components/TripHeader';
import { THEME } from '../theme';

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

interface ServiceSelectionProps {
    destination?: google.maps.places.PlaceResult | null;
    categoryFilter?: string;
    onBack?: () => void;
    pickupAddress?: string;
}

export default function ServiceSelection({ destination: propDestination, onBack, pickupAddress: propPickupAddress }: ServiceSelectionProps = {}) {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const location = useLocation();

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

    // Auto-set state from Home.tsx navigation OR Props
    useEffect(() => {
        if (propDestination) {
            setDestination(propDestination);
        } else if (location.state?.destination) {
            setDestination(location.state.destination);
        }
    }, [location.state, propDestination]);
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

    // TanStack Query: Service Categories
    const { data: categories = [] } = useQuery({
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

                {/* --- FULL SCREEN MAP (Z-0) --- */}
                <div className="absolute inset-0 z-0">
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
                                                <div
                                                    className="text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white relative overflow-hidden"
                                                    style={{ backgroundColor: THEME.colors.primaryBrandColor }}
                                                >
                                                    {isCalculatingEta && (
                                                        <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                                    )}
                                                    <span className="text-lg font-bold leading-none">
                                                        {pickupEta ? pickupEta.split(' ')[0] : '--'}
                                                    </span>
                                                    <span className="text-[10px] font-medium leading-none mt-0.5">min</span>
                                                </div>
                                                {/* Stem/Stick */}
                                                <div className="w-1 h-4" style={{ backgroundColor: THEME.colors.primaryBrandColor }}></div>
                                                {/* Base Dot */}
                                                <div className="w-4 h-4 rounded-full bg-white border-[4px] shadow-sm" style={{ borderColor: THEME.colors.primaryBrandColor }}></div>
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
                                        <div
                                            className="text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white transition-transform duration-200 group-hover:-translate-y-1 relative overflow-hidden"
                                            style={{ backgroundColor: THEME.colors.primaryBrandColor }}
                                        >
                                            {isCalculatingEta && (
                                                <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                            )}
                                            <span className="text-lg font-bold leading-none">
                                                {pickupEta ? pickupEta.split(' ')[0] : '--'}
                                            </span>
                                            <span className="text-[10px] font-medium leading-none mt-0.5">min</span>
                                        </div>
                                        {/* Stem/Stick */}
                                        <div className="w-1 h-4" style={{ backgroundColor: THEME.colors.primaryBrandColor }}></div>
                                        {/* Base Dot */}
                                        <div className="w-4 h-4 rounded-full bg-white border-[4px] shadow-sm" style={{ borderColor: THEME.colors.primaryBrandColor }}></div>
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

                    {/* HEADER: TRIP SUMMARY vs LEGACY NAV */}
                    {destination ? (
                        <TripHeader
                            pickup={propPickupAddress || pickupAddress || "Current Location"}
                            destination={(function () {
                                // CLEAN BUILD: Manual Address Construction
                                const place = destination;
                                if (!place) return "Destination";

                                // 1. Extract raw components
                                const components = place.address_components || [];
                                const getComponent = (type: string) => components.find(c => c.types.includes(type))?.long_name || '';

                                const streetNum = getComponent('street_number');
                                const route = getComponent('route'); // This is the Street Name
                                const city = getComponent('locality') || getComponent('administrative_area_level_1');

                                // 2. Build the string manually
                                if (route) {
                                    // Result: "12 Triq Il-Kwartin, Swieqi"
                                    const part1 = streetNum ? `${streetNum} ${route}` : route;
                                    return city ? `${part1}, ${city}` : part1;
                                }

                                // 3. Fallback: Strip the code using Regex from formatted_address
                                const raw = place.formatted_address || place.name || '';
                                return raw.replace(/^[A-Z0-9]+\+[A-Z0-9]+\s*,?\s*/, '');
                            })()}
                            onClose={() => onBack ? onBack() : navigate('/')}
                        />
                    ) : (
                        /* Legacy Navbar (Overlaid on Map) */
                        <div
                            className="absolute top-0 left-0 w-full p-4 z-20 flex items-center justify-between pointer-events-auto shadow-md"
                            style={{ backgroundColor: THEME.colors.brandNavy }}
                        >
                            <Link to="/" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex-1 px-4 text-center">
                                <h1 className="text-xs font-black tracking-[0.3em] uppercase text-white shadow-sm">Pickup Location</h1>
                            </div>
                            <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-colors">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Locate Button (Moved to float on map) */}
                    <button
                        onClick={handleLocateMe}
                        className={`
                            absolute bottom-6 right-6 z-20 w-12 h-12 glass-panel rounded-full flex items-center justify-center 
                            transition-all active:scale-95 shadow-lg border border-white/10 bg-black/80 backdrop-blur-md
                            ${locating ? 'animate-pulse' : 'hover:text-white'}
                            ${geoError ? 'border-red-500 text-red-500' : ''}
                        `}
                        style={{ color: THEME.colors.primaryBrandColor }}
                    >
                        {locating ? <Loader size={24} className="animate-spin" /> : <Crosshair size={24} />}
                    </button>
                </div>

                {/* --- UBER-STYLE SERVICE SELECTOR (Z-20, SLIDE UP) --- */}
                {/* --- LIGHT THEME SERVICE SELECTOR (Fixed Visibility) --- */}
                {destination && (
                    <div className="absolute bottom-0 left-0 right-0 z-50 h-[45%] flex flex-col pointer-events-none">

                        {/* "GLASS" LIGHT SHEET */}
                        <div className="bg-white rounded-t-[25px] p-5 pb-10 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] border-t border-slate-100 h-full flex flex-col pointer-events-auto">

                            {/* Handle Bar */}
                            <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Choose Service Level
                                </h3>
                                {/* Trip Stats */}
                                <div className="flex flex-col items-end">
                                    {routeInfo && (
                                        <>
                                            <span className="text-xs font-bold text-slate-900">{routeInfo.duration}</span>
                                            <span className="text-[10px] text-slate-400">{routeInfo.distance}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* SCROLLABLE SERVICE LIST (Prevent Overflow) */}
                            <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-hide">
                                {categories.map((service) => {
                                    const Icon = getIcon(service.icon_name);
                                    const isSelected = selectedService === service.id;

                                    return (
                                        <button
                                            key={service.id}
                                            onClick={() => setSelectedService(service.id)}
                                            className={`
                                                w-full flex items-center p-3 rounded-xl border transition-all duration-200 active:scale-[0.98]
                                                ${isSelected
                                                    ? 'bg-[#FFF5EB]'
                                                    : 'bg-[#F9F9F9] border-transparent hover:border-slate-200'
                                                }
                                            `}
                                            style={isSelected ? { borderColor: THEME.colors.primaryBrandColor } : {}}
                                        >
                                            {/* Icon */}
                                            <div className="w-10 flex items-center justify-center">
                                                <Icon className="w-6 h-6" style={{ color: isSelected ? THEME.colors.primaryBrandColor : THEME.colors.labelText }} />
                                            </div>

                                            {/* Text Info */}
                                            <div className="flex-1 px-3 text-left">
                                                <div className="text-base font-bold text-slate-900 leading-tight">
                                                    {service.name}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {service.description}
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-right">
                                                <div className="text-base font-bold text-slate-900">€{service.base_price}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* CONFIRM BUTTON */}
                            <button
                                disabled={!selectedService}
                                onClick={() => {
                                    if (!selectedVehicleId) {
                                        setActiveTab('vehicles');
                                    } else {
                                        handleInitialSelect();
                                        console.log('Booking Confirmed for Service:', selectedService);
                                    }
                                }}
                                className={`
                                    w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider flex items-center justify-center transition-all shadow-md active:scale-[0.98]
                                    ${selectedService
                                        ? 'text-white shadow-orange-500/30 hover:opacity-95'
                                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                                    }
                                `}
                                style={selectedService ? {
                                    backgroundColor: THEME.colors.primaryBrandColor
                                } : {}}
                            >
                                {selectedVehicleId ? 'CONFIRM TOW' : 'Select Vehicle'}
                            </button>

                            {/* Legacy Vehicles Tab (Hidden/Overlaid if active) */}
                            {activeTab === 'vehicles' && (
                                <div className="absolute inset-0 bg-white p-5 pb-10 z-30 flex flex-col rounded-t-[25px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Select Vehicle</h3>
                                        <button onClick={() => setActiveTab('services')} className="p-2 bg-slate-100 rounded-full">
                                            <X className="w-4 h-4 text-slate-600" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto -mx-5 px-5">
                                        <VehicleManager onSelect={setSelectedVehicleId} selectedId={selectedVehicleId} />
                                    </div>
                                    {selectedVehicleId && (
                                        <button
                                            onClick={() => setActiveTab('services')}
                                            className="w-full mt-4 py-4 rounded-xl text-white font-black uppercase tracking-wider shadow-md hover:opacity-95 transition-opacity"
                                            style={{
                                                backgroundColor: THEME.colors.primaryBrandColor
                                            }}
                                        >
                                            Confirm Vehicle
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}

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

                        <div className="w-full sm:max-w-lg mx-auto bg-white p-6 rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-100 shadow-2xl relative pointer-events-auto animate-slide-up sm:animate-fade-in group pb-10 sm:pb-6 max-h-[40vh] overflow-y-auto">

                            {/* Drag Handle (Mobile) */}
                            {/* Drag Handle (Mobile) */}
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden" />
                            <button
                                onClick={() => setShowDestinationModal(false)}
                                className="absolute top-6 right-6 text-slate-400 p-2 hover:bg-slate-50 rounded-full transition-colors close-modal-btn"
                            >
                                <X size={20} />
                            </button>
                            <style>{`
                                .close-modal-btn:hover { color: ${THEME.colors.brandNavy} !important; }
                            `}</style>

                            <h2 className="text-xl font-black mb-1" style={{ color: THEME.colors.brandNavy }}>Where to?</h2>
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
                                    <div
                                        className="p-4 rounded-xl border flex justify-between items-center"
                                        style={{
                                            backgroundColor: `${THEME.colors.primaryBrandColor}0D`, // 5% opacity
                                            borderColor: `${THEME.colors.primaryBrandColor}33` // 20% opacity
                                        }}
                                    >
                                        <div className="flex-1 min-w-0 mr-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: THEME.colors.primaryBrandColor }}>Dropoff</p>
                                            <p className="text-sm font-medium truncate leading-tight" style={{ color: THEME.colors.brandNavy }}>{destination.name || destination.formatted_address}</p>
                                        </div>
                                        {routeInfo ? (
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-black leading-none" style={{ color: THEME.colors.brandNavy }}>{routeInfo.duration}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{routeInfo.distance}</p>
                                            </div>
                                        ) : (
                                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: THEME.colors.primaryBrandColor }} />
                                        )}
                                    </div>

                                    {/* Pickup Optimization Info (Task 3 Placeholder - to be real data soon) */}
                                    <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Estimated Pickup</p>
                                            <p className="text-xs" style={{ color: THEME.colors.brandNavy }}>
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
                                        ? 'text-black hover:scale-[1.02]'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                style={destination && !submitting ? {
                                    backgroundColor: THEME.colors.primaryBrandColor
                                } : {}}
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
// Custom Polyline Component for Google Maps
function Polyline(props: google.maps.PolylineOptions) {
    const map = useMap();
    const [polyline, setPolyline] = useState<google.maps.Polyline>();

    // Initialise
    useEffect(() => {
        if (!map) return;
        const line = new google.maps.Polyline(props);
        line.setMap(map);
        setPolyline(line);

        return () => {
            line.setMap(null);
        };
    }, [map]);

    // Update options
    useEffect(() => {
        if (!polyline) return;
        polyline.setOptions(props);
    }, [polyline, props]);

    return null;
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
    const [routePath, setRoutePath] = useState<google.maps.LatLng[]>([]);

    // Use refs to track the last calculated route to avoid redundant updates
    const lastRouteRef = useRef<string>('');

    useEffect(() => {
        if (!routesLibrary || !map) return;

        const service = new routesLibrary.DirectionsService();
        const renderer = new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true,
            suppressPolylines: true, // We draw our own Neon Flux lines
            preserveViewport: true // CRITICAL: We manage the viewport manually for padding
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

                // --- MAP PADDING ("Zoom Out" Logic) ---
                if (result.routes[0]?.bounds && map) {
                    map.fitBounds(result.routes[0].bounds, {
                        top: 50,
                        right: 20,
                        bottom: 350, // Reserve space for the Uber-Style Sheet
                        left: 20
                    });
                }

                // Extract coordinates for the Neon Flux
                if (result.routes[0]?.overview_path) {
                    setRoutePath(result.routes[0].overview_path);
                }

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

    if (!routePath || routePath.length === 0) return null;

    return (
        <>
            {/* 🛤️ FUTURE-TECH ROUTE STYLING (Blue Edition) */}

            {/* Layer 1: The Outer Haze (Soft Blue Glow) */}
            <Polyline
                path={routePath}
                strokeWeight={12}
                strokeColor="rgba(0, 122, 255, 0.2)" // Faint Blue Haze
                zIndex={10}
            />

            {/* Layer 2: The Inner Plasma (Bright Electric Blue) */}
            <Polyline
                path={routePath}
                strokeWeight={6}
                strokeColor="rgba(0, 122, 255, 0.8)" // Electric Blue
                zIndex={11}
            />

            {/* Layer 3: The Energy Core (White Hot Center) */}
            <Polyline
                path={routePath}
                strokeWeight={2}
                strokeColor="#FFFFFF" // Pure White Core
                zIndex={12}
            />
        </>
    );
}
