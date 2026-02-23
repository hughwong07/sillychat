/**
 * 工具系统模块
 * 管理AI代理可用的工具
 */

import {
  ITool,
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolCall
} from './types';
import { PermissionChecker } from './permissions';
import { PermissionLevel } from './types';

/**
 * 工具注册表
 */
export class ToolRegistry {
  private tools = new Map<string, ITool>();

  /**
   * 注册工具
   */
  register(tool: ITool): void {
    const { id } = tool.definition;
    if (this.tools.has(id)) {
      throw new Error(`Tool ${id} is already registered`);
    }
    this.tools.set(id, tool);
  }

  /**
   * 注销工具
   */
  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  /**
   * 获取工具
   */
  get(toolId: string): ITool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * 获取所有工具定义
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  /**
   * 检查工具是否存在
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }
}

/**
 * 工具执行器
 */
export class ToolExecutor {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * 执行工具
   */
  async execute(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.get(toolCall.name);

    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolCall.name} not found`,
        executionTime: 0
      };
    }

    // 权限检查
    if (tool.definition.requiresPermission) {
      const minLevel = tool.definition.minPermissionLevel ?? PermissionLevel.AI_COLLABORATE;
      if (context.permissionLevel < minLevel) {
        return {
          success: false,
          error: `Permission denied: requires level ${minLevel}`,
          executionTime: 0
        };
      }
    }

    const startTime = Date.now();

    try {
      const result = await tool.execute(toolCall.arguments, context);
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 批量执行工具
   */
  async executeBatch(
    toolCalls: ToolCall[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      toolCalls.map(call => this.execute(call, context))
    );
  }
}

/**
 * 内置工具示例 - 文件读取工具
 */
export class FileReadTool implements ITool {
  definition: ToolDefinition = {
    id: 'file_read',
    name: 'file_read',
    description: 'Read content from a file',
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'File path to read',
        required: true
      }
    ],
    returns: {
      type: 'string',
      description: 'File content'
    },
    requiresPermission: true,
    minPermissionLevel: PermissionLevel.AI_READONLY
  };

  async execute(
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const path = args.path as string;

    try {
      // 模拟文件读取
      return {
        success: true,
        data: `Content of ${path}`,
        executionTime: 100
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error}`,
        executionTime: 0
      };
    }
  }
}

/**
 * 内置工具示例 - 网络搜索工具
 */
export class WebSearchTool implements ITool {
  definition: ToolDefinition = {
    id: 'web_search',
    name: 'web_search',
    description: 'Search the web for information',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Search query',
        required: true
      }
    ],
    returns: {
      type: 'array',
      description: 'Search results'
    },
    requiresPermission: true,
    minPermissionLevel: PermissionLevel.AI_COLLABORATE
  };

  async execute(
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const query = args.query as string;

    return {
      success: true,
      data: [`Search result for: ${query}`],
      executionTime: 500
    };
  }
}

