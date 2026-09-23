// lib/theme.tsx - myapp27 localStorage fix ✅
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeName } from '@/app/usersui/[username]/_components/themes/themeNames';

const ThemeContext = createContext<{
  theme: string;
  setTheme: (t: ThemeName) => void; 
}>({ theme: 'pinafore', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>('pinafore'); // defalt theme is 'pinafore'

  // 초기 로드 - localStorage 읽기
  // Initial load - Read localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      console.log('🔍 loaded theme from localStorage:', saved);
      if (saved) setThemeState(saved);
    } catch {}
  }, []);
  
  // 테마 변경 - state + localStorage 둘 다 저장
  // Theme change – save to both state and localStorage.
  // ✅ 쓰기 - state + localStorage 둘 다
  const updateTheme = (t: ThemeName) => {
    setThemeState(t);
    try {
      localStorage.setItem('theme', t); // ← 이 한 줄이 핵심!
      console.log('💾 saved:', t);
    } catch {}
  };


  return ( // ✅ myapp30-수정-기존<div>삭제-css파일 사용할 떄 사용하던 것
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
        {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export type { ThemeName };