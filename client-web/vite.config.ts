import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5175,
    strictPort: true,
    host: '192.168.7.49',
    hmr: {
      host: '192.168.7.49',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Google Maps into its own chunk (~180KB)
          'google-maps': ['@vis.gl/react-google-maps'],
          // Vendor libraries (React, Router, etc.)
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'supabase': ['@supabase/supabase-js'],
          // TanStack Query
          'query': ['@tanstack/react-query'],
        }
      }
    },
    // Increase chunk size warning limit for maps
    chunkSizeWarningLimit: 600,
  }
})
