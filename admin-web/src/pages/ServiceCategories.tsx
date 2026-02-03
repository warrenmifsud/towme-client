import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2, Calendar, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import {
    CarIcon, SuvIcon, MotorcycleIcon, VanIcon, MediumVanIcon, BoxVanIcon,
    LutonVanIcon, GarageIcon, VintageCarIcon, BatteryJumpIcon,
    BatteryReplacementIcon
} from '../components/ServiceIcons';

interface Category {
    id: string;
    name: string;
    base_price: number;
    description: string;
    icon_name: string;
    is_active: boolean;
}

interface PriceSchedule {
    id: string;
    service_id: string;
    percentage: number;
    start_time: string;
    end_time: string;
    created_at: string;
}

const AVAILABLE_ICONS = [
    { name: 'car', icon: CarIcon, label: 'Car' },
    { name: 'suv', icon: SuvIcon, label: 'SUV' },
    { name: 'motorcycle', icon: MotorcycleIcon, label: 'Motorcycle' },
    { name: 'van', icon: VanIcon, label: 'Van' },
    { name: 'medium_van', icon: MediumVanIcon, label: 'Medium Van' },
    { name: 'box_van', icon: BoxVanIcon, label: 'Box Van' },
    { name: 'luton_van', icon: LutonVanIcon, label: 'Luton Van' },
    { name: 'garage', icon: GarageIcon, label: 'Garage' },
    { name: 'vintage', icon: VintageCarIcon, label: 'High Value / Vintage' },
    { name: 'battery_jump', icon: BatteryJumpIcon, label: 'Battery Jump Start' },
    { name: 'battery_replace', icon: BatteryReplacementIcon, label: 'Battery Replacement' },
];

const CalendarDropdown = ({ value, onChange, onClose }: { value: string, onChange: (val: string) => void, onClose: () => void }) => {
    // value is YYYY-MM-DD
    const date = value && !value.includes('--') ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(new Date(date.getFullYear(), date.getMonth(), 1));

    const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const handleSelect = (d: number) => {
        const y = viewDate.getFullYear();
        const m = String(viewDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        onChange(`${y}-${m}-${dayStr}`);
        onClose(); // Automatically close on selection
    };

    const monthName = viewDate.toLocaleString('default', { month: 'long' });
    const year = viewDate.getFullYear();

    const days = [];
    const totalDays = daysInMonth(year, viewDate.getMonth());
    const startOffset = firstDayOfMonth(year, viewDate.getMonth());

    for (let i = 0; i < startOffset; i++) days.push(<div key={`empty-${i}`} />);
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = value === dateStr;
        const isToday = new Date().toISOString().split('T')[0] === dateStr;

        days.push(
            <button
                key={d}
                type="button"
                onClick={() => handleSelect(d)}
                className={`w-8 h-8 rounded-lg text-xs transition-all flex items-center justify-center border ${isSelected
                    ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                    : isToday
                        ? 'border-blue-500/30 text-blue-400 hover:bg-white/10'
                        : 'border-transparent hover:bg-white/10 text-gray-300'
                    }`}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="absolute top-full right-0 mt-3 p-4 glass-panel z-[100] w-[280px] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 border border-white/10 rounded-2xl bg-black/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 px-1">
                <button type="button" onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div className="text-sm font-bold text-white tracking-wide">{monthName} {year}</div>
                <button type="button" onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-[10px] uppercase font-bold text-gray-500 py-1">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={() => {
                        const today = new Date();
                        const y = today.getFullYear();
                        const m = String(today.getMonth() + 1).padStart(2, '0');
                        const d = String(today.getDate()).padStart(2, '0');
                        onChange(`${y}-${m}-${d}`);
                        onClose();
                    }}
                    className="w-full py-2 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all"
                >
                    Select Today
                </button>
            </div>
        </div>
    );
};

