import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AgentPanel } from './components/AgentPanel';
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);

  return (
    <div className={`app ${theme}`}>
      <TitleBar
        onThemeChange={setTheme}
        currentTheme={theme}
      />
      <div className="app-body">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="main-content">
          <ChatArea />
        </main>
        {agentPanelOpen && (
          <AgentPanel onClose={() => setAgentPanelOpen(false)} />
        )}
      </div>
    </div>
  );
};
