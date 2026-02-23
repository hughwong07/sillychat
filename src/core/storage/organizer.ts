/**
 * File Organizer
 * 小傻瓜聊天工具 - 文件自动整理模块
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { IFileOrganizer, OrganizerConfig, FileCategory, ClassificationResult } from './types';

const MIME_TYPE_MAP: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
  'image/svg+xml': 'images',
  'image/bmp': 'images',
  // Videos
  'video/mp4': 'videos',
  'video/webm': 'videos',
  'video/avi': 'videos',
  'video/mov': 'videos',
  'video/mkv': 'videos',
  // Audio
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/m4a': 'audio',
  'audio/flac': 'audio',
  // Documents
  'application/pdf': 'documents',
  'text/plain': 'documents',
  'text/markdown': 'documents',
  'application/msword': 'documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'documents',
  'application/vnd.ms-excel': 'documents',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'documents',
  'application/vnd.ms-powerpoint': 'documents',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'documents',
};

const EXT_CATEGORY_MAP: Record<string, FileCategory> = {
  '.jpg': 'images', '.jpeg': 'images', '.png': 'images', '.gif': 'images',
  '.webp': 'images', '.svg': 'images', '.bmp': 'images',
  '.mp4': 'videos', '.webm': 'videos', '.avi': 'videos', '.mov': 'videos', '.mkv': 'videos',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.m4a': 'audio', '.flac': 'audio',
  '.pdf': 'documents', '.txt': 'documents', '.md': 'documents',
  '.doc': 'documents', '.docx': 'documents', '.xls': 'documents', '.xlsx': 'documents',
  '.ppt': 'documents', '.pptx': 'documents',
};

export class FileOrganizer implements IFileOrganizer {
  private config: Required<OrganizerConfig>;

  constructor(config: OrganizerConfig) {
    this.config = { organizeBy: 'date', dateFormat: 'YYYY/MM-DD', ...config };
  }

  async initialize(): Promise<void> {
    const categories: FileCategory[] = ['images', 'videos', 'documents', 'audio', 'others'];
    for (const category of categories) {
      const dir = path.join(this.config.filesPath, category);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  classifyByMimeType(mimeType: string): FileCategory {
    return MIME_TYPE_MAP[mimeType] || 'others';
  }

  async classifyFile(filePath: string): Promise<ClassificationResult> {
    const ext = path.extname(filePath).toLowerCase();
    const category = EXT_CATEGORY_MAP[ext] || 'others';
    
    // Detect mime type based on extension
    const mimeType = Object.entries(MIME_TYPE_MAP).find(([_, cat]) => 
      EXT_CATEGORY_MAP[ext] === cat
    )?.[0] || 'application/octet-stream';
    
    return { category, mimeType, confidence: 0.9 };
  }

  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return path.join(year, `${month}-${day}`);
  }

  getFilePath(hash: string, category: FileCategory): string {
    const datePath = this.getDatePath();
    return path.join(this.config.filesPath, category, datePath, hash);
  }

  async organizeFile(hash: string, originalName: string, category: FileCategory): Promise<string> {
    const ext = path.extname(originalName) || '';
    const datePath = this.getDatePath();
    const targetDir = path.join(this.config.filesPath, category, datePath);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetPath = path.join(targetDir, hash + ext);
    return targetPath;
  }

  async createSymlink(hash: string, category: FileCategory, fileName: string): Promise<string> {
    const id = crypto.randomUUID();
    const ext = path.extname(fileName) || '';
    const datePath = this.getDatePath();
    const relativePath = path.join(category, datePath, id + ext);
    const fullPath = path.join(this.config.filesPath, relativePath);
    
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return relativePath;
  }

  async removeSymlink(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.config.filesPath, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  async scanCategory(category: FileCategory): Promise<string[]> {
    const categoryPath = path.join(this.config.filesPath, category);
    if (!fs.existsSync(categoryPath)) return [];
    
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          walk(fullPath);
        } else {
          files.push(path.relative(this.config.filesPath, fullPath));
        }
      }
    };
    walk(categoryPath);
    return files;
  }
}
