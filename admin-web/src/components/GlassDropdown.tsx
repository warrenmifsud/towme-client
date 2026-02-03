import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface GlassDropdownOption {
    value: string;
    label: string;
    color: 'amber' | 'blue' | 'green' | 'red';
}

interface GlassDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: GlassDropdownOption[];
}

export default function GlassDropdown({ value, onChange, options }: GlassDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const getColorClasses = (color: string, isSelected: boolean = false) => {
        const colorMap = {
            amber: isSelected
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'text-amber-500',
            blue: isSelected
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'text-blue-500',
            green: isSelected
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'text-green-500',
            red: isSelected
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'text-red-500',
        };
        return colorMap[color as keyof typeof colorMap] || colorMap.amber;
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`surface-inner px-4 py-2 text-xs font-black uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500/10 cursor-pointer transition-all flex items-center gap-2 ${selectedOption ? getColorClasses(selectedOption.color) : 'border-white/10 text-theme-secondary'
                    }`}
            >
                {selectedOption?.label || 'Select Status'}
                <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in" />

                    {/* Options Panel */}
                    <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] glass-panel p-2 z-50 animate-slide-up shadow-xl border-white/20">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${option.value === value
                                    ? getColorClasses(option.color, true)
                                    : `text-theme-secondary hover:bg-white/10 hover:${getColorClasses(option.color)}`
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
