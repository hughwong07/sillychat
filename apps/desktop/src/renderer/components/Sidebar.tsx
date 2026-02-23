import React from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <button className="new-chat-btn">
            <span>+</span>
            <span>新建对话</span>
          </button>
        )}
        <button className="toggle-btn" onClick={onToggle}>
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-item active">
          <span className="nav-icon">💬</span>
          {!collapsed && <span className="nav-label">聊天</span>}
        </div>
        <div className="nav-item">
          <span className="nav-icon">🤖</span>
          {!collapsed && <span className="nav-label">AI代理</span>}
        </div>
        <div className="nav-item">
          <span className="nav-icon">📁</span>
          {!collapsed && <span className="nav-label">文件</span>}
        </div>
        <div className="nav-item">
          <span className="nav-icon">⚙️</span>
          {!collapsed && <span className="nav-label">设置</span>}
        </div>
      </nav>
    </aside>
  );
};
