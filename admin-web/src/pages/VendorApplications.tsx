import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, MapPin, Mail, Loader2, Trash } from 'lucide-react';

interface Application {
    id: string;
    business_legal_name: string;
    representative_name: string;
    email: string;
    shop_name: string;
    shop_address: string;
    shop_lat?: number;
    shop_long?: number;
    business_summary: string;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    is_read: boolean;
    rejection_reason?: string;
    created_at: string;
}

export default function VendorApplications() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // AI Agent State
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Filter State
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'changes_requested'>('pending');

    useEffect(() => {
        fetchApplications();
    }, []);

    // Filter Logic
    const filteredApplications = applications.filter(app => app.status === filter);

    async function fetchApplications() {
        const { data, error } = await supabase
            .from('vendor_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching applications:', error);
        } else if (data) {
            setApplications(data);
        }
        setLoading(false);
    }

    async function analyzeApplication(app: Application) {
        setAnalyzing(true);
        setSelectedApp(app);
        setAnalysisModalOpen(true);
        setAnalysisReport(null);

        // Call AI Agent
        const { data, error } = await supabase.functions.invoke('analyze-application', {
            body: {
                application: app,
                apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            }
        });

        if (error) {
            console.error('Analysis failed:', error);
            setAnalysisReport({ error: 'Agent could not complete analysis.' });
        } else {
            setAnalysisReport(data);
        }
        setAnalyzing(false);
    }

    function openRejectionModal(app: Application) {
        setSelectedApp(app);
        setRejectionReason(app.rejection_reason || '');
        setRejectionModalOpen(true);
    }

    async function confirmRejection() {
        if (!selectedApp) return;
        await updateStatus(selectedApp, 'rejected', rejectionReason);
        setRejectionModalOpen(false);
        setSelectedApp(null);
    }

    async function updateStatus(app: Application, newStatus: 'approved' | 'rejected' | 'changes_requested', reason?: string) {
        const updateData: any = { status: newStatus };
        if (reason) updateData.rejection_reason = reason;

        const { error } = await supabase
            .from('vendor_applications')
            .update(updateData)
            .eq('id', app.id);

        if (error) {
            alert('Error updating status');
            return;
        }

        // Trigger Email Notification
        const emailType = newStatus === 'approved' ? 'application_approved'
            : newStatus === 'changes_requested' ? 'application_needs_revision'
                : 'application_rejected';

        supabase.functions.invoke('send-email', {
            body: {
                type: emailType,
                email: app.email,
                data: {
                    shop_name: app.shop_name,
                    rejection_reason: reason,
                    application_id: app.id // Pass ID for edit link
                }
            }
        });

        // Optimistic update
        setApplications(apps => apps.map(a =>
            a.id === app.id ? { ...a, status: newStatus } : a
        ));
    }

    async function toggleReadStatus(app: Application, read: boolean) {
        // Optimistic
        setApplications(apps => apps.map(a =>
            a.id === app.id ? { ...a, is_read: read } : a
        ));

        await supabase
            .from('vendor_applications')
            .update({ is_read: read })
            .eq('id', app.id);
    }

    async function deleteApplication(app: Application) {
        if (!confirm('Are you sure you want to permanently delete this application? This action cannot be undone.')) {
            return;
        }

        // Optimistic update
        setApplications(apps => apps.filter(a => a.id !== app.id));

        const { error } = await supabase
            .from('vendor_applications')
            .delete()
            .eq('id', app.id);

        if (error) {
            console.error('Error deleting application:', error);
            fetchApplications(); // Revert on error
            alert('Failed to delete application');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-theme-secondary">
                <Loader2 className="animate-spin mr-2" /> Loading applications...
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-theme-primary">Vendor Applications</h2>
                    <p className="text-theme-secondary mt-1">Review incoming partnership requests</p>
                </div>

                {/* Filter Tabs */}
                <div className="glass-panel p-1 flex items-center gap-1 self-start overflow-x-auto">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'pending'
                            ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'
                            }`}
                    >
                        New Requests
                    </button>
                    <button
                        onClick={() => setFilter('changes_requested')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'changes_requested'
                            ? 'bg-orange-500 text-slate-900 shadow-lg shadow-orange-500/20'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'
                            }`}
                    >
                        Revisions
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'approved'
                            ? 'bg-green-500 text-slate-900 shadow-lg shadow-green-500/20'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'
                            }`}
                    >
                        Accepted
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === 'rejected'
                            ? 'bg-red-500 text-slate-900 shadow-lg shadow-red-500/20'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-white/5'
                            }`}
                    >
                        Rejected
                    </button>
                </div>
            </header>

            <div className="grid gap-6">
                {filteredApplications.length === 0 ? (
                    <div className="glass-panel p-16 flex flex-col items-center justify-center text-center space-y-4 text-slate-500">
                        <div className="w-16 h-16 rounded-full surface-icon-container">
                            {filter === 'pending' ? <Mail size={32} /> : filter === 'approved' ? <Check size={32} /> : <X size={32} />}
                        </div>
                        <p>No {filter} applications found.</p>
                    </div>
                ) : (
                    filteredApplications.map(app => (
                        <div
                            key={app.id}
                            className={`glass-panel p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all duration-300 ${!app.is_read ? 'border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'border-white/5'}`}
                        >
                            {/* Unread Indicator */}
                            {!app.is_read && (
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse"></div>
                            )}
                            {/* Status Indicator */}
                            <div className={`absolute top-0 right-0 px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-bl-xl border-l border-b border-white/10
                                ${app.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                    app.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                        'bg-red-500/20 text-red-500'}`}>
                                {app.status === 'approved' ? 'Active Partner' : app.status}
                            </div>

                            {/* Main Content Area - Click to Read */}
                            <div
                                onClick={() => !app.is_read && toggleReadStatus(app, true)}
                                className={`flex-1 space-y-4 ${!app.is_read ? 'cursor-pointer' : ''}`}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Shop Details */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Shop Name</p>
                                        <h3 className="text-theme-primary font-bold text-lg">{app.shop_name}</h3>
                                        <p className="text-theme-secondary text-sm">{app.shop_address}</p>
                                    </div>

                                    {/* Legal Details */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Business Identity</p>
                                        <div className="text-sm font-medium text-theme-secondary">{app.business_legal_name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-5 h-5 rounded-full surface-inner flex items-center justify-center text-[10px] font-bold text-theme-primary">
                                                {app.representative_name.charAt(0)}
                                            </div>
                                            <span className="text-theme-secondary text-sm">{app.representative_name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Contact Info */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Email</p>
                                        <div className="flex items-center gap-2 text-theme-secondary text-sm">
                                            <Mail size={14} className="text-amber-500" />
                                            {app.email}
                                        </div>
                                    </div>

                                    {/* Location Status */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Location</p>
                                        <div className="flex items-center gap-2 text-theme-secondary text-sm">
                                            <MapPin size={14} className="text-amber-500" />
                                            {app.shop_address}
                                        </div>
                                    </div>
                                </div>

                                {/* Rejection Reason - ONLY show for rejected apps */}
                                {app.status === 'rejected' && app.rejection_reason && (
                                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mt-2">
                                        <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <X size={12} /> Reason for Rejection
                                        </h4>
                                        <p className="text-red-200 text-sm leading-relaxed">{app.rejection_reason}</p>
                                    </div>
                                )}

                                {/* Business Summary */}
                                <div className="surface-inner p-4 mt-2">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Business Summary</h4>
                                    <p className="text-theme-secondary text-sm leading-relaxed">{app.business_summary}</p>
                                </div>
                            </div>

                            {/* Rejected Actions */}
                            {app.status === 'rejected' && (
                                <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px] z-10 relative">
                                    <button
                                        onClick={() => openRejectionModal(app)}
                                        className="glass-button bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Mail size={18} /> Revision
                                    </button>
                                    <button
                                        onClick={() => deleteApplication(app)}
                                        className="glass-button bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Trash size={18} /> Delete
                                    </button>
                                </div>
                            )}

                            {/* Approved Actions (Testing/Management) */}
                            {app.status === 'approved' && (
                                <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px] z-10 relative">
                                    <button
                                        onClick={() => updateStatus(app, 'approved')}
                                        className="glass-button bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 flex items-center justify-center gap-2"
                                        title="Send Approval Email Again"
                                    >
                                        <Check size={18} /> Re-Approve
                                    </button>
                                    <button
                                        onClick={() => openRejectionModal(app)}
                                        className="px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> Revoke
                                    </button>
                                </div>
                            )}

                            {/* Revision Actions */}
                            {app.status === 'changes_requested' && (
                                <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px] z-10 relative">
                                    <button
                                        onClick={() => updateStatus(app, 'approved')}
                                        className="glass-button bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => openRejectionModal(app)}
                                        className="px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                </div>
                            )}

                            {/* Pending Actions */}
                            {app.status === 'pending' && (
                                <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 min-w-[140px] z-10 relative">
                                    <button
                                        onClick={() => updateStatus(app, 'approved')}
                                        className="glass-button bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> Approve
                                    </button>
                                    <button
                                        onClick={() => analyzeApplication(app)}
                                        className="glass-button bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center justify-center gap-2"
                                    >
                                        <Loader2 size={18} className={analyzing ? "animate-spin" : ""} /> Verify
                                    </button>
                                    <button
                                        onClick={() => openRejectionModal(app)}
                                        className="px-4 py-2 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> Reject
                                    </button>

                                    {/* Mark as Unread Utility */}
                                    {app.is_read && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleReadStatus(app, false);
                                            }}
                                            className="w-full py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer relative z-[100] mt-4"
                                        >
                                            Mark Unread
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* AI Analysis Modal */}
            {
                analysisModalOpen && selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 backdrop-blur-md p-4 animate-fade-in">
                        <div className="glass-panel p-0 max-w-2xl w-full overflow-hidden border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-amber-900/40 to-slate-900/50 p-6 border-b border-white/10 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 animate-pulse">
                                        <Loader2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-theme-primary tracking-wide">AI VERIFICATION AGENT</h3>
                                        <p className="text-xs text-amber-400 font-mono">DETECTING PATTERNS • VERIFYING DATA</p>
                                    </div>
                                </div>
                                <button onClick={() => setAnalysisModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 min-h-[400px]">
                                {analyzing ? (
                                    <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                                        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                                        <p className="text-amber-400 font-mono animate-pulse">Establishing Logic uplinks...</p>
                                    </div>
                                ) : analysisReport?.error ? (
                                    <div className="flex flex-col items-center justify-center h-full text-red-400 py-10 space-y-4">
                                        <div className="p-3 bg-red-500/10 rounded-full">
                                            <X size={32} />
                                        </div>
                                        <p className="font-bold">Analysis Failed</p>
                                        <p className="text-sm opacity-70">{analysisReport.error}</p>
                                    </div>
                                ) : analysisReport ? (
                                    <div className="space-y-8 animate-slide-up">
                                        {/* Score Card */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <div className={`text-5xl font-black ${analysisReport.score > 80 ? 'text-green-400' : analysisReport.score > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {analysisReport.score}%
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-widest">Confidence Score</p>
                                                    <p className="text-theme-primary font-bold">{analysisReport.risk_level} RISK DETECTED</p>
                                                </div>
                                            </div>
                                            {analysisReport.location_data && (
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 uppercase tracking-widest">Location Match</p>
                                                    <div className="flex items-center justify-end gap-2 text-green-400 font-bold">
                                                        <MapPin size={16} /> Verified
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Findings Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Analysis Findings</h4>
                                                {analysisReport.findings.map((finding: string, i: number) => (
                                                    <div key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                        <span className="opacity-70 mt-1">
                                                            {finding.includes('✅') ? '✅' : finding.includes('⚠️') ? '⚠️' : '•'}
                                                        </span>
                                                        <span className="flex-1">{finding.replace(/^[✅⚠️❌ℹ️]\s*/, '')}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Location Intelligence</h4>
                                                {analysisReport.location_data ? (
                                                    <div className="surface-inner p-4 space-y-2">
                                                        <p className="text-xs text-slate-500">FORMATTED ADDRESS</p>
                                                        <p className="text-sm font-mono text-amber-200">{analysisReport.location_data.formatted_address}</p>

                                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                                            <div>
                                                                <p className="text-xs text-slate-500">LATITUDE</p>
                                                                <p className="text-sm text-white">{analysisReport.location_data.lat}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500">LONGITUDE</p>
                                                                <p className="text-sm text-white">{analysisReport.location_data.lng}</p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(analysisReport.location_data.formatted_address)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block mt-4 text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                                                        >
                                                            OPEN SATELLITE VIEW
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                                                        Unable to verify location. Address may be invalid or map service unavailable.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-400 text-center">System Error. Check console logs.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Rejection Modal */}
            {
                rejectionModalOpen && selectedApp && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/5 backdrop-blur-sm p-4">
                        <div className="glass-panel p-6 max-w-md w-full animate-enter">
                            <h3 className="text-xl font-bold text-theme-primary mb-2">Reject Application</h3>
                            <p className="text-theme-secondary text-sm mb-4">
                                Please provide a reason for rejecting <strong>{selectedApp.shop_name}</strong>. This will be sent to the applicant.
                            </p>

                            <textarea
                                className="glass-input h-32 mb-4 resize-none"
                                placeholder="Reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                autoFocus
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setRejectionModalOpen(false)}
                                    className="px-4 py-2 text-theme-secondary hover:text-theme-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRejection}
                                    disabled={!rejectionReason.trim()}
                                    className="glass-button bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30"
                                >
                                    Confirm Rejection
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
                                <button
                                    onClick={async () => {
                                        if (!selectedApp || !rejectionReason.trim()) return;
                                        await updateStatus(selectedApp, 'changes_requested', rejectionReason);
                                        setRejectionModalOpen(false);
                                        setSelectedApp(null);
                                    }}
                                    disabled={!rejectionReason.trim()}
                                    className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Mail size={12} /> Request Update Instead
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

