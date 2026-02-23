/**
 * 身份标识系统
 * 管理AI代理的身份、头像和角标
 */

import {
  AgentIdentity,
  RoleType,
  IRole,
  IAIAvatarRole,
  IAIGuestRole
} from './types';

/**
 * AI头像标识配置
 */
export interface AIAvatarIndicator {
  borderStyle: {
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'glow';
  };
  badge: {
    icon: string;
    position: 'top-right' | 'bottom-right';
    backgroundColor: string;
  };
  watermark: {
    enabled: boolean;
    opacity: number;
    text: string;
  };
}

/**
 * 不同AI类型的标识配置
 */
export const AI_AVATAR_STYLES: Record<RoleType, AIAvatarIndicator> = {
  [RoleType.AI_AVATAR]: {
    borderStyle: { color: '#6366F1', width: 2, style: 'solid' },
    badge: { icon: 'robot', position: 'bottom-right', backgroundColor: '#6366F1' },
    watermark: { enabled: true, opacity: 0.1, text: 'AI' }
  },
  [RoleType.AI_GUEST]: {
    borderStyle: { color: '#8B5CF6', width: 2, style: 'dashed' },
    badge: { icon: 'robot-guest', position: 'bottom-right', backgroundColor: '#8B5CF6' },
    watermark: { enabled: true, opacity: 0.1, text: 'GUEST AI' }
  },
  [RoleType.HUMAN]: {
    borderStyle: { color: '#10B981', width: 0, style: 'solid' },
    badge: { icon: 'user', position: 'bottom-right', backgroundColor: '#10B981' },
    watermark: { enabled: false, opacity: 0, text: '' }
  }
};

/**
 * AI名称显示规则
 */
export interface AIDisplayName {
  baseName: string;
  prefix?: string;
  suffix: string;
  fullName: string;
}

/**
 * 身份标识管理器
 */
export class IdentityManager {
  /**
   * 格式化AI名称
   */
  formatAIName(name: string, roleType: RoleType, isInGroup = false): AIDisplayName {
    const suffix = roleType !== RoleType.HUMAN ? '[AI]' : '';
    const prefix = isInGroup && roleType === RoleType.AI_GUEST ? '[Guest]' : '';

    return {
      baseName: name,
      prefix: prefix || undefined,
      suffix,
      fullName: `${prefix}${name}${suffix}`
    };
  }

  /**
   * 获取AI标识样式
   */
  getAvatarStyle(roleType: RoleType): AIAvatarIndicator {
    return AI_AVATAR_STYLES[roleType];
  }

  /**
   * 创建AI身份标识
   */
  createIdentity(
    id: string,
    name: string,
    role: 'master' | 'assistant' | 'expert' | 'guest',
    options?: {
      avatar?: string;
      description?: string;
      personality?: string;
      welcomeMessage?: string;
    }
  ): AgentIdentity {
    return {
      id,
      name,
      avatar: options?.avatar ?? this.getDefaultAvatar(role),
      role,
      description: options?.description,
      personality: options?.personality,
      welcomeMessage: options?.welcomeMessage
    };
  }

  /**
   * 获取默认头像
   */
  private getDefaultAvatar(role: string): string {
    const defaults: Record<string, string> = {
      master: 'avatars/ai-master.png',
      assistant: 'avatars/ai-assistant.png',
      expert: 'avatars/ai-expert.png',
      guest: 'avatars/ai-guest.png'
    };
    return defaults[role] ?? 'avatars/default.png';
  }

  /**
   * 验证身份标识
   */
  validateIdentity(identity: AgentIdentity): boolean {
    return !!(
      identity.id &&
      identity.name &&
      identity.name.length > 0 &&
      identity.name.length <= 50 &&
      ['master', 'assistant', 'expert', 'guest'].includes(identity.role)
    );
  }

  /**
   * 生成唯一ID
   */
  static generateId(prefix = 'agent'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

