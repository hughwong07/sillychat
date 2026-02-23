/**
 * 网络工具模块
 * 提供URL处理、IP验证、网络状态检测等功能
 */

import * as net from 'net';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/** URL解析结果 */
export interface ParsedURL {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  query: Record<string, string>;
}

/** IP信息 */
export interface IPInfo {
  ip: string;
  family: 4 | 6;
  isPrivate: boolean;
}

/** HTTP头 */
export type HttpHeaders = Record<string, string | string[] | undefined>;

/**
 * 解析URL
 * @param url URL字符串
 */
export function parseURL(url: string): ParsedURL {
  const parsed = new URL(url);
  const query: Record<string, string> = {};
  
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  
  return {
    protocol: parsed.protocol.replace(':', ''),
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    username: parsed.username,
    password: parsed.password,
    query
  };
}

/**
 * 构建URL
 * @param base 基础URL
 * @param params 查询参数
 */
export function buildURL(
  base: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return base;
  
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * 验证是否为有效URL
 * @param url URL字符串
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证是否为有效IP地址
 * @param ip IP地址
 */
export function isValidIP(ip: string): boolean {
  return net.isIP(ip) !== 0;
}

/**
 * 验证是否为IPv4
 * @param ip IP地址
 */
export function isIPv4(ip: string): boolean {
  return net.isIPv4(ip);
}

/**
 * 验证是否为IPv6
 * @param ip IP地址
 */
export function isIPv6(ip: string): boolean {
  return net.isIPv6(ip);
}

/**
 * 检查是否为私有IP
 * @param ip IP地址
 */
export function isPrivateIP(ip: string): boolean {
  if (!isIPv4(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8 (localhost)
  if (parts[0] === 127) return true;
  
  return false;
}

/**
 * 解析主机名
 * @param hostname 主机名
 */
export async function resolveHost(hostname: string): Promise<IPInfo[]> {
  try {
    const result = await dnsLookup(hostname, { all: true });
    return result.map(r => ({
      ip: r.address,
      family: r.family as 4 | 6,
      isPrivate: isPrivateIP(r.address)
    }));
  } catch {
    return [];
  }
}

/**
 * 获取本机IP地址
 */
export function getLocalIP(): string {
  const interfaces = require('os').networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

/**
 * 解析查询字符串
 * @param query 查询字符串
 */
export function parseQueryString(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  const params = new URLSearchParams(query);
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * 构建查询字符串
 * @param params 参数对象
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  
  return searchParams.toString();
}

/**
 * URL编码
 * @param str 字符串
 */
export function urlEncode(str: string): string {
  return encodeURIComponent(str);
}

/**
 * URL解码
 * @param str 编码字符串
 */
export function urlDecode(str: string): string {
  return decodeURIComponent(str);
}

/**
 * 规范化路径
 * @param path 路径
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/**
 * 合并路径
 * @param base 基础路径
 * @param paths 路径片段
 */
export function joinPath(base: string, ...paths: string[]): string {
  const combined = [base, ...paths].join('/');
  return normalizePath(combined);
}

/**
 * 获取文件扩展名
 * @param url URL或路径
 */
export function getPathExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastDot = pathname.lastIndexOf('.');
    return lastDot > -1 ? pathname.slice(lastDot + 1).toLowerCase() : '';
  } catch {
    const lastDot = url.lastIndexOf('.');
    const lastSlash = url.lastIndexOf('/');
    return lastDot > lastSlash ? url.slice(lastDot + 1).toLowerCase() : '';
  }
}

/**
 * 验证端口号
 * @param port 端口号
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * 获取默认端口
 * @param protocol 协议
 */
export function getDefaultPort(protocol: string): number {
  const ports: Record<string, number> = {
    http: 80,
    https: 443,
    ftp: 21,
    ssh: 22,
    ws: 80,
    wss: 443
  };
  return ports[protocol.toLowerCase()] || 0;
}

/**
 * 提取域名
 * @param url URL字符串
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号（中国）
 * @param phone 手机号
 */
export function isValidPhoneCN(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 格式化HTTP头
 * @param headers 头信息
 */
export function formatHeaders(headers: HttpHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      result[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    }
  });
  
  return result;
}

/**
 * 获取Content-Type
 * @param filename 文件名
 */
export function getContentType(filename: string): string {
  const ext = getPathExtension(filename);
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    txt: 'text/plain',
    xml: 'application/xml',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4'
  };
  return types[ext] || 'application/octet-stream';
}
