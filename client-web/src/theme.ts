// Ensure these EXACT tokens are in theme.ts
export const THEME = {
    colors: {
        primaryBrandColor: '#F9A825', // Neutral Light Orange (Solid)
        brandNavy: '#1A1C2E', // Midnight Blue circle background (Locked)
        labelText: '#F9A825', // Visual proof color (Solid Brand Color)
        appBg: '#FFFFFF', // Pure White
        background: '#FFFFFF', // Alias to satisfy mandate interface
        white: '#FFFFFF', // Alias for white
        black: '#000000',
    },
    spacing: {
        logoPadding: 25, // Mandated 25px (Locked)
    }
} as const;
