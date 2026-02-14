import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, LogOut, MapPin, X, Crosshair, Loader, Loader2, Clock } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getIcon } from '../lib/serviceIcons';
import { useAuth } from '../contexts/AuthContext';
import { useProgressiveLocation } from '../hooks/useProgressiveLocation';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
import { PaymentModal } from '../components/PaymentModal';
import TripHeader from '../components/TripHeader';
import { THEME } from '../theme.ts';

interface Category {
    id: string;
    name: string;
    base_price: number;
    description: string;
    icon_name: string;
    type: 'towing' | 'roadside';
}

const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };
const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = "DEMO_MAP_ID";

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

// Map Padding Component (Dynamic Map Resizing)
function MapPaddingHandler({ bottomPadding }: { bottomPadding: number }) {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        // Safely check if setPadding exists before calling
        if (typeof (map as any).setPadding === 'function') {
            (map as any).setPadding({ top: 0, right: 0, bottom: bottomPadding, left: 0 });
        } else {
            console.warn('MapPaddingHandler: map.setPadding is not available.');
        }
    }, [map, bottomPadding]);
    return null;
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
    // Filter State
    const [filterType, setFilterType] = useState<'towing' | 'roadside'>('towing');
    // Mock Vehicle for Demo to enable flow (Fixes unused usage of setter)
    const [selectedVehicleId] = useState<string | null>('mock_vehicle_1');
    const location = useLocation();

    // Progressive Location Hook (Instant Load)
    const { location: userGpsLocation, isLoading: locating, error: geoError, refetch: refetchLocation } = useProgressiveLocation();

    // Core State: The PIN location (Ground Truth)
    const [pickupLocation, setPickupLocation] = useState(MALTA_CENTER);
    const [pickupAddress, setPickupAddress] = useState<string>('');
    const [pickupEta, setPickupEta] = useState<string | null>(null);

    // Sync user GPS location to pickup location on initial load
    const hasInitialSync = useRef(false);

    useEffect(() => {
        if (userGpsLocation && !hasInitialSync.current) {
            setPickupLocation(userGpsLocation);
            // Pan camera to user location handled by defaultCenter mostly, or manual effect if needed, 
            // but for now we let the user control or the initial load.
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

    const filteredCategories = categories.filter(c => c.type === filterType || !c.type /* Fallback for legacy */);

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
            {/* MIN-H-[100dvh] FIX for Mobile Browsers + OVERFLOW HIDDEN to Prevent Double Scroll */}
            <div className="h-full w-full relative bg-white text-slate-900 font-sans overflow-hidden flex flex-col">

                {/* --- FULL SCREEN FIXED MAP CONTAINER (No Resizing) --- */}
                <div className="absolute inset-0 z-0">
                    {GOOGLE_MAPS_API_KEY ? (
                        <>
                            <Map
                                defaultCenter={MALTA_CENTER}
                                defaultZoom={15}
                                mapId={MAP_ID}
                                disableDefaultUI={true}
                                zoomControl={false}
                                mapTypeControl={false}
                                gestureHandling={'greedy'}
                                reuseMaps={true}
                                onCameraChanged={(ev) => {
                                    if (!destination) {
                                        setIsCalculatingEta(true);
                                        const cleanup = setTimeout(() => {
                                            setPickupLocation(ev.detail.center);
                                        }, 100);
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

                                {/* Destination Marker & Route */}
                                {destCoords && (
                                    <>
                                        <AdvancedMarker position={pickupLocation}>
                                            <div className="relative flex flex-col items-center">
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
                                                <div className="w-1 h-4" style={{ backgroundColor: THEME.colors.primaryBrandColor }}></div>
                                                <div className="w-4 h-4 rounded-full bg-white border-[4px] shadow-sm" style={{ borderColor: THEME.colors.primaryBrandColor }}></div>
                                            </div>
                                        </AdvancedMarker>

                                        <AdvancedMarker position={destCoords} zIndex={20}>
                                            <div className="relative flex flex-col items-center">
                                                <div className="bg-[#4F46E5] text-white px-3 py-1.5 rounded-full shadow-lg flex flex-col items-center justify-center min-w-[60px] min-h-[60px] border-[3px] border-white">
                                                    <span className="text-[10px] font-bold leading-none mb-0.5">Arrive</span>
                                                    <span className="text-sm font-bold leading-none">{routeInfo ? calculateArrivalTime(routeInfo.duration) : '--:--'}</span>
                                                </div>
                                                <div className="w-1 h-4 bg-[#4F46E5]"></div>
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

                            {/* --- STATIC CENTER PIN OVERLAY --- */}
                            {!destination && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+8px)] z-10 pointer-events-none">
                                    <div className="relative flex flex-col items-center group">
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
                                        <div className="w-1 h-4" style={{ backgroundColor: THEME.colors.primaryBrandColor }}></div>
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
                </div>

                {/* HEADER */}
                {destination ? (
                    <TripHeader
                        pickup={propPickupAddress || pickupAddress || "Current Location"}
                        destination={(function () {
                            const place = destination;
                            if (!place) return "Destination";
                            const raw = place.formatted_address || place.name || '';
                            return raw.replace(/^[A-Z0-9]+\+[A-Z0-9]+\s*,?\s*/, '');
                        })()}
                        onClose={() => onBack ? onBack() : navigate('/')}
                    />
                ) : (
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

                {/* Locate Button */}
                <button
                    onClick={handleLocateMe}
                    className={`
                        absolute right-6 z-20 w-12 h-12 glass-panel rounded-full flex items-center justify-center 
                        transition-all duration-500 active:scale-95 shadow-lg border border-white/10 bg-black/80 backdrop-blur-md
                        ${destination ? 'bottom-[56%]' : 'bottom-6'} 
                        ${locating ? 'animate-pulse' : 'hover:text-white'}
                        ${geoError ? 'border-red-500 text-red-500' : ''}
                    `}
                    style={{ color: THEME.colors.primaryBrandColor }}
                >
                    {locating ? <Loader size={24} className="animate-spin" /> : <Crosshair size={24} />}
                </button>

                {/* --- ADAPTIVE BOTTOM SHEET (Bolt-Style) --- */}
                {destination && (
                    <>
                        {/* Map Padding Handler: Pushes map content up so it's not hidden by the sheet */}
                        {/* Pass different padding depending on whether we currently have a vehicle selected or not */}
                        {/* Approx 45%-55% split. Height of sheet is ~55vh or so. 350-400px seems reasonable. */}
                        <MapPaddingHandler bottomPadding={selectedService ? 380 : 320} />

                        {/* SHEET CONTAINER - Light Mode White */}
                        <div className="absolute bottom-0 left-0 right-0 z-40 bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] flex flex-col h-[60dvh] transition-all duration-300 ease-out animate-slide-up border-t border-slate-100">

                            {/* Drag Handle - Solid Neutral Light Orange */}
                            <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0">
                                <div className="w-10 h-1.5 rounded-full" style={{ backgroundColor: '#F9A825' }} />
                            </div>

                            {/* Header: Title & Stats */}
                            <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    Select Service
                                </h3>
                                {routeInfo && (
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-slate-900">{routeInfo.duration}</div>
                                        <div className="text-[10px] font-bold text-[#F9A825] uppercase">{routeInfo.distance}</div>
                                    </div>
                                )}
                            </div>

                            {/* SCROLLABLE LIST (Visual Viewport Aware) */}
                            <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 custom-scrollbar pb-32">
                                <div className="space-y-3 py-4">
                                    {/* Filter Tabs */}
                                    <div className="flex p-1 mb-4 bg-slate-100 rounded-xl relative">
                                        <button
                                            onClick={() => setFilterType('towing')}
                                            className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'towing' ? 'bg-[#F9A825] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            Towing
                                        </button>
                                        <button
                                            onClick={() => setFilterType('roadside')}
                                            className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'roadside' ? 'bg-[#F9A825] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                        >
                                            Roadside
                                        </button>
                                    </div>

                                    {filteredCategories.map((service) => {
                                        const Icon = getIcon(service.icon_name);
                                        const isSelected = selectedService === service.id;

                                        return (
                                            <button
                                                key={service.id}
                                                className={`
                                                    w-full relative group flex items-center p-4 rounded-xl border transition-all duration-200
                                                    ${isSelected
                                                        ? 'bg-white border-[#F9A825]'
                                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                                    }
                                                `}
                                                onClick={() => {
                                                    // console.log("Service Selected:", service.id); 
                                                    setSelectedService(service.id);
                                                    // sub-service reset removed as not defined
                                                }}
                                            >
                                                {/* Icon Container */}
                                                <div
                                                    className={`
                                                        w-12 h-12 rounded-lg flex items-center justify-center mr-4 shrink-0 transition-colors
                                                        ${isSelected ? 'text-[#F9A825]' : 'text-slate-400 group-hover:text-slate-600'}
                                                    `}
                                                    style={{
                                                        backgroundColor: isSelected ? '#F9A8251A' : '#F1F5F9'
                                                    }}
                                                >
                                                    <Icon size={24} strokeWidth={2} />
                                                </div>

                                                {/* Text Content */}
                                                <div className="flex-1 text-left">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className={`text-base font-black ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                            {service.name}
                                                        </span>
                                                        <span className="text-base font-bold text-[#F9A825]">
                                                            €{service.base_price}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs font-medium leading-snug pr-2 ${isSelected ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        {service.description}
                                                    </p>
                                                </div>

                                                {/* Selection Indicator (Radio Style) */}
                                                <div className={`
                                                    absolute right-4 w-4 h-4 rounded-full border-2 flex items-center justify-center
                                                    ${isSelected ? 'border-[#F9A825]' : 'border-slate-300'}
                                                `}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#F9A825]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* RESTORED BUTTON SECTION (Sticky Footer) */}
                            <section className="absolute bottom-0 left-0 right-0 z-[50] bg-white border-t border-gray-100 p-4 space-y-4">
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={!selectedService}
                                    className={`
                                        w-full py-4 text-base font-bold uppercase tracking-widest rounded-xl transition-all shadow-none
                                        flex items-center justify-center gap-2
                                        ${selectedService
                                            ? 'bg-[#F9A825] text-white hover:opacity-90 active:scale-[0.98]'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {selectedVehicleId ? 'CONFIRM SERVICE REQUEST' : 'Choose Vehicle'}
                                    {selectedService && <ArrowLeft className="w-5 h-5 rotate-180" />}
                                </button>
                            </section>
                        </div>
                    </>
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
                        {/* Backdrop - Transparent to see map clearly */}
                        <div
                            className="absolute inset-0 bg-transparent pointer-events-auto transition-opacity"
                            onClick={() => setShowDestinationModal(false)}
                        />

                        <div className="w-full sm:max-w-lg mx-auto bg-white p-6 rounded-t-[32px] sm:rounded-3xl border-t sm:border border-slate-100 shadow-2xl relative pointer-events-auto animate-slide-up sm:animate-fade-in group pb-10 sm:pb-6 max-h-[40vh] overflow-y-auto">

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

                                    {/* Pickup Optimization Info */}
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
