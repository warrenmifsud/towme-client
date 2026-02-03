import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Power, Truck, Bell, Settings, MapPin, CheckCircle2, ChevronRight, Loader2, LogOut, ShieldCheck, Mail, Lock, AlertCircle, X, Building2, User, Navigation, Clock, Zap, Menu, Crosshair, Volume2, VolumeX, Upload, FileText, Download, Calendar, Phone } from 'lucide-react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function DateInput({ value, onChange, label, error, onFocus }: { value: string, onChange: (val: string) => void, label: string, error?: boolean, onFocus?: () => void }) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear + i); // Next 12 years

    // Parse existing value or default
    const [y, m, d] = value ? value.split('-').map(Number) : [currentYear, 1, 1];

    const handleChange = (type: 'd' | 'm' | 'y', val: number) => {
        let newY = type === 'y' ? val : y;
        let newM = type === 'm' ? val : m;
        let newD = type === 'd' ? val : d;

        // adjust day if month changes and day is invalid (e.g. Feb 30)
        const daysInMonth = new Date(newY, newM, 0).getDate();
        if (newD > daysInMonth) newD = daysInMonth;

        const strM = newM.toString().padStart(2, '0');
        const strD = newD.toString().padStart(2, '0');
        onChange(`${newY}-${strM}-${strD}`);
    };

    return (
        <div className="w-full">
            <label className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${error ? 'text-red-400' : 'text-slate-500'}`}>{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <select
                    value={d}
                    onChange={e => handleChange('d', parseInt(e.target.value))}
                    onFocus={onFocus}
                    className={`bg-slate-900 border rounded-lg px-2 py-2 text-xs text-white outline-none appearance-none ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-amber-500'}`}
                >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                    ))}
                </select>
                <select
                    value={m}
                    onChange={e => handleChange('m', parseInt(e.target.value))}
                    className={`bg-slate-900 border rounded-lg px-2 py-2 text-xs text-white outline-none appearance-none ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-amber-500'}`}
                >
                    {MONTHS.map((month, i) => (
                        <option key={month} value={i + 1}>{month}</option>
                    ))}
                </select>
                <select
                    value={y}
                    onChange={e => handleChange('y', parseInt(e.target.value))}
                    className={`bg-slate-900 border rounded-lg px-2 py-2 text-xs text-white outline-none appearance-none ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-amber-500'}`}
                >
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function FileUploadField({ label, fileUrl, expiryDate, onFileChange, onDateChange, onDateFocus, uploading, errorText }: any) {
    const hasError = !!errorText;
    return (
        <div className={`rounded-xl p-4 border transition-all duration-300 ${hasError ? 'bg-red-500/5 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/5'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${hasError ? 'text-red-400' : 'text-slate-300'}`}>{label}</span>
                        {hasError && <div className="bg-red-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">Action Required</div>}
                    </div>
                    {hasError && <p className="text-[10px] text-red-400 font-medium">{errorText}</p>}
                </div>
                {uploading && <Loader2 size={14} className="animate-spin text-amber-500" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload */}
                <div className="relative group">
                    <label className={`flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${fileUrl ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-amber-500/50 hover:bg-white/5'}`}>
                        <div className="flex flex-col items-center justify-center pt-2 pb-3 px-2 text-center">
                            {fileUrl ? <CheckCircle2 size={24} className="text-green-500 mb-1" /> : <Upload size={24} className="text-slate-400 mb-1" />}
                            <p className="text-[10px] text-slate-400 truncate w-full max-w-[150px]">
                                {fileUrl ? fileUrl.split('/').pop() : 'Click to Upload'}
                            </p>
                        </div>
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={onFileChange} />
                    </label>
                </div>

                {/* Expiry Date */}
                <DateInput
                    label="Expiry Date"
                    value={expiryDate}
                    onChange={onDateChange}
                    onFocus={onDateFocus}
                    error={hasError}
                />
            </div>
        </div>
    );
}

// Simple upload field WITHOUT expiry date (for ID Front)
function SimpleFileUploadField({ label, fileUrl, onFileChange, uploading, errorText }: any) {
    const hasError = !!errorText;
    return (
        <div className={`rounded-xl p-4 border transition-all duration-300 ${hasError ? 'bg-red-500/5 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/5'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${hasError ? 'text-red-400' : 'text-slate-300'}`}>{label}</span>
                        {hasError && <div className="bg-red-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">Action Required</div>}
                    </div>
                    {hasError && <p className="text-[10px] text-red-400 font-medium">{errorText}</p>}
                </div>
                {uploading && <Loader2 size={14} className="animate-spin text-amber-500" />}
            </div>

            <div className="relative group">
                <label className={`flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${fileUrl ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-amber-500/50 hover:bg-white/5'}`}>
                    <div className="flex flex-col items-center justify-center pt-2 pb-3 px-2 text-center">
                        {fileUrl ? <CheckCircle2 size={24} className="text-green-500 mb-1" /> : <Upload size={24} className="text-slate-400 mb-1" />}
                        <p className="text-[10px] text-slate-400 truncate w-full max-w-[150px]">
                            {fileUrl ? fileUrl.split('/').pop() : 'Click to Upload'}
                        </p>
                    </div>
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={onFileChange} />
                </label>
            </div>
        </div>
    );
}


const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };

// Helper: Haversine distance in meters
const getHaversineDistance = (p1: { lat: number, lng: number }, p2: { lat: number, lng: number }) => {
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
// Route Renderer Component (to be extracted outside to prevent re-renders)
const RouteRenderer = ({ route }: { route?: google.maps.DirectionsResult }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !route) return;

        const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            directions: route,
            suppressMarkers: true, // We have our own custom markers
            polylineOptions: {
                strokeColor: '#F59E0B', // Amber color path
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        });

        return () => {
            directionsRenderer.setMap(null);
        };
    }, [map, route]);

    return null;
};

