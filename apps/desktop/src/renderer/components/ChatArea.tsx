import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  agentName?: string;
}

export const ChatArea: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // 模拟 AI 响应
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: '收到您的消息: ' + newMessage.text,
          sender: 'ai',
          timestamp: new Date(),
          agentName: '小助手',
        },
      ]);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h2>💬 当前对话</h2>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌱</div>
            <div className="empty-state-text">开始您的第一次对话</div>
            <div className="empty-state-hint">输入消息与 AI 助手交流</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender === 'user' ? 'user sent' : ''}`}>
              <div className="message-avatar">
                {msg.sender === 'user' ? '我' : (msg.agentName?.[0] || '🤖')}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span>{msg.sender === 'user' ? '我' : (msg.agentName || 'AI 助手')}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-bubble">{msg.text}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入消息... (按 Enter 发送, Shift+Enter 换行)"
          className="chat-input"
          rows={1}
        />
        <button onClick={handleSend} className="send-btn" disabled={!inputText.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
};
