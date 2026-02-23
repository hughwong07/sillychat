/**
 * 加密工具模块
 * 提供哈希、AES加密、随机数生成等安全功能
 */

import * as crypto from 'crypto';

/** 支持的哈希算法 */
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/** AES加密配置 */
export interface AESConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
}

/** 加密结果 */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag?: string;
}

/** 默认AES配置 */
const DEFAULT_AES_CONFIG: Required<AESConfig> = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16
};

/** 密钥派生配置 */
const PBKDF2_CONFIG = {
  iterations: 100000,
  digest: 'sha256'
};

/**
 * 生成随机字符串
 * @param length 长度
 * @param charset 字符集
 */
export function randomString(
  length: number = 32,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  const charsetLength = charset.length;
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charsetLength];
  }
  
  return result;
}

/**
 * 生成随机字节
 * @param length 字节长度
 */
export function randomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * 生成UUID v4
 */
export function uuid(): string {
  return crypto.randomUUID();
}

/**
 * 计算哈希值
 * @param data 原始数据
 * @param algorithm 哈希算法
 * @param encoding 输出编码
 */
export function hash(
  data: string | Buffer,
  algorithm: HashAlgorithm = 'sha256',
  encoding: crypto.BinaryToTextEncoding = 'hex'
): string {
  const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  return crypto.createHash(algorithm).update(input).digest(encoding);
}

/**
 * 计算HMAC
 * @param data 原始数据
 * @param key 密钥
 * @param algorithm 哈希算法
 */
export function hmac(
  data: string | Buffer,
  key: string | Buffer,
  algorithm: HashAlgorithm = 'sha256'
): string {
  const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf-8');
  return crypto.createHmac(algorithm, keyBuffer).update(input).digest('hex');
}

/**
 * 从密码派生密钥
 * @param password 密码
 * @param salt 盐值
 * @param keyLength 密钥长度
 */
export function deriveKey(
  password: string,
  salt: string | Buffer,
  keyLength: number = 32
): Buffer {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, 'hex');
  return crypto.pbkdf2Sync(
    password,
    saltBuffer,
    PBKDF2_CONFIG.iterations,
    keyLength,
    PBKDF2_CONFIG.digest
  );
}

/**
 * AES-GCM 加密
 * @param plaintext 明文
 * @param key 密钥 (32字节)
 * @param config 配置
 */
export function aesEncrypt(
  plaintext: string,
  key: string | Buffer,
  config?: AESConfig
): EncryptionResult {
  const cfg = { ...DEFAULT_AES_CONFIG, ...config };
  const iv = crypto.randomBytes(cfg.ivLength);
  
  const keyBuffer = typeof key === 'string' 
    ? Buffer.from(key, 'hex') 
    : key;
    
  if (keyBuffer.length !== cfg.keyLength) {
    throw new Error(`Key length must be ${cfg.keyLength} bytes`);
  }

  const cipher = crypto.createCipheriv(cfg.algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * AES-GCM 解密
 * @param result 加密结果
 * @param key 密钥
 * @param config 配置
 */
export function aesDecrypt(
  result: EncryptionResult,
  key: string | Buffer,
  config?: AESConfig
): string {
  const cfg = { ...DEFAULT_AES_CONFIG, ...config };
  
  const keyBuffer = typeof key === 'string' 
    ? Buffer.from(key, 'hex') 
    : key;
    
  if (keyBuffer.length !== cfg.keyLength) {
    throw new Error(`Key length must be ${cfg.keyLength} bytes`);
  }

  const iv = Buffer.from(result.iv, 'hex');
  const authTag = result.authTag ? Buffer.from(result.authTag, 'hex') : undefined;
  
  const decipher = crypto.createDecipheriv(cfg.algorithm, keyBuffer, iv);
  
  if (authTag) {
    decipher.setAuthTag(authTag);
  }
  
  let decrypted = decipher.update(result.encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  
  return decrypted;
}

/**
 * 使用密码加密（自动派生密钥）
 * @param plaintext 明文
 * @param password 密码
 */
export function encryptWithPassword(
  plaintext: string,
  password: string
): { encrypted: string; iv: string; salt: string; authTag: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = deriveKey(password, salt);
  const result = aesEncrypt(plaintext, key);
  
  return {
    ...result,
    salt
  };
}

/**
 * 使用密码解密
 * @param encryptedData 加密数据
 * @param password 密码
 */
export function decryptWithPassword(
  encryptedData: { encrypted: string; iv: string; salt: string; authTag: string },
  password: string
): string {
  const key = deriveKey(password, encryptedData.salt);
  return aesDecrypt(encryptedData, key);
}

/**
 * 生成RSA密钥对
 * @param modulusLength 模数长度
 */
export function generateRSAKeyPair(modulusLength: number = 2048): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  return { publicKey, privateKey };
}

/**
 * RSA 加密
 * @param plaintext 明文
 * @param publicKey 公钥
 */
export function rsaEncrypt(plaintext: string, publicKey: string): string {
  const buffer = Buffer.from(plaintext, 'utf-8');
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    buffer
  );
  return encrypted.toString('base64');
}

/**
 * RSA 解密
 * @param ciphertext 密文
 * @param privateKey 私钥
 */
export function rsaDecrypt(ciphertext: string, privateKey: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    buffer
  );
  return decrypted.toString('utf-8');
}

/**
 * RSA 签名
 * @param data 数据
 * @param privateKey 私钥
 * @param algorithm 哈希算法
 */
export function rsaSign(
  data: string,
  privateKey: string,
  algorithm: HashAlgorithm = 'sha256'
): string {
  const algoUpper = algorithm.toUpperCase();
  const signer = crypto.createSign(`RSA-${algoUpper}`);
  signer.update(data);
  return signer.sign(privateKey, 'base64');
}

/**
 * RSA 验签
 * @param data 数据
 * @param signature 签名
 * @param publicKey 公钥
 * @param algorithm 哈希算法
 */
export function rsaVerify(
  data: string,
  signature: string,
  publicKey: string,
  algorithm: HashAlgorithm = 'sha256'
): boolean {
  const algoUpper = algorithm.toUpperCase();
  const verifier = crypto.createVerify(`RSA-${algoUpper}`);
  verifier.update(data);
  return verifier.verify(publicKey, signature, 'base64');
}

/**
 * 常量时间比较（防时序攻击）
 * @param a 字符串a
 * @param b 字符串b
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  
  if (bufA.length !== bufB.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}