const DatePickerParts = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [showCalendar, setShowCalendar] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const yearRef = useRef<HTMLInputElement>(null);

    const parts = (value || '').split('-');
    const y = parts[0] || '';
    const m = parts[1] || '';
    const d = parts[2] || '';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePart = (part: 'y' | 'm' | 'd', newVal: string) => {
        const digits = newVal.replace(/\D/g, '');
        if (part === 'y' && digits.length > 4) return;
        if ((part === 'm' || part === 'd') && digits.length > 2) return;

        const nextY = part === 'y' ? digits : y;
        const nextM = part === 'm' ? digits : m;
        const nextD = part === 'd' ? digits : d;
        onChange(`${nextY}-${nextM}-${nextD}`);

        if (part === 'd' && digits.length === 2) monthRef.current?.focus();
        if (part === 'm' && digits.length === 2) yearRef.current?.focus();
    };

    return (
        <div className="flex gap-2 items-center flex-1 relative" ref={containerRef}>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 h-12 flex-1 focus-within:border-blue-500/50 focus-within:bg-blue-500/5 transition-all duration-300">
                <input
                    ref={dayRef}
                    type="text"
                    placeholder="DD"
                    value={d}
                    onChange={e => updatePart('d', e.target.value)}
                    className="w-8 bg-transparent text-center outline-none text-theme-primary text-sm placeholder:text-gray-600 font-mono"
                />
                <span className="text-gray-600 mx-1">/</span>
                <input
                    ref={monthRef}
                    type="text"
                    placeholder="MM"
                    value={m}
                    onChange={e => updatePart('m', e.target.value)}
                    className="w-8 bg-transparent text-center outline-none text-theme-primary text-sm placeholder:text-gray-600 font-mono"
                />
                <span className="text-gray-600 mx-1">/</span>
                <input
                    ref={yearRef}
                    type="text"
                    placeholder="YYYY"
                    value={y}
                    onChange={e => updatePart('y', e.target.value)}
                    className="w-12 bg-transparent text-center outline-none text-theme-primary text-sm placeholder:text-gray-600 font-mono"
                />

                <div className="w-[1px] h-4 bg-white/10 mx-2" />

                <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className={`transition-all p-1.5 rounded-lg ${showCalendar ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-blue-400 hover:bg-white/5'}`}
                    title="Open Calendar"
                >
                    <Calendar size={16} />
                </button>
            </div>

            {showCalendar && (
                <CalendarDropdown
                    value={value}
                    onChange={onChange}
                    onClose={() => setShowCalendar(false)}
                />
            )}
        </div>
    );
};

