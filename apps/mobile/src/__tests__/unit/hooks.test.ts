/**
 * 小傻瓜聊天工具 - Hooks 单元测试
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useDebounce } from '../../hooks/useDebounce';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { usePrevious } from '../../hooks/usePrevious';

describe('Hooks 测试', () => {
  describe('useLocalStorage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('应该返回默认值', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      expect(result.current[0]).toBe('default');
    });

    it('应该从 localStorage 读取值', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'));
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      expect(result.current[0]).toBe('stored-value');
    });

    it('应该更新 localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));

      act(() => {
        result.current[1]('new-value');
      });

      expect(result.current[0]).toBe('new-value');
      expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('new-value');
    });

    it('应该处理复杂对象', () => {
      const defaultValue = { name: 'test', count: 0 };
      const { result } = renderHook(() => useLocalStorage('obj-key', defaultValue));

      act(() => {
        result.current[1]({ name: 'updated', count: 5 });
      });

      expect(result.current[0]).toEqual({ name: 'updated', count: 5 });
    });
  });

  describe('useDebounce', () => {
    jest.useFakeTimers();

    it('应该延迟返回值', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'changed' });
      expect(result.current).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('changed');
    });

    it('应该取消之前的延迟', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'change1' });
      rerender({ value: 'change2' });
      rerender({ value: 'change3' });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current).toBe('change3');
    });
  });

  describe('useNetworkStatus', () => {
    const mockOnline = (online: boolean) => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: online,
      });
    };

    it('应该返回网络状态', () => {
      mockOnline(true);
      const { result } = renderHook(() => useNetworkStatus());
      expect(result.current.isOnline).toBe(true);
    });

    it('应该监听网络变化', () => {
      mockOnline(true);
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        mockOnline(false);
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('usePrevious', () => {
    it('应该返回之前的值', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 0 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 1 });
      expect(result.current).toBe(0);

      rerender({ value: 2 });
      expect(result.current).toBe(1);
    });
  });
});
