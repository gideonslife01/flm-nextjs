// lib/theme.tsx - myapp26 ✅
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'pinafore' | 'mastodon' | 'minimal';

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}>({ theme: 'pinafore', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('pinafore');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as ThemeName;
    if (saved) setTheme(saved);
  }, []);
  
  const updateTheme = (t: ThemeName) => {
    setTheme(t);
    localStorage.setItem('theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      <div data-theme={theme} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);