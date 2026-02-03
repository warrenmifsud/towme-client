import { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps {
    onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

export default function PlaceAutocomplete({ onPlaceSelect }: PlaceAutocompleteProps) {
    const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const places = useMapsLibrary('places');

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const options = {
            fields: ['geometry', 'name', 'formatted_address'],
            componentRestrictions: { country: 'mt' }, // Restrict to Malta for this app
        };

        setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
    }, [places]);

    useEffect(() => {
        if (!placeAutocomplete) return;

        placeAutocomplete.addListener('place_changed', () => {
            onPlaceSelect(placeAutocomplete.getPlace());
        });
    }, [onPlaceSelect, placeAutocomplete]);

    return (
        <input
            ref={inputRef}
            className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.1] transition-all duration-300 font-medium text-lg"
            placeholder="Search destination..."
        />
    );
}
