/**
 * 文件操作工具模块
 * 提供文件读写、目录操作、路径处理等功能
 */

import * as fs from 'fs';
import * as path from 'path';

/** 文件信息 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
}

/** 目录遍历选项 */
export interface WalkOptions {
  maxDepth?: number;
  includeFiles?: boolean;
  includeDirs?: boolean;
  filter?: (info: FileInfo) => boolean;
}

/** 写入选项 */
export interface WriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
}

const DEFAULT_WALK_OPTIONS: Required<WalkOptions> = {
  maxDepth: -1,
  includeFiles: true,
  includeDirs: false,
  filter: () => true
};

export function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function isDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

export function getFileInfo(filePath: string): FileInfo | null {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  } catch {
    return null;
  }
}

export function readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
  return fs.readFileSync(filePath, { encoding });
}

export function readFileBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function readJSON<T = unknown>(filePath: string): T {
  const content = readFile(filePath);
  return JSON.parse(content) as T;
}

export function writeFile(
  filePath: string,
  data: string | Buffer,
  options: WriteOptions = {}
): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, data, options);
}

export function writeJSON(
  filePath: string,
  data: unknown,
  pretty: boolean = true
): void {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  writeFile(filePath, content);
}

export function appendFile(filePath: string, data: string): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.appendFileSync(filePath, data, 'utf-8');
}

export function deleteFile(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function copyFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
}

export function moveFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.renameSync(src, dest);
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function removeDir(dirPath: string): boolean {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export function emptyDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      removeDir(fullPath);
    } else {
      deleteFile(fullPath);
    }
  }
}

export function readDir(dirPath: string): string[] {
  return fs.readdirSync(dirPath);
}

export function* walk(
  dirPath: string,
  options: WalkOptions = {}
): Generator<FileInfo> {
  const opts = { ...DEFAULT_WALK_OPTIONS, ...options };
  function* walkRecursive(currentPath: string, currentDepth: number): Generator<FileInfo> {
    if (opts.maxDepth !== -1 && currentDepth > opts.maxDepth) {
      return;
    }
    const entries = fs.readdirSync(currentPath);
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const info = getFileInfo(fullPath);
      if (!info || !opts.filter(info)) {
        continue;
      }
      if (info.isDirectory) {
        if (opts.includeDirs) {
          yield info;
        }
        yield* walkRecursive(fullPath, currentDepth + 1);
      } else if (opts.includeFiles) {
        yield info;
      }
    }
  }
  yield* walkRecursive(dirPath, 0);
}

export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function getBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function normalizePath(filePath: string): string {
  return path.normalize(filePath);
}

export function joinPath(...paths: string[]): string {
  return path.join(...paths);
}

export function resolvePath(filePath: string): string {
  return path.resolve(filePath);
}

export function relativePath(from: string, to: string): string {
  return path.relative(from, to);
}

export function tempPath(prefix: string = 'tmp', suffix: string = ''): string {
  const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
  const random = Math.random().toString(36).substring(2, 10);
  return path.join(tmpDir, `${prefix}-${random}${suffix}`);
}

export function watchFile(
  filePath: string,
  callback: (event: 'change' | 'rename', filename: string | null) => void
): fs.FSWatcher {
  return fs.watch(filePath, callback);
}

export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function findFiles(dirPath: string, pattern: RegExp | string): string[] {
  const regex = typeof pattern === 'string' 
    ? new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
    : pattern;
  const results: string[] = [];
  for (const info of walk(dirPath)) {
    if (regex.test(info.name)) {
      results.push(info.path);
    }
  }
  return results;
}

export function safeWriteFile(filePath: string, data: string | Buffer): void {
  const tmpFile = filePath + '.tmp';
  writeFile(tmpFile, data);
  try {
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    deleteFile(tmpFile);
    throw err;
  }
}
