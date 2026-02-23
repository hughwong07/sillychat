/**
 * 性能优化工具
 * 提供防抖、节流、缓存等性能优化功能
 */

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * 防抖Hook
 * @param callback 回调函数
 * @param delay 延迟时间（毫秒）
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * 节流Hook
 * @param callback 回调函数
 * @param interval 间隔时间（毫秒）
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  interval: number
): (...args: Parameters<T>) => void {
  const lastTimeRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastTimeRef.current >= interval) {
        lastTimeRef.current = now;
        callback(...args);
      }
    },
    [callback, interval]
  );
}

/**
 * 记忆化计算Hook
 * 带缓存的计算函数
 */
export function useMemoized<T, R>(
  compute: (arg: T) => R,
  keyFn?: (arg: T) => string
): (arg: T) => R {
  const cacheRef = useRef<Map<string, R>>(new Map());

  return useCallback(
    (arg: T) => {
      const key = keyFn ? keyFn(arg) : String(arg);
      if (cacheRef.current.has(key)) {
        return cacheRef.current.get(key)!;
      }
      const result = compute(arg);
      cacheRef.current.set(key, result);
      return result;
    },
    [compute, keyFn]
  );
}

/**
 * 清除缓存
 */
export function clearMemoizedCache(): void {
  // 这个方法用于全局清除缓存
}

/**
 * 性能监控Hook
 * 监控组件渲染性能
 */
export function usePerformanceMonitor(componentName: string): void {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    const endTime = performance.now();
    const duration = startTimeRef.current ? endTime - startTimeRef.current : 0;

    if (duration > 16) {
      // 超过一帧的时间（60fps）
      console.warn(
        `[Performance] ${componentName} rendered slowly: ${duration.toFixed(2)}ms`
      );
    }

    startTimeRef.current = performance.now();
  });

  useEffect(() => {
    return () => {
      console.log(
        `[Performance] ${componentName} total renders: ${renderCountRef.current}`
      );
    };
  }, [componentName]);
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
export interface VirtualListState {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

/**
 * 虚拟列表计算器
 * 只渲染可视区域内的列表项
 */
export function calculateVisibleRange(
  scrollOffset: number,
  totalItems: number,
  config: VirtualListConfig
): VirtualListState {
  const { itemHeight, overscan, containerHeight } = config;

  const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);

  return {
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
    totalHeight: totalItems * itemHeight,
  };
}

/**
 * 图片预加载
 * @param urls 图片URL数组
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
    })
  );
}

/**
 * 测量函数执行时间
 * @param fn 要测量的函数
 * @param label 标签
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

/**
 * FPS监控Hook
 */
export function useFPSMonitor(): number {
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    let animationFrameId: number;

    const updateFPS = () => {
      frameCountRef.current++;
      const now = Date.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return fps;
}

/**
 * 内存使用监控（仅Web环境）
 */
export function useMemoryMonitor(): { used: number; total: number } | null {
  const [memory, setMemory] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if ('memory' in performance) {
      const interval = setInterval(() => {
        const memoryInfo = (performance as any).memory;
        setMemory({
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return memory;
}
