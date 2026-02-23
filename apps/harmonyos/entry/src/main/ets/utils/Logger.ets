import { hilog } from '@kit.PerformanceAnalysisKit';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 3,
  INFO = 4,
  WARN = 5,
  ERROR = 6
}

/**
 * 日志工具类
 * 封装鸿蒙系统的hilog日志功能
 */
export class Logger {
  private static readonly DOMAIN = 0x0000;
  private static currentLogLevel: LogLevel = LogLevel.DEBUG;

  /**
   * 设置日志级别
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.currentLogLevel = level;
  }

  /**
   * 获取日志级别
   */
  public static getLogLevel(): LogLevel {
    return Logger.currentLogLevel;
  }

  /**
   * 调试日志
   */
  public static debug(tag: string, message: string, ...args: unknown[]): void {
    if (Logger.currentLogLevel <= LogLevel.DEBUG) {
      hilog.debug(Logger.DOMAIN, tag, message, args);
    }
  }

  /**
   * 信息日志
   */
  public static info(tag: string, message: string, ...args: unknown[]): void {
    if (Logger.currentLogLevel <= LogLevel.INFO) {
      hilog.info(Logger.DOMAIN, tag, message, args);
    }
  }

  /**
   * 警告日志
   */
  public static warn(tag: string, message: string, ...args: unknown[]): void {
    if (Logger.currentLogLevel <= LogLevel.WARN) {
      hilog.warn(Logger.DOMAIN, tag, message, args);
    }
  }

  /**
   * 错误日志
   */
  public static error(tag: string, message: string, ...args: unknown[]): void {
    if (Logger.currentLogLevel <= LogLevel.ERROR) {
      hilog.error(Logger.DOMAIN, tag, message, args);
    }
  }

  /**
   * 致命错误日志
   */
  public static fatal(tag: string, message: string, ...args: unknown[]): void {
    hilog.fatal(Logger.DOMAIN, tag, message, args);
  }

  /**
   * 记录对象
   */
  public static logObject(tag: string, label: string, obj: unknown): void {
    try {
      const jsonString = JSON.stringify(obj, null, 2);
      Logger.debug(tag, `${label}: ${jsonString}`);
    } catch (error) {
      Logger.error(tag, `Failed to log object: ${error}`);
    }
  }

  /**
   * 记录性能
   */
  public static performance(tag: string, label: string, startTime: number): void {
    const duration = Date.now() - startTime;
    Logger.info(tag, `${label} took ${duration}ms`);
  }

  /**
   * 记录函数调用
   */
  public static functionCall(tag: string, functionName: string, ...args: unknown[]): void {
    const argsString = args.map(arg => {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(', ');
    Logger.debug(tag, `Calling ${functionName}(${argsString})`);
  }

  /**
   * 记录网络请求
   */
  public static network(tag: string, method: string, url: string, data?: unknown): void {
    if (data) {
      Logger.debug(tag, `[${method}] ${url}`, JSON.stringify(data));
    } else {
      Logger.debug(tag, `[${method}] ${url}`);
    }
  }

  /**
   * 记录网络响应
   */
  public static networkResponse(tag: string, url: string, status: number, data?: unknown): void {
    if (data) {
      Logger.debug(tag, `Response [${status}] ${url}`, JSON.stringify(data));
    } else {
      Logger.debug(tag, `Response [${status}] ${url}`);
    }
  }
}

/**
 * 日志标签常量
 */
export class LogTags {
  static readonly APP = 'SillyChatApp';
  static readonly UI = 'SillyChatUI';
  static readonly DATA = 'SillyChatData';
  static readonly NETWORK = 'SillyChatNetwork';
  static readonly CHAT = 'SillyChatChat';
  static readonly AGENT = 'SillyChatAgent';
  static readonly SETTINGS = 'SillyChatSettings';
  static readonly PROFILE = 'SillyChatProfile';
}
