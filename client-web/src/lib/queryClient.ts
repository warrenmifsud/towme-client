import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Client Configuration
 * Optimized for instant load times with aggressive caching
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,

            // Cache data for 10 minutes before garbage collection
            gcTime: 10 * 60 * 1000,

            // Automatically refetch when window regains focus
            refetchOnWindowFocus: true,

            // Don't refetch on mount if data is still fresh
            refetchOnMount: false,

            // Retry failed requests once
            retry: 1,

            // Show cached data while fetching new data in background
            placeholderData: (previousData: unknown) => previousData,
        },
    },
});
