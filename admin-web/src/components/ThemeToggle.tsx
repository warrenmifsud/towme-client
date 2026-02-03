// KILL SWITCH: Theme toggle component disabled
// Theme is hard-locked to Liquid Glass, no toggle needed
export function ThemeToggle() {
    // Theme toggle is disabled - component returns null
    return null;
}

/* ORIGINAL THEME TOGGLE (DISABLED BY KILL SWITCH)
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sparkles } from 'lucide-react';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden"
            title={theme === 'dark' ? 'Switch to Liquid Glass OS' : 'Switch to Dark Mode'}
        >
            <div className="relative z-10">
                {theme === 'dark' ? (
                    <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
                ) : (
                    <Moon className="w-5 h-5 text-slate-800" />
                )}
            </div>

            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
*/
