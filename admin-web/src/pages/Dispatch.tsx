import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Clock, MapPin } from 'lucide-react';
import { ManualJobForm } from '../components/ManualJobForm';
import { DispatchBoard } from '../components/DispatchBoard';
import { DriverSelectionModal } from '../components/DriverSelectionModal';
import { notificationService } from '../services/notificationService';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };

interface Request {
    id: string;
    pickup_lat: number;
    pickup_long: number;
    pickup_address: string;
    dropoff_address: string;
    status: string;
    source: string; // 'app' | 'manual'
    created_at: string;
    vehicle_details: any;
    profiles?: { full_name: string; phone: string | null };
}

interface Driver {
    driver_id: string;
    is_online: boolean;
    is_busy?: boolean;
    location_lat: number;
    location_long: number;
    full_name: string;
}

export default function Dispatch() {
    const [viewMode, setViewMode] = useState<'map' | 'board'>('map');
    const [requests, setRequests] = useState<Request[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
    const [lastPulse, setLastPulse] = useState<Date>(new Date());


    // Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningReqId, setAssigningReqId] = useState<string | null>(null);

    async function fetchData() {
        // Fetch Drivers
        const { data: driverData } = await supabase.from('driver_status')
            .select(`
                driver_id, 
                is_online, 
                last_lat, 
                last_lng, 
                location, 
                profiles:driver_id(full_name)
            `);

        // Fetch active requests (needed for busy status)
        const { data: activeJobs } = await supabase
            .from('towing_requests')
            .select('driver_id')
            .in('status', ['dispatched', 'en_route', 'in_progress', 'accepted']);

        const busyDriverIds = new Set(activeJobs?.map((j: any) => j.driver_id));

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
                    console.error('Coordinate fallback failed:', e);
                }
            }

            return {
                driver_id: d.driver_id,
                is_online: d.is_online,
                is_busy: busyDriverIds.has(d.driver_id),
                location_lat: lat || 35.8989,
                location_long: lng || 14.5146,
                full_name: d.profiles?.full_name || 'Unknown'
            };
        }) || [];
        setDrivers(formattedDrivers);

        // Fetch Requests (Pending/Active)
        const { data: requestData } = await supabase.from('towing_requests')
            .select(`
                id, pickup_lat, pickup_long, pickup_address, dropoff_address, 
                status, source, created_at, vehicle_details,
                profiles!client_id(full_name, phone)
            `)
            .in('status', ['pending', 'dispatched', 'en_route', 'in_progress'])
            .order('created_at', { ascending: false });

        setRequests((requestData || []).map((r: any) => ({
            ...r,
            profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        })));

    }

    useEffect(() => {
        fetchData();

        // Subscription for real-time updates - Unified High-Reliability Channel
        const fleetSub = supabase
            .channel('mission_control_sync')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'driver_status' },
                () => {
                    setLastPulse(new Date());
                    fetchData();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'towing_requests' },
                () => {
                    setLastPulse(new Date());
                    fetchData();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setSyncStatus('synced');
                else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setSyncStatus('error');
            });

        return () => {
            supabase.removeChannel(fleetSub);
        };
    }, []);

    async function handleAssignDriver(driverId: string) {
        if (!assigningReqId) return;

        try {
            const { error } = await supabase
                .from('towing_requests')
                .update({
                    status: 'dispatched',
                    driver_id: driverId
                })
                .eq('id', assigningReqId);

            if (error) throw error;

            // Notify Customer (Simulated)
            const req = requests.find(r => r.id === assigningReqId);
            const driver = drivers.find(d => d.driver_id === driverId);

            if (req && driver) {
                const phone = req.source === 'manual' ? req.vehicle_details?.customer_phone : req.profiles?.phone;
                const name = req.source === 'manual' ? req.vehicle_details?.customer_name : req.profiles?.full_name;

                if (phone && name) {
                    await notificationService.sendSMS(
                        phone,
                        notificationService.templates.driverAssigned(name, driver.full_name, '15') // Mock 15 mins ETA
                    );
                    alert(`Driver Assigned! SMS sent to ${name}.`);
                }
            }

            setIsAssignModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Assignments error:', err);
            alert('Could not assign driver.');
        }
    }

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col gap-4 animate-in fade-in duration-500">

            <DriverSelectionModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                drivers={drivers}
                onSelectDriver={handleAssignDriver}
                pickupLocation={requests.find(r => r.id === assigningReqId) ? {
                    lat: requests.find(r => r.id === assigningReqId)!.pickup_lat,
                    lng: requests.find(r => r.id === assigningReqId)!.pickup_long
                } : undefined}
            />

            {/* Header / Toolbar */}
            <div className="flex justify-between items-center glass-panel p-3">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-theme-primary">
                        TowMe Operations
                    </h2>
                    <span className="text-xs text-theme-secondary bg-white/5 px-2 py-1 rounded-full border border-white/5">
                        Test Mode
                    </span>
                </div>

                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === 'map' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Live Map
                    </button>
                    <button
                        onClick={() => setViewMode('board')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewMode === 'board' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Kanban Board
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel: Active Queue (Only visible in Map Mode) */}
                {viewMode === 'map' && (
                    <div className="w-80 flex flex-col gap-4">
                        <div className="glass-panel p-4 flex justify-between items-center">
                            <h2 className="font-bold text-lg">Active Queue</h2>
                            <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                                {requests.length} Jobs
                            </span>
                        </div>

                        <div className="flex-1 glass-panel overflow-y-auto p-2 space-y-2">
                            {requests.length === 0 && (
                                <div className="text-center p-8 text-slate-500 text-sm">
                                    No active jobs.
                                </div>
                            )}
                            {requests.map(req => (
                                <div
                                    key={req.id}
                                    onClick={() => setSelectedId(req.id)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedId === req.id
                                        ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${req.source === 'manual' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                                                }`}>
                                                {req.source}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold ${req.status === 'pending' ? 'text-amber-400' : 'text-green-400'
                                            }`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-sm text-white mb-1">
                                        {req.source === 'manual'
                                            ? req.vehicle_details?.customer_name || 'Guest'
                                            : req.profiles?.full_name || 'Client'
                                        }
                                    </h4>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                                        <MapPin size={12} className="text-slate-500" />
                                        <span className="truncate">{req.pickup_address || 'No address'}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock size={12} />
                                        <span>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Center Content: Map OR Board */}
                <div className="flex-1 rounded-3xl overflow-hidden glass-panel border-white/10 relative">
                    {viewMode === 'map' ? (
                        <>
                            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                                <Map
                                    defaultCenter={MALTA_CENTER}
                                    defaultZoom={12}
                                    gestureHandling={'greedy'}
                                    disableDefaultUI={true}
                                    mapId="dispatch_map_id"
                                >
                                    {/* ... Markers ... */}
                                    {drivers.map(d => (
                                        <Marker
                                            key={d.driver_id}
                                            position={{ lat: d.location_lat, lng: d.location_long }}
                                            zIndex={100} // Drivers above requests
                                            onClick={() => setSelectedId(d.driver_id)}
                                            icon={{
                                                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                                                        <defs>
                                                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                                                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="black" flood-opacity="0.5"/>
                                                            </filter>
                                                            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                                <stop offset="0%" stop-color="#f8fafc" />
                                                                <stop offset="100%" stop-color="#cbd5e1" />
                                                            </linearGradient>
                                                        </defs>

                                                        <!-- Universal High-Intensity Pulse System -->
                                                        <ellipse cx="24" cy="24" rx="14" ry="20" fill="${(d as any).is_busy ? '#f59e0b' : (d.is_online ? '#4ade80' : '#94a3b8')}" fill-opacity="0.4" filter="blur(3px)">
                                                            ${d.is_online ? `
                                                                <animate attributeName="fill-opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" />
                                                                <animate attributeName="rx" values="14;16;14" dur="2s" repeatCount="indefinite" />
                                                                <animate attributeName="ry" values="20;24;20" dur="2s" repeatCount="indefinite" />
                                                            ` : ''}
                                                        </ellipse>
                                                        
                                                        <!-- Ring 2 (Outer Pulse - Only for Active) -->
                                                        ${d.is_online ? `
                                                            <ellipse cx="24" cy="24" rx="14" ry="20" fill="${(d as any).is_busy ? '#f59e0b' : '#4ade80'}" fill-opacity="0.3">
                                                                <animate attributeName="rx" values="14;24;14" dur="2s" repeatCount="indefinite" />
                                                                <animate attributeName="ry" values="20;32;20" dur="2s" repeatCount="indefinite" />
                                                                <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                                                            </ellipse>
                                                        ` : ''}

                                                        <!-- Truck Body -->
                                                        <g filter="url(#shadow)">
                                                            <!-- Main Chassis -->
                                                            <rect x="16" y="12" width="16" height="24" rx="3" fill="url(#bodyGradient)" stroke="#475569" stroke-width="1"/>
                                                            <!-- Cab -->
                                                            <rect x="16" y="8" width="16" height="8" rx="2" fill="#1e293b" />
                                                            <!-- Windshield -->
                                                            <rect x="18" y="9" width="12" height="4" rx="1" fill="#38bdf8" fill-opacity="0.8"/>
                                                            <!-- Bed/Flatbed Details -->
                                                            <line x1="18" y1="20" x2="30" y2="20" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2"/>
                                                            <line x1="18" y1="24" x2="30" y2="24" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2"/>
                                                            <line x1="18" y1="28" x2="30" y2="28" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 2"/>
                                                            
                                                            <!-- Beacons for Ongoing Job -->
                                                            ${(d as any).is_busy ? `
                                                                <rect x="18" y="27" width="4" height="2" fill="#f59e0b">
                                                                    <animate attributeName="fill" values="#fbbf24;#78350f;#fbbf24" dur="0.8s" repeatCount="indefinite" />
                                                                </rect>
                                                                <rect x="26" y="27" width="4" height="2" fill="#f59e0b">
                                                                    <animate attributeName="fill" values="#78350f;#fbbf24;#78350f" dur="0.8s" repeatCount="indefinite" />
                                                                </rect>
                                                            ` : ''}

                                                            <!-- Tail Lights -->
                                                            <rect x="17" y="34" width="3" height="2" fill="${d.is_online ? '#ef4444' : '#64748b'}" />
                                                            <rect x="28" y="34" width="3" height="2" fill="${d.is_online ? '#ef4444' : '#64748b'}" />

                                                            <!-- Status Lights (Roof) -->
                                                            <rect x="15" y="10" width="2" height="2" rx="1" fill="${d.is_online ? '#4ade80' : '#475569'}"/>
                                                            <rect x="29" y="10" width="2" height="2" rx="1" fill="${d.is_online ? '#4ade80' : '#475569'}"/>
                                                        </g>
                                                    </svg>
                                                `)}`,
                                                scaledSize: { width: 48, height: 48 } as any,
                                                anchor: { x: 24, y: 24 } as any
                                            }}
                                        />
                                    ))}

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
                                                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                                                <feMerge>
                                                                    <feMergeNode in="coloredBlur"/>
                                                                    <feMergeNode in="SourceGraphic"/>
                                                                </feMerge>
                                                            </filter>
                                                        </defs>
                                                        <!-- Extreme Multi-Ring Pulse -->
                                                        <circle cx="24" cy="24" r="12" fill="${req.source === 'manual' ? '#a855f7' : '#3b82f6'}" fill-opacity="0.5">
                                                            <animate attributeName="r" values="12;32;12" dur="1.5s" repeatCount="indefinite" />
                                                            <animate attributeName="fill-opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                                                        </circle>
                                                        <circle cx="24" cy="24" r="10" fill="${req.source === 'manual' ? '#a855f7' : '#3b82f6'}" fill-opacity="0.3">
                                                            <animate attributeName="r" values="10;48;10" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                                                            <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                                                        </circle>
                                                        <!-- Main Marker -->
                                                        <circle cx="24" cy="24" r="10" fill="${req.source === 'manual' ? '#a855f7' : '#3b82f6'}" stroke="white" stroke-width="2" filter="url(#glow)"/>
                                                        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" fill="white" font-weight="bold">${req.source === 'manual' ? 'M' : 'A'}</text>
                                                    </svg>
                                                `)}`,
                                                scaledSize: { width: 48, height: 48 } as any
                                            }}
                                        />
                                    ))}

                                    {selectedId && (
                                        <InfoWindow
                                            position={
                                                drivers.find(d => d.driver_id === selectedId)
                                                    ? { lat: drivers.find(d => d.driver_id === selectedId)!.location_lat, lng: drivers.find(d => d.driver_id === selectedId)!.location_long }
                                                    : requests.find(r => r.id === selectedId)
                                                        ? { lat: requests.find(r => r.id === selectedId)!.pickup_lat, lng: requests.find(r => r.id === selectedId)!.pickup_long }
                                                        : null
                                            }
                                            onCloseClick={() => setSelectedId(null)}
                                        >
                                            <div className="p-2 min-w-[150px]">
                                                {drivers.find(d => d.driver_id === selectedId) ? (
                                                    // Driver Info
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
                                                            className="w-full mt-3 surface-button-secondary text-[10px] font-bold py-1.5 pointer-events-auto"
                                                        >
                                                            View Profile
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Request Info
                                                    <>
                                                        <h4 className="font-bold text-sm text-slate-900">
                                                            {requests.find(r => r.id === selectedId)?.source === 'manual'
                                                                ? requests.find(r => r.id === selectedId)?.vehicle_details?.customer_name || 'Guest'
                                                                : requests.find(r => r.id === selectedId)?.profiles?.full_name || 'Client'
                                                            }
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 mt-1 truncate">{requests.find(r => r.id === selectedId)?.pickup_address}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className={`w-2 h-2 rounded-full ${requests.find(r => r.id === selectedId)?.status === 'pending' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                                                                {requests.find(r => r.id === selectedId)?.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setAssigningReqId(selectedId);
                                                                setIsAssignModalOpen(true);
                                                            }}
                                                            className="w-full mt-3 bg-amber-500 text-black text-[10px] font-bold py-1.5 rounded-lg hover:bg-amber-600 transition-colors pointer-events-auto"
                                                        >
                                                            Dispatch Driver
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </InfoWindow>
                                    )}
                                </Map>
                            </APIProvider>

                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                {/* Live Radar Badge */}
                                <div className="glass-panel px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-300 border border-white/10 shadow-xl backdrop-blur-md">
                                    <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-500'}`} />
                                    {syncStatus === 'synced' ? 'Live Radar' : 'Offline'}
                                    <span className="text-slate-500 font-mono ml-1">{lastPulse.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>

                                {/* Compact Stats */}
                                <div className="flex gap-2">
                                    <div className="glass-panel px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-green-400 border border-white/10 shadow-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        {drivers.filter(d => d.is_online).length} Online
                                    </div>
                                    <div className="glass-panel px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-blue-400 border border-white/10 shadow-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        {requests.filter(r => r.status === 'pending').length} Pending
                                    </div>
                                    <div className="glass-panel px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-500 border border-white/10 shadow-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        {requests.filter(r => ['dispatched', 'en_route', 'in_progress', 'accepted'].includes(r.status)).length} Active
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full p-4">
                            <DispatchBoard
                                requests={requests}
                                onUpdate={fetchData}
                                onAssign={(id) => {
                                    setAssigningReqId(id);
                                    setIsAssignModalOpen(true);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel: Manual Entry (Always visible) */}
                <div className="w-96 flex flex-col">
                    <ManualJobForm onJobCreated={fetchData} />
                </div>
            </div>
        </div>
    );
}
