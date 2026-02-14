import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlassLayout } from './layouts/GlassLayout';
import ServiceCategories from './pages/ServiceCategories';
import FleetMap from './pages/FleetMap';
import Dispatch from './pages/Dispatch';
import VendorApplications from './pages/VendorApplications';
// import DriverApplications from './pages/DriverApplications'; // DECOMMISSIONED
import SovereignCommand from './pages/SovereignCommand';
import VendorSettings from './pages/VendorSettings';
import Vendors from './pages/Vendors';
import Clients from './pages/Clients';
import { LayoutDashboard } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import PageContainer from './components/PageContainer';

import { AgentStatusPanel } from './components/AgentStatusPanel';
import { AdminV2Layout } from './modules/AdminV2/AdminV2Layout';
// import { IncomingRequestsGrid } from './modules/AdminV2/components/IncomingRequestsGrid'; // DECOMMISSIONED
import { FinancialSettings } from './modules/AdminV2/components/FinancialSettings';
import { AssetAudit } from './modules/AdminV2/components/AssetAudit';
// import { FleetPortal } from './modules/AdminV2/components/FleetPortal'; // DECOMMISSIONED
import { Security } from './modules/AdminV2/components/Security';
import { LiveOperations } from './modules/AdminV2/components/LiveOperations';
import Login from './pages/Login';
import AdminResetPassword from './pages/AdminResetPassword';

function Dashboard() {
  return (
    <PageContainer
      title="Overview"
      subtitle="Real-time fleet activity monitoring"
      actions={
        <>
          <ThemeToggle />
          <button className="glass-button">
            + New Dispatch
          </button>
        </>
      }
    >
      {/* Staff Synergy / Agents */}
      <h3 className="text-lg font-semibold mb-4 text-theme-primary opacity-80">AI Workforce</h3>
      <AgentStatusPanel />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Jobs" value="12" change="+2.4%" />
        <StatCard title="Available Drivers" value="8" change="Normal" />
        <StatCard title="Avg Response" value="14m" change="-1m" />
      </div>

      {/* Recent Activity Panel */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-theme-primary">
          <LayoutDashboard size={20} className="text-[#F9A825]" />
          Recent Requests
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#F9A825]/20 flex items-center justify-center text-[#F9A825] font-bold">
                  #{1000 + i}
                </div>
                <div>
                  <h4 className="font-medium text-theme-primary">Flat Tire Assistance</h4>
                  <p className="text-sm text-theme-secondary">1.2km away • 5 mins ago</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-[#F9A825]/20 text-[#F9A825] text-xs rounded-full border border-[#F9A825]/30">
                Pending
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}

function StatCard({ title, value, change }: { title: string, value: string, change: string }) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#F9A825]/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover:bg-[#F9A825]/20" />
      <h3 className="text-theme-secondary text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-theme-primary">{value}</span>
        <span className="text-sm text-green-400 mb-1">{change}</span>
      </div>
    </div>
  )
}

import { BrandCard } from './components/BrandCard';

function App() {
  return (
    <ThemeProvider>
      <BrandCard variant="identity" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-reset-password" element={<AdminResetPassword />} />

          {/* Admin V2 Module (Standalone Layout) */}
          <Route path="/admin/v2" element={<AdminV2Layout />}>
            {/* <Route path="requests" element={<IncomingRequestsGrid />} /> DECOMMISSIONED */}
            <Route path="requests" element={<Navigate to="/admin/v2/intake" replace />} />
            <Route path="intake" element={<SovereignCommand />} />
            <Route path="assets" element={<AssetAudit />} />
            {/* <Route path="fleet" element={<FleetPortal />} /> DECOMMISSIONED */}
            <Route path="financials" element={<FinancialSettings />} />
            <Route path="security" element={<Security />} />
            <Route path="live-ops" element={<LiveOperations />} />
          </Route>

          {/* Legacy/Main Admin Module (Glass Layout) */}
          <Route path="*" element={
            <GlassLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/dispatch" element={<Dispatch />} />
                <Route path="/categories" element={<ServiceCategories />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/vendor-applications" element={<VendorApplications />} />
                {/* Driver Applications moved to V2 */}
                <Route path="/vendor-settings" element={<VendorSettings />} />
                <Route path="/fleet-map" element={<FleetMap />} />
              </Routes>
            </GlassLayout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
