import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BRAND_SETTINGS from '../config/brand_settings.json';

// INTERFACE (Mirrors DriverRequest for now)
interface DriverRequest {
    id: string;
    name: string;
    location: string;
    email: string;
    phone: string;
    vat: string;
    id_card_front_path?: string;
    id_card_back_path?: string;
    driving_license_front_path?: string;
    driving_license_back_path?: string;
}

interface BrandCardProps {
    driver?: DriverRequest;
    variant?: 'vault' | 'identity';
}

export const BrandCard = ({ driver, variant = 'vault' }: BrandCardProps) => {
    // --- MODE 1: GLOBAL IDENTITY (The W.M CODING Card) ---
    if (variant === 'identity') {
        const config = BRAND_SETTINGS.brand.global_card;
        return (
            <div className={`${config.position} z-50 animate-in fade-in slide-in-from-bottom-4 duration-1000 group`}>
                <div className={`${config.bg} ${config.border} border-2 rounded-xl shadow-2xl p-4 flex items-center gap-3 ${config.animation} cursor-default`}>
                    <div className="bg-[#F9A825] p-2 rounded-lg text-white shadow-md group-hover:rotate-12 transition-transform duration-300">
                        <ShieldCheck size={20} strokeWidth={3} />
                    </div>
                    <div>
                        <div className={`text-[9px] font-bold text-slate-400 uppercase tracking-wider`}>
                            {config.credit_label}
                        </div>
                        <div className={`text-xs font-black tracking-[0.2em] uppercase ${config.text}`}>
                            {config.credit_value}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MODE 2: DRIVER VAULT (Original Logic) ---
    if (!driver) return null; // Safety for Vault Mode

    const [docUrls, setDocUrls] = useState<Record<string, string | null>>({});

    // Configuration for Document Slots
    const docConfig = React.useMemo(() => [
        { key: 'id_card_front', label: 'ID Card Front', path: driver.id_card_front_path },
        { key: 'id_card_back', label: 'ID Card Back', path: driver.id_card_back_path },
        { key: 'license_front', label: 'License Front', path: driver.driving_license_front_path },
        { key: 'license_back', label: 'License Back', path: driver.driving_license_back_path },
    ], [driver]);

    useEffect(() => {
        const fetchDocs = async () => {
            const urls: Record<string, string | null> = {};
            console.log(`🔒 Vault Access: Fetching secure tokens for ${driver.id}...`);

            for (const doc of docConfig) {
                if (doc.path) {
                    const { data, error } = await supabase.storage.from('driver_documents').createSignedUrl(doc.path, 60);
                    if (data?.signedUrl) {
                        urls[doc.key] = data.signedUrl;
                    } else {
                        console.warn(`Vault Warning: Failed to sign URL for ${doc.key} (${doc.path})`, error);
                        urls[doc.key] = null;
                    }
                } else {
                    urls[doc.key] = null;
                }
            }
            setDocUrls(urls);
        };
        fetchDocs();
    }, [driver, docConfig]);

    return (
        <div className="bg-gray-50 p-6 border-l-4 border-[#F9A825] shadow-inner animate-in slide-in-from-top-2 duration-200">
            {/* Header Identity & Protocol */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    LANA PARTNER VERIFICATION PROTOCOL
                </h3>
                <div className="text-[10px] font-mono text-slate-400 p-1 bg-white border rounded">
                    SECURE_SESSION_ACTIVE for {driver.id.slice(0, 8)}...
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* LEFT: Identity Block (3 Cols) */}
                <div className="col-span-4 lg:col-span-3 space-y-6 border-r border-gray-200 pr-4">
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entity Name</h4>
                        <div className="text-sm font-bold text-slate-900">{driver.name}</div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Matrix</h4>
                        <div className="text-xs text-slate-600 space-y-0.5">
                            <div className="flex items-center gap-2 overflow-hidden"><span className="text-slate-400 w-4">E:</span> <span className="truncate">{driver.email}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-4">P:</span> {driver.phone}</div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Legal & VAT</h4>
                        <div className="text-xs font-mono text-slate-700 bg-slate-100 p-1 rounded inline-block">
                            {driver.vat}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Business Address</h4>
                        <div className="text-xs text-slate-600 leading-relaxed">
                            {driver.location}
                        </div>
                    </div>
                </div>

                {/* RIGHT: 4-Slot Document Matrix (9 Cols) */}
                <div className="col-span-8 lg:col-span-9">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {docConfig.map((doc) => {
                            const url = docUrls[doc.key];
                            return (
                                <div key={doc.key} className="bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col h-full">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">{doc.label}</div>
                                    <div className="flex-1 bg-gray-100 mb-2 flex items-center justify-center text-gray-400 text-xs overflow-hidden rounded relative min-h-[80px]">
                                        {url ? (
                                            <img src={url} alt={doc.label} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="flex flex-col items-center gap-1 opacity-50">
                                                <FileText size={16} />
                                                <span>NO SIGNAL</span>
                                            </span>
                                        )}
                                    </div>
                                    <a
                                        href={url || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`block w-full py-1.5 text-[9px] font-bold text-white rounded uppercase text-center transition-opacity ${!url ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                                        style={{ backgroundColor: '#F9A825' }}
                                        onClick={(e) => !url && e.preventDefault()}
                                    >
                                        View {doc.label}
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
