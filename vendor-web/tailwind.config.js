/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                glass: {
                    100: 'rgba(255, 255, 255, 0.1)',
                    200: 'rgba(255, 255, 255, 0.2)',
                    300: 'rgba(255, 255, 255, 0.3)',
                    border: 'rgba(255, 255, 255, 0.2)',
                },
                // Matching Admin UI Amber tones
                amber: {
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                slate: {
                    900: '#0f172a',
                    950: '#020617',
                }
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                // Exact shadow from Admin UI button hover
                'amber-glow': '0 0 20px #f59e0b66',
            }
        },
    },
    plugins: [],
}
