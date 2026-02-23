/**
 * 日期时间工具函数
 */

import {TIME_DISPLAY} from '../constants/messages';

/**
 * 格式化时间戳为相对时间
 * @param timestamp 时间戳（毫秒）
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // 小于1分钟
  if (diff < 60 * 1000) {
    return TIME_DISPLAY.justNow;
  }

  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return TIME_DISPLAY.minutesAgo.replace('{minutes}', String(minutes));
  }

  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return TIME_DISPLAY.hoursAgo.replace('{hours}', String(hours));
  }

  // 昨天
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const targetDate = new Date(timestamp);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === yesterday.getTime()) {
    return TIME_DISPLAY.yesterday;
  }

  // 小于7天
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return TIME_DISPLAY.daysAgo.replace('{days}', String(days));
  }

  return TIME_DISPLAY.longTimeAgo;
}

/**
 * 格式化时间戳为聊天时间显示
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
export function formatChatTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const isToday = now.toDateString() === date.toDateString();

  // 今天显示时间
  if (isToday) {
    return formatTime(date);
  }

  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return `昨天 ${formatTime(date)}`;
  }

  // 本周显示星期几
  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysDiff < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }

  // 更早显示日期
  return formatDate(date);
}

/**
 * 格式化时间为 HH:mm
 * @param date Date 对象或时间戳
 * @returns 时间字符串
 */
export function formatTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param date Date 对象或时间戳
 * @returns 日期字符串
 */
export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 MM月DD日
 * @param date Date 对象或时间戳
 * @returns 日期字符串
 */
export function formatShortDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

/**
 * 获取日期分组标签（用于消息列表）
 * @param timestamp 时间戳
 * @returns 分组标签
 */
export function getDateGroupLabel(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return '今天';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return '昨天';
  }

  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysDiff < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }

  return formatShortDate(date);
}

/**
 * 检查两个时间戳是否是同一天
 * @param timestamp1 时间戳1
 * @param timestamp2 时间戳2
 * @returns 是否是同一天
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return date1.toDateString() === date2.toDateString();
}

/**
 * 检查时间戳是否是今天
 * @param timestamp 时间戳
 * @returns 是否是今天
 */
export function isToday(timestamp: number): boolean {
  return isSameDay(timestamp, Date.now());
}

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
