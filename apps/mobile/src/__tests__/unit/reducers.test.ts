/**
 * 小傻瓜聊天工具 - Reducers 和 Actions 单元测试
 */

import {
  chatReducer,
  initialChatState,
  ChatAction,
  ChatActionType,
} from '../../store/chat/reducer';
import {
  settingsReducer,
  initialSettingsState,
  SettingsAction,
  SettingsActionType,
} from '../../store/settings/reducer';
import {
  agentReducer,
  initialAgentState,
  AgentAction,
  AgentActionType,
} from '../../store/agent/reducer';

describe('Reducers 测试', () => {
  describe('Chat Reducer', () => {
    it('应该处理 ADD_MESSAGE', () => {
      const action: ChatAction = {
        type: ChatActionType.ADD_MESSAGE,
        payload: {
          id: '1',
          content: 'Hello',
          role: 'user',
          timestamp: Date.now(),
        },
      };

      const newState = chatReducer(initialChatState, action);
      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0].content).toBe('Hello');
    });

    it('应该处理 DELETE_MESSAGE', () => {
      const stateWithMessages = {
        ...initialChatState,
        messages: [
          { id: '1', content: 'Hello', role: 'user', timestamp: Date.now() },
          { id: '2', content: 'Hi', role: 'assistant', timestamp: Date.now() },
        ],
      };

      const action: ChatAction = {
        type: ChatActionType.DELETE_MESSAGE,
        payload: '1',
      };

      const newState = chatReducer(stateWithMessages, action);
      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0].id).toBe('2');
    });

    it('应该处理 CLEAR_MESSAGES', () => {
      const stateWithMessages = {
        ...initialChatState,
        messages: [
          { id: '1', content: 'Hello', role: 'user', timestamp: Date.now() },
        ],
      };

      const action: ChatAction = {
        type: ChatActionType.CLEAR_MESSAGES,
      };

      const newState = chatReducer(stateWithMessages, action);
      expect(newState.messages).toHaveLength(0);
    });

    it('应该处理 SET_TYPING', () => {
      const action: ChatAction = {
        type: ChatActionType.SET_TYPING,
        payload: true,
      };

      const newState = chatReducer(initialChatState, action);
      expect(newState.isTyping).toBe(true);
    });

    it('应该处理 SET_ERROR', () => {
      const action: ChatAction = {
        type: ChatActionType.SET_ERROR,
        payload: 'Network error',
      };

      const newState = chatReducer(initialChatState, action);
      expect(newState.error).toBe('Network error');
    });

    it('应该处理 SET_CURRENT_CONVERSATION', () => {
      const action: ChatAction = {
        type: ChatActionType.SET_CURRENT_CONVERSATION,
        payload: 'conv-123',
      };

      const newState = chatReducer(initialChatState, action);
      expect(newState.currentConversationId).toBe('conv-123');
    });

    it('应该返回相同状态对于未知 action', () => {
      const action = { type: 'UNKNOWN' } as any;
      const newState = chatReducer(initialChatState, action);
      expect(newState).toBe(initialChatState);
    });
  });

  describe('Settings Reducer', () => {
    it('应该处理 SET_THEME', () => {
      const action: SettingsAction = {
        type: SettingsActionType.SET_THEME,
        payload: 'dark',
      };

      const newState = settingsReducer(initialSettingsState, action);
      expect(newState.theme).toBe('dark');
    });

    it('应该处理 SET_LANGUAGE', () => {
      const action: SettingsAction = {
        type: SettingsActionType.SET_LANGUAGE,
        payload: 'en',
      };

      const newState = settingsReducer(initialSettingsState, action);
      expect(newState.language).toBe('en');
    });

    it('应该处理 SET_NOTIFICATIONS', () => {
      const action: SettingsAction = {
        type: SettingsActionType.SET_NOTIFICATIONS,
        payload: false,
      };

      const newState = settingsReducer(initialSettingsState, action);
      expect(newState.notificationsEnabled).toBe(false);
    });

    it('应该处理 SET_FONT_SIZE', () => {
      const action: SettingsAction = {
        type: SettingsActionType.SET_FONT_SIZE,
        payload: 'large',
      };

      const newState = settingsReducer(initialSettingsState, action);
      expect(newState.fontSize).toBe('large');
    });

    it('应该处理 SET_MESSAGE_PREVIEW', () => {
      const action: SettingsAction = {
        type: SettingsActionType.SET_MESSAGE_PREVIEW,
        payload: false,
      };

      const newState = settingsReducer(initialSettingsState, action);
      expect(newState.messagePreview).toBe(false);
    });

    it('应该处理 RESET_SETTINGS', () => {
      const modifiedState = {
        ...initialSettingsState,
        theme: 'dark',
        language: 'en',
      };

      const action: SettingsAction = {
        type: SettingsActionType.RESET_SETTINGS,
      };

      const newState = settingsReducer(modifiedState, action);
      expect(newState).toEqual(initialSettingsState);
    });
  });

  describe('Agent Reducer', () => {
    it('应该处理 SET_AGENTS', () => {
      const agents = [
        { id: '1', name: 'Agent 1', role: 'assistant', status: 'online' },
        { id: '2', name: 'Agent 2', role: 'expert', status: 'offline' },
      ];

      const action: AgentAction = {
        type: AgentActionType.SET_AGENTS,
        payload: agents,
      };

      const newState = agentReducer(initialAgentState, action);
      expect(newState.agents).toHaveLength(2);
      expect(newState.agents[0].name).toBe('Agent 1');
    });

    it('应该处理 SELECT_AGENT', () => {
      const action: AgentAction = {
        type: AgentActionType.SELECT_AGENT,
        payload: 'agent-123',
      };

      const newState = agentReducer(initialAgentState, action);
      expect(newState.selectedAgentId).toBe('agent-123');
    });

    it('应该处理 ADD_AGENT', () => {
      const newAgent = {
        id: '3',
        name: 'New Agent',
        role: 'assistant',
        status: 'online',
      };

      const action: AgentAction = {
        type: AgentActionType.ADD_AGENT,
        payload: newAgent,
      };

      const newState = agentReducer(initialAgentState, action);
      expect(newState.agents).toHaveLength(1);
      expect(newState.agents[0].name).toBe('New Agent');
    });

    it('应该处理 REMOVE_AGENT', () => {
      const stateWithAgents = {
        ...initialAgentState,
        agents: [
          { id: '1', name: 'Agent 1', role: 'assistant', status: 'online' },
          { id: '2', name: 'Agent 2', role: 'expert', status: 'offline' },
        ],
      };

      const action: AgentAction = {
        type: AgentActionType.REMOVE_AGENT,
        payload: '1',
      };

      const newState = agentReducer(stateWithAgents, action);
      expect(newState.agents).toHaveLength(1);
      expect(newState.agents[0].id).toBe('2');
    });

    it('应该处理 UPDATE_AGENT_STATUS', () => {
      const stateWithAgents = {
        ...initialAgentState,
        agents: [
          { id: '1', name: 'Agent 1', role: 'assistant', status: 'online' },
        ],
      };

      const action: AgentAction = {
        type: AgentActionType.UPDATE_AGENT_STATUS,
        payload: { agentId: '1', status: 'busy' },
      };

      const newState = agentReducer(stateWithAgents, action);
      expect(newState.agents[0].status).toBe('busy');
    });

    it('应该处理 SET_LOADING', () => {
      const action: AgentAction = {
        type: AgentActionType.SET_LOADING,
        payload: true,
      };

      const newState = agentReducer(initialAgentState, action);
      expect(newState.isLoading).toBe(true);
    });
  });
});
