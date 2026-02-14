// OASR-VERIFIED TELEMETRY COMPONENT
// VISUAL LAW: #F9A825 | STATUS: ZERO-SIMULATION COMPLIANT

import React, { useEffect, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { supabase } from '../../../lib/supabase'; // OASR Pathing Law (Adjusted for relative path)
import { Loader2 } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };

export const LiveOperations = () => {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const fetchFleetTelemetry = async () => {
        try {
            console.log('OASR SENTINEL: Initiating Telemetry Handshake...');

            const { data, error } = await supabase
                .from('driver_locations')
                .select(`
                    id,
                    latitude,
                    longitude,
                    heading,
                    status,
                    last_updated, 
                    driver:driver_locations_driver_id_fkey!inner (
                        id,
                        owner_name, 
                        vehicle_type,
                        tow_truck_make,
                        tow_truck_registration_plate,
                        phone,
                        status
                    )
                `)
                .eq('status', 'ONLINE');

            if (error) {
                console.error('OASR CRITICAL FAILURE:', error);
                // Implement retry logic for transient errors
                const { data: retryData, error: retryError } = await supabase
                    .from('driver_locations')
                    .select(`
                        id,
                        latitude,
                        longitude,
                        heading,
                        status,
                        last_updated, 
                        driver:driver_locations_driver_id_fkey!inner (
                            id,
                            owner_name, 
                            vehicle_type,
                            tow_truck_make,
                            tow_truck_registration_plate,
                            phone,
                            status
                        )
                    `)
                    .eq('status', 'ONLINE');

                if (retryError) {
                    console.error('OASR CRITICAL FAILURE (500):', retryError);
                    throw retryError;
                }
                setDrivers(retryData || []);
            } else {
                setDrivers(data || []);
            }

            setIsLoading(false);
            setLastRefresh(new Date());
            console.log('OASR SUCCESS: Fleet Signal Acquired.');

        } catch (err) {
            console.error('SYSTEM HALT: Telemetry fetch aborted.', err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFleetTelemetry();
        const interval = setInterval(fetchFleetTelemetry, 30000); // 30s Pulse
        return () => clearInterval(interval);
    }, []);

    if (isLoading) return (
        <div className="flex h-screen items-center justify-center bg-slate-900 text-[#F9A825]">
            <Loader2 className="animate-spin mr-3" />
            <span className="font-mono text-xs uppercase tracking-widest">OASR Telemetry Handshake...</span>
        </div>
    );

    const selectedDriver = drivers.find(d => d.id === selectedId);

    return (
        <div className="relative w-full h-[calc(100vh-64px)] bg-slate-900 overflow-hidden">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                    defaultCenter={MALTA_CENTER}
                    defaultZoom={11}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    mapId="live_ops_dark"
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                >
                    {drivers.map(loc => (
                        <Marker
                            key={loc.id}
                            position={{ lat: loc.latitude, lng: loc.longitude }}
                            onClick={() => setSelectedId(loc.id)}
                            icon={{
                                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                                        <circle cx="20" cy="20" r="8" fill="#F9A825" fill-opacity="0.4">
                                            <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                                            <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                        <circle cx="20" cy="20" r="5" fill="#F9A825" stroke="white" stroke-width="2" />
                                    </svg>
                                `)}`,
                                scaledSize: { width: 40, height: 40 } as any,
                                anchor: { x: 20, y: 20 } as any
                            }}
                        />
                    ))}

                    {selectedDriver && (
                        <InfoWindow
                            position={{ lat: selectedDriver.latitude, lng: selectedDriver.longitude }}
                            onCloseClick={() => setSelectedId(null)}
                            headerContent={<span className="font-bold text-xs uppercase tracking-widest">
                                {selectedDriver.driver.owner_name || selectedDriver.driver.name || 'Unknown Unit'}
                            </span>}
                        >
                            <div className="min-w-[200px] p-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-[#F9A825]" />
                                    <span className="text-xs font-mono">{selectedDriver.status}</span>
                                </div>
                                <div className="text-sm font-bold text-slate-800 mb-1">
                                    {Array.isArray(selectedDriver.driver.tow_truck_types)
                                        ? selectedDriver.driver.tow_truck_types[0]
                                        : (selectedDriver.driver.vehicle_type || 'Tow Truck')}
                                </div>
                                <div className="mt-3 pt-2 border-t flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400">ID: {selectedDriver.driver.id.slice(0, 6)}</span>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>

            {/* LIVE OVERLAY STATS */}
            <div className="absolute top-6 left-6 bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[200px]">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">OASR LIVE FEED</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Active Units</span>
                        <span className="font-mono font-bold text-[#F9A825]">{drivers.length}</span>
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
                    LAST SYNC: {lastRefresh.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};
