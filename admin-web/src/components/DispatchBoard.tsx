import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MoreHorizontal, Clock, MapPin, User, ArrowRight } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface Request {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    status: string;
    source: string;
    vehicle_details: any;
    profiles?: { full_name: string; phone: string | null };
    created_at: string;
}

interface DispatchBoardProps {
    requests: Request[];
    onUpdate: () => void;
    onAssign: (requestId: string) => void;
}

const COLUMNS = [
    { id: 'pending', label: 'Pending', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { id: 'dispatched', label: 'Dispatched', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
    { id: 'en_route', label: 'En Route', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    { id: 'completed', label: 'Completed', color: 'bg-green-500/10 border-green-500/20 text-green-400' }
];

export function DispatchBoard({ requests, onUpdate, onAssign }: DispatchBoardProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    const handleDragStart = (id: string) => {
        setDraggedId(id);
    };

    const handleDrop = async (newStatus: string) => {
        if (!draggedId) return;

        // If moving to Dispatched, trigger Manual Assign flow
        if (newStatus === 'dispatched') {
            onAssign(draggedId);
            setDraggedId(null);
            return;
        }

        setUpdating(true);

        try {
            const { error } = await supabase
                .from('towing_requests')
                .update({ status: newStatus })
                .eq('id', draggedId);

            if (error) throw error;

            // Notify Customer (Simulated) if completed
            if (newStatus === 'completed') {
                const req = requests.find(r => r.id === draggedId);
                const phone = req?.source === 'manual' ? req?.vehicle_details?.customer_phone : req?.profiles?.phone;
                const name = req?.source === 'manual' ? req?.vehicle_details?.customer_name : req?.profiles?.full_name;

                // Assuming a fixed price or derived from vehicle_details for now
                const price = req?.vehicle_details?.quoted_price || 0;

                if (phone && name) {
                    await notificationService.sendSMS(
                        phone,
                        notificationService.templates.jobCompleted(name, price)
                    );
                    await notificationService.sendEmail(
                        'admin@mifsudtowing.com', // Receipt to admin or customer email if we had it
                        `Receipt for Job #${req?.id.slice(0, 5)}`,
                        `Job completed for ${name}. Amount: €${price}`
                    );
                    alert('Job Completed! Receipt sent.');
                }
            }

            onUpdate();
        } catch (err) {
            console.error('Failed to update status:', err);
            alert('Failed to move item.');
        } finally {
            setDraggedId(null);
            setUpdating(false);
        }
    };

    return (
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
            {COLUMNS.map(col => (
                <div
                    key={col.id}
                    className={`min-w-[300px] flex-1 glass-panel flex flex-col ${updating ? 'opacity-50 pointer-events-none' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.id)}
                >
                    {/* Header */}
                    <div className={`p-3 border-b border-white/5 font-bold uppercase text-xs tracking-widest flex justify-between ${col.color}`}>
                        {col.label}
                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-white">
                            {requests.filter(r => r.status === col.id).length}
                        </span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 flex-1 overflow-y-auto bg-black/20">
                        {requests.filter(r => r.status === col.id).map(req => (
                            <div
                                key={req.id}
                                draggable
                                onDragStart={() => handleDragStart(req.id)}
                                className="glass-panel p-3 cursor-grab active:cursor-grabbing hover:bg-white/5 hover:border-amber-500/30 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${req.source === 'manual' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                        {req.source}
                                    </span>
                                    <button className="text-theme-secondary hover:text-white">
                                        <MoreHorizontal size={14} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <User size={14} className="text-theme-secondary" />
                                    <span className="font-bold text-sm text-theme-primary">
                                        {req.source === 'manual' ? req.vehicle_details?.customer_name : req.profiles?.full_name || 'Client'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-2 text-xs text-theme-secondary">
                                    <MapPin size={12} className="text-amber-500" />
                                    <span className="truncate max-w-[180px]">{req.pickup_address}</span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                                    <div className="flex items-center gap-1 text-[10px] text-theme-secondary">
                                        <Clock size={10} />
                                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>

                                    {/* Quick action: Next Step */}
                                    {col.id !== 'completed' && (
                                        <button
                                            onClick={() => { setDraggedId(req.id); handleDrop(COLUMNS[COLUMNS.findIndex(c => c.id === col.id) + 1].id); }}
                                            className="text-[10px] bg-white/5 hover:bg-amber-500 hover:text-black px-2 py-1 rounded transition-colors flex items-center gap-1"
                                        >
                                            Next <ArrowRight size={8} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
