/**
 * 权限系统模块
 * 实现基于角色的权限控制 (RBAC)
 */

import {
  RoleType,
  PermissionLevel,
  OperationType,
  PermissionContext,
  PermissionResult,
  PermissionModifier,
  IRole,
  IAIGuestRole
} from './types';

/**
 * 操作所需的最小权限等级映射
 */
const OPERATION_REQUIRED_LEVEL: Record<OperationType, number> = {
  [OperationType.CREATE_SESSION]: PermissionLevel.AI_COLLABORATE,
  [OperationType.DELETE_SESSION]: PermissionLevel.ADMIN,
  [OperationType.SEND_MESSAGE]: PermissionLevel.AI_READONLY,
  [OperationType.CREATE_AI]: PermissionLevel.MASTER,
  [OperationType.DELETE_AI]: PermissionLevel.MASTER,
  [OperationType.UPDATE_AI_CONFIG]: PermissionLevel.ADMIN,
  [OperationType.USE_SKILL]: PermissionLevel.AI_COLLABORATE,
  [OperationType.GRANT_PERMISSION]: PermissionLevel.ADMIN
};

/**
 * 权限检查器
 */
export class PermissionChecker {
  /**
   * 检查操作权限
   */
  async checkPermission(
    actor: IRole,
    operation: OperationType,
    resourceOwnerId?: string,
    context?: PermissionContext
  ): Promise<PermissionResult> {
    const requiredLevel = this.getRequiredLevel(operation);
    const effectiveLevel = await this.getEffectivePermissionLevel(
      actor,
      resourceOwnerId,
      context
    );

    if (effectiveLevel < requiredLevel) {
      return {
        allowed: false,
        reason: `Permission denied: required level ${requiredLevel}, current level ${effectiveLevel}`,
        requiredLevel,
        currentLevel: effectiveLevel
      };
    }

    // AI访客特殊检查
    if (actor.type === RoleType.AI_GUEST) {
      const guestCheck = this.checkGuestPermissions(actor as IAIGuestRole, operation);
      if (!guestCheck.allowed) {
        return guestCheck;
      }
    }

    return {
      allowed: true,
      requiredLevel,
      currentLevel: effectiveLevel
    };
  }

  /**
   * 获取操作所需的最小权限等级
   */
  private getRequiredLevel(operation: OperationType): number {
    return OPERATION_REQUIRED_LEVEL[operation] ?? PermissionLevel.MASTER;
  }

  /**
   * 计算有效权限等级
   */
  private async getEffectivePermissionLevel(
    actor: IRole,
    resourceOwnerId?: string,
    context?: PermissionContext
  ): Promise<number> {
    let effective = actor.permissionLevel;

    // 资源所有者拥有完全权限
    if (resourceOwnerId && actor.id === resourceOwnerId) {
      return PermissionLevel.MASTER;
    }

    // 应用权限修饰符
    if (context?.modifiers) {
      effective = this.applyModifiers(effective, context.modifiers);
    }

    return effective;
  }

  /**
   * 应用权限修饰符
   */
  private applyModifiers(
    baseLevel: number,
    modifiers: PermissionModifier[]
  ): number {
    let effective = baseLevel;

    for (const modifier of modifiers) {
      if (modifier.type === 'override' && modifier.value !== undefined) {
        effective = modifier.value;
      } else if (modifier.type === 'boost' && modifier.value !== undefined) {
        effective = Math.min(100, effective + modifier.value);
      } else if (modifier.type === 'reduce' && modifier.value !== undefined) {
        effective = Math.max(0, effective - modifier.value);
      }
    }

    return effective;
  }

  /**
   * 检查AI访客权限
   */
  private checkGuestPermissions(
    guest: IAIGuestRole,
    operation: OperationType
  ): PermissionResult {
    // 检查是否过期
    if (guest.expiresAt && guest.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'AI guest permission has expired',
        currentLevel: guest.permissionLevel
      };
    }

    // AI访客不能创建或删除AI
    if (operation === OperationType.CREATE_AI ||
        operation === OperationType.DELETE_AI) {
      return {
        allowed: false,
        reason: 'AI guest cannot create or delete AI agents',
        currentLevel: guest.permissionLevel
      };
    }

    return { allowed: true, currentLevel: guest.permissionLevel };
  }

  /**
   * 验证权限等级是否有效
   */
  static isValidPermissionLevel(level: number): boolean {
    return level >= 0 && level <= 100;
  }

  /**
   * 获取权限等级名称
   */
  static getLevelName(level: number): string {
    if (level >= PermissionLevel.MASTER) return 'Master';
    if (level >= PermissionLevel.ADMIN) return 'Admin';
    if (level >= PermissionLevel.AI_COLLABORATE) return 'AI Collaborate';
    if (level >= PermissionLevel.AI_READONLY) return 'AI Readonly';
    return 'Visitor';
  }
}

/**
 * 权限管理器
 */
export class PermissionManager {
  private checker: PermissionChecker;
  private auditLog: Array<{
    actorId: string;
    operation: OperationType;
    result: boolean;
    timestamp: Date;
  }> = [];

  constructor() {
    this.checker = new PermissionChecker();
  }

  /**
   * 检查权限并记录审计日志
   */
  async check(
    actor: IRole,
    operation: OperationType,
    resourceOwnerId?: string,
    context?: PermissionContext
  ): Promise<PermissionResult> {
    const result = await this.checker.checkPermission(
      actor,
      operation,
      resourceOwnerId,
      context
    );

    this.auditLog.push({
      actorId: actor.id,
      operation,
      result: result.allowed,
      timestamp: new Date()
    });

    return result;
  }

  /**
   * 获取审计日志
   */
  getAuditLog(limit = 100): typeof this.auditLog {
    return this.auditLog.slice(-limit);
  }
}

