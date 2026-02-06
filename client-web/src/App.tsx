import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CookieBanner } from './components/CookieBanner';

// Lazy Load Pages for "Ferrari" Performance
const Home = lazy(() => import('./pages/Home'));
const Vendors = lazy(() => import('./pages/Vendors'));
const ServiceSelection = lazy(() => import('./pages/ServiceSelection'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Suspended = lazy(() => import('./pages/Suspended'));
const Landing = lazy(() => import('./pages/Landing'));

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="text-4xl font-black tracking-tighter text-white">
          Tow<span className="text-amber-500">Me</span>
        </div>
        <div className="w-12 h-1 bg-amber-500/20 rounded-full overflow-hidden">
          <div className="w-full h-full bg-amber-500 origin-left animate-[shimmer_1.5s_infinite]"></div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuspended } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  // Suspension Check (Takes priority over everything except specific paths)
  if (isSuspended && location.pathname !== '/suspended') {
    return <Navigate to="/suspended" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Global Suspension Watcher
function SuspensionWatcher({ children }: { children: React.ReactNode }) {
  const { isSuspended } = useAuth();
  const location = useLocation();

  // If suspended and not on the suspended page (and not logging out/in), redirect
  if (isSuspended && location.pathname !== '/suspended' && location.pathname !== '/login') {
    return <Navigate to="/suspended" replace />;
  }

  // If NOT suspended but ON suspended page, go home
  if (!isSuspended && location.pathname === '/suspended') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen text-white relative bg-black font-sans">
          <div className="max-w-md mx-auto min-h-screen relative overflow-hidden bg-black shadow-2xl border-x border-white/5">
            <SuspensionWatcher>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />

                  {/* Suspended Page */}
                  <Route path="/suspended" element={<Suspended />} />

                  {/* Use Dashboard for Authenticated Home */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  } />

                  {/* Public Landing (Auto-redirects to Dashboard if logged in) */}
                  <Route path="/" element={<Landing />} />

                  <Route path="/vendors" element={<Vendors />} />

                  {/* Protected Routes */}
                  <Route
                    path="/services"
                    element={
                      <ProtectedRoute>
                        <ServiceSelection />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/tracking/:requestId"
                    element={
                      <ProtectedRoute>
                        <Tracking />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </SuspensionWatcher>
          </div>
        </div>
      </BrowserRouter>
      <CookieBanner />
    </AuthProvider>
  );
}

export default App;
