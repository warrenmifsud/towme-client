import React from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
// BRAND SETTINGS (Inlined for standalone portability or import from config if preferred)
const BRAND = {
    primary: '#F9A825',    // Orange (Success/Brand)
    danger: '#DC2626',     // Red (Error)
};

interface VisualAlertProps {
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose: () => void;
}

export const VisualAlert: React.FC<VisualAlertProps> = ({ title, message, type, onClose }) => {
    // VISUAL LAW LOGIC:
    // Success = Orange (#F9A825)
    // Error = Red (#DC2626)

    const getColor = () => {
        if (type === 'success') return BRAND.primary;
        if (type === 'error') return BRAND.danger;
        return BRAND.primary; // Default/Warning
    };

    const color = getColor();

    return (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top duration-300">
            <div
                className="bg-white border-l-4 shadow-2xl rounded-r p-5 max-w-md flex items-start gap-4"
                style={{ borderColor: color }}
            >
                <div className={`p-2 rounded-full`} style={{ backgroundColor: `${color}10`, color: color }}>
                    {type === 'error' ? <ShieldAlert size={20} /> : <Check size={20} />}
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: color }}>
                        {title}
                    </h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
