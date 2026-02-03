import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, User, Phone, Car, Euro, FileText, Send, Loader2 } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface ManualJobFormProps {
    onJobCreated: () => void;
}

interface ServiceCategory {
    id: string;
    name: string;
    base_price: number;
}

export function ManualJobForm({ onJobCreated }: ManualJobFormProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [priceQuote, setPriceQuote] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from('service_categories').select('*');
        if (data) setCategories(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get current user (Dispatcher) to use as client_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in to dispatch jobs.');

            // Insert into towing_requests
            // Note: client_id is required, so we use the Dispatcher's ID as the "client"
            const { data, error } = await supabase.from('towing_requests').insert({
                client_id: user.id,
                service_category_id: categoryId || null, // Handle potentially empty selection gracefully

                // Location Data (Defaulting coordinates for manual entry as 0.0 or HQ)
                pickup_address: pickupLocation,
                pickup_lat: 35.8989, // Default to Malta Center if no geocoding
                pickup_long: 14.5146,
                dropoff_address: dropoffLocation,
                dropoff_lat: 35.8989,
                dropoff_long: 14.5146,

                status: 'pending',
                source: 'manual',
                dispatcher_notes: `Customer: ${customerName} (${customerPhone}). \nNotes: ${notes}`,

                // Storing manual details in JSONB since columns don't verify strict schema
                vehicle_details: {
                    type: vehicleType,
                    manual_entry: true,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    quoted_price: parseFloat(priceQuote) || 0
                }
            }).select();

            if (error) throw error;

            // Notify Customer (Simulated)
            await notificationService.sendSMS(
                customerPhone,
                notificationService.templates.bookingConfirmed(customerName, data[0]?.id || 'REF')
            );

            // Reset Form and Notify
            setCustomerName('');
            setCustomerPhone('');
            setPickupLocation('');
            setDropoffLocation('');
            setVehicleType('');
            setPriceQuote('');
            setNotes('');
            onJobCreated();
            alert('Manual Job Created Successfully! 🚀\n(SMS Notification sent)');

        } catch (err: any) {
            console.error('Error creating job:', err);
            alert('Failed to create job: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-6 h-full flex flex-col overflow-y-auto">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-600 mb-6 flex items-center gap-2">
                <FileText className="text-amber-500" size={24} />
                New Manual Job
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                {/* Customer Details */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-theme-secondary uppercase tracking-widest pl-1">Customer</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Name"
                                className="glass-input pl-10"
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input
                                required
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="Phone"
                                className="glass-input pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Locations */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-theme-secondary uppercase tracking-widest pl-1">Route</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-green-500" size={16} />
                        <input
                            required
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            placeholder="Pickup Address"
                            className="glass-input pl-10"
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-red-500" size={16} />
                        <input
                            required
                            value={dropoffLocation}
                            onChange={(e) => setDropoffLocation(e.target.value)}
                            placeholder="Dropoff Address"
                            className="glass-input pl-10"
                        />
                    </div>
                </div>

                {/* Vehicle & Service */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-theme-secondary uppercase tracking-widest pl-1">Job Details</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative col-span-2">
                            <Car className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input
                                required
                                value={vehicleType}
                                onChange={(e) => setVehicleType(e.target.value)}
                                placeholder="Vehicle (e.g. Toyota Camry, Silver)"
                                className="glass-input pl-10"
                            />
                        </div>
                        <select
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="glass-input appearance-none"
                        >
                            <option value="" disabled>Select Service</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id} className="text-theme-primary">{cat.name}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <Euro className="absolute left-3 top-3 text-amber-500" size={16} />
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={priceQuote}
                                onChange={(e) => setPriceQuote(e.target.value)}
                                placeholder="0.00"
                                className="glass-input pl-10 text-amber-400 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-theme-secondary uppercase tracking-widest pl-1">Dispatcher Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Gate codes, special instructions, etc."
                        className="glass-input min-h-[80px]"
                    />
                </div>

                <div className="pt-4 mt-auto">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full glass-button flex items-center justify-center gap-2 group"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="group-hover:translate-x-1 transition-transform" />}
                        {loading ? 'Processing...' : 'Dispatch Job'}
                    </button>
                    <p className="text-[10px] text-center text-theme-secondary mt-2">
                        * Job will be broadcast to eligible drivers immediately.
                    </p>
                </div>
            </form>
        </div>
    );
}
