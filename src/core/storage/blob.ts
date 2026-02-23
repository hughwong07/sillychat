/**
 * Blob Storage Pool
 * SillyChat - Blob存储池(去重)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { IBlobPool, BlobPoolConfig, BlobStoreResult } from './types';

export class BlobPool implements IBlobPool {
  private config: Required<BlobPoolConfig>;

  constructor(config: BlobPoolConfig) {
    this.config = { hashAlgorithm: 'sha256', prefixLength: 2, ...config };
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.config.poolPath)) {
      fs.mkdirSync(this.config.poolPath, { recursive: true });
    }
  }

  private getHashPath(hash: string): string {
    const prefix = hash.substring(0, this.config.prefixLength);
    return path.join(this.config.poolPath, prefix, hash);
  }

  async calculateHash(filePath: string): Promise<string> {
    const hash = crypto.createHash(this.config.hashAlgorithm);
    const stream = createReadStream(filePath);
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async calculateHashBuffer(buffer: Buffer): Promise<string> {
    const hash = crypto.createHash(this.config.hashAlgorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }

  async store(sourcePath: string): Promise<BlobStoreResult> {
    const hash = await this.calculateHash(sourcePath);
    const targetPath = this.getHashPath(hash);
    const stats = fs.statSync(sourcePath);

    if (fs.existsSync(targetPath)) {
      return { hash, isNew: false, path: targetPath, size: stats.size };
    }

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await pipeline(createReadStream(sourcePath), createWriteStream(targetPath));

    return { hash, isNew: true, path: targetPath, size: stats.size };
  }

  async storeBuffer(buffer: Buffer, mimeType: string): Promise<BlobStoreResult> {
    const hash = await this.calculateHashBuffer(buffer);
    const targetPath = this.getHashPath(hash);

    if (fs.existsSync(targetPath)) {
      return { hash, isNew: false, path: targetPath, size: buffer.length };
    }

    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetPath, buffer);

    return { hash, isNew: true, path: targetPath, size: buffer.length };
  }

  async getPath(hash: string): Promise<string | null> {
    const targetPath = this.getHashPath(hash);
    return fs.existsSync(targetPath) ? targetPath : null;
  }

  async getBuffer(hash: string): Promise<Buffer | null> {
    const targetPath = await this.getPath(hash);
    return targetPath ? fs.readFileSync(targetPath) : null;
  }

  async getStream(hash: string): Promise<NodeJS.ReadableStream | null> {
    const targetPath = await this.getPath(hash);
    return targetPath ? createReadStream(targetPath) : null;
  }

  async exists(hash: string): Promise<boolean> {
    return fs.existsSync(this.getHashPath(hash));
  }

  async delete(hash: string): Promise<boolean> {
    const targetPath = this.getHashPath(hash);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return true;
    }
    return false;
  }

  async incrementRef(_hash: string): Promise<void> {}
  async decrementRef(_hash: string): Promise<void> {}
  async getRefCount(_hash: string): Promise<number> { return 1; }

  async getStats(): Promise<{ totalSize: number; count: number }> {
    let totalSize = 0;
    let count = 0;
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          walk(fullPath);
        } else {
          totalSize += stats.size;
          count++;
        }
      }
    };
    walk(this.config.poolPath);
    return { totalSize, count };
  }

  async cleanup(): Promise<number> {
    return 0;
  }
}
