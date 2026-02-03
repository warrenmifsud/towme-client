import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsProviderProps {
    children: React.ReactNode;
    apiKey: string;
}

/**
 * Separate chunk for Google Maps SDK
 * This component is lazy-loaded to prevent blocking initial render
 */
export default function GoogleMapsProvider({ children, apiKey }: GoogleMapsProviderProps) {
    return (
        <APIProvider apiKey={apiKey} libraries={['places', 'marker', 'routes', 'geometry']}>
            {children}
        </APIProvider>
    );
}
