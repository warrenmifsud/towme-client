import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign, Wallet, Users, AlertCircle, Loader2, Save, History, FileText, Search, Landmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- SOVEREIGN BRAND LAW ---
const BRAND = {
    primary: '#F9A825',    // Solid Neutral Light Orange
    secondary: '#1A1C2E',  // Midnight Blue
    white: '#FFFFFF',
    textMain: '#111827',
    danger: '#EF4444',
    success: '#10B981'
};

interface FinancialConfig {
    commission_rate: number;
    vat_rate: number;
    driver_split: number;
}

interface LedgerEntry {
    id: string;
    created_at: string;
    driver_name: string; // Joined or fetched
    job_id: string;
    amount: number;
    commission_amount: number;
    net_amount: number;
    status: string;
}

interface DriverPayout {
    id: string;
    name: string;
    balance: number;
    iban: string;
    status: string;
}

interface DriverFinancialProfile {
    id: string;
    owner_name: string;
    email: string;
    commission_rate_override: number | null;
    vat_rate_override: number | null;
}

export function FinancialSettings() {
    const [scope, setScope] = useState<'GLOBAL' | 'DRIVER'>('GLOBAL');
    const [config, setConfig] = useState<FinancialConfig>({ commission_rate: 20, vat_rate: 18, driver_split: 80 });
    const [payouts, setPayouts] = useState<DriverPayout[]>([]);
    const [history, setHistory] = useState<LedgerEntry[]>([]);

    // Driver Scope State
    const [allDrivers, setAllDrivers] = useState<DriverFinancialProfile[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<DriverFinancialProfile | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ZONE D: Bank Credentials
    interface BankRecord { id: string; profile_id: string; bank_name: string; account_holder: string; iban: string; swift_bic: string; driver_name?: string; }
    const [bankRecords, setBankRecords] = useState<BankRecord[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // ZONE A: Fetch Config
            const { data: configData } = await supabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'financial_config')
                .single();

            if (configData?.value) {
                setConfig(configData.value);
            }

            // Fetch Approved Drivers for Search (Lightweight fetch)
            const { data: driverList } = await supabase
                .from('driver_applications')
                .select('id, owner_name, email, commission_rate_override, vat_rate_override')
                .eq('status', 'APPROVED');

            if (driverList) {
                setAllDrivers(driverList);
            }

            // ZONE B: Pending Payouts
            const { data: drivers } = await supabase
                .from('driver_applications')
                .select('id, owner_name, wallet_balance, iban')
                .eq('status', 'APPROVED')
                .gt('wallet_balance', 0);

            setPayouts((drivers || []).map((d: any) => ({
                id: d.id,
                name: d.owner_name,
                balance: d.wallet_balance || 0,
                iban: d.iban || 'N/A',
                status: 'PENDING'
            })));

            // ZONE C: Ledger History
            // We need to join with driver info. 
            const { data: ledgerData } = await supabase
                .from('financial_ledger')
                .select(`
                    id, created_at, job_id, amount, commission_amount, net_amount, status,
                    driver:driver_applications!driver_id (owner_name)
                `)
                .order('created_at', { ascending: false })
                .limit(50); // Pagination assumed later

            setHistory((ledgerData || []).map((entry: any) => ({
                id: entry.id,
                created_at: new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                driver_name: entry.driver?.owner_name || 'Unknown Driver',
                job_id: entry.job_id || 'N/A',
                amount: entry.amount || 0,
                commission_amount: entry.commission_amount || 0,
                net_amount: entry.net_amount || 0,
                status: entry.status || 'COMPLETED'
            })));

            // ZONE D: Bank Credentials
            const { data: bankData } = await supabase
                .from('bank_details')
                .select('*')
                .order('updated_at', { ascending: false });

            if (bankData && bankData.length > 0) {
                // Fetch driver names for display
                const profileIds = bankData.map((b: any) => b.profile_id);
                const { data: profiles } = await supabase
                    .from('driver_applications')
                    .select('id, owner_name')
                    .in('id', profileIds);

                const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.owner_name]));
                setBankRecords(bankData.map((b: any) => ({
                    ...b,
                    driver_name: nameMap.get(b.profile_id) || 'Unknown Driver'
                })));
            }

        } catch (err) {
            console.error("Financial Data Sync Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (scope === 'GLOBAL') {
                const { error } = await supabase
                    .from('platform_settings')
                    .upsert({
                        key: 'financial_config',
                        value: config
                    }, { onConflict: 'key' });

                if (error) throw error;
                alert("Global Configuration Saved Successfully");
            } else {
                if (!selectedDriver) return;

                const { error } = await supabase
                    .from('driver_applications')
                    .update({
                        commission_rate_override: selectedDriver.commission_rate_override,
                        vat_rate_override: selectedDriver.vat_rate_override
                    })
                    .eq('id', selectedDriver.id);

                if (error) throw error;
                alert(`Overrides saved for ${selectedDriver.owner_name}`);

                // Refresh driver list to sync logic
                fetchData();
            }
        } catch (err) {
            console.error("Save failed", err);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight" style={{ color: BRAND.textMain }}>
                        Financial Unification | <span style={{ color: BRAND.primary }}>Protocol</span>
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Global Configurator, Sentinel & Ledger</p>
                </div>
            </div>

            {/* ZONE A: THE CONFIGURATOR */}
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden relative">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <TrendingUp size={16} color={BRAND.primary} />
                        Zone A: Platform Configurator
                    </h3>

                    {/* SCOPE TOGGLE */}
                    <div className="flex bg-gray-200 rounded p-1 text-[10px] font-bold uppercase tracking-wider">
                        <button
                            onClick={() => { setScope('GLOBAL'); setSelectedDriver(null); }}
                            className={`px-3 py-1 rounded transition-all ${scope === 'GLOBAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Global Defaults
                        </button>
                        <button
                            onClick={() => setScope('DRIVER')}
                            className={`px-3 py-1 rounded transition-all ${scope === 'DRIVER' ? 'bg-[#F9A825] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Driver Specific
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* DRIVER SEARCH (Only in Driver Mode) */}
                    {scope === 'DRIVER' && (
                        <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Verified Driver</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <select
                                    className="w-full p-2 pl-9 border border-gray-300 rounded text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
                                    onChange={(e) => {
                                        const driver = allDrivers.find(d => d.id === e.target.value);
                                        setSelectedDriver(driver || null);
                                    }}
                                    value={selectedDriver?.id || ''}
                                >
                                    <option value="">-- Search Driver --</option>
                                    {allDrivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.owner_name} ({d.email})</option>
                                    ))}
                                </select>
                            </div>
                            {!selectedDriver && (
                                <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Please select a driver to configure overrides.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* COMMISSION RATE */}
                        <div className={`transition-opacity ${scope === 'DRIVER' && !selectedDriver ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                Commission (%)
                                {scope === 'DRIVER' && selectedDriver?.commission_rate_override !== null && selectedDriver?.commission_rate_override !== undefined && (
                                    <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded">OVERRIDE ACTIVE</span>
                                )}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={
                                        scope === 'GLOBAL'
                                            ? config.commission_rate
                                            : (selectedDriver?.commission_rate_override ?? config.commission_rate)
                                    }
                                    onChange={(e) => {
                                        if (scope === 'GLOBAL') {
                                            setConfig({ ...config, commission_rate: parseFloat(e.target.value) });
                                        } else if (selectedDriver) {
                                            // Update local driver state for UI
                                            setSelectedDriver({
                                                ...selectedDriver,
                                                commission_rate_override: parseFloat(e.target.value)
                                            });
                                        }
                                    }}
                                    className={`w-full p-2 pl-3 border rounded text-sm font-bold focus:ring-2 outline-none ${scope === 'DRIVER' && selectedDriver?.commission_rate_override !== null && selectedDriver?.commission_rate_override !== undefined
                                        ? 'border-[#F9A825] text-[#F9A825] ring-orange-100 bg-orange-50/10' // Visual Law: Override Highlight
                                        : 'border-gray-300 text-slate-900 focus:ring-orange-200'
                                        }`}
                                />
                                <span className="absolute right-3 top-2 text-slate-400 text-xs">%</span>
                            </div>
                            {scope === 'DRIVER' && (
                                <div className="mt-1 text-[10px] text-slate-400 text-right">
                                    {selectedDriver?.commission_rate_override === null || selectedDriver?.commission_rate_override === undefined ? (
                                        <span>Using Global Default</span>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedDriver({ ...selectedDriver!, commission_rate_override: null })}
                                            className="text-red-400 hover:text-red-500 underline"
                                        >
                                            Reset to Global
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* VAT RATE - Read Only in Driver Mode for now based on mandate, or same logic */}
                        <div className={`transition-opacity ${scope === 'DRIVER' && !selectedDriver ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">VAT Rate (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={scope === 'GLOBAL' ? config.vat_rate : (selectedDriver?.vat_rate_override ?? config.vat_rate)}
                                    // Supporting VAT override if we want
                                    onChange={(e) => {
                                        if (scope === 'GLOBAL') {
                                            setConfig({ ...config, vat_rate: parseFloat(e.target.value) });
                                        } else if (selectedDriver) {
                                            setSelectedDriver({
                                                ...selectedDriver,
                                                vat_rate_override: parseFloat(e.target.value)
                                            });
                                        }
                                    }}
                                    className={`w-full p-2 pl-3 border rounded text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-200 outline-none ${scope === 'DRIVER' && selectedDriver?.vat_rate_override != null
                                        ? 'border-[#F9A825] text-[#F9A825] ring-orange-100 bg-orange-50/10'
                                        : ''
                                        }`}
                                />
                                <span className="absolute right-3 top-2 text-slate-400 text-xs">%</span>
                            </div>
                        </div>

                        {/* DRIVER SPLIT - Likely Global Only? */}
                        <div className={`transition-opacity ${scope === 'DRIVER' && !selectedDriver ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Split (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={config.driver_split} // Keep Global for now
                                    onChange={(e) => setConfig({ ...config, driver_split: parseFloat(e.target.value) })}
                                    disabled={scope === 'DRIVER'} // Global constraint
                                    className="w-full p-2 pl-3 border rounded text-sm font-bold text-slate-500 bg-gray-50 focus:ring-0 outline-none cursor-not-allowed"
                                />
                                <span className="absolute right-3 top-2 text-slate-400 text-xs">%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || (scope === 'DRIVER' && !selectedDriver)}
                        className="flex items-center gap-2 px-6 py-2 rounded shadow-sm text-xs font-bold text-white uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: BRAND.primary }}
                    >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        {scope === 'GLOBAL' ? 'Save Global Configuration' : 'Save Driver Overrides'}
                    </button>
                </div>
            </div>

            {/* ZONE B: THE SENTINEL (Pending Payouts) */}
            <div className="bg-white rounded shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Wallet size={16} color={BRAND.primary} />
                        Zone B: Payout Sentinel
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-white border px-2 py-1 rounded">
                        {payouts.length} PENDING
                    </span>
                </div>

                {payouts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-mono">
                        No pending payouts. Global liability is €0.00.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {payouts.map((payout) => (
                            <div key={payout.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded bg-[#F9A825]/10 flex items-center justify-center text-[#F9A825] font-bold text-xs">
                                        {payout.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900">{payout.name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{payout.iban}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-xs text-slate-900">€{payout.balance.toFixed(2)}</div>
                                    <button
                                        className="px-3 py-1 text-[10px] font-bold text-white rounded shadow-sm uppercase"
                                        style={{ backgroundColor: BRAND.primary }}
                                    >
                                        Process
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ZONE D: BANK CREDENTIALS VAULT */}
            <div className="bg-white rounded shadow-sm overflow-hidden" style={{ border: `2px solid ${BRAND.primary}` }}>
                <div className="px-6 py-4 flex justify-between items-center" style={{ borderBottom: `2px solid ${BRAND.primary}`, background: 'rgba(249, 168, 37, 0.04)' }}>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Landmark size={16} color={BRAND.primary} />
                        Zone D: Bank Credentials Vault
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-white border px-2 py-1 rounded">
                        {bankRecords.length} RECORDS
                    </span>
                </div>

                {bankRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-mono">
                        <Landmark size={24} className="mx-auto opacity-20 mb-2" />
                        No bank credentials registered yet.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {bankRecords.map((bank) => (
                            <div key={bank.id} className="px-6 py-4 flex items-center justify-between hover:bg-orange-50/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(249,168,37,0.1)', color: BRAND.primary }}>
                                        <Landmark size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{bank.driver_name}</div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                            {bank.account_holder} • {bank.bank_name}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-xs text-slate-700 font-mono tracking-wider">
                                        {bank.iban.length > 8
                                            ? bank.iban.slice(0, 4) + ' •••• •••• ' + bank.iban.slice(-4)
                                            : bank.iban}
                                    </div>
                                    {bank.swift_bic && (
                                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                            SWIFT: {bank.swift_bic}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ZONE C: THE LEDGER (Transaction History) */}
            <div className="bg-white rounded shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <History size={16} color={BRAND.primary} />
                        Zone C: Global Transaction History
                    </h3>
                    <button className="text-slate-400 hover:text-slate-600">
                        <Download size={16} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-white">
                                <th className="px-6 py-3 font-bold">Date</th>
                                <th className="px-6 py-3 font-bold">Driver</th>
                                <th className="px-6 py-3 font-bold">Job ID</th>
                                <th className="px-6 py-3 font-bold text-right">Amount</th>
                                <th className="px-6 py-3 font-bold text-right">Commission</th>
                                <th className="px-6 py-3 font-bold text-right">Net Payout</th>
                                <th className="px-6 py-3 font-bold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-mono">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={24} className="opacity-20" />
                                            No Historical Records Found (Zero-Simulation)
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-xs text-slate-600 font-mono">{entry.created_at}</td>
                                        <td className="px-6 py-3 text-xs text-slate-900 font-bold">{entry.driver_name}</td>
                                        <td className="px-6 py-3 text-xs text-slate-500 font-mono">{entry.job_id.slice(0, 8)}...</td>
                                        <td className="px-6 py-3 text-xs text-slate-900 text-right font-mono">€{entry.amount.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-xs text-red-500 text-right font-mono">-€{entry.commission_amount.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-xs text-green-600 text-right font-mono font-bold">€{entry.net_amount.toFixed(2)}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-green-50 text-green-600 border border-green-100">
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
