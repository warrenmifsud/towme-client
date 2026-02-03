import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapControlProps {
    center: google.maps.LatLngLiteral;
    zoom?: number;
}

export default function MapControl({ center, zoom }: MapControlProps) {
    const map = useMap();

    useEffect(() => {
        if (!map || !center) return;
        map.panTo(center);
        if (zoom) map.setZoom(zoom);
    }, [map, center, zoom]);

    return null;
}
