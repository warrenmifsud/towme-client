import { X } from 'lucide-react';

interface TripHeaderProps {
    pickup: string;
    destination: string;
    onClose: () => void;
}

export default function TripHeader({ pickup, destination, onClose }: TripHeaderProps) {
    return (
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-center pointer-events-none">
            {/* The Pill container - Enable pointer events here */}
            <div className="bg-white rounded-2xl shadow-lg py-3 px-4 flex items-center gap-3 w-full max-w-md pointer-events-auto animate-slide-down border border-slate-100/50">

                {/* Left: Close Button */}
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                    <X size={18} />
                </button>

                {/* Center: Route Info (Stacked) */}
                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    {/* Pickup */}
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-600 font-bold leading-none mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{pickup}</span>
                    </div>

                    {/* Destination - Allow wrapping/multi-line */}
                    <div className="flex items-start gap-2 text-sm text-slate-900 font-medium leading-tight">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                        <span className="break-words whitespace-normal line-clamp-2">{destination}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
