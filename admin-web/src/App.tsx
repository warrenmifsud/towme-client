import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GlassLayout } from './layouts/GlassLayout';
import ServiceCategories from './pages/ServiceCategories';
import Drivers from './pages/Drivers';
import FleetMap from './pages/FleetMap';
import Dispatch from './pages/Dispatch';
import VendorApplications from './pages/VendorApplications';
import DriverApplications from './pages/DriverApplications';
import VendorSettings from './pages/VendorSettings';
import Vendors from './pages/Vendors';
import Clients from './pages/Clients';
import { LayoutDashboard } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import PageContainer from './components/PageContainer';

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Jobs" value="12" change="+2.4%" />
        <StatCard title="Available Drivers" value="8" change="Normal" />
        <StatCard title="Avg Response" value="14m" change="-1m" />
      </div>

      {/* Recent Activity Panel */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-theme-primary">
          <LayoutDashboard size={20} className="text-amber-500" />
          Recent Requests
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  #{1000 + i}
                </div>
                <div>
                  <h4 className="font-medium text-theme-primary">Flat Tire Assistance</h4>
                  <p className="text-sm text-theme-secondary">1.2km away • 5 mins ago</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30">
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
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/20" />
      <h3 className="text-theme-secondary text-sm font-medium mb-2">{title}</h3>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-theme-primary">{value}</span>
        <span className="text-sm text-green-400 mb-1">{change}</span>
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <GlassLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/categories" element={<ServiceCategories />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendor-applications" element={<VendorApplications />} />
            <Route path="/driver-applications" element={<DriverApplications />} />
            <Route path="/vendor-settings" element={<VendorSettings />} />
            <Route path="/fleet-map" element={<FleetMap />} />
          </Routes>
        </GlassLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
