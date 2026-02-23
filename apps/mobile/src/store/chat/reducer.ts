/**
 * 小傻瓜聊天工具 - Chat Reducer
 */

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  attachments?: string[];
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  currentConversationId: string | null;
  isLoading: boolean;
}

export const initialChatState: ChatState = {
  messages: [],
  isTyping: false,
  error: null,
  currentConversationId: null,
  isLoading: false,
};

export enum ChatActionType {
  ADD_MESSAGE = 'ADD_MESSAGE',
  DELETE_MESSAGE = 'DELETE_MESSAGE',
  CLEAR_MESSAGES = 'CLEAR_MESSAGES',
  SET_TYPING = 'SET_TYPING',
  SET_ERROR = 'SET_ERROR',
  SET_LOADING = 'SET_LOADING',
  SET_CURRENT_CONVERSATION = 'SET_CURRENT_CONVERSATION',
  UPDATE_MESSAGE = 'UPDATE_MESSAGE',
}

export type ChatAction =
  | { type: ChatActionType.ADD_MESSAGE; payload: ChatMessage }
  | { type: ChatActionType.DELETE_MESSAGE; payload: string }
  | { type: ChatActionType.CLEAR_MESSAGES }
  | { type: ChatActionType.SET_TYPING; payload: boolean }
  | { type: ChatActionType.SET_ERROR; payload: string | null }
  | { type: ChatActionType.SET_LOADING; payload: boolean }
  | { type: ChatActionType.SET_CURRENT_CONVERSATION; payload: string | null }
  | { type: ChatActionType.UPDATE_MESSAGE; payload: { id: string; content: string } };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case ChatActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case ChatActionType.DELETE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== action.payload),
      };

    case ChatActionType.CLEAR_MESSAGES:
      return {
        ...state,
        messages: [],
        error: null,
      };

    case ChatActionType.SET_TYPING:
      return {
        ...state,
        isTyping: action.payload,
      };

    case ChatActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case ChatActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ChatActionType.SET_CURRENT_CONVERSATION:
      return {
        ...state,
        currentConversationId: action.payload,
      };

    case ChatActionType.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        ),
      };

    default:
      return state;
  }
}
