import { lazy, Suspense } from 'react';
import { Loader } from 'lucide-react';

// Lazy load the Google Maps components to reduce initial bundle size
const GoogleMapsProvider = lazy(() => import('./GoogleMapsProvider.tsx'));

interface LazyMapProps {
    children: React.ReactNode;
    apiKey: string;
}

/**
 * Lazy-loaded Google Maps wrapper
 * Reduces main bundle size by ~180KB by loading maps asynchronously
 */
export default function LazyMap({ children, apiKey }: LazyMapProps) {
    return (
        <Suspense fallback={<MapSkeleton />}>
            <GoogleMapsProvider apiKey={apiKey}>
                {children}
            </GoogleMapsProvider>
        </Suspense>
    );
}

function MapSkeleton() {
    return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-pulse">
                <Loader className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Loading Map...
                </p>
            </div>
        </div>
    );
}
