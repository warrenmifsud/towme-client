import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Loader2 } from 'lucide-react';
import PageContainer from '../components/PageContainer';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };

interface Driver {
    driver_id: string;
    is_online: boolean;
    is_busy: boolean;
    location_lat: number;
    location_long: number;
    full_name: string;
}

interface Request {
    id: string;
    pickup_lat: number;
    pickup_long: number;
    status: string;
    service_name: string;
    client_name: string;
}

export default function FleetMap() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
    const [lastPulse, setLastPulse] = useState<Date>(new Date());

    useEffect(() => {
        fetchData();

        // Subscription for real-time updates - Unified High-Reliability Channel
        const driversSubscription = supabase
            .channel('fleet_force_sync')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'driver_status' },
                (payload) => {
                    console.log('Driver status pulse:', payload);
                    setLastPulse(new Date());
                    fetchData();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'towing_requests' },
                (payload) => {
                    console.log('Job request pulse:', payload);
                    setLastPulse(new Date());
                    fetchData();
                }
            )
            .subscribe((status) => {
                console.log('Fleet Sync Heartbeat:', status);
                if (status === 'SUBSCRIBED') {
                    setSyncStatus('synced');
                    fetchData(); // Final catch-up on successful connect
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setSyncStatus('error');
                }
            });

        return () => {
            supabase.removeChannel(driversSubscription);
        };
    }, []);

    async function fetchData() {
        // 1. Fetch active requests first (needed for busy driver check)
        const { data: requestData, error: requestError } = await supabase
            .from('towing_requests')
            .select(`
                id,
                pickup_lat,
                pickup_long,
                status,
                driver_id,
                service_categories:category_id (name),
                profiles!client_id (full_name)
            `)
            .in('status', ['pending', 'dispatched', 'en_route', 'in_progress', 'accepted']);

        if (requestError) console.error('Request Fetch Error:', requestError);

        const busyDriverIds = new Set(requestData?.filter((r: any) => r.driver_id && ['dispatched', 'en_route', 'in_progress', 'accepted'].includes(r.status)).map((r: any) => r.driver_id));

        // 2. Fetch Drivers
        const { data: driverData, error: driverError } = await supabase
            .from('driver_status')
            .select(`
                driver_id,
                is_online,
                last_lat,
                last_lng,
                location,
                profiles(full_name)
            `);

        if (driverError) {
            console.error('Driver Fetch Error:', driverError);
        }

        const formattedDrivers = driverData?.map((d: any) => {
            let lat = d.last_lat;
            let lng = d.last_lng;

            if ((!lat || !lng) && d.location) {
                try {
                    if (typeof d.location === 'string') {
                        const coords = d.location.match(/\((.*)\)/)?.[1]?.split(' ');
                        if (coords) {
                            lng = parseFloat(coords[0]);
                            lat = parseFloat(coords[1]);
                        }
                    } else if (d.location.coordinates) {
                        lng = d.location.coordinates[0];
                        lat = d.location.coordinates[1];
                    }
                } catch (e) {
                    console.error('Coordinate parsing fallback failed:', e);
                }
            }

            return {
                driver_id: d.driver_id,
                is_online: d.is_online,
                is_busy: busyDriverIds.has(d.driver_id),
                location_lat: lat || 35.8989,
                location_long: lng || 14.5146,
                full_name: d.profiles?.full_name || 'Unknown Driver'
            };
        }) || [];

        setDrivers(formattedDrivers);

        const formattedRequests = requestData?.map((r: any) => ({
            id: r.id,
            pickup_lat: r.pickup_lat,
            pickup_long: r.pickup_long,
            status: r.status,
            service_name: r.service_categories?.name || 'Service',
            client_name: r.profiles?.full_name || 'Client'
        })) || [];

        setRequests(formattedRequests);
        setLoading(false);
    }

    if (loading) return (
        <div className="flex items-center justify-center p-20 text-gray-400">
            <Loader2 className="animate-spin mr-2" /> Loading map data...
        </div>
    );

    return (
        <PageContainer
            title="Live Fleet Map"
            subtitle="Real-time driver and request tracking"
        >
            <div className="h-[calc(100vh-300px)] rounded-3xl overflow-hidden glass-panel border-white/10 relative">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <Map
                        defaultCenter={MALTA_CENTER}
                        defaultZoom={12}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        mapId="bf50a41c2c27038"
                    >
                        {/* Driver Markers */}
                        {drivers.map(driver => (
                            <Marker
                                key={driver.driver_id}
                                position={{ lat: driver.location_lat, lng: driver.location_long }}
                                onClick={() => setSelectedId(driver.driver_id)}
                                icon={{
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                                        <defs>
                                            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                                                <feOffset dx="1" dy="2" result="offsetblur"/>
                                                <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                                                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                                            </filter>
                                            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" style="stop-color:#334155"/>
                                                <stop offset="50%" style="stop-color:#475569"/>
                                                <stop offset="100%" style="stop-color:#334155"/>
                                            </linearGradient>
                                        </defs>

                                        <!-- Universal High-Intensity Pulse System -->
                                        <!-- Ring 1 (Inner) -->
                                        <ellipse cx="24" cy="24" rx="14" ry="20" fill="${driver.is_busy ? '#f59e0b' : (driver.is_online ? '#4ade80' : '#94a3b8')}" fill-opacity="0.4" filter="blur(3px)">
                                            ${driver.is_online ? `
                                                <animate attributeName="fill-opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="rx" values="14;16;14" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="ry" values="20;24;20" dur="2s" repeatCount="indefinite" />
                                            ` : ''}
                                        </ellipse>
                                        
                                        <!-- Ring 2 (Outer Pulse - Only for Active) -->
                                        ${driver.is_online ? `
                                            <ellipse cx="24" cy="24" rx="14" ry="20" fill="${driver.is_busy ? '#f59e0b' : '#4ade80'}" fill-opacity="0.3">
                                                <animate attributeName="rx" values="14;24;14" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="ry" values="20;32;20" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                            </ellipse>
                                        ` : ''}

                                        <!-- Truck Body -->
                                        <g filter="url(#shadow)">
                                            <rect x="14" y="10" width="20" height="28" rx="2" fill="url(#bodyGradient)"/>
                                            <rect x="14" y="28" width="20" height="12" rx="3" fill="url(#bodyGradient)"/>
                                            <rect x="16" y="30" width="16" height="8" rx="2" fill="#0f172a"/>
                                            
                                            <!-- Beacons for Ongoing Job -->
                                            ${driver.is_busy ? `
                                                <rect x="18" y="27" width="4" height="2" fill="#f59e0b">
                                                    <animate attributeName="fill" values="#fbbf24;#78350f;#fbbf24" dur="0.8s" repeatCount="indefinite" />
                                                </rect>
                                                <rect x="26" y="27" width="4" height="2" fill="#f59e0b">
                                                    <animate attributeName="fill" values="#78350f;#fbbf24;#78350f" dur="0.8s" repeatCount="indefinite" />
                                                </rect>
                                            ` : ''}

                                            <!-- Status Lights -->
                                            <rect x="15" y="10" width="4" height="1.5" rx="0.5" fill="${driver.is_online ? '#4ade80' : '#475569'}"/>
                                            <rect x="29" y="10" width="4" height="1.5" rx="0.5" fill="${driver.is_online ? '#4ade80' : '#475569'}"/>
                                        </g>
                                    </svg>
                                `)}`,
                                    scaledSize: { width: 48, height: 48 } as any,
                                    anchor: { x: 24, y: 24 } as any
                                }}
                            />
                        ))}

                        {/* Request Markers */}
                        {requests.map(req => (
                            <Marker
                                key={req.id}
                                position={{ lat: req.pickup_lat, lng: req.pickup_long }}
                                onClick={() => setSelectedId(req.id)}
                                icon={{
                                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                                        <defs>
                                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feGaussianBlur stdDeviation="3" result="blur" />
                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                            </filter>
                                        </defs>
                                        <!-- Extreme Multi-Ring Pulse -->
                                        <circle cx="24" cy="24" r="12" fill="${req.status === 'pending' ? '#3b82f6' : '#f59e0b'}" fill-opacity="0.5">
                                            <animate attributeName="r" values="12;32;12" dur="1.5s" repeatCount="indefinite" />
                                            <animate attributeName="fill-opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                                        </circle>
                                        <circle cx="24" cy="24" r="10" fill="${req.status === 'pending' ? '#3b82f6' : '#f59e0b'}" fill-opacity="0.3">
                                            <animate attributeName="r" values="10;48;10" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                                            <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                                        </circle>
                                        <!-- Main Marker -->
                                        <circle cx="24" cy="24" r="10" fill="white" filter="url(#glow)"/>
                                        <circle cx="24" cy="24" r="7" fill="${req.status === 'pending' ? '#3b82f6' : '#f59e0b'}"/>
                                        <path d="M24 16v8l4 2" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
                                    </svg>
                                `)}`,
                                    scaledSize: { width: 48, height: 48 } as any,
                                    anchor: { x: 24, y: 24 } as any
                                }}
                            />
                        ))}

                        {/* Selection Info */}
                        {selectedId && (
                            <InfoWindow
                                position={
                                    drivers.find(d => d.driver_id === selectedId)
                                        ? { lat: drivers.find(d => d.driver_id === selectedId)!.location_lat, lng: drivers.find(d => d.driver_id === selectedId)!.location_long }
                                        : { lat: requests.find(r => r.id === selectedId)!.pickup_lat, lng: requests.find(r => r.id === selectedId)!.pickup_long }
                                }
                                onCloseClick={() => setSelectedId(null)}
                            >
                                <div className="p-2 min-w-[150px] text-slate-900">
                                    {drivers.find(d => d.driver_id === selectedId) ? (
                                        <>
                                            <h4 className="font-bold text-sm text-slate-900">{drivers.find(d => d.driver_id === selectedId)!.full_name}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${drivers.find(d => d.driver_id === selectedId)?.is_busy ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : (drivers.find(d => d.driver_id === selectedId)?.is_online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-400')}`} />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                    {drivers.find(d => d.driver_id === selectedId)?.is_busy ? 'On Job' : (drivers.find(d => d.driver_id === selectedId)?.is_online ? 'Online' : 'Offline')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => alert('Driver details coming soon')}
                                                className="w-full mt-4 surface-button-secondary text-[10px] font-black uppercase tracking-widest py-2 pointer-events-auto active:scale-95 shadow-lg"
                                            >
                                                View Profile
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="font-bold text-sm text-slate-900">{requests.find(r => r.id === selectedId)!.client_name}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500/90 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                                                    {requests.find(r => r.id === selectedId)!.service_name}
                                                </span>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-slate-100">
                                                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Job Status</p>
                                                <p className={`text-xs font-bold mt-0.5 ${requests.find(r => r.id === selectedId)!.status === 'pending' ? 'text-blue-500' : 'text-amber-500'}`}>
                                                    {requests.find(r => r.id === selectedId)!.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </InfoWindow>
                        )}
                    </Map>
                </APIProvider>

                {/* Legend & Stats Overlay */}
                <div className="absolute bottom-6 left-6 glass-panel p-6 flex flex-col gap-6 shadow-2xl border border-white/10 rounded-3xl pointer-events-none">
                    {/* Connection Status Badge */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {syncStatus === 'synced' ? 'Live Radar Active' : 'Radar Link Lost'}
                            </span>
                        </div>
                        <span className="text-[9px] text-gray-600 font-mono">
                            {lastPulse.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4 pb-6 border-b border-white/10">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Online</span>
                            <span className="text-2xl font-black text-green-400 leading-none">{drivers.filter(d => d.is_online).length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Offline</span>
                            <span className="text-2xl font-black text-slate-500 leading-none">{drivers.filter(d => !d.is_online).length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Pending</span>
                            <span className="text-2xl font-black text-blue-400 leading-none">{requests.filter(r => r.status === 'pending').length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Ongoing</span>
                            <span className="text-2xl font-black text-amber-500 leading-none">{requests.filter(r => ['dispatched', 'en_route', 'in_progress', 'accepted'].includes(r.status)).length}</span>
                        </div>
                    </div>

                    {/* Legend Section */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-wider">
                            <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]" /> Online Driver
                        </div>
                        <div className="flex items-center gap-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                            <div className="w-3 h-3 rounded-full bg-gray-500" /> Offline Driver
                        </div>
                        <div className="flex items-center gap-4 text-xs font-black text-blue-400 uppercase tracking-wider">
                            <div className="w-3 h-3 rounded-full bg-blue-500/90 shadow-[0_0_12px_rgba(59,130,246,0.5)] animate-pulse" /> Pending Request
                        </div>
                        <div className="flex items-center gap-4 text-xs font-black text-amber-500 uppercase tracking-wider">
                            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse" /> Ongoing Job
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
