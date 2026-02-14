import { useEffect, useState } from 'react';
import { Zap, DollarSign, Brain, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DemandOverview {
    category_id: string;
    category_name: string;
    current_surge: number;
    pending_requests: number;
    online_drivers: number;
    demand_ratio: number;
    recommended_surge: number;
}

export function AgentStatusPanel() {
    const [demandData, setDemandData] = useState<DemandOverview[]>([]);
    const [atlasRunning, setAtlasRunning] = useState(false);
    const [lastCheck, setLastCheck] = useState<string | null>(null);

    useEffect(() => {
        fetchDemandOverview();
        const interval = setInterval(fetchDemandOverview, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    async function fetchDemandOverview() {
        try {
            const { data, error } = await supabase
                .from('v_atlas_demand_overview')
                .select('*');
            if (error) throw error;
            setDemandData(data || []);
        } catch (err) {
            console.error('Atlas demand overview fetch error:', err);
        }
    }

    async function runAtlasCheck() {
        try {
            setAtlasRunning(true);
            const { data, error } = await supabase.rpc('fn_atlas_demand_check');
            if (error) throw error;
            console.log('[ATLAS] Demand check results:', data);
            setLastCheck(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            // Refresh data after atlas adjusts surge
            await fetchDemandOverview();
        } catch (err: any) {
            console.error('[ATLAS] Demand check error:', err);
            alert(`Atlas demand check failed: ${err.message || JSON.stringify(err)}`);
        } finally {
            setAtlasRunning(false);
        }
    }

    // Computed stats from live data
    const activeSurges = demandData.filter(d => d.current_surge > 1).length;
    const totalPending = demandData.reduce((sum, d) => sum + d.pending_requests, 0);
    const totalDrivers = demandData.reduce((sum, d) => sum + d.online_drivers, 0);
    const highestRatio = demandData.length > 0 ? Math.max(...demandData.map(d => d.demand_ratio)) : 0;
    const atlasStatus = activeSurges > 0 ? 'surging' : totalPending > 0 ? 'monitoring' : 'idle';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* ATLAS - Dispatch Intelligence */}
            <div className={`glass-panel p-5 relative overflow-hidden transition-all hover:scale-[1.02] border ${atlasStatus === 'surging'
                    ? 'border-[#F9A825]/40 bg-[#F9A825]/10'
                    : atlasStatus === 'monitoring'
                        ? 'border-blue-500/30 bg-blue-500/10'
                        : 'border-slate-500/20 bg-slate-500/5'
                }`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner ${atlasStatus === 'surging' ? 'bg-[#F9A825]/20' : 'bg-white/10'
                            }`}>
                            <Zap className={`w-5 h-5 ${atlasStatus === 'surging' ? 'text-[#F9A825]' : 'text-blue-400'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Atlas</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Dispatch Intelligence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${atlasStatus === 'surging' ? 'bg-[#F9A825] animate-pulse' :
                                atlasStatus === 'monitoring' ? 'bg-blue-400 animate-pulse' :
                                    'bg-slate-500'
                            }`}></span>
                        <span className="text-xs text-slate-500 font-medium capitalize">{atlasStatus}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Active Surges</span>
                        <span className={`font-mono font-medium ${activeSurges > 0 ? 'text-[#F9A825]' : 'text-white'}`}>
                            {activeSurges}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Demand Ratio</span>
                        <span className={`font-mono font-medium ${highestRatio >= 2 ? 'text-[#F9A825]' : 'text-white'}`}>
                            {highestRatio.toFixed(1)}x
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Pending / Drivers</span>
                        <span className="text-white font-mono font-medium">{totalPending} / {totalDrivers}</span>
                    </div>
                </div>

                {/* Run Atlas Check button */}
                <button
                    onClick={runAtlasCheck}
                    disabled={atlasRunning}
                    className={`mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${atlasRunning
                            ? 'bg-white/5 text-slate-500 cursor-wait'
                            : 'bg-[#F9A825]/20 text-[#F9A825] hover:bg-[#F9A825]/30 border border-[#F9A825]/30'
                        }`}
                >
                    <RefreshCw size={12} className={atlasRunning ? 'animate-spin' : ''} />
                    {atlasRunning ? 'Atlas Scanning...' : 'Run Atlas Check'}
                </button>
                {lastCheck && (
                    <p className="text-[9px] text-slate-600 text-center mt-1">Last: {lastCheck}</p>
                )}

                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* LANA - Vehicle Intelligence */}
            <AgentCard
                name="LANA"
                role="Vehicle Intelligence"
                icon={<Brain className="w-5 h-5 text-amber-400" />}
                status="processing"
                color="border-amber-500/30 bg-amber-500/10"
                stats={[
                    { label: "VINs Decoded", value: "150" },
                    { label: "Wrong Truck Prevention", value: "12" }
                ]}
            />

            {/* PENNY - Finance */}
            <AgentCard
                name="Penny"
                role="Revenue & Pricing"
                icon={<DollarSign className="w-5 h-5 text-green-400" />}
                status="idle"
                color="border-green-500/30 bg-green-500/10"
                stats={[
                    { label: "Revenue Today", value: "€2.4k" },
                    { label: "Pending Invoices", value: "3" }
                ]}
            />
        </div>
    );
}

function AgentCard({ name, role, icon, status, color, stats }: any) {
    return (
        <div className={`glass-panel p-5 relative overflow-hidden transition-all hover:scale-[1.02] ${color} border`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md shadow-inner">
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{name}</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">{role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'active' || status === 'processing' ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    <span className="text-xs text-slate-500 font-medium capitalize">{status}</span>
                </div>
            </div>

            <div className="space-y-2">
                {stats.map((stat: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{stat.label}</span>
                        <span className="text-white font-mono font-medium">{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        </div>
    );
}
