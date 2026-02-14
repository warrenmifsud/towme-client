import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, X, RefreshCw, Loader2, AlertTriangle, ShieldAlert, Power } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VisualAlert } from '../components/VisualAlert';
import { BrandCard } from '../components/BrandCard';

// --- SOVEREIGN BRAND LAW ---
const BRAND = {
    primary: '#F9A825',    // Solid Neutral Light Orange
    secondary: '#1F2937',  // Slate-800 (Neutral Dark)
    white: '#FFFFFF',
    textMain: '#111827',
    danger: '#DC2626',     // Red-600 (Standard UI Error) - Trademark Red #EF4444 BANNED
    success: '#10B981',
    locked: '#DC2626'      // Red-600 for Locked/Suspended
};

// ... (Interface unchanged)

interface DriverRequest {
    id: string;
    status: string;
    name: string;
    location: string;
    email: string;
    phone: string;
    vat: string;
    submittedAt: string;
    // Roster Fields
    balance?: number;
    plate?: string;
    // Documents
    id_card_front_path?: string;
    id_card_back_path?: string;
    driving_license_front_path?: string;
    driving_license_back_path?: string;
}

export default function SovereignCommand() {
    const [mode, setMode] = useState<'INBOX' | 'ROSTER'>('INBOX');
    const [requests, setRequests] = useState<DriverRequest[]>([]);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    // VISUAL LAW: Custom Alert State
    const [visualAlert, setVisualAlert] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    // REJECTION MODAL STATE
    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    // LOGIC RESURRECTION: The "fetchLiveDrivers" Function
    const fetchLiveDrivers = async () => {
        setLoading(true);
        try {
            console.log("RMC Protocol: Initiating Live Driver Pulse...");

            // Core Query - Fetching from Source of Truth
            let query = supabase
                .from('driver_applications')
                .select(`
                    id, status, owner_name, address, email, phone, vat_number, created_at, wallet_balance, tow_truck_registration_plate,
                    id_card_front_path, id_card_back_path, driving_license_front_path, driving_license_back_path
                `)
                .order('created_at', { ascending: false });

            // DUAL-MODE TOGGLE LOGIC
            if (mode === 'INBOX') {
                // Pending applications only (Case Insensitive Safety)
                query = query.in('status', ['PENDING', 'pending', 'CONTACTED', 'contacted']);
            } else {
                // Active Roster: Approved, Suspended, and Terminated (for hard delete)
                query = query.in('status', ['APPROVED', 'approved', 'SUSPENDED', 'suspended', 'TERMINATED', 'terminated']);
            }

            const { data, error } = await query;

            if (error) {
                console.error("RMC Alert: Database Signal Lost", error);
                throw error;
            }

            // Data Transformation Matrix
            setRequests((data || []).map((app: any) => ({
                id: app.id,
                status: app.status, // Database Truth
                name: app.owner_name,
                location: app.address,
                email: app.email,
                phone: app.phone,
                vat: app.vat_number || 'N/A',
                // European Chronos Format
                submittedAt: new Date(app.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }),
                balance: app.wallet_balance || 0,
                plate: app.tow_truck_registration_plate || 'N/A',
                // Document Paths
                id_card_front_path: app.id_card_front_path,
                id_card_back_path: app.id_card_back_path,
                driving_license_front_path: app.driving_license_front_path,
                driving_license_back_path: app.driving_license_back_path
            })));

            console.log("RMC Protocol: Driver Pulse Acquired.");

        } catch (err) {
            console.error("RMC Alert: Critical Fetch Failure", err);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when mode toggles
    useEffect(() => {
        fetchLiveDrivers();
    }, [mode]);

    // Initial load
    useEffect(() => {
        fetchLiveDrivers();
    }, []);

    // --- SECURITY NEXUS: AUDIT LOGGING HELPER ---
    const logAdminAction = async (action: string, targetId: string, metadata: any = {}) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const driver = requests.find(r => r.id === targetId);

            await supabase.from('admin_audit_logs').insert({
                admin_email: user?.email || 'warrenmifsud@gmail.com', // Fallback as per Directive
                action: action,
                target: `Driver: ${driver?.name || 'Unknown'} (ID: ${targetId})`,
                metadata: {
                    timestamp: new Date(),
                    ip: 'client_side_v2',
                    ...metadata
                }
            });
            console.log(`Security Nexus: Action ${action} Logged.`);
        } catch (e) {
            console.error("Security Nexus Failure:", e);
            // Non-blocking error, but noted.
        }
    };

    // --- VISUAL LAW: Specific Loading State ---
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const handleApprove = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const driver = requests.find(r => r.id === id);
        if (!driver) return;

        const confirm = window.confirm(`Authorize ${driver.name} for TowMe Dispatch? This will trigger an Invite Email.`);
        if (!confirm) return;

        setApprovingId(id); // Engage Visual Law Loading State

        try {
            console.log(`Soul Injection: Invoking 'approve-driver' for ${id}...`);

            // FORENSIC SESSION REFRESH: Force a fresh token before every edge function call.
            // Admin sessions expire after ~1 hour. Without refresh, long sessions get 401.
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshData.session) {
                const failMsg = `Session Refresh Failed: ${refreshError?.message || 'No session returned'}. You may need to log in again.`;
                console.error('[FORENSIC]', failMsg);
                throw new Error(failMsg);
            }
            const session = refreshData.session;

            console.log('[DIAG] Refreshed Session User:', session.user?.email, 'Role:', session.user?.app_metadata?.role,
                'Token Expires:', new Date((session.expires_at || 0) * 1000).toISOString());

            // SET SESSION: Ensure the Supabase client uses the refreshed token for the invoke call.
            // DO NOT manually set Authorization/apikey headers — this causes "missing sub claim" errors
            // because the gateway receives conflicting auth info.
            await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token
            });

            const { data, error } = await supabase.functions.invoke('approve-driver', {
                body: {
                    driverId: id,
                    driverEmail: driver.email
                }
                // NO custom headers — let supabase.functions.invoke handle auth automatically
            });

            console.log('[DIAG] Response:', { data, error });

            if (error) {
                // FORENSIC ERROR EXTRACTION: Get the EXACT failing values, not generic wrappers.
                const ctx = (error as any).context;
                let backendMsg = 'Unknown Edge Function Error';
                let httpStatus = 'N/A';
                let rawBody = '';

                if (ctx && typeof ctx === 'object') {
                    // ctx is a Response object — extract status and body
                    httpStatus = ctx.status || 'N/A';
                    try {
                        if (typeof ctx.json === 'function') {
                            const j = await ctx.json();
                            rawBody = JSON.stringify(j);
                            backendMsg = j.error || j.message || j.msg || rawBody;
                        } else if (typeof ctx.text === 'function') {
                            rawBody = await ctx.text();
                            backendMsg = rawBody;
                        }
                    } catch {
                        backendMsg = `HTTP ${httpStatus} — Could not parse response body`;
                    }
                } else if (data && typeof data === 'object' && data.error) {
                    backendMsg = data.error;
                } else if (error.message) {
                    backendMsg = error.message;
                }

                // FORENSIC TRANSPARENCY: Include exact failing values
                const forensicDetail = [
                    `HTTP Status: ${httpStatus}`,
                    `Error: ${backendMsg}`,
                    `Admin: ${session.user?.email || 'unknown'}`,
                    `Role: ${session.user?.app_metadata?.role || 'undefined'}`,
                    `Token Exp: ${new Date((session.expires_at || 0) * 1000).toLocaleString()}`,
                    rawBody ? `Raw: ${rawBody.substring(0, 200)}` : ''
                ].filter(Boolean).join(' | ');

                console.error('[FORENSIC] Approve-Driver Failure:', forensicDetail);
                throw new Error(forensicDetail);
            }
            if (!data?.success) throw new Error(data?.message || data?.error || 'Approval Failed');

            console.log("Soul Injection Success:", data);
            await logAdminAction('APPROVE_DRIVER', id, { method: 'EDGE_FUNCTION', meta: data });

            setVisualAlert({
                title: 'ACCESS GRANTED',
                message: `Driver Approved & Invite Sent to ${driver.email}`,
                type: 'success'
            });
            fetchLiveDrivers(); // Force Refresh

        } catch (err: any) {
            console.error("RMC Alert: Approval Failed", err);
            // Extract the most specific error message available
            const errorMessage = err?.message || err?.error || (typeof err === 'string' ? err : JSON.stringify(err));
            console.error('[DIAG] Final Error Message:', errorMessage);
            setVisualAlert({
                title: 'ACCESS DENIED — FORENSIC DETAIL',
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setApprovingId(null); // Disengage Visual Law Loading State
        }
    };

    const openRejectionModal = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRejectionTargetId(id);
        setRejectionReason('');
        setRejectionModalOpen(true);
    };

    const confirmRejection = async () => {
        if (!rejectionTargetId || !rejectionReason) return;
        setRejecting(true);
        const driver = requests.find(r => r.id === rejectionTargetId);

        try {
            const { error } = await supabase
                .from('driver_applications')
                .update({ status: 'rejected', rejection_reason: rejectionReason })
                .eq('id', rejectionTargetId);

            if (error) throw error;

            await logAdminAction('REJECT_DRIVER', rejectionTargetId, { reason: rejectionReason });

            // DISPATCH REJECTION EMAIL WITH RE-APPLY LINK
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'application_rejected',
                        email: driver?.email,
                        data: {
                            name: driver?.name,
                            rejection_reason: rejectionReason,
                            resubmission_link: 'https://localhost:5176'
                        }
                    }
                });
                console.log('Rejection email dispatched to:', driver?.email);
            } catch (emailErr) {
                console.warn('Rejection email dispatch failed (non-blocking):', emailErr);
            }

            setRejectionModalOpen(false);
            setVisualAlert({
                title: 'APPLICATION REJECTED',
                message: `Driver ${driver?.name || 'Unknown'} has been rejected. Reason: ${rejectionReason}`,
                type: 'error'
            });
            fetchLiveDrivers();
        } catch (err) {
            console.error("RMC Alert: Rejection Failed", err);
            setVisualAlert({
                title: 'REJECTION FAILED',
                message: (err as any)?.message || 'Unknown error during rejection',
                type: 'error'
            });
        } finally {
            setRejecting(false);
        }
    };

    // --- PHASE 60-C: LIFECYCLE MANAGEMENT ---

    const handleSuspend = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("WARNING: Designate this driver as SUSPENDED? They will lose access immediately.")) return;

        try {
            const { error } = await supabase
                .from('driver_applications')
                .update({ status: 'SUSPENDED' })
                .eq('id', id);

            if (error) throw error;

            await logAdminAction('SUSPEND_DRIVER', id);
            fetchLiveDrivers();
        } catch (err: any) {
            console.error("RMC Alert: Suspension Failed", err);
            setVisualAlert({ title: 'SUSPENSION FAILED', message: err.message, type: 'error' });
        }
    };

    const handleReactivate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Reactivate this driver to the Active Roster?")) return;

        try {
            const { error } = await supabase
                .from('driver_applications')
                .update({ status: 'APPROVED' })
                .eq('id', id);

            if (error) throw error;

            await logAdminAction('REACTIVATE_DRIVER', id);
            fetchLiveDrivers();
        } catch (err: any) {
            console.error("RMC Alert: Reactivation Failed", err);
            setVisualAlert({ title: 'REACTIVATION FAILED', message: err.message, type: 'error' });
        }
    };

    const handleTerminate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const reason = window.prompt("REQUIRED: Enter reason for TERMINATION (Logged in Security Nexus):");
        if (!reason) return; // Cancel if no reason

        if (!window.confirm("CRITICAL WARNING: This will PERMANENTLY DELETE the driver's account and data. They will need to sign up again. Proceed?")) return;

        try {
            console.log(`[TERMINATE] Invoking Edge Function for ${id}...`);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Authentication Ghost: No Active Session Token');

            const { data, error } = await supabase.functions.invoke('terminate-driver', {
                body: { driverId: id, reason },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;
            if (data.error) {
                // FORENSIC RED CARD: Extract full diagnostic data
                const forensic = data.forensic;
                const forensicMsg = forensic
                    ? `[${forensic.stage}] Code: ${forensic.code} | SQLState: ${forensic.sqlState || 'N/A'} | driver_id: ${id} | Fix: ${forensic.recommendation}`
                    : data.error;
                throw new Error(forensicMsg);
            }

            console.log("[TERMINATE] Success:", data);

            // Log locally just in case, though function logs too
            await logAdminAction('TERMINATE_DRIVER', id, { reason, method: 'EDGE_FUNCTION' });

            setVisualAlert({ title: 'TERMINATION EXECUTED', message: 'Driver Terminated & Account Deleted Successfully.', type: 'warning' });
            fetchLiveDrivers();
        } catch (err: any) {
            console.error("RMC Alert: Termination Failed", err);
            setVisualAlert({
                title: 'TERMINATION FAILED — FORENSIC RED CARD',
                message: `driver_id: ${id} | ${err.message || 'Unknown Error'}`,
                type: 'error'
            });
        }
    };



    return (
        <div className="w-full min-h-screen p-6" style={{ backgroundColor: '#F3F4F6' }}>
            {/* VISUAL LAW: SYSTEM ALERT OVERLAY */}
            {visualAlert && (
                <VisualAlert
                    title={visualAlert.title}
                    message={visualAlert.message}
                    type={visualAlert.type}
                    onClose={() => setVisualAlert(null)}
                />
            )}

            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight leading-none" style={{ color: BRAND.textMain }}>
                        Partner Command <span style={{ color: BRAND.primary }}>Center</span>
                    </h1>

                    {/* DUAL-MODE HIGH DENSITY TOGGLE */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => setMode('INBOX')}
                            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${mode === 'INBOX'
                                ? 'bg-white text-slate-900 shadow-sm border-b-2 border-[#F9A825]'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span>📥 Inbox (Pending)</span>
                        </button>
                        <button
                            onClick={() => setMode('ROSTER')}
                            className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${mode === 'ROSTER'
                                ? 'bg-white text-slate-900 shadow-sm border-b-2 border-[#10B981]'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span>🟢 Active Roster</span>
                        </button>
                    </div>
                </div>
                <button onClick={fetchLiveDrivers} className="px-3 py-2 bg-white border rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> SCAN NETWORK
                </button>
            </div>

            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-5">{mode === 'INBOX' ? 'Driver Identity' : 'Unit Details'}</div>
                    <div className="col-span-3">{mode === 'INBOX' ? 'Submitted' : 'Financial Status'}</div>
                    <div className="col-span-3 text-right">Command Matrix</div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={20} /> Accessing Production Grid...
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">
                        {mode === 'INBOX' ? 'No Pending Requests.' : 'No Active Roster Units Found.'}
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} className="border-b border-gray-100 hover:bg-[#FFFBF2] transition-colors">
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer" onClick={() => toggleRow(req.id)}>
                                <div className="col-span-1">
                                    {mode === 'INBOX' ? (
                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">{req.status}</span>
                                    ) : (
                                        // STATUS INDICATORS
                                        req.status === 'APPROVED' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                                </span>
                                                <span className="text-[10px] font-bold text-green-600">LIVE</span>
                                            </div>
                                        ) : req.status === 'SUSPENDED' ? (
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={14} className="text-red-500" />
                                                <span className="text-[10px] font-bold text-red-600">FROZEN</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-500">{req.status}</span>
                                        )
                                    )}
                                </div>
                                <div className="col-span-5">
                                    <div className="font-bold text-sm text-slate-900">{req.name}</div>
                                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                                        <span>{req.phone}</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="font-mono">{mode === 'ROSTER' ? req.plate : req.email}</span>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    {mode === 'INBOX' ? (
                                        <div className="text-xs font-mono text-slate-500 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                                            {req.submittedAt}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-700">€{req.balance?.toFixed(2)}</span>
                                            {req.balance && req.balance > 0 && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">PAYOUT READY</span>}
                                        </div>
                                    )}
                                </div>

                                {/* ACTION MATRIX IMPLEMENTATION */}
                                <div className="col-span-3 flex justify-end items-center gap-2">
                                    {mode === 'INBOX' ? (
                                        <>
                                            <button className="p-2 text-gray-400 hover:text-red-500" onClick={(e) => openRejectionModal(req.id, e)}><X size={18} /></button>
                                            <button
                                                className="px-4 py-1.5 rounded shadow-sm text-xs font-bold text-white hover:brightness-110 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ backgroundColor: BRAND.primary }}
                                                onClick={(e) => handleApprove(req.id, e)}
                                                disabled={approvingId === req.id}
                                            >
                                                {approvingId === req.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Check size={14} />
                                                )}
                                                {approvingId === req.id ? 'PROCESSING...' : 'APPROVE'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {req.status === 'SUSPENDED' ? (
                                                <button
                                                    className="px-3 py-1.5 rounded border border-green-200 bg-green-50 text-green-600 text-[10px] font-bold hover:bg-green-100 flex items-center gap-1"
                                                    onClick={(e) => handleReactivate(req.id, e)}
                                                >
                                                    <Power size={12} /> REACTIVATE
                                                </button>
                                            ) : (
                                                <button
                                                    className="px-3 py-1.5 rounded border border-slate-600 bg-slate-900 text-white text-[10px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                                                    onClick={(e) => handleSuspend(req.id, e)}
                                                >
                                                    <ShieldAlert size={12} /> SUSPEND
                                                </button>
                                            )}

                                            <button
                                                className="px-3 py-1.5 rounded border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold hover:bg-red-100"
                                                onClick={(e) => handleTerminate(req.id, e)}
                                            >
                                                TERMINATE
                                            </button>
                                        </>
                                    )}
                                    <div className="text-gray-300 ml-2">{expandedRow === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                </div>
                            </div>

                            {/* Deep Dive Vault */}
                            {expandedRow === req.id && (
                                <BrandCard driver={req} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ═══ REJECTION REASON MODAL ═══ */}
            {rejectionModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectionModalOpen(false)}></div>
                    <div className="w-full max-w-md relative z-10 bg-white rounded-2xl shadow-2xl border-2 overflow-hidden" style={{ borderColor: BRAND.danger }}>
                        <div className="p-6 border-b" style={{ borderColor: 'rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.03)' }}>
                            <div className="flex items-center gap-3">
                                <ShieldAlert size={24} style={{ color: BRAND.danger }} />
                                <h3 className="text-lg font-black" style={{ color: BRAND.danger }}>REJECT APPLICATION</h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Select or provide a reason. The driver will be notified via email with a re-apply link.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {['Incomplete Documents', 'Invalid Information', 'Failed Verification', 'Policy Violation'].map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => setRejectionReason(reason)}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${rejectionReason === reason
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-red-300'
                                            }`}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Additional details or custom reason..."
                                className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-red-400 resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setRejectionModalOpen(false)}
                                className="px-5 py-2 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={confirmRejection}
                                disabled={!rejectionReason || rejecting}
                                className="px-5 py-2 rounded-full text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                style={{ background: BRAND.danger }}
                            >
                                {rejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                {rejecting ? 'PROCESSING...' : 'CONFIRM REJECTION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
