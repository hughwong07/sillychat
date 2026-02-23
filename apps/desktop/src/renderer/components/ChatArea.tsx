import React, { useState } from 'react';

export const ChatArea: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; sender: 'user' | 'ai' }>>([]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user' as const,
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: '收到您的消息: ' + newMessage.text,
          sender: 'ai',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        <h2>当前对话</h2>
      </div>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>开始您的第一次对话</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">{msg.text}</div>
            </div>
          ))
        )}
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          className="chat-input"
        />
        <button onClick={handleSend} className="send-btn">
          发送
        </button>
      </div>
    </div>
  );
};
