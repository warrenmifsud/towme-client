import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { DriverApplication } from '../hooks/useIncomingRequests';

type DocumentReviewPanelProps = {
    application: DriverApplication;
    onClose: () => void;
    onStatusChange: () => void; // Reload list
};

export const DocumentReviewPanel = ({ application, onClose, onStatusChange }: DocumentReviewPanelProps) => {
    const [submitting, setSubmitting] = useState(false);
    const [rejectReason, setRejectReason] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Mock documents for now - in real app, fetch from buckets based on application.id
    // expecting application_data to have document paths
    const documents = [
        { title: 'Driver License', url: application.avatar_url || 'https://via.placeholder.com/600x400?text=License+Front' }, // Fallback
        { title: 'Logbook', url: 'https://via.placeholder.com/600x400?text=Logbook' },
    ];
    const [activeDocIndex, setActiveDocIndex] = useState(0);

    const handleApprove = async () => {
        if (!confirm("Confirm approval? This will send the Welcome Email.")) return;
        setSubmitting(true);
        try {
            // 1. Update DB Status
            const { error } = await supabase
                .from('driver_applications') // or relevant table
                .update({ status: 'approved' })
                .eq('id', application.id);

            if (error) throw error;

            // 2. Trigger Welcome Email (via Edge Function)
            await supabase.functions.invoke('send-email', {
                body: {
                    type: 'WELCOME_DRIVER',
                    email: application.email,
                    name: application.full_name
                }
            });

            onStatusChange();
            onClose();
        } catch (err: any) {
            alert("Error approving: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason) return;
        setSubmitting(true);
        try {
            // 1. Update DB Status
            const { error } = await supabase
                .from('driver_applications')
                .update({ status: 'rejected' })
                .eq('id', application.id);

            if (error) throw error;

            // 2. Trigger Rejection Email
            await supabase.functions.invoke('send-email', {
                body: {
                    type: 'REJECTION',
                    email: application.email,
                    name: application.full_name,
                    rejection_reason: rejectReason
                }
            });

            onStatusChange();
            onClose();
        } catch (err: any) {
            alert("Error rejecting: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#1A1C2E]/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden">

                {/* LEFT: Document Viewer */}
                <div className="w-2/3 bg-slate-100 p-8 flex flex-col relative">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 text-lg">Document Viewer</h3>
                        <div className="flex gap-2">
                            {documents.map((doc, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveDocIndex(idx)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${activeDocIndex === idx
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : 'bg-white text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {doc.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-200 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group">
                        <img
                            src={documents[activeDocIndex].url}
                            alt="Document"
                            className="max-w-full max-h-full object-contain shadow-lg transition-transform group-hover:scale-105"
                        />
                    </div>
                </div>

                {/* RIGHT: Verification Panel */}
                <div className="w-1/3 bg-white flex flex-col border-l border-slate-100">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-xl text-slate-900">Verification</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        {/* Applicant & Business Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</label>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                        <img src={application.avatar_url || ''} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{application.full_name || application.owner_name}</p>
                                        <p className="text-xs text-slate-500">{application.email}</p>
                                        <p className="text-xs text-slate-500">{application.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Business Entity</label>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Company</span>
                                    <span className="font-bold text-slate-900">{application.company_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">VAT No.</span>
                                    <span className="font-mono text-slate-700">{application.vat_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Address</span>
                                    <span className="font-medium text-slate-900 text-right max-w-[150px] truncate">{application.address || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Details</label>
                            <div className="mt-2 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Make/Model</span>
                                    <span className="font-medium">{application.vehicle_make} {application.vehicle_model}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Plate</span>
                                    <span className="font-bold font-mono text-slate-900">{application.vehicle_plate}</span>
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {application.tow_truck_types?.map((type, i) => (
                                    <span key={i} className="text-[10px] bg-[#F9A825]/10 text-[#bf801d] px-2 py-1 rounded font-bold border border-[#F9A825]/20">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Validation Checklist</label>
                            <div className="mt-2 space-y-2">
                                {['Photo Match', 'License Valid', 'Logbook Current'].map(item => (
                                    <label key={item} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                        <input type="checkbox" className="rounded border-slate-300 text-[#F9A825] focus:ring-[#F9A825]" />
                                        <span className="text-sm font-medium text-slate-700">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        {!showRejectModal ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    className="px-4 py-3 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={submitting}
                                    className="px-4 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 shadow-md transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Processing...' : 'Approve Application'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in slide-in-from-bottom-2">
                                <h4 className="font-bold text-red-800 text-sm">Select Rejection Reason</h4>
                                <select
                                    className="w-full p-2 rounded border border-red-200 text-sm"
                                    onChange={(e) => setRejectReason(e.target.value)}
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="ID Unreadable">ID Unreadable / Blurry</option>
                                    <option value="License Expired">License Expired</option>
                                    <option value="Vehicle Ineligible">Vehicle Ineligible (Check Year/Make)</option>
                                    <option value="Missing Logbook">Missing Logbook Pages</option>
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        className="flex-1 py-2 text-slate-500 text-sm font-medium hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={!rejectReason || submitting}
                                        className="flex-1 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Confirm Rejection
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
