import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Truck, Navigation, Clock, ShieldCheck, ArrowLeft, Phone, Radio, Loader2 } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };

export default function Tracking() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState<any>(null);
    const [driver, setDriver] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [eta, setEta] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel the request?")) return;
        setIsCancelling(true);
        try {
            const { error } = await supabase
                .from('towing_requests')
                .update({ status: 'cancelled' })
                .eq('id', requestId);

            if (error) throw error;
            navigate('/services');
        } catch (err) {
            console.error('Error cancelling:', err);
            alert('Failed to cancel request.');
            setIsCancelling(false);
        }
    };
    const [distanceText, setDistanceText] = useState<string>('--');

    useEffect(() => {
        fetchRequest();

        const subscription = supabase
            .channel(`tracking-${requestId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'towing_requests', filter: `id=eq.${requestId}` },
                payload => {
                    setRequest(payload.new);
                    if (payload.new.driver_id) fetchDriverStatus(payload.new.driver_id);
                })
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [requestId]);

    useEffect(() => {
        if (!request?.driver_id) return;

        const driverSub = supabase
            .channel(`driver-tracking-${request.driver_id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'driver_status',
                filter: `driver_id=eq.${request.driver_id}`
            }, payload => {
                setDriver((prev: any) => ({ ...prev, ...payload.new }));
                calculateLiveEta(payload.new.location);
            })
            .subscribe();

        return () => { driverSub.unsubscribe(); };
    }, [request?.driver_id]);

    async function calculateLiveEta(locationStr: string) {
        if (!window.google || !locationStr || !request) return;

        const coords = locationStr.match(/\((.*)\)/)?.[1]?.split(' ');
        if (!coords) return;
        const driverPos = { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) };
        const pickupPos = { lat: request.pickup_lat, lng: request.pickup_long };

        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [driverPos],
            destinations: [pickupPos],
            travelMode: google.maps.TravelMode.DRIVING
        }, (response, status) => {
            if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
                setEta(response.rows[0].elements[0].duration.text);
                setDistanceText(response.rows[0].elements[0].distance.text);
            }
        });
    }

    async function fetchRequest() {
        const { data } = await supabase
            .from('towing_requests')
            .select('*, driver_id')
            .eq('id', requestId)
            .single();

        setRequest(data);
        if (data?.driver_id) fetchDriverStatus(data.driver_id);
        setLoading(false);
    }

    async function fetchDriverStatus(driverId: string) {
        const { data } = await supabase
            .from('driver_status')
            .select('*, profiles(full_name)')
            .eq('driver_id', driverId)
            .single();
        setDriver(data);
    }

    if (loading) return (
        <div className="h-screen bg-black flex items-center justify-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-center animate-pulse">
                <Truck className="text-amber-500" size={32} />
            </div>
        </div>
    );

    const isAccepted = request?.status !== 'pending';
    const pickupLocation = request ? { lat: request.pickup_lat, lng: request.pickup_long } : MALTA_CENTER;

    const getDriverCoords = (location: string) => {
        if (!location) return null;
        const coords = location.match(/\((.*)\)/)?.[1]?.split(' ');
        if (!coords) return null;
        return { lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) };
    };

    const driverLocation = driver?.location ? getDriverCoords(driver.location) : null;

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <div className="h-screen w-full relative bg-black text-white overflow-hidden font-sans animate-fade-in">
                {/* Real Google Map */}
                <div className="absolute inset-0 z-0 grayscale brightness-[0.3] contrast-125">
                    {GOOGLE_MAPS_API_KEY ? (
                        <Map
                            defaultCenter={pickupLocation}
                            defaultZoom={15}
                            gestureHandling={'greedy'}
                            disableDefaultUI={true}
                            mapId="bf50a41c2c27038"
                        >
                            <Marker position={pickupLocation} />
                            {isAccepted && driverLocation && (
                                <Marker
                                    position={driverLocation}
                                    icon={{
                                        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="1" y="3" width="15" height="13"></rect>
                                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                            </svg>
                                        `)}`,
                                        scaledSize: { width: 48, height: 48 } as any
                                    }}
                                />
                            )}
                        </Map>
                    ) : (
                        <div className="w-full h-full opacity-10 bg-[#F9A825]"></div>
                    )}
                </div>

                {/* Top Bar Navigation */}
                <div className="absolute top-0 left-0 w-full p-6 z-20 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/services" className="p-4 rounded-2xl glass-button border-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft className="text-amber-500" size={20} />
                        </Link>
                        <div className="flex-1 glass-panel px-5 py-3 flex items-center justify-between border-white/5 bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${isAccepted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-amber-500 shadow-gold-glow animate-pulse'}`} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                    {request?.status === 'pending' ? 'Establishing Comms...' : 'TowMe Escort En Route'}
                                </span>
                            </div>
                            {isAccepted && <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg">ETA: {eta}</span>}
                        </div>
                    </div>

                    {/* Task 6: Arriving Now Notification */}
                    {request?.status === 'en_route' && (
                        <div className="w-full bg-amber-500 py-3 px-6 rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.4)] animate-bounce flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Radio className="text-black animate-pulse" size={20} />
                                <span className="text-black font-black uppercase tracking-widest text-xs">Arriving Now • Get Ready</span>
                            </div>
                            <span className="text-black font-black text-xs italic">{eta}</span>
                        </div>
                    )}
                </div>

                {/* Main Content Area (Real-time tracking visual) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] z-10 pointer-events-none">
                    {!isAccepted ? (
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
                                <div className="w-24 h-24 bg-black/40 backdrop-blur-xl border-4 border-amber-500/30 rounded-[40px] flex items-center justify-center relative shadow-gold-glow">
                                    <Radio className="text-amber-500 animate-pulse" size={40} />
                                </div>
                            </div>
                            <p className="mt-6 text-xs font-black uppercase tracking-[0.4em] text-amber-500/60 animate-bounce">Scanning Grid</p>
                        </div>
                    ) : null}
                </div>

                {/* Bottom Control Panel */}
                <div className="absolute bottom-0 left-0 w-full p-8 z-20">
                    <div className="glass-panel p-8 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] animate-slide-up bg-black/80 backdrop-blur-[40px] border-white/5 rounded-[40px]">
                        {!isAccepted ? (
                            <div className="text-center">
                                <h3 className="text-3xl font-black mb-2 tracking-tighter">Locating TowMe Rescuer</h3>
                                <p className="text-sm font-medium text-slate-500 mb-10">High-priority request broadcasted from your location.</p>

                                <button
                                    onClick={handleCancel}
                                    disabled={isCancelling}
                                    className="w-full py-5 text-[10px] font-black uppercase tracking-[0.3em] text-red-500/40 hover:text-red-500 transition-all border border-red-500/10 rounded-2xl hover:bg-red-500/5 disabled:opacity-50"
                                >
                                    {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Abort Mission (Cancel)'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-[24px] bg-amber-500 flex items-center justify-center text-black shadow-gold-glow relative">
                                            <Truck size={32} />
                                            <div className="absolute -top-2 -right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-black"></div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl tracking-tight">{driver?.profiles?.full_name || 'ELITE OPERATOR'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rapid Response Unit</span>
                                            </div>
                                        </div>
                                    </div>
                                    <a href={`tel:${driver?.profiles?.contact_number || '#'}`} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-green-500 hover:bg-green-500/10 hover:border-green-500/20 transition-all active:scale-90">
                                        <Phone size={24} fill="currentColor" />
                                    </a>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 transition-transform hover:scale-[1.02]">
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Clock size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Arrival</span>
                                        </div>
                                        <p className="text-2xl font-black text-white m-0">{(eta || '--').split(' ')[0]} <span className="text-[10px] text-slate-500 font-bold ml-1">{(eta || '--').split(' ')[1] || 'MIN'}</span></p>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 transition-transform hover:scale-[1.02]">
                                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                                            <Navigation size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Range</span>
                                        </div>
                                        <p className="text-2xl font-black text-white m-0">{distanceText.split(' ')[0]} <span className="text-[10px] text-slate-500 font-bold ml-1">{distanceText.split(' ')[1] || 'KM'}</span></p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-amber-500/5 p-5 rounded-3xl border border-amber-500/10">
                                    <ShieldCheck className="text-amber-500" size={20} />
                                    <span>Deployment Covered by TowMe Elite</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </APIProvider>
    );
}
