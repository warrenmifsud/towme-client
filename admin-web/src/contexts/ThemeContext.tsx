import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'liquid';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // ========================================
    // KILL SWITCH: FORCE LIQUID GLASS THEME
    // ========================================
    // This prevents regression to dark mode by:
    // 1. Clearing any stored theme preference
    // 2. Removing legacy dark mode classes
    // 3. Hard-locking to Liquid Glass theme
    // 4. Ignoring OS system preferences

    const [theme] = useState<Theme>(() => {
        // FORCED RESET SCRIPT
        try {
            // Clear any stored theme preference
            localStorage.removeItem('admin-theme');
            localStorage.removeItem('theme');

            // Remove legacy dark mode class
            document.documentElement.classList.remove('dark', 'theme-dark');

            // Force Liquid Glass theme
            document.documentElement.setAttribute('data-theme', 'liquid-glass');
            document.documentElement.classList.add('theme-liquid');
        } catch (e) {
            console.warn('Theme reset failed:', e);
        }

        // HARD-LOCK: Always return 'liquid', ignore localStorage
        return 'liquid';
    });

    useEffect(() => {
        // Enforce Liquid Glass theme on every render
        const root = window.document.documentElement;
        root.classList.remove('theme-dark', 'dark');
        root.classList.add('theme-liquid');
        root.setAttribute('data-theme', 'liquid-glass');

        // DO NOT save to localStorage to prevent persistence of dark mode
        // localStorage.setItem('admin-theme', theme); // DISABLED
    }, [theme]);

    // KILL SWITCH: Disable theme toggle to prevent regression
    const toggleTheme = () => {
        // NO-OP: Theme toggle is disabled
        console.warn('Theme toggle is disabled. Application is hard-locked to Liquid Glass theme.');
    };

    // KILL SWITCH: Disable manual theme setting
    const setTheme = (_newTheme: Theme) => {
        // NO-OP: Manual theme setting is disabled
        console.warn('Manual theme setting is disabled. Application is hard-locked to Liquid Glass theme.');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (undefined === context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
