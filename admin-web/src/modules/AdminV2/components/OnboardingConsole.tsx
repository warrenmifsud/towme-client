import React, { useState, useEffect } from 'react';
import {
    User, Truck, FileText, CreditCard, X,
    Check, AlertTriangle, ChevronRight, ZoomIn, Eye, Ban
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatEuropeanDate } from './EuropeanChronos';

const InputField = ({ label, value, icon, multiline }: any) => (
    <div className="group">
        <label className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-[#F9A825] transition-colors mb-1 block">{label}</label>
        <div className="flex items-start gap-2">
            {icon}
            {multiline ? (
                <textarea
                    readOnly
                    value={value}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#F9A825] transition-all resize-none h-24"
                />
            ) : (
                <input
                    readOnly
                    type="text"
                    value={value}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#F9A825] transition-all"
                />
            )}
        </div>
    </div>
);

// Re-defining interface to include Financials (will sync with parent later)
export interface DriverApplication {
    id: string;
    company_name: string;
    owner_name: string;
    email: string;
    phone: string;
    address: string;
    vat_number: string;

    // Tow Truck
    tow_truck_make: string;
    tow_truck_model: string;
    tow_truck_year: string;
    tow_truck_registration_plate: string;
    tow_truck_color: string;

    // Documents
    driving_license_front_path?: string;
    driving_license_front_expiry?: string;
    driving_license_back_path?: string;
    driving_license_back_expiry?: string;
    id_card_front_path?: string;
    id_card_front_expiry?: string;
    id_card_back_path?: string;
    id_card_back_expiry?: string;
    insurance_policy_path?: string;
    insurance_policy_expiry?: string;

    // Financials (New)
    iban?: string;
    bank_name?: string;
    payout_type?: string;
    payout_rate?: number;

    status: 'pending' | 'approved' | 'rejected' | 'contacted' | 'changes_requested';
    created_at: string;

    // Missing fields from parent
    tow_truck_types: string[];
    services_offered: string[];
    application_type: 'single' | 'fleet';
}

interface OnboardingConsoleProps {
    application: DriverApplication;
    onClose: () => void;
    onUpdate: (app: DriverApplication) => void;
    onApprove: (app: DriverApplication) => void;
    onReject: (app: DriverApplication, reason: string) => void;
}

type Stage = 'identity' | 'vehicle' | 'documents' | 'financials';

export const OnboardingConsole: React.FC<OnboardingConsoleProps> = ({
    application, onClose, onUpdate, onApprove, onReject
}) => {
    const [activeStage, setActiveStage] = useState<Stage>('identity');
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

    // Expiry & Validity Check Logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checks = [
        // License Back (Required Expiry)
        { val: application.driving_license_back_expiry, required: true },
        // ID Back (Required Expiry)
        { val: application.id_card_back_expiry, required: true },
        // Insurance (Required Expiry)
        { val: application.insurance_policy_expiry, required: true },
        // Front Docs (Expiry Optional but check if present AND expired)
        { val: application.driving_license_front_expiry, required: false },
        { val: application.id_card_front_expiry, required: false }
    ];

    const hasBlockingIssues = checks.some(c => {
        if (c.required && !c.val) return true; // Missing mandatory expiry
        if (c.val) {
            const d = new Date(c.val);
            if (isNaN(d.getTime())) return false; // Invalid date string? treat as missing?
            if (d < today) return true; // Expired
        }
        return false;
    });

    // Auto-select first document available when entering 'documents' stage
    useEffect(() => {
        if (activeStage === 'documents' && !selectedDoc) {
            if (application.driving_license_front_path) setSelectedDoc(application.driving_license_front_path);
            else if (application.id_card_front_path) setSelectedDoc(application.id_card_front_path);
        }
    }, [activeStage, application]);

    const renderSidebar = () => (
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Audit Stages</h3>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <SidebarItem
                    icon={<User size={18} />}
                    label="Identity"
                    isActive={activeStage === 'identity'}
                    onClick={() => setActiveStage('identity')}
                    status="valid" // Logic to check status
                />
                <SidebarItem
                    icon={<Truck size={18} />}
                    label="Vehicle"
                    isActive={activeStage === 'vehicle'}
                    onClick={() => setActiveStage('vehicle')}
                    status="valid"
                />
                <SidebarItem
                    icon={<FileText size={18} />}
                    label="Documents"
                    isActive={activeStage === 'documents'}
                    onClick={() => setActiveStage('documents')}
                    status="warning" // Example
                />
                <SidebarItem
                    icon={<CreditCard size={18} />}
                    label="Financials"
                    isActive={activeStage === 'financials'}
                    onClick={() => setActiveStage('financials')}
                    status="empty"
                />
            </nav>

            <div className="p-4 border-t border-slate-200 bg-white">
                {hasBlockingIssues ? (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-center shadow-inner">
                        <p className="text-[10px] font-bold text-red-600 uppercase flex items-center justify-center gap-1 mb-1">
                            <Ban size={12} /> Approval Blocked
                        </p>
                        <p className="text-[9px] text-red-400">
                            Critical documents are expired or missing expiry dates.
                            <br />Please verify documents in the main list.
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={() => onApprove(application)}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> APPROVE DRIVER
                    </button>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="py-2 bg-amber-50 text-amber-600 font-bold text-xs rounded border border-amber-200 hover:bg-amber-100">
                        REQUEST CHANGES
                    </button>
                    <button className="py-2 bg-red-50 text-red-600 font-bold text-xs rounded border border-red-200 hover:bg-red-100">
                        REJECT
                    </button>
                </div>
            </div>
        </div>
    );

    const renderContent = () => {
        if (activeStage === 'identity') {
            return (
                <div className="space-y-8 p-6">
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Business Identity</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Company Name" value={application.company_name} />
                            <InputField label="VAT Number" value={application.vat_number} />
                            <InputField label="Owner Name" value={application.owner_name} />
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Contact Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Email Address" value={application.email} icon={<div className="p-2 bg-slate-100 rounded text-slate-500">@</div>} />
                            <InputField label="Phone Number" value={application.phone} />
                            <InputField label="Address" value={application.address} multiline />
                        </div>
                    </section>
                </div>
            );
        }

        if (activeStage === 'vehicle') {
            return (
                <div className="space-y-8 p-6">
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Vehicle Specifications</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Make" value={application.tow_truck_make} />
                            <InputField label="Model" value={application.tow_truck_model} />
                            <InputField label="Year" value={application.tow_truck_year} />
                            <InputField label="Color" value={application.tow_truck_color} />
                        </div>
                    </section>
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Registration & Capabilities</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Registration Plate" value={application.tow_truck_registration_plate} icon={<div className="px-2 py-1 bg-yellow-400 text-black font-bold rounded text-xs border border-black/10">EU</div>} />
                            {application.tow_truck_types && <InputField label="Truck Type" value={application.tow_truck_types.join(', ')} />}
                        </div>
                    </section>
                </div>
            );
        }

        if (activeStage === 'documents') {
            const docs = [
                { id: 'driving_license_front', label: 'Driving License (Front)', path: application.driving_license_front_path, expiry: application.driving_license_front_expiry },
                { id: 'driving_license_back', label: 'Driving License (Back)', path: application.driving_license_back_path, expiry: application.driving_license_back_expiry },
                { id: 'id_card_front', label: 'ID Card (Front)', path: application.id_card_front_path, expiry: application.id_card_front_expiry },
                { id: 'id_card_back', label: 'ID Card (Back)', path: application.id_card_back_path, expiry: application.id_card_back_expiry },
                { id: 'insurance_policy', label: 'Insurance Policy', path: application.insurance_policy_path, expiry: application.insurance_policy_expiry },
            ];

            return (
                <div className="space-y-6 p-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Required Documentation</h4>
                    <div className="space-y-2">
                        {docs.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => doc.path && setSelectedDoc(doc.path)}
                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${selectedDoc === doc.path
                                    ? 'bg-[#F9A825]/10 border-[#F9A825] ring-1 ring-[#F9A825]/20'
                                    : 'bg-white border-slate-200 hover:border-[#F9A825]/50'
                                    }`}
                            >
                                <div>
                                    <p className={`text-xs font-bold uppercase ${selectedDoc === doc.path ? 'text-[#F9A825]' : 'text-slate-600'}`}>
                                        {doc.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                        EXP: {doc.expiry ? (
                                            <span className={new Date(doc.expiry) < new Date() ? 'text-red-500 font-bold' : ''}>
                                                {formatEuropeanDate(doc.expiry)}
                                                {new Date(doc.expiry) < new Date() && ' (EXPIRED)'}
                                            </span>
                                        ) : 'N/A'}
                                    </p>
                                </div>
                                {doc.path ? (
                                    <Eye size={16} className={selectedDoc === doc.path ? 'text-[#F9A825]' : 'text-slate-300 group-hover:text-[#F9A825]'} />
                                ) : (
                                    <span className="text-[10px] text-red-400 font-bold uppercase">Missing</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeStage === 'financials') {
            return (
                <div className="space-y-8 p-6">
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Banking Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Bank Name" value={application.bank_name || 'Not Provided'} icon={<CreditCard size={16} className="text-slate-400" />} />
                            <InputField label="IBAN" value={application.iban || 'Not Provided'} />
                        </div>
                    </section>
                    <section>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Payout Configuration</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Payout Type" value={application.payout_type || 'Standard'} />
                            <InputField label="Commission Rate" value={application.payout_rate ? `${application.payout_rate}%` : 'Standard'} />
                        </div>
                    </section>
                </div>
            );
        }

        return <div className="p-8 text-slate-400 italic">Stage content loading...</div>;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#F9A825] flex items-center justify-center text-white font-bold">
                        {application.owner_name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-none">{application.owner_name}</h2>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{application.id}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded ml-2">
                        {application.status}
                    </span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                    <X size={24} />
                </button>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {renderSidebar()}

                {/* Main Split View */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Data & Audit Controls */}
                    <div className="w-1/2 overflow-y-auto border-r border-slate-200 bg-slate-50/30">
                        {renderContent()}
                    </div>

                    {/* Right Panel: Visual Verification (Document Preview) */}
                    <div className="w-1/2 bg-slate-900 flex items-center justify-center relative overflow-hidden">
                        {/* Dot Pattern Background */}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        {selectedDoc ? (
                            <img src={selectedDoc} alt="Document Preview" className="max-w-full max-h-full object-contain shadow-2xl" />
                        ) : (
                            <div className="text-slate-600 text-sm font-mono flex flex-col items-center gap-2">
                                <ZoomIn size={32} />
                                <span>NO DOCUMENT SELECTED</span>
                            </div>
                        )}

                        {/* Floating Controls for Image */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full flex gap-4 text-xs font-mono">
                            <button className="hover:text-[#F9A825]">ZOOM IN</button>
                            <span>•</span>
                            <button className="hover:text-[#F9A825]">RESET</button>
                            <span>•</span>
                            <button className="hover:text-[#F9A825]">OPEN ORIG</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon, label, isActive, onClick, status }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all group ${isActive ? 'bg-[#F9A825]/10 text-[#F9A825] ring-1 ring-[#F9A825]/30' : 'text-slate-500 hover:bg-white hover:shadow-sm'
            }`}
    >
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </div>
        {status === 'valid' && <Check size={14} className="text-green-500" />}
        {status === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
    </button>
);
