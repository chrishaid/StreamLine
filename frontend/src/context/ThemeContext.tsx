import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { userPreferencesApi } from '../services/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { userPreferences, updateUserPreference, isAuthenticated } = useAppStore();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first for instant load
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Sync theme with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync with user preferences from store
  useEffect(() => {
    if (userPreferences.theme && userPreferences.theme !== theme) {
      setThemeState(userPreferences.theme);
    }
  }, [userPreferences.theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    updateUserPreference('theme', newTheme);

    // Persist to database if authenticated
    if (isAuthenticated) {
      try {
        await userPreferencesApi.updatePreferences({ theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