export default function App() {
    const [isOnline, setIsOnline] = useState(false);
    const [activeCategories, setActiveCategories] = useState<string[]>([]);
    const [assignedCategories, setAssignedCategories] = useState<{ id: string, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [availableJobs, setAvailableJobs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'jobs' | 'map' | 'alerts' | 'profile'>('jobs');
    const [currentLocation, setCurrentLocation] = useState(MALTA_CENTER);
    const [incomingJob, setIncomingJob] = useState<any | null>(null);
    const [activeJob, setActiveJob] = useState<any | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(30);
    const [allServices, setAllServices] = useState<{ id: string, name: string }[]>([]);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Application Modal State
    const [applicationModal, setApplicationModal] = useState<'none' | 'partner' | 'fleet'>('none');
    const [appForm, setAppForm] = useState({
        company_name: '',
        owner_name: '',
        vat_number: '',
        app_email: '',
        phone: '',
        address: '',
        tow_truck_make: '',
        tow_truck_model: '',
        tow_truck_year: '',
        tow_truck_type: '',
        tow_truck_registration_plate: '',
        tow_truck_color: '',
        services_offered: [] as string[],
        // Documents
        driving_license_front: '', driving_license_front_expiry: '',
        driving_license_back: '', driving_license_back_expiry: '',
        id_card_front: '', id_card_front_expiry: '',
        id_card_back: '', id_card_back_expiry: '',
        insurance_policy: '', insurance_policy_expiry: ''
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [redFlags, setRedFlags] = useState<Record<string, string>>({}); // Map Field Name -> Error Message

    // Effect: Check for Edit Mode (URL params)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('id');
        const action = params.get('action');

        if (editId && action === 'edit') {
            loadApplicationForEdit(editId);
        }

        // Fetch Services
        async function fetchAllServices() {
            const { data } = await supabase
                .from('service_categories')
                .select('id, name')
                .or('is_active.eq.true,is_active.is.null')
                .order('name');
            if (data) setAllServices(data);
        }
        fetchAllServices();
    }, []);

    async function loadApplicationForEdit(id: string) {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_application_details', { p_id: id });

            if (error) throw error;
            if (!data) throw new Error("Application not found or not editable.");

            // Populate Form
            setAppForm({
                company_name: data.company_name,
                owner_name: data.owner_name,
                vat_number: data.vat_number,
                app_email: data.email,
                phone: data.phone,
                address: data.address,
                tow_truck_make: data.tow_truck_make,
                tow_truck_model: data.tow_truck_model,
                tow_truck_year: data.tow_truck_year,
                tow_truck_type: data.tow_truck_type || '', // Handle potential missing fields
                tow_truck_registration_plate: data.tow_truck_registration_plate,
                tow_truck_color: data.tow_truck_color,
                services_offered: data.services_offered || [],

                driving_license_front: data.driving_license_front_path,
                driving_license_front_expiry: data.driving_license_front_expiry || '',
                driving_license_back: data.driving_license_back_path,
                driving_license_back_expiry: data.driving_license_back_expiry || '',
                id_card_front: data.id_card_front_path,
                id_card_front_expiry: data.id_card_front_expiry || '',
                id_card_back: data.id_card_back_path,
                id_card_back_expiry: data.id_card_back_expiry || '',
                insurance_policy: data.insurance_policy_path,
                insurance_policy_expiry: data.insurance_policy_expiry || ''
            });

            setEditingId(id);
            setApplicationModal(data.application_type === 'single' ? 'partner' : 'fleet'); // Open Modal

            // Parse Red Flags from Rejection Reason
            if (data.rejection_reason) {
                const flags: Record<string, string> = {};
                // Reason format: "- Document Name: Error details" or just text blocks
                const lines = data.rejection_reason.split('\n');

                lines.forEach((line: string) => {
                    const cleanLine = line.replace(/^- /, '').trim();
                    if (!cleanLine) return;

                    // Match known fields
                    if (cleanLine.toLowerCase().startsWith('driving license front')) {
                        flags['Driving License Front'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().startsWith('driving license back')) {
                        flags['Driving License Back'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().startsWith('id card front')) {
                        flags['ID Card Front'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().startsWith('id card back')) {
                        flags['ID Card Back'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().startsWith('insurance policy')) {
                        flags['Insurance Policy'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().includes('driving license front expiry')) {
                        flags['Driving License Front Expiry'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().includes('driving license back expiry')) {
                        flags['Driving License Back Expiry'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().includes('id card front expiry')) {
                        flags['ID Card Front Expiry'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().includes('id card back expiry')) {
                        flags['ID Card Back Expiry'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                    else if (cleanLine.toLowerCase().includes('insurance policy expiry')) {
                        flags['Insurance Policy Expiry'] = cleanLine.split(':').slice(1).join(':').trim() || cleanLine;
                    }
                });

                setRedFlags(flags);
            }

            // Optional: Show message
            alert("Application loaded for revision. Please review the flagged items.");

        } catch (err: any) {
            console.error("Load Edit Error:", err);
            alert("Could not load application: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fieldName}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('driver_documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('driver_documents').getPublicUrl(filePath);

            setAppForm(prev => ({ ...prev, [fieldName]: data.publicUrl }));
        } catch (error) {
            console.error('Upload failed:', error);
            alert('File upload failed. Please try again.');
        } finally {
            setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
        }
    };


    const [appSubmitting, setAppSubmitting] = useState(false);
    const [appSuccess, setAppSuccess] = useState(false);

    const lastUpdateLocation = useRef<google.maps.LatLngLiteral | null>(null);

    const locationRef = useRef(MALTA_CENTER);

    // Sync Ref
    useEffect(() => {
        locationRef.current = currentLocation;
    }, [currentLocation]);

    // Web Audio API Context Ref
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const [audioAllowed, setAudioAllowed] = useState(false);

    // Initialize Audio Context & Unlock Strategy
    useEffect(() => {
        // Create generated beep sound (No external file dependencies!)
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (AudioContextClass) {
            audioContextRef.current = new AudioContext();
        }

        // Mobile Autoplay Unlocker
        const unlockAudio = () => {
            const ctx = audioContextRef.current;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log("Audio Context Resumed/Unlocked 🔓");
                    setAudioAllowed(true);
                }).catch(e => console.warn("Audio Resume Failed:", e));
            } else if (ctx && ctx.state === 'running') {
                setAudioAllowed(true);
            }
        };

        // Listen for ANY interaction to unlock
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Effect: Play/Stop Sound on Incoming Job (Stable ID check)
    const incomingJobId = incomingJob?.id;
    useEffect(() => {
        let intervalId: any;

        if (incomingJobId && audioContextRef.current) {
            const ctx = audioContextRef.current;

            const playBeep = () => {
                if (ctx.state === 'suspended') ctx.resume();

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                // "Digital Phone Ring"
                osc.type = 'square';
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5

                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            };

            // Play immediately then loop
            playBeep();
            intervalId = setInterval(playBeep, 2000); // Pulse every 2s

            console.log("Starting Web Audio Alert 🔔");

        } else {
            // Cleanup happens in return
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [incomingJobId]);

    // Effect: Initialize Driver (Mount Only)
    useEffect(() => {
        initDriver();
    }, []);

    // Effect: Initial Geolocation (Fast Fix)
    useEffect(() => {
        if ("geolocation" in navigator && user) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setCurrentLocation(newLocation);
                    // Force initial update to DB
                    updateDriverLocation(newLocation);
                    lastUpdateLocation.current = newLocation;
                },
                (error) => console.error("Initial Location Error:", error),
                { enableHighAccuracy: true, maximumAge: 30000, timeout: 5000 }
            );
        }
    }, [user]); // user dependency to trigger once logged in

    // Effect: Geolocation Watcher
    useEffect(() => {
        if (!user) return;

        if (!("geolocation" in navigator)) {
            console.error("Geolocation is not supported by this browser.");
            return;
        }

        // Secure Context Warning for Mobile Testing
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            console.warn("Geolocation requires a Secure Context (HTTPS). You are on HTTP:", window.location.href);
            // On some mobile browsers, this will silently fail or throw a permission denied error immediately.
            // ALERT THE USER FOR VISIBILITY
            alert("Warning: Geolocation requires HTTPS. It may fail on this connection.");
        }

        const success = (position: GeolocationPosition) => {
            const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            console.log("GPS Fix:", newLocation); // Debug Log
            setCurrentLocation(newLocation);

            // Only update DB if moved more than 10 meters OR if it's the first fix (no last update)
            if (!lastUpdateLocation.current || getHaversineDistance(newLocation, lastUpdateLocation.current) > 10) {
                updateDriverLocation(newLocation);
                lastUpdateLocation.current = newLocation;
            }

            // Initial fix flag
            if (!lastUpdateLocation.current) {
                updateDriverLocation(newLocation);
                lastUpdateLocation.current = newLocation;
            }
        };

        const error = (err: GeolocationPositionError) => {
            console.error(`Geolocation Error (${err.code}): ${err.message}`);
        };

        // 1. Get Initial Fix Fast (Cached is fine)
        navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: false, maximumAge: 30000, timeout: 5000 });

        // 2. Continuous Tracking (Robust)
        const watchId = navigator.geolocation.watchPosition(
            success,
            error,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [user, isOnline]);

    // Effect A: Fetch Jobs on Location Change (Debounced ideally, but this is fine)
    useEffect(() => {
        if (isOnline && user) {
            fetchJobs();
        }
    }, [currentLocation, isOnline, user]);

    // Effect B: Stable Realtime Subscription (No Location Dependency)
    // Single, clean subscription reference
    const subscriptionRef = useRef<any>(null);


    async function updateDriverLocation(location: { lat: number, lng: number }) {
        if (!user) return;
        // Proceed even if technically "offline" locally to debug, or log it
        if (!isOnline) {
            console.log("Skipping location update (Offline)");
            return;
        }

        console.log("Updating Driver Location:", location);
        const { error } = await supabase.from('driver_status').upsert({
            driver_id: user.id,
            location: `POINT(${location.lng} ${location.lat})`,
            last_lat: location.lat,
            last_lng: location.lng,
            updated_at: new Date().toISOString()
        });

        if (error) console.error("Location Update Failed:", error);
    }

    async function fetchJobs() {
        if (!GOOGLE_MAPS_API_KEY || !user) {
            console.log('fetchJobs: Skipping (No Key/User)');
            return;
        }

        try {
            console.log('--- START fetchJobs ---');
            console.log('Target User ID:', user.id);

            // 1. Fetch EVERYTHING assigned to this driver (RLS Debug)
            const { data: allAssigned, error: rlsError } = await supabase
                .from('towing_requests')
                .select('*')
                .eq('driver_id', user.id);

            if (rlsError) {
                console.error('RLS ERROR or Query Failed:', rlsError);
            }

            console.log('Total assigned jobs visible to app:', allAssigned?.length || 0);
            if (allAssigned && allAssigned.length > 0) {
                console.log('Visible jobs:', allAssigned.map(j => ({ id: j.id.slice(0, 8), status: j.status })));
            }

            // 2. Find the active one
            const job = allAssigned?.find(j =>
                ['dispatched', 'accepted', 'en_route', 'in_progress'].includes(j.status)
            );

            if (job) {
                console.log('Processing active job:', job.id.slice(0, 8), 'Status:', job.status);

                if (job.status === 'dispatched') {
                    // Calculate offer countdown
                    const offerStartTime = new Date(job.dispatched_at || job.updated_at).getTime();
                    const now = new Date().getTime();
                    const elapsed = (now - offerStartTime) / 1000;
                    const remaining = Math.max(0, 30 - Math.floor(elapsed));

                    console.log('Offer Timer:', { elapsed, remaining, start: new Date(offerStartTime).toISOString() });

                    if (remaining > 0) {
                        setIncomingJob(job);
                        setTimeLeft(remaining);
                    } else {
                        console.log('Offer expired! Triggering auto-reject.');
                        setIncomingJob(null);
                        supabase.rpc('reject_job', { p_request_id: job.id, p_driver_id: user.id });
                    }
                } else {
                    console.log('App is in ACTIVE job mode');
                    setActiveJob(job);
                    setIncomingJob(null);
                }
            } else {
                console.log('No qualifying active jobs found for this driver ID in the current RLS view.');
                setIncomingJob(null);
                setActiveJob(null);
            }
            console.log('--- END fetchJobs ---');
            setAvailableJobs([]);
        } catch (err: any) {
            console.error('fetchJobs Exception:', err);
        }
    }

    async function initDriver() {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
            setLoading(false);
            return;
        }
        setUser(authUser);
        const { data: profile } = await supabase.from('profiles').select('driver_categories').eq('id', authUser.id).single();
        if (profile?.driver_categories && profile.driver_categories.length > 0) {
            const { data: cats } = await supabase.from('service_categories').select('id, name').in('id', profile.driver_categories);
            setAssignedCategories(cats || []);
        }
        const { data: status } = await supabase.from('driver_status').select('*').eq('driver_id', authUser.id).single();
        if (status) {
            setIsOnline(status.is_online);
            setActiveCategories(status.active_categories || []);
        }
        setLoading(false);
    }

    const toggleOnline = async () => {
        if (!user) return;

        // UNLOCK AUDIO CONTEXT: Play silent sound on user interaction
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume();
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        }

        const nextStatus = !isOnline;
        setIsOnline(nextStatus);
        const { error } = await supabase.from('driver_status').upsert({
            driver_id: user.id,
            is_online: nextStatus,
            location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
            last_lat: currentLocation.lat,
            last_lng: currentLocation.lng,
            updated_at: new Date().toISOString()
        });

        console.log(`Toggled Online: ${nextStatus}. Location: ${currentLocation.lat}, ${currentLocation.lng}`);

        if (error) {
            console.error('Status Update Error:', error);
            alert('Failed to go online: ' + error.message);
            setIsOnline(!nextStatus); // Revert
        }
    };

    const toggleCategory = async (catId: string) => {
        const nextCats = activeCategories.includes(catId) ? activeCategories.filter(id => id !== catId) : [...activeCategories, catId];
        setActiveCategories(nextCats);
        await supabase.from('driver_status').upsert({
            driver_id: user.id,
            active_categories: nextCats,
            location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
            last_lat: currentLocation.lat,
            last_lng: currentLocation.lng,
            updated_at: new Date().toISOString()
        }, { onConflict: 'driver_id' });
    };

    const handleAcceptJob = async (jobId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('towing_requests')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                })
                .eq('id', jobId);

            if (error) throw error;
            setIncomingJob(null);
            fetchJobs(); // This will populate activeJob
        } catch (err: any) {
            console.error('Acceptance Error:', err);
            alert("Failed to accept job: " + (err.message || 'Error'));
        }
    };

    const handleRejectJob = async () => {
        if (!incomingJob || !user) return;
        try {
            setIncomingJob(null); // Close immediately for UX
            const { error } = await supabase.rpc('reject_job', {
                p_request_id: incomingJob.id,
                p_driver_id: user.id
            });
            if (error) throw error;
        } catch (err: any) {
            console.error('Rejection Error:', err);
        }
    };

    const openNavigation = (lat: number, lng: number, mode: 'google' | 'waze') => {
        const url = mode === 'google'
            ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
            : `waze://?ll=${lat},${lng}&navigate=yes`;

        if (mode === 'waze') {
            window.location.href = url;
            // Fallback to Google if Waze fails
            setTimeout(() => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
            }, 1000);
        } else {
            window.open(url, '_blank');
        }
    };

    const handleArrivedAtPickup = async () => {
        if (!activeJob) return;
        try {
            const { error } = await supabase
                .from('towing_requests')
                .update({ status: 'en_route' }) // Using en_route to signify "Arriving Now" or status update
                .eq('id', activeJob.id);

            if (error) throw error;
            fetchJobs();
        } catch (err) {
            console.error(err);
        }
    };

    // Effect: Countdown Timer for Incoming Jobs
    useEffect(() => {
        let timer: any;
        if (incomingJob && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleRejectJob();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [incomingJob, timeLeft]);

    // Update Realtime subscription to handle more events
    useEffect(() => {
        if (!isOnline || !user) {
            // Cleanup if we go offline/logout
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
                subscriptionRef.current = null;
            }
            setAvailableJobs([]);
            return;
        }

        // Avoid double-subscribing
        if (subscriptionRef.current) return;

        fetchJobs(); // Initial fetch

        const channel = supabase
            .channel('dispatch_radar')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'towing_requests'
            }, (payload) => {
                const newJob = payload.new as any;
                const oldJob = payload.old as any;

                // 1. If we got a NEW offer
                if (newJob?.status === 'dispatched' && newJob.driver_id === user.id) {
                    setIncomingJob(newJob);
                    setTimeLeft(30);
                    // Play sound
                    const audio = new Audio('https://cdn.freesound.org/previews/536/536420_4921277-lq.mp3');
                    audio.play().catch(e => console.error("Audio error", e));
                }

                // 2. If the current job was updated or cancelled
                if (newJob?.id === activeJob?.id || newJob?.id === incomingJob?.id) {
                    if (newJob.status === 'cancelled' || (newJob.driver_id !== user.id && newJob.status === 'dispatched')) {
                        setIncomingJob(null);
                        setActiveJob(null);
                    } else {
                        fetchJobs();
                    }
                }
            })
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
                subscriptionRef.current = null;
            }
        };
    }, [isOnline, user, activeJob?.id, incomingJob?.id]);

    // State for enriched job data (Price, Address, Distance, Route)
    const [jobMeta, setJobMeta] = useState<{ price?: number, address?: string, distance?: string, duration?: string, route?: google.maps.DirectionsResult }>({});
    // const map = useMap(); // REMOVED: Cannot use useMap here as App is not wrapped in APIProvider yet

    // Effect: Enrich Incoming Job Data (Address, Price, Route/Distance)
    useEffect(() => {
        if (!incomingJob) {
            setJobMeta({});
            return;
        }

        const enrichJob = async () => {
            let newMeta: { price?: number, address?: string, distance?: string, duration?: string, route?: any } = { ...jobMeta };
            let updated = false;

            // 1. Fetch Real Price (if missing)
            if (!newMeta.price && incomingJob.category_id) {
                try {
                    // Fetch from the live pricing view to match client app exactly
                    const { data } = await supabase
                        .from('v_live_service_prices')
                        .select('base_price')
                        .eq('id', incomingJob.category_id)
                        .single();

                    if (data) {
                        newMeta.price = data.base_price;
                        updated = true;
                    }
                } catch (e) {
                    console.error("Price fetch error:", e);
                }
            }

            // 2. Resolve Address (if missing or unknown)
            if ((!incomingJob.pickup_address || incomingJob.pickup_address === 'Unknown Location' || incomingJob.pickup_address.includes('Lat:')) && !newMeta.address) {
                try {
                    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${incomingJob.pickup_lat},${incomingJob.pickup_long}&key=${GOOGLE_MAPS_API_KEY}`);
                    const data = await response.json();
                    if (data.results && data.results[0]) {
                        const street = data.results[0].address_components.find((c: any) => c.types.includes('route'))?.long_name
                            || data.results[0].formatted_address.split(',')[0];
                        newMeta.address = street;
                        updated = true;
                    }
                } catch (e) {
                    console.error('Geocoding fetch failed', e);
                }
            }

            // 3. Fetch Real Distance & Route (Driver -> Pickup)
            // Ensure we have a valid currentLocation and target before routing
            if (window.google && incomingJob.pickup_lat && incomingJob.pickup_long) {
                // simple check to avoid spamming: only if we don't have it, or maybe just once per job?
                // actually, if the driver is moving, we might want to update it, but for now let's just ensure we get it AT LEAST once with valid data.
                if (!newMeta.distance || !newMeta.route) {
                    const directionsService = new google.maps.DirectionsService();
                    directionsService.route({
                        origin: currentLocation, // Driver's Live Location
                        destination: { lat: incomingJob.pickup_lat, lng: incomingJob.pickup_long }, // Client Pickup
                        travelMode: google.maps.TravelMode.DRIVING
                    }, (result, status) => {
                        if (status === 'OK' && result) {
                            // Update state safely, INCLUDING any address/price resolved above
                            setJobMeta(prev => ({
                                ...prev,
                                ...newMeta, // Merge in any local updates (address, price) that haven't been saved yet if this ran on same tick
                                distance: result.routes[0].legs[0].distance?.text,
                                duration: result.routes[0].legs[0].duration?.text,
                                route: result
                            }));
                        } else {
                            console.error('Directions request failed due to ' + status);
                        }
                    });
                }
            } else if (updated) {
                setJobMeta(prev => ({ ...prev, ...newMeta }));
            }
        };

        enrichJob();
    }, [incomingJob?.id, incomingJob?.pickup_address, window.google, currentLocation.lat, currentLocation.lng]);




    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setUser(data.user);
            initDriver();
        } catch (err: any) {
            setAuthError(err.message || 'Failed to sign in');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleApplicationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppSubmitting(true);
        try {
            let error;

            if (editingId) {
                // UPDATE Existing Application using secure RPC (V5 - Diagnostic)
                console.log('📤 Sending to RPC:', appForm);
                console.log('🆔 Editing ID:', editingId);
                const { data, error: updateError } = await supabase.rpc('update_driver_application_v5', {
                    p_id: editingId,
                    p_data: appForm
                });
                console.log('✅ RPC Response:', data);
                error = updateError;
            } else {
                // NEW Insert
                const { error: insertError } = await supabase.from('driver_applications').insert({
                    application_type: applicationModal === 'partner' ? 'single' : 'fleet',
                    company_name: appForm.company_name,
                    owner_name: appForm.owner_name,
                    vat_number: appForm.vat_number,
                    email: appForm.app_email,
                    phone: appForm.phone,
                    address: appForm.address,
                    tow_truck_make: appForm.tow_truck_make,
                    tow_truck_model: appForm.tow_truck_model,
                    tow_truck_year: appForm.tow_truck_year,
                    // Map the new 'type' field to the legacy column as an array for compatibility, or just use the new column usage logic in backend
                    tow_truck_registration_plate: appForm.tow_truck_registration_plate,
                    tow_truck_color: appForm.tow_truck_color,
                    services_offered: appForm.services_offered,
                    // Documents
                    driving_license_front_path: appForm.driving_license_front,
                    driving_license_front_expiry: appForm.driving_license_front_expiry || null,
                    driving_license_back_path: appForm.driving_license_back,
                    driving_license_back_expiry: appForm.driving_license_back_expiry || null,
                    id_card_front_path: appForm.id_card_front,
                    id_card_front_expiry: appForm.id_card_front_expiry || null,
                    id_card_back_path: appForm.id_card_back,
                    id_card_back_expiry: appForm.id_card_back_expiry || null,
                    insurance_policy_path: appForm.insurance_policy,
                    insurance_policy_expiry: appForm.insurance_policy_expiry || null
                });
                error = insertError;
            }


            if (error) throw error;
            setAppSuccess(true);
            setTimeout(() => {
                setAppSuccess(false);
                setApplicationModal('none');
                setAppForm({
                    company_name: '', owner_name: '', vat_number: '', app_email: '', phone: '', address: '',
                    tow_truck_make: '', tow_truck_model: '', tow_truck_year: '', tow_truck_type: '',
                    tow_truck_registration_plate: '', tow_truck_color: '', services_offered: [],
                    driving_license_front: '', driving_license_front_expiry: '',
                    driving_license_back: '', driving_license_back_expiry: '',
                    id_card_front: '', id_card_front_expiry: '',
                    id_card_back: '', id_card_back_expiry: '',
                    insurance_policy: '', insurance_policy_expiry: ''
                });
            }, 2000);
        } catch (err: any) {
            console.error(err);
            alert(`Failed to submit application: ${err.message || 'Unknown Error'} \nHint: ${err.hint || ''}`);
        } finally {
            setAppSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Initializing Operations</p>
            </div>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
            <div className={`w-full max-w-sm relative z-10 animate-slide-up ${applicationModal !== 'none' ? 'blur-sm scale-95 pointer-events-none' : ''}`}>
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center mb-6 relative group">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl opacity-60"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center">
                            <Truck className="w-12 h-12 text-amber-500" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-2">TowMe</h1>
                    <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.35em]">Driver Portal</p>
                </div>

                <div className="glass-panel p-1 rounded-[2rem] bg-slate-900/95 border border-white/10">
                    <form onSubmit={handleLogin} className="p-8 space-y-5">
                        {authError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-red-200">{authError}</p>
                            </div>
                        )}
                        <AuthInput
                            icon={<Mail size={18} />}
                            label="Operator ID"
                            type="email"
                            required
                            value={email}
                            onChange={(e: any) => setEmail(e.target.value)}
                            placeholder="driver@towme.com"
                        />
                        <AuthInput
                            icon={<Lock size={18} />}
                            label="Access Key"
                            type="password"
                            required
                            value={password}
                            onChange={(e: any) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        <button type="submit" disabled={authLoading} className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2">
                            {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>AUTHENTICATE</span><ChevronRight size={16} /></>}
                        </button>
                    </form>
                </div>

                {/* Partner Links */}
                <div className="mt-8 flex flex-col gap-3">
                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Interested in Partnership?</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                            <button onClick={() => setApplicationModal('partner')} className="w-full glass-panel p-4 border border-white/5 hover:bg-amber-500/5 transition-all flex flex-col items-center gap-2">
                                <Truck size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Partner</span>
                            </button>
                            {/* Top Tier Modal / Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-slate-900 border-r border-b border-amber-500/30 rotate-45"></div>
                                <h4 className="text-amber-500 text-xs font-bold uppercase mb-1">Single Partner</h4>
                                <p className="text-[10px] text-slate-300 leading-relaxed">Sign up if you are self employed owning 1 vehicle and you are the driver.</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <button onClick={() => setApplicationModal('fleet')} className="w-full glass-panel p-4 border border-white/5 hover:bg-purple-500/5 transition-all flex flex-col items-center gap-2">
                                <Building2 size={20} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Fleet</span>
                            </button>
                            {/* Top Tier Modal / Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-slate-900 border border-purple-500/30 rounded-xl p-4 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-slate-900 border-r border-b border-purple-500/30 rotate-45"></div>
                                <h4 className="text-purple-500 text-xs font-bold uppercase mb-1">Fleet Owner</h4>
                                <p className="text-[10px] text-slate-300 leading-relaxed">Sign up if you own more than 1 vehicle and have drivers employed under your company/business.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Application Modal */}
            {applicationModal !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setApplicationModal('none')}></div>
                    <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                        {appSuccess ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                                <CheckCircle2 size={40} className="text-green-500 mb-6" />
                                <h3 className="text-2xl font-black text-white mb-2">Application Received</h3>
                                <p className="text-gray-400 text-sm">We will contact you shortly.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-xl font-black text-white">{applicationModal === 'partner' ? 'Become a Partner' : 'Fleet Partnership'}</h3>
                                    <button onClick={() => setApplicationModal('none')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                        <X size={16} className="text-gray-400" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto">
                                    <form onSubmit={handleApplicationSubmit} className="space-y-4">

                                        <div className="mb-6 border-b border-white/5 pb-2">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Business / Driver information</h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                value={appForm.company_name} onChange={e => setAppForm({ ...appForm, company_name: e.target.value })} placeholder="Business Name" />

                                            <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                value={appForm.owner_name} onChange={e => setAppForm({ ...appForm, owner_name: e.target.value })} placeholder="Owner Name" />
                                        </div>
                                        <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                            value={appForm.vat_number} onChange={e => setAppForm({ ...appForm, vat_number: e.target.value })} placeholder="VAT Number" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input required type="email" className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                value={appForm.app_email} onChange={e => setAppForm({ ...appForm, app_email: e.target.value })} placeholder="Email Address" />
                                            <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} placeholder="Phone Number" />
                                        </div>
                                        <textarea required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white h-20"
                                            value={appForm.address} onChange={e => setAppForm({ ...appForm, address: e.target.value })} placeholder="Registered Business Address" />

                                        {/* Document Uploads */}
                                        <div className="pt-4 border-t border-white/10 space-y-4">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Required Documents</p>

                                            <FileUploadField
                                                label="Driving License Front"
                                                fileUrl={appForm.driving_license_front}
                                                expiryDate={appForm.driving_license_front_expiry}
                                                onFileChange={(e: any) => handleFileUpload(e, 'driving_license_front')}
                                                onDateChange={(val: string) => setAppForm(prev => ({ ...prev, driving_license_front_expiry: val }))}
                                                uploading={uploadingFiles['driving_license_front']}
                                                errorText={redFlags['Driving License Front']}
                                            />

                                            <FileUploadField
                                                label="Driving License Back"
                                                fileUrl={appForm.driving_license_back}
                                                expiryDate={appForm.driving_license_back_expiry}
                                                onFileChange={(e: any) => handleFileUpload(e, 'driving_license_back')}
                                                onDateChange={(val: string) => setAppForm(prev => ({ ...prev, driving_license_back_expiry: val }))}
                                                uploading={uploadingFiles['driving_license_back']}
                                                errorText={redFlags['Driving License Back']}
                                            />

                                            <SimpleFileUploadField
                                                label="ID Card Front"
                                                fileUrl={appForm.id_card_front}
                                                onFileChange={(e: any) => handleFileUpload(e, 'id_card_front')}
                                                uploading={uploadingFiles['id_card_front']}
                                                errorText={redFlags['ID Card Front']}
                                            />

                                            <FileUploadField
                                                label="ID Card Back"
                                                fileUrl={appForm.id_card_back}
                                                expiryDate={appForm.id_card_back_expiry}
                                                onFileChange={(e: any) => handleFileUpload(e, 'id_card_back')}
                                                onDateChange={(val: string) => setAppForm(prev => ({ ...prev, id_card_back_expiry: val }))}
                                                uploading={uploadingFiles['id_card_back']}
                                                errorText={redFlags['ID Card Back']}
                                            />

                                            <FileUploadField
                                                label="Insurance Policy"
                                                fileUrl={appForm.insurance_policy}
                                                expiryDate={appForm.insurance_policy_expiry}
                                                onFileChange={(e: any) => handleFileUpload(e, 'insurance_policy')}
                                                onDateChange={(val: string) => setAppForm(prev => ({ ...prev, insurance_policy_expiry: val }))}
                                                uploading={uploadingFiles['insurance_policy']}
                                                errorText={redFlags['Insurance Policy']}
                                            />
                                        </div>


                                        <div className="pt-4 border-t border-white/10">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Tow Truck Information</p>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_make} onChange={e => setAppForm({ ...appForm, tow_truck_make: e.target.value })} placeholder="Make" />
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_model} onChange={e => setAppForm({ ...appForm, tow_truck_model: e.target.value })} placeholder="Model" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-3">
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_year} onChange={e => setAppForm({ ...appForm, tow_truck_year: e.target.value })} placeholder="Year" />
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_type} onChange={e => setAppForm({ ...appForm, tow_truck_type: e.target.value })} placeholder="Type (e.g. Flatbed)" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_registration_plate} onChange={e => setAppForm({ ...appForm, tow_truck_registration_plate: e.target.value })} placeholder="Registration Plate" />
                                                <input required className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-sm text-white"
                                                    value={appForm.tow_truck_color} onChange={e => setAppForm({ ...appForm, tow_truck_color: e.target.value })} placeholder="Color" />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/10">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Categories / Services to Offer</p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {allServices.map(service => (
                                                    <label key={service.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                                                            checked={appForm.services_offered.includes(service.name)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setAppForm(prev => ({ ...prev, services_offered: [...prev.services_offered, service.name] }));
                                                                } else {
                                                                    setAppForm(prev => ({ ...prev, services_offered: prev.services_offered.filter(s => s !== service.name) }));
                                                                }
                                                            }}
                                                        />
                                                        <span className="text-sm text-slate-300">{service.name}</span>
                                                    </label>
                                                ))}
                                                {allServices.length === 0 && (
                                                    <p className="text-xs text-slate-500 italic">No services available</p>
                                                )}
                                            </div>
                                        </div>

                                        <button type="submit" disabled={appSubmitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 mt-4">
                                            {appSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Application'}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>


    );

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <div className="min-h-screen bg-slate-950 flex flex-col pb-28 text-white font-sans overflow-x-hidden">
                {activeTab === 'jobs' && (
                    <div className="animate-slide-up w-full max-w-lg mx-auto md:max-w-none">
                        <header className="px-8 py-12 flex justify-between items-end">
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter leading-none mb-2">Dispatch</h2>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-amber-500 animate-pulse' : 'bg-gray-700'}`}></div>
                                    <p className="text-amber-400/60 text-[10px] font-black uppercase tracking-[0.2em]">{isOnline ? 'Active Beacon' : 'Standby Mode'}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button className="w-14 h-14 glass-panel border-white/5 flex items-center justify-center relative shadow-2xl">
                                    <Bell size={22} className="text-gray-300" />
                                    {availableJobs.length > 0 && <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />}
                                </button>
                                <button
                                    onClick={() => fetchJobs()}
                                    className="w-14 h-14 glass-panel border-white/5 flex items-center justify-center shadow-2xl mr-2"
                                    title="Refresh Jobs"
                                >
                                    <Clock size={22} className="text-amber-500 animate-pulse" />
                                </button>
                                <button
                                    onClick={() => {
                                        supabase.auth.signOut();
                                        setUser(null);
                                    }}
                                    className="w-14 h-14 glass-panel border-white/5 flex items-center justify-center shadow-2xl"
                                >
                                    <LogOut size={22} className="text-gray-500" />
                                </button>
                            </div>
                        </header>

                        <div className="px-8 mb-14">
                            <div className={`glass-panel p-10 relative overflow-hidden transition-all duration-700 shadow-3xl ${isOnline ? 'border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-white/2 opacity-80'}`}>
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">Signal Status</p>
                                        <h3 className={`text-4xl font-black tracking-tighter ${isOnline ? 'text-white' : 'text-gray-700'}`}>
                                            {isOnline ? 'ONLINE' : 'DARK'}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={toggleOnline}
                                        className={`w-24 h-24 rounded-[3rem] flex items-center justify-center transition-all duration-700 relative shadow-2xl ${isOnline
                                            ? 'bg-gradient-to-br from-amber-400 to-yellow-600 ring-4 ring-amber-500/20'
                                            : 'bg-white/5 border border-white/10 grayscale'
                                            }`}
                                    >
                                        <Power className={isOnline ? 'text-white' : 'text-gray-700'} size={42} strokeWidth={3.5} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 mb-14">
                            {!isOnline && (
                                <div className="glass-panel p-20 text-center border-dashed border-white/10 opacity-60">
                                    <Truck className="w-12 h-12 text-gray-800 mx-auto mb-8" />
                                    <p className="text-gray-600 font-black text-2xl italic">Beacon Restricted</p>
                                </div>
                            )}
                        </div>

                        <div className="px-8 pb-12">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 mb-8 px-2">Assigned Services</h3>
                            <div className="grid grid-cols-1 gap-6">
                                {assignedCategories.map((cat: any) => {
                                    const active = activeCategories.includes(cat.id);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`flex items-center justify-between p-8 rounded-[3rem] border transition-all duration-700 shadow-2xl relative overflow-hidden ${active
                                                ? 'bg-amber-600 border-amber-400'
                                                : 'bg-white/5 border-white/5 opacity-30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className={`w-18 h-18 rounded-[1.75rem] flex items-center justify-center ${active ? 'bg-white/20 text-white' : 'bg-slate-900 text-gray-700'}`}>
                                                    <Truck size={36} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-2xl tracking-tighter text-white">{cat.name}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-white/50">{active ? 'Status: Active' : 'Status: Off'}</p>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${active ? 'bg-white border-white shadow-lg' : 'border-white/10'}`}>
                                                {active && <CheckCircle2 size={24} className="text-amber-600" strokeWidth={3} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'map' && (
                    <RadarMap
                        currentLocation={currentLocation}
                        availableJobs={availableJobs}
                        isOnline={isOnline}
                    />
                )}

                {/* TOP TIER INCOMING JOB OVERLAY (Uber/Bolt Style) */}
                {incomingJob && (
                    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950 animate-fade-in overflow-hidden">
                        {/* 1. MAP BACKGROUND SECTION */}
                        <div className="relative flex-1">
                            <Map
                                defaultCenter={{ lat: incomingJob.pickup_lat, lng: incomingJob.pickup_long }}
                                defaultZoom={15}
                                gestureHandling={'none'}
                                disableDefaultUI={true}
                                mapId="bf50a41c2c27038"
                                className="h-full w-full grayscale-[0.2]"
                            >
                                <Marker
                                    position={{ lat: incomingJob.pickup_lat, lng: incomingJob.pickup_long }}
                                    icon={{
                                        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-9-7-9z",
                                        fillColor: '#F59E0B',
                                        fillOpacity: 1,
                                        strokeWeight: 2,
                                        strokeColor: '#000',
                                        scale: 1.5,
                                        anchor: { x: 12, y: 24 } as any
                                    }}
                                />
                                <RouteRenderer route={jobMeta.route} />
                            </Map>

                            {/* Overlay Blur for edges */}
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />

                            {/* Top Status HUD */}
                            <div className="absolute top-12 left-0 w-full px-6 flex justify-center">
                                <div className="glass-panel py-3 px-8 flex items-center gap-4 bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 flex items-center justify-center">
                                            <span className="text-sm font-black text-amber-500">{timeLeft}</span>
                                        </div>
                                        <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                                            <circle
                                                cx="20" cy="20" r="18"
                                                fill="transparent"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="text-amber-500 transition-all duration-1000 ease-linear"
                                                style={{ strokeDasharray: 113, strokeDashoffset: 113 - (113 * timeLeft) / 30 }}
                                            />
                                        </svg>
                                    </div>
                                    <div className="pr-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/50 leading-none mb-1">Incoming</p>
                                        <h3 className="text-sm font-black text-white uppercase italic leading-none">Job Request</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. PREMIUM INFO & ACTION PANEL (THE "VIBRANT ZONE") */}
                        <div className="bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] relative z-10">
                            {/* Address & Meta Info */}
                            <div className="px-8 pt-10 pb-6">
                                {/* Pickup Row */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 relative">
                                        <MapPin size={24} className="text-amber-500" />
                                        <div className="absolute -bottom-1 w-0.5 h-3 bg-white/10" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1.5">Pick up</p>
                                        <h2 className="text-lg font-black text-white leading-tight truncate">
                                            {jobMeta.address || incomingJob.pickup_address || "Fetching address..."}
                                        </h2>
                                    </div>
                                </div>

                                {/* Destination Row (Task 3) */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500">
                                        <Navigation size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 leading-none mb-1.5">Drop off (Dest)</p>
                                        <h2 className="text-base font-black text-white leading-tight line-clamp-2">
                                            {incomingJob.dropoff_address || "Client Specified Destination"}
                                        </h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 pb-4">
                                    <div className="p-4 glass-panel bg-white/2 border-white/5 rounded-3xl flex items-center justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Distance to Client</p>
                                            <p className="text-2xl font-black text-white">
                                                {jobMeta.distance || (getHaversineDistance(currentLocation, { lat: incomingJob.pickup_lat, lng: incomingJob.pickup_long }) / 1000).toFixed(1) + ' km'}
                                            </p>
                                        </div>
                                        {jobMeta.duration && (
                                            <div className="text-right">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Est. Time</p>
                                                <p className="text-xl font-bold text-amber-500">
                                                    {jobMeta.duration}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* VIBRANT ACCEPT ZONE (Vibrant Green like Uber/Bolt) */}
                            <div className="p-4 pt-0">
                                <button
                                    onClick={() => handleAcceptJob(incomingJob.id)}
                                    className="relative w-full h-32 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all rounded-[2.5rem] overflow-hidden group shadow-[0_15px_40px_rgba(10,207,131,0.2)]"
                                >
                                    {/* The Draining Green Bar (Horizontal) */}
                                    <div
                                        className="absolute top-0 left-0 h-full bg-[#0ACF83] transition-all duration-1000 ease-linear"
                                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                                    />

                                    {/* Content (Z-Index above the bar) */}
                                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center text-black">
                                                <Zap size={22} fill="currentColor" />
                                            </div>
                                            <span className="text-2xl font-black text-black tracking-tighter italic">
                                                ACCEPT OFFER
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-black/80">
                                                Price: {jobMeta.price ? `€${Number(jobMeta.price).toFixed(2)}` : 'Calculating...'}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-[9px] font-black text-black/40 uppercase tracking-[0.3em]">
                                            Tap to accept
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleRejectJob}
                                    className="w-full py-6 text-gray-600 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
                                >
                                    Pass this request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIVE JOB INTERFACE (Bolt/Uber Style) */}
                {activeJob && (
                    <div className="fixed inset-0 z-[60] flex flex-col pointer-events-none">
                        <div className="mt-auto w-full p-6 pb-28 pointer-events-auto">
                            <div className="bg-slate-950 border border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
                                {/* Status Header */}
                                <div className="bg-amber-500 px-8 py-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black">
                                            {activeJob.status === 'accepted' ? 'Mission: Proceed to Pickup' : 'Mission: Arriving Now'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-black italic">ID: {activeJob.id.substring(0, 8)}</span>
                                </div>

                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Current Destination</p>
                                            <p className="text-xl font-black text-white leading-tight">
                                                {activeJob.status === 'accepted' ? activeJob.pickup_address : activeJob.dropoff_address}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openNavigation(activeJob.pickup_lat, activeJob.pickup_long, 'google')}
                                                className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-amber-500 active:scale-90 transition-all"
                                                title="Google Maps"
                                            >
                                                <Navigation size={24} />
                                            </button>
                                            <button
                                                onClick={() => openNavigation(activeJob.pickup_lat, activeJob.pickup_long, 'waze')}
                                                className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-sky-400 active:scale-90 transition-all font-black text-xs"
                                                title="Waze"
                                            >
                                                WAZE
                                            </button>
                                        </div>
                                    </div>

                                    {activeJob.status === 'accepted' && (
                                        <button
                                            onClick={handleArrivedAtPickup}
                                            className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                                        >
                                            I've Arrived at Pickup
                                        </button>
                                    )}

                                    {activeJob.status === 'en_route' && (
                                        <div className="flex flex-col gap-4">
                                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4">
                                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-500/70 uppercase">Client Notified</p>
                                                    <p className="text-sm font-bold text-white">Wait for client to secure vehicle</p>
                                                </div>
                                            </div>
                                            <button
                                                className="w-full py-6 bg-amber-500 text-black rounded-[2rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                Vehicle Secured - Start Tow
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <nav className="fixed bottom-0 left-0 w-full px-10 pb-10 z-50">
                    <div className="glass-panel p-2.5 flex justify-around items-center bg-slate-950/80 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[3.5rem]">
                        <NavIcon active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} icon={<Truck size={28} />} label="Jobs" />
                        <NavIcon active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapPin size={28} />} label="Radar" />
                        <NavIcon active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell size={28} />} label="Signal" />
                        <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={28} />} label="ID" />
                    </div>
                </nav>

                {/* DEBUG PANEL (Internal Use) */}
                <div className="fixed bottom-24 left-4 z-[1000] p-3 glass-panel text-[8px] space-y-1 bg-black/80 border-white/10">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-white/40 uppercase font-black">Online</span>
                        <span className={isOnline ? "text-green-500" : "text-red-500"}>{isOnline ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-white/40 uppercase font-black">User ID</span>
                        <span className="text-white font-mono">{user?.id?.slice(0, 8) || 'NONE'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-white/40 uppercase font-black">Offer</span>
                        <span className="text-amber-500 font-mono">{incomingJob?.id?.slice(0, 8) || 'NONE'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-white/40 uppercase font-black">Active</span>
                        <span className="text-blue-500 font-mono">{activeJob?.id?.slice(0, 8) || 'NONE'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-white/40 uppercase font-black">Timer</span>
                        <span className="text-white">{timeLeft}s</span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                        <button
                            onClick={() => {
                                const ctx = audioContextRef.current;
                                if (ctx) {
                                    if (ctx.state === 'suspended') ctx.resume();

                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();

                                    osc.connect(gain);
                                    gain.connect(ctx.destination);

                                    osc.type = 'square';
                                    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                                    osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1);

                                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                                    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

                                    osc.start(ctx.currentTime);
                                    osc.stop(ctx.currentTime + 0.5);

                                    alert("Beep sent to speakers!");
                                } else {
                                    alert("Audio Context Failed Init");
                                }
                            }}
                            className="w-full bg-white/10 hover:bg-white/20 text-[8px] py-1 rounded text-white font-bold"
                        >
                            TEST SOUND
                        </button>
                    </div>
                </div>
            </div>
        </APIProvider >
    );
}

// Sub-components
function RadarMap({ currentLocation, availableJobs, isOnline }: { currentLocation: { lat: number, lng: number }, availableJobs: any[], isOnline: boolean }) {
    const map = useMap();

    useEffect(() => {
        if (map && currentLocation) {
            map.setCenter(currentLocation);
        }
    }, [map]);

    return (
        <div className="flex-1 relative animate-slide-up h-[calc(100vh-140px)]">
            <div className="absolute inset-0 z-0">
                {GOOGLE_MAPS_API_KEY ? (
                    <Map
                        defaultCenter={currentLocation}
                        defaultZoom={13}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        mapId="bf50a41c2c27038"
                        className="h-full w-full"
                    >
                        <Marker position={currentLocation} />
                    </Map>
                ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                        <Navigation size={48} className="text-gray-800 mb-4 animate-pulse" />
                    </div>
                )}
            </div>

            <div className="absolute top-12 left-8 right-8 flex justify-between items-center z-10">
                <div className="glass-panel px-8 py-5 flex items-center gap-4 bg-slate-950/80 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-3xl">
                    <div className={`w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)]' : 'bg-red-500'}`} />
                    <span className="text-xs font-black uppercase tracking-[0.25em]">{isOnline ? 'Beacon Active' : 'Signal Lost'}</span>
                </div>
                <button
                    onClick={() => { if (map) map.panTo(currentLocation); }}
                    className="w-18 h-18 rounded-[2rem] glass-panel border border-white/10 flex items-center justify-center shadow-3xl bg-slate-950/80 backdrop-blur-3xl"
                >
                    <Navigation size={32} className="text-amber-500" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function NavIcon({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-2xl transition-all duration-500 ${active ? 'bg-amber-500/10' : 'hover:bg-white/5'}`}
        >
            <div className={`transition-all ${active ? 'text-amber-500' : 'text-gray-600'}`}>{icon}</div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'text-amber-500 opacity-100' : 'text-gray-700 opacity-0 group-hover:opacity-100'}`}>{label}</span>
        </button>
    );
}

function AuthInput({ icon, label, ...props }: any) {
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 pl-4">{label}</label>
            <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-amber-500 transition-colors">
                    {icon}
                </div>
                <input
                    {...props}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-[2rem] py-5 pl-16 pr-8 text-white font-bold placeholder:text-gray-700 focus:border-amber-500/50 outline-none transition-all focus:bg-slate-950"
                />
            </div>
        </div>
    );
}
