import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import BRAND_SETTINGS from '../../../config/brand_settings.json';

export type DriverFinancialStats = {
    driver_id: string;
    full_name: string;
    email: string;
    payout_type: 'COMMISSION' | 'FIXED_WAGE';
    gross_earnings: number;
    towme_take: number;
    net_earnings: number;
    efficiency_rating: number;
    job_count: number;
};

export const useDriverFinancials = () => {
    const [stats, setStats] = useState<DriverFinancialStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [globalStats, setGlobalStats] = useState({
        total_gross: 0,
        total_revenue: 0
    });

    useEffect(() => {
        fetchFinancials();
    }, []);

    const fetchFinancials = async () => {
        try {
            setLoading(true);

            // 1. Fetch Active Drivers (Hard-Link to Intake)
            const { data: drivers, error: driverError } = await supabase
                .from('active_drivers')
                .select(`
                    driver_id,
                    owner_name,
                    email,
                    payout_type,
                    partner_commission_rate,
                    hourly_rate
                `);

            if (driverError) throw driverError;

            // 2. Fetch Completed Jobs and Payments
            const { data: completedJobs, error: jobsError } = await supabase
                .from('towing_requests')
                .select(`
                    id,
                    driver_id,
                    status,
                    payments (
                        amount,
                        status
                    )
                `)
                .eq('status', 'completed')
                .not('driver_id', 'is', null);

            if (jobsError) throw jobsError;

            // 3. Aggregate Data
            const driverMap = new Map<string, DriverFinancialStats>();

            // Initialize map with Active Drivers
            drivers?.forEach((d: any) => {
                driverMap.set(d.driver_id, {
                    driver_id: d.driver_id,
                    full_name: d.owner_name || 'Unknown', // Mapped from Active Drivers View
                    email: d.email || 'N/A',
                    payout_type: d.payout_type as 'COMMISSION' | 'FIXED_WAGE',
                    gross_earnings: 0,
                    towme_take: 0,
                    net_earnings: 0,
                    efficiency_rating: 100, // Default
                    job_count: 0
                });
            });

            // Process Jobs
            completedJobs?.forEach(job => {
                if (!job.driver_id) return;

                const driverStat = driverMap.get(job.driver_id);
                if (!driverStat) return;

                const jobTotal = Array.isArray(job.payments)
                    ? job.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                    : 0;

                driverStat.gross_earnings += jobTotal;
                driverStat.job_count += 1;
            });

            // 4. Calculate Commissions & Net
            let globalGross = 0;
            let globalRevenue = 0;

            const finalStats: DriverFinancialStats[] = [];

            driverMap.forEach(stat => {
                if (stat.payout_type === 'COMMISSION') {
                    // AUDIT: Use Brand Settings
                    stat.towme_take = stat.gross_earnings * BRAND_SETTINGS.financials.commission_rate;
                    stat.net_earnings = stat.gross_earnings - stat.towme_take;
                } else {
                    // FIXED_WAGE: TowMe takes 0% commission from the job revenue (Driver keeps full job amount or separate wage handling)
                    stat.towme_take = 0;
                    stat.net_earnings = stat.gross_earnings;
                }


                // Efficiency Calculation (AGI / Average Ticket Value)
                // Since 'online_hours' is not yet tracked, we use Average Revenue per Job
                const avgTicket = stat.job_count > 0 ? (stat.gross_earnings / stat.job_count) : 0;

                // Example Logic: Benchmark is €50 per job
                // Efficiency = (AvgTicket / 50) * 100, capped at 100? Or just raw number?
                // Visuals expect a % (0-100).
                const benchmark = 65.0; // €65 target
                let efficiency = (avgTicket / benchmark) * 100;
                if (efficiency > 100) efficiency = 100;

                stat.efficiency_rating = Math.round(efficiency);

                globalGross += stat.gross_earnings;
                globalRevenue += stat.towme_take;

                finalStats.push(stat);
            });

            setStats(finalStats.sort((a, b) => b.gross_earnings - a.gross_earnings));
            setGlobalStats({
                total_gross: globalGross,
                total_revenue: globalRevenue
            });

        } catch (err: any) {
            console.error('Error fetching driver financials:', err);
            // REALITY MODE: Mock Data Purged per Directives
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { stats, globalStats, loading, error, refetch: fetchFinancials };
};
