import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type DarkModeContextValue = {
  isDark: boolean;
  toggle: () => void;
};

const DarkModeContext = createContext<DarkModeContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

const STORAGE_KEY = 'dark-mode';

export const DarkModeProvider = ({ children }: Props) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      return stored === '1';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Apply dark mode class to document
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem(STORAGE_KEY, isDark ? '1' : '0');
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => !prev);
  };

  return <DarkModeContext.Provider value={{ isDark, toggle }}>{children}</DarkModeContext.Provider>;
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};

