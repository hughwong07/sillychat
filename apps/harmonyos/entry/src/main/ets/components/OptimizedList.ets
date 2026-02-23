import { Logger } from '../utils/Logger';

const TAG = 'OptimizedList';

/**
 * 列表项缓存池
 * 用于复用列表项，减少内存分配
 */
export class ListItemPool<T> {
  private pool: T[] = [];
  private maxSize: number;
  private createFn: () => T;
  private resetFn: (item: T) => void;

  constructor(maxSize: number, createFn: () => T, resetFn: (item: T) => void) {
    this.maxSize = maxSize;
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  /**
   * 获取一个列表项
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * 释放列表项回缓存池
   */
  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  /**
   * 清空缓存池
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * 获取缓存池大小
   */
  get size(): number {
    return this.pool.length;
  }
}

/**
 * 虚拟列表配置
 */
export interface VirtualListConfig {
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

/**
 * 虚拟列表状态
 */
export class VirtualListState {
  startIndex: number = 0;
  endIndex: number = 0;
  offsetY: number = 0;
  totalHeight: number = 0;

  constructor(init?: Partial<VirtualListState>) {
    if (init) {
      Object.assign(this, init);
    }
  }
}

/**
 * 虚拟列表计算器
 * 只渲染可视区域内的列表项，提升长列表性能
 */
export class VirtualListCalculator {
  private config: VirtualListConfig;

  constructor(config: VirtualListConfig) {
    this.config = config;
  }

  /**
   * 计算可视区域
   */
  calculateVisibleRange(scrollOffset: number, totalItems: number): VirtualListState {
    const { itemHeight, overscan, containerHeight } = this.config;

    // 计算起始索引
    const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);

    // 计算结束索引
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);

    // 计算总高度
    const totalHeight = totalItems * itemHeight;

    // 计算偏移量
    const offsetY = startIndex * itemHeight;

    return new VirtualListState({
      startIndex,
      endIndex,
      offsetY,
      totalHeight
    });
  }

  /**
   * 获取可视项数量
   */
  getVisibleItemCount(): number {
    return Math.ceil(this.config.containerHeight / this.config.itemHeight) + this.config.overscan * 2;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VirtualListConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 列表性能监控器
 */
export class ListPerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 60;
  private isMonitoring: boolean = false;

  /**
   * 开始监控
   */
  start(): void {
    this.isMonitoring = true;
    this.lastTime = Date.now();
    this.frameCount = 0;
    this.monitorLoop();
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * 记录帧
   */
  recordFrame(): void {
    this.frameCount++;
  }

  /**
   * 监控循环
   */
  private monitorLoop(): void {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastTime = now;

      // 如果FPS过低，记录日志
      if (this.fps < 30) {
        Logger.warn(TAG, `Low FPS detected: ${this.fps}`);
      }
    }

    // 使用setTimeout代替requestAnimationFrame
    setTimeout(() => this.monitorLoop(), 100);
  }

  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number {
    return this.fps;
  }
}

/**
 * 防抖函数
 * 用于优化频繁触发的事件
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
   * 节流函数
 * 用于优化频繁触发的事件
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime: number = 0;

  return function (this: any, ...args: Parameters<T>): void {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 内存管理器
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupCallbacks: (() => void)[] = [];

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * 注册清理回调
   */
  registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * 执行内存清理
   */
  performCleanup(): void {
    Logger.info(TAG, 'Performing memory cleanup');
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        Logger.error(TAG, `Cleanup error: ${JSON.stringify(error)}`);
      }
    });
  }

  /**
   * 建议GC
   */
  suggestGC(): void {
    // 在HarmonyOS中，GC是自动的，但可以通过释放引用来帮助GC
    this.performCleanup();
  }
}
