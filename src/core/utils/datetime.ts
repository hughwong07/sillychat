/**
 * 日期时间工具模块
 */

export const TimeUnit = { MILLISECOND: 1, SECOND: 1000, MINUTE: 60 * 1000, HOUR: 60 * 60 * 1000, DAY: 24 * 60 * 60 * 1000, WEEK: 7 * 24 * 60 * 60 * 1000 } as const;

export type DateFormat = 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD HH:mm:ss' | 'YYYY/MM/DD HH:mm:ss' | 'HH:mm:ss' | 'HH:mm' | 'ISO' | 'RFC2822';

export interface Duration { years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number; }

export interface TimeRange { start: Date; end: Date; }

export function now(): number { return Date.now(); }

export function createDate(input?: string | number | Date): Date { if (input === undefined) return new Date(); if (input instanceof Date) return new Date(input); return new Date(input); }

export function formatDate(date: Date | number | string, format: DateFormat = 'YYYY-MM-DD HH:mm:ss'): string { const d = createDate(date); if (format === 'ISO') return d.toISOString(); if (format === 'RFC2822') return d.toUTCString(); const year = d.getFullYear(); const month = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); const hours = String(d.getHours()).padStart(2, '0'); const minutes = String(d.getMinutes()).padStart(2, '0'); const seconds = String(d.getSeconds()).padStart(2, '0'); return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day).replace('HH', hours).replace('mm', minutes).replace('ss', seconds); }

export function parseDate(dateStr: string): Date | null { const timestamp = Date.parse(dateStr); return isNaN(timestamp) ? null : new Date(timestamp); }

export function addTime(date: Date, amount: number, unit: keyof typeof TimeUnit): Date { const d = new Date(date); const ms = amount * TimeUnit[unit]; d.setTime(d.getTime() + ms); return d; }

export function subtractTime(date: Date, amount: number, unit: keyof typeof TimeUnit): Date { return addTime(date, -amount, unit); }

export function diffTime(start: Date | number, end: Date | number): number { const s = start instanceof Date ? start.getTime() : start; const e = end instanceof Date ? end.getTime() : end; return e - s; }

export function diffDetailed(start: Date, end: Date): Duration { let diff = Math.abs(end.getTime() - start.getTime()); const milliseconds = diff % 1000; diff = Math.floor(diff / 1000); const seconds = diff % 60; diff = Math.floor(diff / 60); const minutes = diff % 60; diff = Math.floor(diff / 60); const hours = diff % 24; diff = Math.floor(diff / 24); const days = diff % 30; const months = Math.floor(diff / 30) % 12; const years = Math.floor(diff / 365); return { years, months, days, hours, minutes, seconds, milliseconds }; }

export function formatDuration(ms: number, compact: boolean = false): string { const absMs = Math.abs(ms); if (absMs < TimeUnit.SECOND) return ms + 'ms'; if (absMs < TimeUnit.MINUTE) { const seconds = (ms / TimeUnit.SECOND).toFixed(1); return compact ? seconds + 's' : seconds + ' seconds'; } if (absMs < TimeUnit.HOUR) { const minutes = Math.floor(ms / TimeUnit.MINUTE); const seconds = Math.floor((ms % TimeUnit.MINUTE) / TimeUnit.SECOND); return compact ? minutes + 'm' + seconds + 's' : minutes + 'm ' + seconds + 's'; } if (absMs < TimeUnit.DAY) { const hours = Math.floor(ms / TimeUnit.HOUR); const minutes = Math.floor((ms % TimeUnit.HOUR) / TimeUnit.MINUTE); return compact ? hours + 'h' + minutes + 'm' : hours + 'h ' + minutes + 'm'; } const days = Math.floor(ms / TimeUnit.DAY); const hours = Math.floor((ms % TimeUnit.DAY) / TimeUnit.HOUR); return compact ? days + 'd' + hours + 'h' : days + 'd ' + hours + 'h'; }

export function timeAgo(date: Date | number, baseDate: Date | number = new Date()): string { const d = date instanceof Date ? date.getTime() : date; const base = baseDate instanceof Date ? baseDate.getTime() : baseDate; const diff = base - d; const absDiff = Math.abs(diff); if (diff > 0) { if (absDiff < TimeUnit.MINUTE) return 'just now'; if (absDiff < TimeUnit.HOUR) return Math.floor(absDiff / TimeUnit.MINUTE) + ' minutes ago'; if (absDiff < TimeUnit.DAY) return Math.floor(absDiff / TimeUnit.HOUR) + ' hours ago'; if (absDiff < TimeUnit.WEEK) return Math.floor(absDiff / TimeUnit.DAY) + ' days ago'; return formatDate(d, 'YYYY-MM-DD'); } else { if (absDiff < TimeUnit.MINUTE) return 'in a moment'; if (absDiff < TimeUnit.HOUR) return 'in ' + Math.floor(absDiff / TimeUnit.MINUTE) + ' minutes'; if (absDiff < TimeUnit.DAY) return 'in ' + Math.floor(absDiff / TimeUnit.HOUR) + ' hours'; return formatDate(d, 'YYYY-MM-DD'); } }

export function startOfDay(date: Date = new Date()): Date { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }

export function endOfDay(date: Date = new Date()): Date { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; }

export function startOfWeek(date: Date = new Date()): Date { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); d.setDate(diff); d.setHours(0, 0, 0, 0); return d; }

export function startOfMonth(date: Date = new Date()): Date { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }

export function isSameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export function isLeapYear(year: number): boolean { return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0; }

export function getDaysInMonth(year: number, month: number): number { return new Date(year, month, 0).getDate(); }

export function getTimeRange(date: Date, type: 'day' | 'week' | 'month' | 'year'): TimeRange { const d = new Date(date); switch (type) { case 'day': return { start: startOfDay(d), end: endOfDay(d) }; case 'week': { const start = startOfWeek(d); const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999); return { start, end }; } case 'month': { const monthStart = startOfMonth(d); const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); return { start: monthStart, end: monthEnd }; } case 'year': { const yearStart = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0); const yearEnd = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); return { start: yearStart, end: yearEnd }; } default: return { start: d, end: d }; } }

export function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }

export function timeout<T>(ms: number, message: string = 'Timeout'): Promise<T> { return new Promise((_, reject) => { setTimeout(() => reject(new Error(message)), ms); }); }

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> { return Promise.race([promise, timeout<T>(ms, 'Operation timed out after ' + ms + 'ms')]); }

export function debounce(fn: (...args: any[]) => void, delay: number): (...args: any[]) => void { let timer: NodeJS.Timeout | null = null; return (...args: any[]) => { if (timer) clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }

export function throttle(fn: (...args: any[]) => void, interval: number): (...args: any[]) => void { let lastTime = 0; return (...args: any[]) => { const now = Date.now(); if (now - lastTime >= interval) { lastTime = now; fn(...args); } }; }