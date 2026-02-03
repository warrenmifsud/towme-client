import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationState {
    location: google.maps.LatLngLiteral | null;
    accuracy: 'cached' | 'network' | 'gps' | null;
    isLoading: boolean;
    error: string | null;
}

const MALTA_CENTER = { lat: 35.8989, lng: 14.5146 };
const LOCATION_CACHE_KEY = 'towme_last_location';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation {
    lat: number;
    lng: number;
    timestamp: number;
}

/**
 * Progressive Location Hook - 3-Tier Strategy for Instant Load
 * 
 * Tier 1 (0ms): Return cached location from localStorage
 * Tier 2 (~200ms): Network-based coarse location
 * Tier 3 (2-5s): High-accuracy GPS watch
 */
export function useProgressiveLocation() {
    const [state, setState] = useState<LocationState>({
        location: null,
        accuracy: null,
        isLoading: true,
        error: null
    });

    const watchIdRef = useRef<number | null>(null);
    const hasNetworkFixRef = useRef(false);
    const hasGpsFixRef = useRef(false);

    // Load cached location immediately (Tier 1)
    useEffect(() => {
        try {
            const cached = localStorage.getItem(LOCATION_CACHE_KEY);
            if (cached) {
                const parsed: CachedLocation = JSON.parse(cached);
                const age = Date.now() - parsed.timestamp;

                // Use cache if less than 24 hours old
                if (age < CACHE_MAX_AGE) {
                    setState({
                        location: { lat: parsed.lat, lng: parsed.lng },
                        accuracy: 'cached',
                        isLoading: true, // Still loading for better accuracy
                        error: null
                    });
                    return;
                }
            }
        } catch (err) {
            console.warn('Failed to load cached location:', err);
        }

        // No valid cache, show Malta center as fallback
        setState({
            location: MALTA_CENTER,
            accuracy: null,
            isLoading: true,
            error: null
        });
    }, []);

    // Start progressive location resolution
    useEffect(() => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'GPS not supported by this device'
            }));
            return;
        }

        // Tier 2: Network-based location (fast, low accuracy)
        const startNetworkLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    hasNetworkFixRef.current = true;

                    setState(prev => ({
                        ...prev,
                        location: newLoc,
                        accuracy: 'network',
                        isLoading: true, // Still waiting for GPS
                        error: null
                    }));

                    // Cache this location
                    cacheLocation(newLoc);
                },
                (error) => {
                    console.warn('Network location failed:', error);
                    // Don't set error yet, wait for GPS attempt
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 60000 // Accept 1-minute-old position
                }
            );
        };

        // Tier 3: High-accuracy GPS watch
        const startGpsWatch = () => {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const newLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    hasGpsFixRef.current = true;

                    setState({
                        location: newLoc,
                        accuracy: 'gps',
                        isLoading: false,
                        error: null
                    });

                    // Cache this high-accuracy location
                    cacheLocation(newLoc);
                },
                (error) => {
                    console.error('GPS watch error:', error);

                    // Only show error if we have no location at all
                    setState(prev => {
                        if (!prev.location || prev.location === MALTA_CENTER) {
                            let friendlyMsg = 'Location access required';
                            switch (error.code) {
                                case 1:
                                    friendlyMsg = 'Permission denied. Please enable location services.';
                                    break;
                                case 2:
                                    friendlyMsg = 'Position unavailable. Check GPS or network.';
                                    break;
                                case 3:
                                    friendlyMsg = 'GPS timeout. Using approximate location.';
                                    break;
                            }

                            return {
                                ...prev,
                                isLoading: false,
                                error: friendlyMsg
                            };
                        }

                        // We have a location (cached or network), just stop loading
                        return {
                            ...prev,
                            isLoading: false
                        };
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        };

        // Execute progressive strategy
        startNetworkLocation();
        startGpsWatch();

        // Cleanup
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    // Manual refetch for "Locate Me" button
    const refetch = useCallback(() => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        hasNetworkFixRef.current = false;
        hasGpsFixRef.current = false;

        // Try high-accuracy first with longer timeout
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLoc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                setState({
                    location: newLoc,
                    accuracy: 'gps',
                    isLoading: false,
                    error: null
                });

                cacheLocation(newLoc);
            },
            (error) => {
                console.warn('High-accuracy locate failed, trying low-accuracy:', error);

                // Fallback to low-accuracy on timeout or position unavailable
                if (error.code === 2 || error.code === 3) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const newLoc = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };

                            setState({
                                location: newLoc,
                                accuracy: 'network',
                                isLoading: false,
                                error: null
                            });

                            cacheLocation(newLoc);
                        },
                        (fallbackError) => {
                            console.error('Low-accuracy locate also failed:', fallbackError);
                            setState(prev => ({
                                ...prev,
                                isLoading: false,
                                error: 'Unable to get current location. Please try again or move the pin manually.'
                            }));
                        },
                        {
                            enableHighAccuracy: false,
                            timeout: 10000,
                            maximumAge: 60000 // Accept cached position up to 1 minute old
                        }
                    );
                } else {
                    // Permission denied or other error
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error.code === 1
                            ? 'Location permission denied. Please enable location services.'
                            : 'Failed to get current location. Please try again.'
                    }));
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 20000, // Increased from 10s to 20s
                maximumAge: 0
            }
        );
    }, []);

    return {
        ...state,
        refetch
    };
}

// Helper: Cache location to localStorage
function cacheLocation(location: google.maps.LatLngLiteral) {
    try {
        const cached: CachedLocation = {
            lat: location.lat,
            lng: location.lng,
            timestamp: Date.now()
        };
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
    } catch (err) {
        console.warn('Failed to cache location:', err);
    }
}
