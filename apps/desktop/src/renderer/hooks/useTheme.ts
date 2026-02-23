import { useState, useEffect, useCallback } from 'react';

export const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const setTheme = useCallback(async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    await window.electronAPI.theme.set(newTheme);
    const currentTheme = await window.electronAPI.theme.get();
    setResolvedTheme(currentTheme);
  }, []);

  useEffect(() => {
    const initTheme = async () => {
      const currentTheme = await window.electronAPI.theme.get();
      setResolvedTheme(currentTheme);
    };

    initTheme();

    const unsubscribe = window.electronAPI.theme.onChanged((newTheme) => {
      setResolvedTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  return { theme, resolvedTheme, setTheme };
};
