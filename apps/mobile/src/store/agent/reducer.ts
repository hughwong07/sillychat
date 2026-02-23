/**
 * 小傻瓜聊天工具 - Agent Reducer
 */

export type AgentStatus = 'online' | 'offline' | 'busy' | 'away';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  avatar?: string;
  description?: string;
  capabilities?: string[];
}

export interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;
}

export const initialAgentState: AgentState = {
  agents: [],
  selectedAgentId: null,
  isLoading: false,
  error: null,
};

export enum AgentActionType {
  SET_AGENTS = 'SET_AGENTS',
  SELECT_AGENT = 'SELECT_AGENT',
  ADD_AGENT = 'ADD_AGENT',
  REMOVE_AGENT = 'REMOVE_AGENT',
  UPDATE_AGENT = 'UPDATE_AGENT',
  UPDATE_AGENT_STATUS = 'UPDATE_AGENT_STATUS',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
}

export type AgentAction =
  | { type: AgentActionType.SET_AGENTS; payload: Agent[] }
  | { type: AgentActionType.SELECT_AGENT; payload: string | null }
  | { type: AgentActionType.ADD_AGENT; payload: Agent }
  | { type: AgentActionType.REMOVE_AGENT; payload: string }
  | { type: AgentActionType.UPDATE_AGENT; payload: Agent }
  | { type: AgentActionType.UPDATE_AGENT_STATUS; payload: { agentId: string; status: AgentStatus } }
  | { type: AgentActionType.SET_LOADING; payload: boolean }
  | { type: AgentActionType.SET_ERROR; payload: string | null };

export function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case AgentActionType.SET_AGENTS:
      return {
        ...state,
        agents: action.payload,
      };

    case AgentActionType.SELECT_AGENT:
      return {
        ...state,
        selectedAgentId: action.payload,
      };

    case AgentActionType.ADD_AGENT:
      return {
        ...state,
        agents: [...state.agents, action.payload],
      };

    case AgentActionType.REMOVE_AGENT:
      return {
        ...state,
        agents: state.agents.filter((agent) => agent.id !== action.payload),
        selectedAgentId:
          state.selectedAgentId === action.payload ? null : state.selectedAgentId,
      };

    case AgentActionType.UPDATE_AGENT:
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? action.payload : agent
        ),
      };

    case AgentActionType.UPDATE_AGENT_STATUS:
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.agentId
            ? { ...agent, status: action.payload.status }
            : agent
        ),
      };

    case AgentActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AgentActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    default:
      return state;
  }
}
