import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShieldAlert, History, Activity } from 'lucide-react';
import { SecurityProfile } from './SecurityProfile';

// --- SOVEREIGN BRAND LAW ---
const BRAND = {
    primary: '#F9A825',    // Solid Neutral Light Orange (Action/Highlight)
    secondary: '#1A1C2E',  // Midnight Blue (Identifier)
};

interface AuditLog {
    id: string;
    admin_email: string;
    action: string;
    target: string;
    metadata: any;
    created_at: string;
}

export const Security = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // ZERO-SIMULATION: Real Data Only
            const { data, error } = await supabase
                .from('admin_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error("Security Nexus: Log Fetch Failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight" style={{ color: BRAND.secondary }}>
                        Security & Audit <span style={{ color: BRAND.primary }}>Nexus</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Platform Surveillance & Identity Management</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="px-4 py-2 bg-white border border-gray-200 rounded text-xs font-bold uppercase hover:bg-gray-50 flex items-center gap-2"
                >
                    <Activity size={14} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
                </button>
            </div>

            {/* IDENTITY MODULE (Imported for consolidation) */}
            <SecurityProfile />

            {/* THE LOG GRID */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden relative">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <History size={16} color={BRAND.primary} />
                        Live Audit Ledger
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-white border px-2 py-1 rounded">
                            {logs.length} EVENTS
                        </span>
                    </div>
                </div>

                {logs.length === 0 && !loading ? (
                    <div className="p-12 text-center text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
                        <ShieldAlert size={32} className="opacity-20" />
                        NO SECURITY EVENTS DETECTED
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-gray-100">
                                <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                    <th className="px-6 py-3">Timestamp</th>
                                    <th className="px-6 py-3">Admin Identity</th>
                                    <th className="px-6 py-3">Action</th>
                                    <th className="px-6 py-3">Target Entity</th>
                                    <th className="px-6 py-3">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-3 text-xs font-bold text-[#1A1C2E]">
                                            {log.admin_email}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-700 font-mono">
                                            {log.target}
                                        </td>
                                        <td className="px-6 py-3 text-[10px] text-slate-400 font-mono max-w-xs truncate">
                                            {JSON.stringify(log.metadata)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
