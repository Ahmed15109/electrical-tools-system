import { useState, useEffect } from 'react';

const STORAGE_KEY = 'app-theme';
const DEFAULT_THEME = 'dark';

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        } catch {
            return DEFAULT_THEME;
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch { }
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, toggleTheme };
}
