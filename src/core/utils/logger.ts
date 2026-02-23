/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持不同日志级别和输出格式
 */

/** 日志级别枚举 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/** 日志级别名称映射 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

/** 日志配置选项 */
export interface LoggerOptions {
  /** 最低日志级别 */
  minLevel?: LogLevel;
  /** 是否包含时间戳 */
  timestamp?: boolean;
  /** 是否包含颜色 */
  colors?: boolean;
  /** 自定义输出函数 */
  output?: (message: string) => void;
  /** 前缀 */
  prefix?: string;
}

/** 日志条目 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/** 日志处理器 */
export type LogHandler = (entry: LogEntry) => void;

/** ANSI 颜色代码 */
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',   // 青色
  info: '\x1b[32m',    // 绿色
  warn: '\x1b[33m',    // 黄色
  error: '\x1b[31m',   // 红色
  fatal: '\x1b[35m',   // 紫色
  gray: '\x1b[90m'     // 灰色
};

/** 默认配置 */
const DEFAULT_OPTIONS: Required<LoggerOptions> = {
  minLevel: LogLevel.INFO,
  timestamp: true,
  colors: true,
  output: console.log,
  prefix: ''
};

/** 日志记录器类 */
export class Logger {
  private options: Required<LoggerOptions>;
  private handlers: LogHandler[] = [];

  constructor(options: LoggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 更新配置
   */
  configure(options: LoggerOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 添加日志处理器
   */
  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }

  /**
   * 移除日志处理器
   */
  removeHandler(handler: LogHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * 格式化日志消息
   */
  private format(entry: LogEntry): string {
    const parts: string[] = [];

    // 时间戳
    if (this.options.timestamp) {
      const timeStr = entry.timestamp.toISOString();
      parts.push(this.options.colors ? `${COLORS.gray}[${timeStr}]${COLORS.reset}` : `[${timeStr}]`);
    }

    // 日志级别
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const color = this.options.colors ? COLORS[LogLevel[entry.level].toLowerCase() as keyof typeof COLORS] : '';
    const reset = this.options.colors ? COLORS.reset : '';
    parts.push(`${color}[${levelName}]${reset}`);

    // 前缀
    if (this.options.prefix) {
      parts.push(`[${this.options.prefix}]`);
    }

    // 消息内容
    parts.push(entry.message);

    // 上下文
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(' ');
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level < this.options.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context
    };

    // 输出到控制台
    const formatted = this.format(entry);
    this.options.output(formatted);

    // 调用注册的处理器
    this.handlers.forEach(handler => {
      try {
        handler(entry);
      } catch (err) {
        console.error('Log handler error:', err);
      }
    });
  }

  /** 调试日志 */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /** 信息日志 */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /** 警告日志 */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /** 错误日志 */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /** 致命错误日志 */
  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context);
  }

  /**
   * 创建子日志记录器
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix
    });
  }

  /**
   * 创建子日志记录器 (别名)
   */
  createChild(prefix: string): Logger {
    return this.child(prefix);
  }
}

/** 默认日志实例 */
export const logger = new Logger();

/** 快速日志函数 */
export const logDebug = (msg: string, ctx?: Record<string, unknown>) => logger.debug(msg, ctx);
export const logInfo = (msg: string, ctx?: Record<string, unknown>) => logger.info(msg, ctx);
export const logWarn = (msg: string, ctx?: Record<string, unknown>) => logger.warn(msg, ctx);
export const logError = (msg: string, ctx?: Record<string, unknown>) => logger.error(msg, ctx);
export const logFatal = (msg: string, ctx?: Record<string, unknown>) => logger.fatal(msg, ctx);
