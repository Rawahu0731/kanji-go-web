import { useEffect } from 'react';
import { useGamification } from '../contexts/GamificationContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useGamification();

  useEffect(() => {
    // テーマに応じてbody要素にクラスを適用
    const themeClass = state.activeTheme || 'default';
    document.body.className = `theme-${themeClass}`;
  }, [state.activeTheme]);

  return <>{children}</>;
}
