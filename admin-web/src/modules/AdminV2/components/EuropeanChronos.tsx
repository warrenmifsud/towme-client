import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EuropeanChronosProps {
    label: string;
    value?: string | Date | null; // Support string for broader compatibility
    onChange: (date: Date) => void;
    className?: string;
    variant?: 'standard' | 'compact';
    validateExpiry?: boolean; // If true, checks against TODAY
}

const MONTHS = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export const formatEuropeanDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return `${d.getDate().toString().padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

export const EuropeanChronos: React.FC<EuropeanChronosProps> = ({
    label,
    value,
    onChange,
    className = '',
    variant = 'standard',
    validateExpiry = false
}) => {
    const [day, setDay] = useState<string>('');
    const [month, setMonth] = useState<number>(new Date().getMonth());
    const [year, setYear] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'valid' | 'expired'>('idle');

    // Scale based on variant
    const sizeClass = variant === 'compact' ? 'p-1 text-xs' : 'p-2';

    // Sync internal state with props
    useEffect(() => {
        if (value) {
            const dateObj = typeof value === 'string' ? new Date(value) : value;
            if (!isNaN(dateObj.getTime())) {
                setDay(dateObj.getDate().toString().padStart(2, '0'));
                setMonth(dateObj.getMonth());
                setYear(dateObj.getFullYear().toString());

                if (validateExpiry) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkDate = new Date(dateObj);
                    checkDate.setHours(0, 0, 0, 0);

                    if (checkDate < today) setStatus('expired');
                    else setStatus('valid');
                }
            }
        }
    }, [value, validateExpiry]);

    const handleUpdate = (d: string, m: number, y: string) => {
        const dayNum = parseInt(d);
        const yearNum = parseInt(y);

        if (d && y && !isNaN(dayNum) && !isNaN(yearNum) && y.length === 4) {
            // Validate day count for month
            const daysInMonth = new Date(yearNum, m + 1, 0).getDate();
            const validDay = Math.min(Math.max(1, dayNum), daysInMonth);

            const newDate = new Date(yearNum, m, validDay);
            onChange(newDate);
        }
    };

    const onDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (parseInt(val) > 31) val = '31';
        setDay(val);
        if (val.length === 2) handleUpdate(val, month, year);
    };

    const onYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
        setYear(val);
        if (val.length === 4) handleUpdate(day, month, val);
    };

    const onMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = parseInt(e.target.value);
        setMonth(val);
        handleUpdate(day, val, year);
    };

    const borderColor = status === 'expired'
        ? 'border-red-500 bg-red-50'
        : status === 'valid'
            ? 'border-emerald-500 bg-emerald-50/30'
            : 'border-slate-200 bg-white';

    const iconColor = status === 'expired' ? 'text-red-500' : status === 'valid' ? 'text-emerald-500' : 'text-slate-400';

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    {label}
                </label>
                {status === 'expired' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full animate-pulse">
                        <AlertCircle className="w-3 h-3" /> EXPIRED
                    </span>
                )}
                {status === 'valid' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> VALID
                    </span>
                )}
            </div>

            <div className={`flex items-center gap-1 ${borderColor} border-2 rounded-lg ${sizeClass} transition-all group hover:border-[#F9A825] focus-within:!border-[#F9A825] focus-within:shadow-[0_4px_12px_rgba(249,168,37,0.15)]`}>
                <Calendar className={`w-4 h-4 ${iconColor} flex-shrink-0 group-hover:text-[#F9A825] transition-colors`} />

                {/* DAY */}
                <input
                    type="text"
                    placeholder="DD"
                    value={day}
                    onChange={onDayChange}
                    maxLength={2}
                    className="w-8 text-center font-bold text-[#1A1C2E] text-sm outline-none placeholder:text-slate-300 bg-transparent"
                />
                <span className="text-slate-300 font-light">/</span>

                {/* MONTH */}
                <select
                    value={month}
                    onChange={onMonthChange}
                    className="bg-transparent font-bold text-[#1A1C2E] text-sm outline-none cursor-pointer uppercase tracking-tight appearance-none text-center hover:text-[#F9A825] transition-colors min-w-[50px]"
                    style={{ textAlignLast: 'center' }}
                >
                    {MONTHS.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                    ))}
                </select>
                <span className="text-slate-300 font-light">/</span>

                {/* YEAR */}
                <input
                    type="text"
                    placeholder="YYYY"
                    value={year}
                    onChange={onYearChange}
                    maxLength={4}
                    className="w-12 text-center font-bold text-[#1A1C2E] text-sm outline-none placeholder:text-slate-300 bg-transparent"
                />
            </div>
        </div>
    );
};
