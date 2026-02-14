// FORENSIC CAPTURE: Grab the URL hash BEFORE Supabase's createClient consumes it.
// When an invite token is invalid/expired, Supabase redirects with:
// #error=access_denied&error_code=403&error_description=Invalid+JWT
// The Supabase JS client strips this hash on initialization, making it invisible to React.
// We preserve it here at the earliest possible moment.
(window as any).__AUTH_HASH__ = window.location.hash || '';

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
)
