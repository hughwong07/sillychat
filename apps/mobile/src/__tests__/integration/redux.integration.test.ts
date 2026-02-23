/**
 * Redux State Flow Integration Tests
 * SillyChat Mobile - Tests for Redux action dispatching and state updates
 */

import {
  chatReducer,
  initialChatState,
  ChatActionType,
  ChatMessage,
} from '../../store/chat/reducer';
import {
  settingsReducer,
  initialSettingsState,
  SettingsActionType,
} from '../../store/settings/reducer';
import {
  agentReducer,
  initialAgentState,
  AgentActionType,
} from '../../store/agent/reducer';

describe('Redux State Flow Integration', () => {
  describe('Chat State Flow', () => {
    it('should handle complete message lifecycle', () => {
      let state = initialChatState;

      // Add first message
      const message1: ChatMessage = {
        id: 'msg-1',
        content: 'Hello',
        role: 'user',
        timestamp: Date.now(),
      };

      state = chatReducer(state, {
        type: ChatActionType.ADD_MESSAGE,
        payload: message1,
      });

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('Hello');

      // Add second message
      const message2: ChatMessage = {
        id: 'msg-2',
        content: 'Hi there!',
        role: 'assistant',
        timestamp: Date.now(),
      };

      state = chatReducer(state, {
        type: ChatActionType.ADD_MESSAGE,
        payload: message2,
      });

      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe('Hi there!');

      // Set typing indicator
      state = chatReducer(state, {
        type: ChatActionType.SET_TYPING,
        payload: true,
      });

      expect(state.isTyping).toBe(true);

      // Delete first message
      state = chatReducer(state, {
        type: ChatActionType.DELETE_MESSAGE,
        payload: 'msg-1',
      });

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe('msg-2');

      // Clear all messages
      state = chatReducer(state, {
        type: ChatActionType.CLEAR_MESSAGES,
      });

      expect(state.messages).toHaveLength(0);
      expect(state.isTyping).toBe(false);
    });

    it('should handle conversation switching', () => {
      let state = initialChatState;

      // Set current conversation
      state = chatReducer(state, {
        type: ChatActionType.SET_CURRENT_CONVERSATION,
        payload: 'conv-123',
      });

      expect(state.currentConversationId).toBe('conv-123');

      // Add messages to conversation
      state = chatReducer(state, {
        type: ChatActionType.ADD_MESSAGE,
        payload: {
          id: 'msg-1',
          content: 'Message in conv-123',
          role: 'user',
          timestamp: Date.now(),
        },
      });

      expect(state.messages).toHaveLength(1);

      // Switch to different conversation
      state = chatReducer(state, {
        type: ChatActionType.SET_CURRENT_CONVERSATION,
        payload: 'conv-456',
      });

      expect(state.currentConversationId).toBe('conv-456');
      // Messages should be cleared when switching conversations
      // (This depends on your app logic)
    });

    it('should handle error states', () => {
      let state = initialChatState;

      // Set loading
      state = chatReducer(state, {
        type: ChatActionType.SET_LOADING,
        payload: true,
      });

      expect(state.isLoading).toBe(true);

      // Set error
      state = chatReducer(state, {
        type: ChatActionType.SET_ERROR,
        payload: 'Network connection failed',
      });

      expect(state.error).toBe('Network connection failed');
      expect(state.isLoading).toBe(true); // Loading state preserved

      // Clear error
      state = chatReducer(state, {
        type: ChatActionType.SET_ERROR,
        payload: null,
      });

      expect(state.error).toBeNull();
    });

    it('should handle message updates', () => {
      let state = initialChatState;

      // Add initial message
      state = chatReducer(state, {
        type: ChatActionType.ADD_MESSAGE,
        payload: {
          id: 'msg-1',
          content: 'Original content',
          role: 'user',
          timestamp: Date.now(),
        },
      });

      // Update message
      state = chatReducer(state, {
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          id: 'msg-1',
          content: 'Updated content',
        },
      });

      expect(state.messages[0].content).toBe('Updated content');
    });

    it('should handle multiple rapid state changes', () => {
      let state = initialChatState;

      // Simulate rapid message additions
      for (let i = 0; i < 10; i++) {
        state = chatReducer(state, {
          type: ChatActionType.ADD_MESSAGE,
          payload: {
            id: `msg-${i}`,
            content: `Message ${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            timestamp: Date.now(),
          },
        });
      }

      expect(state.messages).toHaveLength(10);
      expect(state.messages[0].content).toBe('Message 0');
      expect(state.messages[9].content).toBe('Message 9');
    });
  });

  describe('Settings State Flow', () => {
    it('should handle theme changes', () => {
      let state = initialSettingsState;

      // Change to dark theme
      state = settingsReducer(state, {
        type: SettingsActionType.SET_THEME,
        payload: 'dark',
      });

      expect(state.theme).toBe('dark');

      // Change to light theme
      state = settingsReducer(state, {
        type: SettingsActionType.SET_THEME,
        payload: 'light',
      });

      expect(state.theme).toBe('light');
    });

    it('should handle language changes', () => {
      let state = initialSettingsState;

      state = settingsReducer(state, {
        type: SettingsActionType.SET_LANGUAGE,
        payload: 'zh-CN',
      });

      expect(state.language).toBe('zh-CN');

      state = settingsReducer(state, {
        type: SettingsActionType.SET_LANGUAGE,
        payload: 'en',
      });

      expect(state.language).toBe('en');
    });

    it('should handle notification settings', () => {
      let state = initialSettingsState;

      // Disable notifications
      state = settingsReducer(state, {
        type: SettingsActionType.SET_NOTIFICATIONS,
        payload: false,
      });

      expect(state.notificationsEnabled).toBe(false);

      // Enable notifications
      state = settingsReducer(state, {
        type: SettingsActionType.SET_NOTIFICATIONS,
        payload: true,
      });

      expect(state.notificationsEnabled).toBe(true);
    });

    it('should handle font size changes', () => {
      let state = initialSettingsState;

      const fontSizes = ['small', 'medium', 'large'] as const;

      for (const size of fontSizes) {
        state = settingsReducer(state, {
          type: SettingsActionType.SET_FONT_SIZE,
          payload: size,
        });

        expect(state.fontSize).toBe(size);
      }
    });

    it('should handle settings reset', () => {
      let state = initialSettingsState;

      // Modify multiple settings
      state = settingsReducer(state, {
        type: SettingsActionType.SET_THEME,
        payload: 'dark',
      });
      state = settingsReducer(state, {
        type: SettingsActionType.SET_LANGUAGE,
        payload: 'en',
      });
      state = settingsReducer(state, {
        type: SettingsActionType.SET_NOTIFICATIONS,
        payload: false,
      });

      expect(state.theme).toBe('dark');
      expect(state.language).toBe('en');
      expect(state.notificationsEnabled).toBe(false);

      // Reset to defaults
      state = settingsReducer(state, {
        type: SettingsActionType.RESET_SETTINGS,
      });

      expect(state).toEqual(initialSettingsState);
    });

    it('should handle message preview toggle', () => {
      let state = initialSettingsState;

      state = settingsReducer(state, {
        type: SettingsActionType.SET_MESSAGE_PREVIEW,
        payload: false,
      });

      expect(state.messagePreview).toBe(false);

      state = settingsReducer(state, {
        type: SettingsActionType.SET_MESSAGE_PREVIEW,
        payload: true,
      });

      expect(state.messagePreview).toBe(true);
    });
  });

  describe('Agent State Flow', () => {
    it('should handle agent list updates', () => {
      let state = initialAgentState;

      const agents = [
        { id: 'agent-1', name: 'Assistant', role: 'assistant', status: 'online' },
        { id: 'agent-2', name: 'Expert', role: 'expert', status: 'offline' },
        { id: 'agent-3', name: 'Coder', role: 'coder', status: 'busy' },
      ];

      state = agentReducer(state, {
        type: AgentActionType.SET_AGENTS,
        payload: agents,
      });

      expect(state.agents).toHaveLength(3);
      expect(state.agents[0].name).toBe('Assistant');
      expect(state.agents[1].status).toBe('offline');
    });

    it('should handle agent selection', () => {
      let state = initialAgentState;

      // Set agents first
      state = agentReducer(state, {
        type: AgentActionType.SET_AGENTS,
        payload: [
          { id: 'agent-1', name: 'Assistant', role: 'assistant', status: 'online' },
          { id: 'agent-2', name: 'Expert', role: 'expert', status: 'online' },
        ],
      });

      // Select an agent
      state = agentReducer(state, {
        type: AgentActionType.SELECT_AGENT,
        payload: 'agent-1',
      });

      expect(state.selectedAgentId).toBe('agent-1');

      // Select different agent
      state = agentReducer(state, {
        type: AgentActionType.SELECT_AGENT,
        payload: 'agent-2',
      });

      expect(state.selectedAgentId).toBe('agent-2');

      // Deselect
      state = agentReducer(state, {
        type: AgentActionType.SELECT_AGENT,
        payload: null,
      });

      expect(state.selectedAgentId).toBeNull();
    });

    it('should handle adding new agents', () => {
      let state = initialAgentState;

      const newAgent = {
        id: 'agent-new',
        name: 'New Agent',
        role: 'specialist',
        status: 'online',
      };

      state = agentReducer(state, {
        type: AgentActionType.ADD_AGENT,
        payload: newAgent,
      });

      expect(state.agents).toHaveLength(1);
      expect(state.agents[0].id).toBe('agent-new');
    });

    it('should handle removing agents', () => {
      let state = initialAgentState;

      // Add agents
      state = agentReducer(state, {
        type: AgentActionType.SET_AGENTS,
        payload: [
          { id: 'agent-1', name: 'Agent 1', role: 'assistant', status: 'online' },
          { id: 'agent-2', name: 'Agent 2', role: 'expert', status: 'online' },
          { id: 'agent-3', name: 'Agent 3', role: 'coder', status: 'offline' },
        ],
      });

      expect(state.agents).toHaveLength(3);

      // Remove an agent
      state = agentReducer(state, {
        type: AgentActionType.REMOVE_AGENT,
        payload: 'agent-2',
      });

      expect(state.agents).toHaveLength(2);
      expect(state.agents.find(a => a.id === 'agent-2')).toBeUndefined();
    });

    it('should handle agent status updates', () => {
      let state = initialAgentState;

      // Add agent
      state = agentReducer(state, {
        type: AgentActionType.SET_AGENTS,
        payload: [
          { id: 'agent-1', name: 'Agent 1', role: 'assistant', status: 'online' },
        ],
      });

      // Update status
      state = agentReducer(state, {
        type: AgentActionType.UPDATE_AGENT_STATUS,
        payload: { agentId: 'agent-1', status: 'busy' },
      });

      expect(state.agents[0].status).toBe('busy');

      // Update to offline
      state = agentReducer(state, {
        type: AgentActionType.UPDATE_AGENT_STATUS,
        payload: { agentId: 'agent-1', status: 'offline' },
      });

      expect(state.agents[0].status).toBe('offline');
    });

    it('should handle loading states', () => {
      let state = initialAgentState;

      state = agentReducer(state, {
        type: AgentActionType.SET_LOADING,
        payload: true,
      });

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();

      state = agentReducer(state, {
        type: AgentActionType.SET_LOADING,
        payload: false,
      });

      expect(state.isLoading).toBe(false);
    });

    it('should handle errors', () => {
      let state = initialAgentState;

      state = agentReducer(state, {
        type: AgentActionType.SET_ERROR,
        payload: 'Failed to load agents',
      });

      expect(state.error).toBe('Failed to load agents');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Cross-Reducer Integration', () => {
    it('should maintain independent state slices', () => {
      let chatState = initialChatState;
      let settingsState = initialSettingsState;
      let agentState = initialAgentState;

      // Update each slice independently
      chatState = chatReducer(chatState, {
        type: ChatActionType.ADD_MESSAGE,
        payload: {
          id: 'msg-1',
          content: 'Hello',
          role: 'user',
          timestamp: Date.now(),
        },
      });

      settingsState = settingsReducer(settingsState, {
        type: SettingsActionType.SET_THEME,
        payload: 'dark',
      });

      agentState = agentReducer(agentState, {
        type: AgentActionType.SET_AGENTS,
        payload: [{ id: 'agent-1', name: 'Assistant', role: 'assistant', status: 'online' }],
      });

      // Verify each slice is independent
      expect(chatState.messages).toHaveLength(1);
      expect(settingsState.theme).toBe('dark');
      expect(agentState.agents).toHaveLength(1);

      // Verify no cross-contamination
      expect(chatState).not.toHaveProperty('theme');
      expect(settingsState).not.toHaveProperty('messages');
      expect(agentState).not.toHaveProperty('messages');
    });

    it('should handle simultaneous state updates', () => {
      let chatState = initialChatState;
      let settingsState = initialSettingsState;

      // Simulate simultaneous updates
      const updates = [
        () =>
          (chatState = chatReducer(chatState, {
            type: ChatActionType.ADD_MESSAGE,
            payload: { id: '1', content: 'A', role: 'user', timestamp: Date.now() },
          })),
        () =>
          (settingsState = settingsReducer(settingsState, {
            type: SettingsActionType.SET_THEME,
            payload: 'dark',
          })),
        () =>
          (chatState = chatReducer(chatState, {
            type: ChatActionType.SET_TYPING,
            payload: true,
          })),
        () =>
          (settingsState = settingsReducer(settingsState, {
            type: SettingsActionType.SET_LANGUAGE,
            payload: 'zh-CN',
          })),
      ];

      // Execute updates
      updates.forEach(update => update());

      // Verify final states
      expect(chatState.messages).toHaveLength(1);
      expect(chatState.isTyping).toBe(true);
      expect(settingsState.theme).toBe('dark');
      expect(settingsState.language).toBe('zh-CN');
    });
  });
});