export default function ServiceCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('car');

    // Bulk Update State
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkPercentage, setBulkPercentage] = useState('');

    // Schedule Pricing State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [schedulePercent, setSchedulePercent] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');

    const [schedules, setSchedules] = useState<PriceSchedule[]>([]);
    const [editingSchedule, setEditingSchedule] = useState<PriceSchedule | null>(null);

    useEffect(() => {
        fetchCategories();
        fetchSchedules();
    }, []);

    async function fetchSchedules() {
        try {
            const { data, error } = await supabase
                .from('price_schedules')
                .select('*')
                .order('start_time', { ascending: true });
            if (error) throw error;
            setSchedules(data || []);
        } catch (err) {
            console.error('Error fetching schedules:', err);
        }
    }

    async function fetchCategories() {
        try {
            const { data, error } = await supabase
                .from('service_categories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddCategory(e: React.FormEvent) {
        e.preventDefault();
        try {
            const payload = {
                name: newName,
                base_price: parseFloat(newPrice),
                description: newDesc,
                icon_name: selectedIcon
            };

            if (editingCategory) {
                // Update existing
                const { error } = await supabase
                    .from('service_categories')
                    .update(payload)
                    .eq('id', editingCategory.id);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('service_categories')
                    .insert([payload]);
                if (error) throw error;
            }

            closeModal();
            fetchCategories(); // Refresh list
        } catch (err) {
            console.error('Error saving category:', err);
            alert('Failed to save category');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            const { error } = await supabase
                .from('service_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            alert('Failed to delete category');
        }
    }

    async function handleToggleActive(id: string, currentStatus: boolean) {
        try {
            const { error } = await supabase
                .from('service_categories')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchCategories();
        } catch (err) {
            console.error('Error toggling category status:', err);
            alert('Failed to update service status');
        }
    }

    async function handleBulkUpdate(e: React.FormEvent) {
        e.preventDefault();
        try {
            const percentage = parseFloat(bulkPercentage);
            if (isNaN(percentage)) return;

            const { error } = await supabase.rpc('adjust_service_prices', { percentage });

            if (error) throw error;

            setShowBulkModal(false);
            setBulkPercentage('');
            fetchCategories();
            alert('Prices updated successfully!');
        } catch (err: any) {
            console.error('Error updating prices:', err);
            alert(`Failed to update prices: ${err.message || JSON.stringify(err)}`);
        }
    }

    async function handleScheduleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const percentage = parseFloat(schedulePercent);
            if (isNaN(percentage)) throw new Error('Invalid percentage');
            if (selectedServices.length === 0) throw new Error('Select at least one service');
            if (!startDate || !startTime || !endDate || !endTime) throw new Error('Start and End date/times are required');

            const start = new Date(`${startDate}T${startTime}`).toISOString();
            const end = new Date(`${endDate}T${endTime}`).toISOString();

            if (editingSchedule) {
                // UPDATE single schedule
                const { error } = await supabase
                    .from('price_schedules')
                    .update({
                        percentage,
                        start_time: start,
                        end_time: end,
                        service_id: selectedServices[0] // Always use the first one if editing
                    })
                    .eq('id', editingSchedule.id);
                if (error) throw error;
            } else {
                // CREATE new schedules
                const payload = selectedServices.map(serviceId => ({
                    service_id: serviceId,
                    percentage,
                    start_time: start,
                    end_time: end
                }));

                const { error } = await supabase
                    .from('price_schedules')
                    .insert(payload);
                if (error) throw error;
            }

            setShowScheduleModal(false);
            setEditingSchedule(null);
            setSchedulePercent('');
            setStartDate('');
            setStartTime('');
            setEndDate('');
            setEndTime('');
            setSelectedServices([]);
            fetchSchedules(); // Refresh the schedules list
            alert(editingSchedule ? 'Price schedule updated!' : 'Price schedule created!');
        } catch (err: any) {
            console.error('Error saving schedule:', err);
            alert(`Failed to save schedule: ${err.message || JSON.stringify(err)}`);
        }
    }

    async function handleDeleteSchedule(id: string) {
        if (!confirm('Are you sure you want to delete this price schedule?')) return;
        try {
            const { error } = await supabase
                .from('price_schedules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchSchedules();
        } catch (err) {
            console.error('Error deleting schedule:', err);
            alert('Failed to delete schedule');
        }
    }

    const toggleServiceSelection = (id: string) => {
        if (selectedServices.includes(id)) {
            setSelectedServices(selectedServices.filter(s => s !== id));
        } else {
            setSelectedServices([...selectedServices, id]);
        }
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setNewName(cat.name);
        setNewPrice(cat.base_price.toString());
        setNewDesc(cat.description);
        setSelectedIcon(cat.icon_name);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setNewName('');
        setNewPrice('');
        setNewDesc('');
        setSelectedIcon('car');
    };

    const getIconComponent = (name: string) => {
        const found = AVAILABLE_ICONS.find(i => i.name === name) || AVAILABLE_ICONS.find(i => i.name === 'car');
        return found ? found.icon : CarIcon;
    };

    const formatDisplayDate = (isoString: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const day = d.getDate();
        const month = d.toLocaleString('en-GB', { month: 'short' });
        const year = d.getFullYear();
        const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `${day} ${month} ${year} ${time}`;
    };

    const calculateDuration = (start: string, end: string) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diff = e - s;
        if (diff <= 0) return '0m';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.join(' ') || '0m';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-theme-primary">Service Categories</h2>
                    <p className="text-theme-secondary">Manage available towing services</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="glass-button flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30"
                    >
                        <Edit2 size={18} /> Schedule Pricing
                    </button>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="glass-button flex items-center gap-2 bg-white/5 hover:bg-white/10"
                    >
                        <Edit2 size={18} /> Adjust Prices
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="glass-button flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30"
                    >
                        <Plus size={18} /> Add Category
                    </button>
                </div>
            </div>

            {schedules.length > 0 && (
                <div className="glass-panel p-6 border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                            <Calendar size={20} className="text-purple-400" />
                            Active & Upcoming Schedules
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {schedules.map(s => {
                            const cat = categories.find(c => c.id === s.service_id);
                            const isLive = new Date() >= new Date(s.start_time) && new Date() <= new Date(s.end_time);
                            return (
                                <div key={s.id} className={`p-4 rounded-xl border ${isLive ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'} group transition-all`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-theme-primary">{cat?.name || 'Unknown Service'}</span>
                                            <span className={`text-[10px] ${isLive ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>
                                                {isLive ? 'LIVE NOW' : 'SCHEDULED'}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingSchedule(s);
                                                    setSelectedServices([s.service_id]);
                                                    setSchedulePercent(s.percentage.toString());
                                                    const start = new Date(s.start_time);
                                                    const end = new Date(s.end_time);
                                                    setStartDate(start.toISOString().split('T')[0]);
                                                    setStartTime(start.toTimeString().split(' ')[0].slice(0, 5));
                                                    setEndDate(end.toISOString().split('T')[0]);
                                                    setEndTime(end.toTimeString().split(' ')[0].slice(0, 5));
                                                    setShowScheduleModal(true);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-theme-secondary hover:text-theme-primary"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSchedule(s.id)}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xl font-bold text-theme-primary font-mono">
                                            {s.percentage > 0 ? '+' : ''}{s.percentage}%
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="text-[10px] text-muted">
                                                <span className="text-gray-400 font-bold uppercase mr-1">Starts:</span>
                                                {formatDisplayDate(s.start_time)}
                                            </div>
                                            <div className="text-[10px] text-muted">
                                                <span className="text-gray-400 font-bold uppercase mr-1">Ends:</span>
                                                {formatDisplayDate(s.end_time)}
                                            </div>
                                            <div className="text-[10px] text-purple-400 bg-purple-500/5 px-2 py-0.5 rounded-full inline-block border border-purple-500/10">
                                                Duration: {calculateDuration(s.start_time, s.end_time)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-theme-secondary">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((cat) => {
                        const IconComp = getIconComponent(cat.icon_name);
                        const serviceSchedules = schedules.filter(s => s.service_id === cat.id);
                        const activeSchedule = serviceSchedules.find(s => {
                            const now = new Date();
                            return now >= new Date(s.start_time) && now <= new Date(s.end_time);
                        });
                        const futureSchedule = !activeSchedule ? serviceSchedules.find(s => new Date(s.start_time) > new Date()) : null;

                        return (
                            <div key={cat.id} className="glass-panel p-6 group relative overflow-hidden">
                                {activeSchedule && (
                                    <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-purple-500/30 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                        LIVE {activeSchedule.percentage > 0 ? '+' : ''}{activeSchedule.percentage}%
                                    </div>
                                )}
                                {futureSchedule && !activeSchedule && (
                                    <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-blue-500/20 flex items-center gap-1">
                                        UPCOMING
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/10 overflow-hidden p-1">
                                        <IconComp className="w-full h-full object-contain" size={48} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleActive(cat.id, cat.is_active)}
                                            className={`p-2 rounded-lg transition-colors ${cat.is_active ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-400'}`}
                                            title={cat.is_active ? "Hide from Client" : "Show to Client"}
                                        >
                                            {cat.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(cat)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-theme-secondary hover:text-theme-primary">
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-semibold text-theme-primary mb-1">{cat.name}</h3>
                                <p className="text-muted text-sm mb-4 h-10 line-clamp-2">{cat.description}</p>

                                <div className="flex items-center justify-between text-sm top-border pt-4 border-t border-white/5">
                                    <span className="text-muted">Base Price</span>
                                    <div className="text-right">
                                        {activeSchedule ? (
                                            <>
                                                <div className="text-[10px] text-muted line-through">€{cat.base_price}</div>
                                                <div className="text-purple-400 font-mono text-lg font-bold">
                                                    €{(cat.base_price * (1 + activeSchedule.percentage / 100)).toFixed(2)}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-green-400 font-mono text-lg">€{cat.base_price}</span>
                                        )}
                                    </div>
                                </div>

                                {(activeSchedule || futureSchedule) && (
                                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                        {serviceSchedules.map(s => {
                                            const isLive = new Date() >= new Date(s.start_time) && new Date() <= new Date(s.end_time);
                                            return (
                                                <div key={s.id} className="flex items-center justify-between text-[10px]">
                                                    <span className={`${isLive ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>
                                                        {s.percentage > 0 ? '+' : ''}{s.percentage}% adjustment
                                                    </span>
                                                    <span className="text-gray-500 flex flex-col items-end gap-0.5">
                                                        <span>{formatDisplayDate(s.start_time)} - {formatDisplayDate(s.end_time)}</span>
                                                        <span className="text-gray-600 font-medium">({calculateDuration(s.start_time, s.end_time)})</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="surface-modal w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-2xl font-bold text-theme-primary mb-6">
                            {editingCategory ? 'Edit Service' : 'New Service'}
                        </h3>

                        <form onSubmit={handleAddCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Service Name</label>
                                <input
                                    type="text"
                                    value={newName} onChange={e => setNewName(e.target.value)}
                                    className="glass-input"
                                    placeholder="e.g. Flatbed Towing"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Icon</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {AVAILABLE_ICONS.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setSelectedIcon(item.name)}
                                            className={`
                                                p-3 rounded-lg flex flex-col items-center justify-center transition-all
                                                ${selectedIcon === item.name
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                                            `}
                                        >
                                            <item.icon size={20} />
                                            {/* <span className="text-[10px] mt-1">{item.label}</span> */}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Base Price (€)</label>
                                <input
                                    type="number"
                                    value={newPrice} onChange={e => setNewPrice(e.target.value)}
                                    className="glass-input"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={newDesc} onChange={e => setNewDesc(e.target.value)}
                                    className="glass-input h-24 resize-none"
                                    placeholder="Service details..."
                                />
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="glass-button flex-1 bg-white/5 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="glass-button flex-1 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-200"
                                >
                                    {editingCategory ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Update Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="surface-modal w-full max-w-sm p-8 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-theme-primary mb-2">Adjust Prices</h3>
                        <p className="text-sm text-gray-400 mb-6">Enter a percentage to increase or decrease all service prices.</p>

                        <form onSubmit={handleBulkUpdate}>
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-1">Percentage Change (%)</label>
                                <input
                                    type="number"
                                    value={bulkPercentage}
                                    onChange={e => setBulkPercentage(e.target.value)}
                                    className="glass-input"
                                    placeholder="e.g. 10 for +10%"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Use negative numbers for discounts (e.g. -5).
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkModal(false)}
                                    className="glass-button flex-1 bg-white/5 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="glass-button flex-1 bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-200"
                                >
                                    Apply
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Schedule Pricing Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="surface-modal w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-theme-primary mb-2">Schedule Price Change</h3>
                        <p className="text-sm text-gray-400 mb-6">Automatically adjust prices for selected services during a date range.</p>

                        <form onSubmit={handleScheduleSubmit}>
                            {/* Service Selection */}
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">Select Services</label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-lg border border-white/10">
                                    {categories.map(cat => (
                                        <div
                                            key={cat.id}
                                            onClick={() => toggleServiceSelection(cat.id)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                                                ${selectedServices.includes(cat.id) ? 'bg-purple-500/20 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}
                                            `}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedServices.includes(cat.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`}>
                                                {selectedServices.includes(cat.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="text-sm text-gray-300 truncate font-medium">{cat.name}</span>
                                                    <span className="text-xs text-gray-400 font-mono">€{cat.base_price}</span>
                                                </div>
                                                {schedulePercent && !isNaN(parseFloat(schedulePercent)) && (
                                                    <div className="text-[10px] text-purple-400 font-bold mt-1 flex items-center gap-1">
                                                        <span className="opacity-50">New Price:</span>
                                                        <span className="bg-purple-500/20 px-1 rounded">
                                                            €{(cat.base_price * (1 + parseFloat(schedulePercent) / 100)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Start</label>
                                    <div className="flex gap-2">
                                        <DatePickerParts
                                            value={startDate}
                                            onChange={setStartDate}
                                        />
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 w-32 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 text-theme-primary text-sm transition-all duration-300 font-mono"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">End</label>
                                    <div className="flex gap-2">
                                        <DatePickerParts
                                            value={endDate}
                                            onChange={setEndDate}
                                        />
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 w-32 outline-none focus:border-blue-500/50 focus:bg-blue-500/5 text-theme-primary text-sm transition-all duration-300 font-mono"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm text-gray-400 mb-1">Percentage Adjustment (%)</label>
                                <input
                                    type="number"
                                    value={schedulePercent}
                                    onChange={e => setSchedulePercent(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 w-full outline-none focus:border-purple-500/50 focus:bg-purple-500/5 text-theme-primary text-sm transition-all duration-300"
                                    placeholder="e.g. 20 for +20%"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Price will be {schedulePercent ? (parseFloat(schedulePercent) > 0 ? 'increased' : 'decreased') : 'changed'} by {Math.abs(parseFloat(schedulePercent) || 0)}% during this period.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowScheduleModal(false);
                                        setEditingSchedule(null);
                                        setSchedulePercent('');
                                        setSelectedServices([]);
                                    }}
                                    className="glass-button flex-1 bg-white/5 hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="glass-button flex-1 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30 text-purple-200"
                                >
                                    Create Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
