import React, { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy';
  description: string;
  skills: string[];
  avatar: string;
}

interface AgentPanelProps {
  onClose: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ onClose }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agents] = useState<Agent[]>([
    {
      id: '1',
      name: '小傻瓜',
      role: '主助手',
      status: 'online',
      description: '您的个人 AI 助手，擅长日常对话和任务处理',
      skills: ['聊天', '翻译', '写作'],
      avatar: '傻',
    },
    {
      id: '2',
      name: 'Claude',
      role: 'AI专家',
      status: 'online',
      description: '专业的 AI 助手，擅长深度分析和代码编写',
      skills: ['编程', '分析', '推理'],
      avatar: 'C',
    },
    {
      id: '3',
      name: 'GPT-4',
      role: '全能助手',
      status: 'offline',
      description: '强大的语言模型，知识广博',
      skills: ['知识问答', '创意写作', '数学'],
      avatar: 'G',
    },
  ]);

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>🤖 AI 代理</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="agent-list">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-item ${selectedAgent === agent.id ? 'active' : ''}`}
            onClick={() => setSelectedAgent(agent.id)}
          >
            <div className="agent-header">
              <div className={`agent-avatar ${agent.id === '2' ? 'cyan' : ''}`}>
                {agent.avatar}
              </div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
              </div>
              <div className={`agent-status ${agent.status}`} />
            </div>
            <div className="agent-description">{agent.description}</div>
            <div className="agent-skills">
              {agent.skills.map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="agent-panel-footer">
        <button className="add-agent-btn">+ 添加代理</button>
      </div>
    </div>
  );
};
