/**
 * 小傻瓜聊天工具 - 单元测试
 * 工具函数测试
 */

import {
  formatTimestamp,
  truncateText,
  isValidEmail,
  generateId,
  debounce,
  throttle,
  deepClone,
  isEmptyObject,
  formatFileSize,
  parseJSONSafe
} from '../../utils/helpers';

describe('工具函数测试', () => {
  describe('formatTimestamp', () => {
    it('应该正确格式化时间戳', () => {
      const timestamp = new Date('2024-01-15 14:30:00').getTime();
      const result = formatTimestamp(timestamp);
      expect(result).toMatch(/14:30/);
    });

    it('应该处理今天的日期', () => {
      const today = new Date();
      today.setHours(10, 30, 0, 0);
      const result = formatTimestamp(today.getTime());
      expect(result).toContain('今天');
    });

    it('应该处理昨天的日期', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 30, 0, 0);
      const result = formatTimestamp(yesterday.getTime());
      expect(result).toContain('昨天');
    });

    it('应该处理无效的时间戳', () => {
      const result = formatTimestamp(NaN);
      expect(result).toBe('--');
    });
  });

  describe('truncateText', () => {
    it('应该截断超长文本', () => {
      const text = '这是一个非常长的文本内容';
      const result = truncateText(text, 5);
      expect(result).toBe('这是一个非常...');
    });

    it('应该保留短文本', () => {
      const text = '短文本';
      const result = truncateText(text, 10);
      expect(result).toBe('短文本');
    });

    it('应该处理空字符串', () => {
      const result = truncateText('', 10);
      expect(result).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('应该验证有效邮箱', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
    });

    it('应该拒绝无效邮箱', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('应该生成唯一ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toHaveLength(20);
    });

    it('应该只包含有效字符', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('应该延迟执行函数', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn();
      expect(fn).not.toBeCalled();

      jest.advanceTimersByTime(300);
      expect(fn).toBeCalled();
    });

    it('应该取消之前的调用', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 300);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      jest.advanceTimersByTime(300);
      expect(fn).toBeCalledTimes(1);
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('应该限制函数执行频率', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toBeCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toBeCalledTimes(2);
    });
  });

  describe('deepClone', () => {
    it('应该深克隆对象', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('应该处理数组', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it('应该处理 null', () => {
      expect(deepClone(null)).toBeNull();
    });
  });

  describe('isEmptyObject', () => {
    it('应该识别空对象', () => {
      expect(isEmptyObject({})).toBe(true);
    });

    it('应该识别非空对象', () => {
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });

    it('应该处理 null', () => {
      expect(isEmptyObject(null)).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化字节', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('应该格式化 KB', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
    });

    it('应该格式化 MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });

    it('应该格式化 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('parseJSONSafe', () => {
    it('应该成功解析有效 JSON', () => {
      const result = parseJSONSafe('{"a":1}', {});
      expect(result).toEqual({ a: 1 });
    });

    it('应该处理无效 JSON', () => {
      const fallback = { default: true };
      const result = parseJSONSafe('invalid', fallback);
      expect(result).toBe(fallback);
    });

    it('应该处理空字符串', () => {
      const fallback = { default: true };
      const result = parseJSONSafe('', fallback);
      expect(result).toBe(fallback);
    });
  });
});
