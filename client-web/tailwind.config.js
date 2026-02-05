/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#F59E0B',
                'surface-dark': '#111827',
                'surface-light': '#FFFFFF',
                glass: {
                    100: 'rgba(255, 255, 255, 0.02)',
                    200: 'rgba(255, 255, 255, 0.04)',
                    300: 'rgba(255, 255, 255, 0.08)',
                    border: 'rgba(255, 255, 255, 0.05)',
                    gold: 'rgba(212, 175, 55, 0.05)',
                    'gold-border': 'rgba(212, 175, 55, 0.15)',
                },
                amber: {
                    400: '#E5C45D',
                    500: '#D4AF37',
                    600: '#B8860B',
                }
            },
            backdropBlur: {
                xs: '2px',
                'xl': '24px',
                '2xl': '40px',
                '3xl': '64px',
                '4xl': '80px',
            },
            boxShadow: {
                glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'gold-glow': '0 0 15px rgba(212, 175, 55, 0.3)',
                'inner-gold': 'inset 0 0 10px rgba(212, 175, 55, 0.1)',
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.4s ease-out forwards',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            }
        },
    },
    plugins: [],
}
