import React from 'react';

interface AgentPanelProps {
  onClose: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
  const agents = [
    { id: '1', name: '小傻瓜', role: '助手', status: 'online' },
    { id: '2', name: 'Claude', role: 'AI助手', status: 'online' },
    { id: '3', name: 'GPT-4', role: 'AI助手', status: 'offline' },
  ];

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>AI代理</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="agent-list">
        {agents.map((agent) => (
          <div key={agent.id} className="agent-item">
            <div className={`agent-avatar ${agent.status}`}>
              {agent.name[0]}
            </div>
            <div className="agent-info">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-role">{agent.role}</div>
            </div>
            <div className={`agent-status ${agent.status}`} />
          </div>
        ))}
      </div>
      <div className="agent-panel-footer">
        <button className="add-agent-btn">+ 添加代理</button>
      </div>
    </div>
  );
};
