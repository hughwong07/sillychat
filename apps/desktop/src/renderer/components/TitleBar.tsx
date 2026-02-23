import React from 'react';
import { useWindowControls } from '../hooks/useWindowControls';

interface TitleBarProps {
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  currentTheme: 'light' | 'dark' | 'system';
}

export const TitleBar: React.FC<TitleBarProps> = ({ onThemeChange, currentTheme }) => {
  const { isMaximized, minimize, maximize, close } = useWindowControls();

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <div className="app-logo">傻</div>
        <span className="app-title">SillyChat</span>
      </div>
      <div className="titlebar-controls">
        <select
          className="theme-selector"
          value={currentTheme}
          onChange={(e) => onThemeChange(e.target.value as 'light' | 'dark' | 'system')}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
        <button className="titlebar-btn minimize" onClick={minimize} title="最小化">
          <svg viewBox="0 0 16 16">
            <rect x="2" y="7" width="12" height="2" />
          </svg>
        </button>
        <button className="titlebar-btn maximize" onClick={maximize} title={isMaximized ? '还原' : '最大化'}>
          <svg viewBox="0 0 16 16">
            {isMaximized ? (
              <path d="M3 5h10v8H3z M5 3h8v2H5z" />
            ) : (
              <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
            )}
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={close} title="关闭">
          <svg viewBox="0 0 16 16">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
