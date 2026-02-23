import { useState, useEffect, useCallback } from 'react';

export const useWindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  const minimize = useCallback(() => {
    window.electronAPI.window.minimize();
  }, []);

  const maximize = useCallback(async () => {
    await window.electronAPI.window.maximize();
    const maximized = await window.electronAPI.window.isMaximized();
    setIsMaximized(maximized);
  }, []);

  const close = useCallback(() => {
    window.electronAPI.window.close();
  }, []);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await window.electronAPI.window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  return { isMaximized, minimize, maximize, close };
};
