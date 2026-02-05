import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Mail, Calendar, Shield, Trash2, Ban, RefreshCw, X, AlertTriangle } from 'lucide-react';
import PageContainer from '../components/PageContainer';

interface Client {
    id: string;
    email: string;
    contact_number?: string;
    full_name: string;
    created_at: string;
    status: 'active' | 'suspended';
    suspension_reason?: string | null;
    suspended_until?: string | null;
    provider?: string; // Phase 62
}

export default function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [suspensionDate, setSuspensionDate] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching clients:', error);
        } else if (data) {
            setClients(data);
        }
        setLoading(false);
    }

    const handleDelete = async (client: Client) => {
        if (!confirm(`Are you sure you want to permanently delete ${client.full_name}? This cannot be undone.`)) return;

        setProcessing(true);
        const { error } = await supabase.from('clients').delete().eq('id', client.id);

        if (error) {
            alert('Failed to delete client: ' + error.message);
        } else {
            setClients(prev => prev.filter(c => c.id !== client.id));
        }
        setProcessing(false);
    };

    const handleSuspendClick = (client: Client) => {
        setSelectedClient(client);
        setSuspensionReason('');
        setSuspensionDate('');
        setShowSuspendModal(true);
    };

    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const confirmSuspend = async () => {
        if (!selectedClient || !suspensionReason || !suspensionDate) return;

        setProcessing(true);
        // Golden Rule Date Format for Email: DD Mon YYYY
        const formattedDate = formatDate(suspensionDate);

        // 1. Update DB
        const { error } = await supabase
            .from('clients')
            .update({
                status: 'suspended',
                suspension_reason: suspensionReason,
                suspended_until: new Date(suspensionDate).toISOString()
            })
            .eq('id', selectedClient.id);

        if (error) {
            alert('Failed to suspend client: ' + error.message);
            setProcessing(false);
            return;
        }

        // 2. Send Email
        await supabase.functions.invoke('send-email', {
            body: {
                type: 'client_suspended',
                email: selectedClient.email,
                data: {
                    full_name: selectedClient.full_name,
                    reason: suspensionReason,
                    until_date: formattedDate
                }
            }
        });

        // 3. Update UI
        setClients(prev => prev.map(c =>
            c.id === selectedClient.id
                ? { ...c, status: 'suspended', suspension_reason: suspensionReason, suspended_until: new Date(suspensionDate).toISOString() }
                : c
        ));

        setShowSuspendModal(false);
        setProcessing(false);
    };

    const handleReactivate = async (client: Client) => {
        if (!confirm(`Reactivate ${client.full_name}? They will regain access immediately.`)) return;

        setProcessing(true);

        // 1. Update DB
        const { error } = await supabase
            .from('clients')
            .update({
                status: 'active',
                suspension_reason: null,
                suspended_until: null
            })
            .eq('id', client.id);

        if (error) {
            alert('Failed to reactivate client: ' + error.message);
            setProcessing(false);
            return;
        }

        // 2. Send Email
        await supabase.functions.invoke('send-email', {
            body: {
                type: 'client_reactivated',
                email: client.email,
                data: {
                    full_name: client.full_name
                }
            }
        });

        // 3. Update UI
        setClients(prev => prev.map(c =>
            c.id === client.id
                ? { ...c, status: 'active', suspension_reason: null, suspended_until: null }
                : c
        ));

        setProcessing(false);
    };

    const filteredClients = clients.filter(client =>
        (client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
    );

    return (
        <PageContainer
            title="Clients"
            subtitle="Registered application users"
        >
            <div className="glass-panel p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="glass-input pl-10 w-full"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 text-left">
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest">User</th>
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest">Provider</th>
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest">Contact</th>
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest">Joined</th>
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest">Status</th>
                                <th className="p-4 text-xs font-bold text-theme-secondary uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading clients...</td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No clients found.</td>
                                </tr>
                            ) : (
                                filteredClients.map(client => (
                                    <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center text-theme-secondary font-bold border border-white/5">
                                                    {client.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="font-medium text-theme-primary">{client.full_name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {/* Phase 62: Provider Badge */}
                                            {client.provider === 'google' ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.347.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.2-3.293 2.253-2.253 2.947-5.467 2.947-8.133 0-.8-.067-1.453-.173-1.653H12.48z" /></svg>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Google</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10 w-fit">
                                                    <Mail size={10} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Email</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-theme-secondary text-sm">
                                                    <Mail size={14} />
                                                    {client.email}
                                                </div>
                                                {client.contact_number && (
                                                    <div className="flex items-center gap-2 text-theme-secondary text-sm">
                                                        <span className="opacity-70 text-[10px]">TEL:</span>
                                                        {client.contact_number}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-theme-secondary text-sm">
                                                <Calendar size={14} />
                                                {formatDate(client.created_at)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {client.status === 'suspended' ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                        <Ban size={10} /> Suspended
                                                    </span>
                                                    {client.suspended_until && (
                                                        <span className="text-[10px] text-red-400/70">
                                                            Until {formatDate(client.suspended_until)}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                    <Shield size={10} /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {client.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => handleReactivate(client)}
                                                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                                        title="Reactivate Account"
                                                        disabled={processing}
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuspendClick(client)}
                                                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                                                        title="Suspend Account"
                                                        disabled={processing}
                                                    >
                                                        <Ban size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(client)}
                                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                    title="Delete Client"
                                                    disabled={processing}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Suspension Modal */}
            {showSuspendModal && selectedClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/5 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 border-red-500/30">
                        <button
                            onClick={() => setShowSuspendModal(false)}
                            className="absolute top-4 right-4 text-theme-secondary hover:text-theme-primary transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-theme-primary">Suspend Account</h3>
                                <p className="text-theme-secondary text-sm">Restrict access for {selectedClient.full_name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-theme-secondary">Reason for Suspension</label>
                                <textarea
                                    value={suspensionReason}
                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                    placeholder="e.g. Violation of terms, Non-payment..."
                                    className="glass-input w-full min-h-[100px] resize-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-theme-secondary">Suspended Until</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={suspensionDate}
                                        onChange={(e) => setSuspensionDate(e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <div className="glass-input w-full flex items-center justify-between min-h-[42px]">
                                        <span className={suspensionDate ? "text-theme-primary" : "text-theme-secondary"}>
                                            {suspensionDate ? formatDate(suspensionDate) : "DD Mon YYYY"}
                                        </span>
                                        <Calendar size={18} className="text-amber-500/50" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Access will be automatically restored after this date.</p>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setShowSuspendModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-theme-secondary hover:bg-white/5 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmSuspend}
                                    disabled={!suspensionReason || !suspensionDate || processing}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? 'Processing...' : 'Confirm Suspension'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
