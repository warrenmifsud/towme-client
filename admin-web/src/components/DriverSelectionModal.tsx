
import { User, Truck, MapPin, X, CheckCircle2 } from 'lucide-react';

interface Driver {
    driver_id: string;
    full_name: string;
    is_online: boolean;
    location_lat: number;
    location_long: number;
}

interface DriverSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    drivers: Driver[];
    onSelectDriver: (driverId: string) => void;
    pickupLocation?: { lat: number; lng: number };
}

export function DriverSelectionModal({ isOpen, onClose, drivers, onSelectDriver, pickupLocation }: DriverSelectionModalProps) {
    if (!isOpen) return null;

    // Simple distance calc (haversine approximation or just euclidean for sorting)
    const getDistance = (d: Driver) => {
        if (!pickupLocation) return 0;
        const R = 6371; // km
        const dLat = (d.location_lat - pickupLocation.lat) * Math.PI / 180;
        const dLon = (d.location_long - pickupLocation.lng) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(pickupLocation.lat * Math.PI / 180) * Math.cos(d.location_lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const sortedDrivers = [...drivers].sort((a, b) => {
        // Sort by online status first, then distance
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return getDistance(a) - getDistance(b);
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                            <Truck className="text-amber-500" size={20} />
                            Dispatch Override
                        </h3>
                        <p className="text-xs text-theme-secondary">Manually assign a driver to this job.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-2 space-y-2 flex-1">
                    {sortedDrivers.map(driver => {
                        const distance = pickupLocation ? getDistance(driver).toFixed(1) : '?';
                        return (
                            <button
                                key={driver.driver_id}
                                disabled={!driver.is_online}
                                onClick={() => onSelectDriver(driver.driver_id)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between group transition-all ${driver.is_online
                                    ? 'bg-white/5 border-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 cursor-pointer'
                                    : 'bg-black/20 border-transparent opacity-50 cursor-not-allowed'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold surface-inner ${driver.is_online ? 'text-orange-500' : 'text-slate-600'
                                        }`}>
                                        <User size={18} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-bold text-sm ${driver.is_online ? 'text-theme-primary' : 'text-theme-secondary'}`}>
                                            {driver.full_name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`w-2 h-2 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-slate-600'}`} />
                                            <span className="text-slate-400">{driver.is_online ? 'Online' : 'Offline'}</span>
                                            {pickupLocation && (
                                                <span className="text-slate-500 flex items-center gap-0.5">
                                                    • <MapPin size={10} /> {distance} km away
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {driver.is_online && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500">
                                        <CheckCircle2 size={20} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 text-center text-[10px] text-theme-secondary">
                    Assigning a driver manually bypasses the acceptance flow.
                </div>
            </div>
        </div>
    );
}
