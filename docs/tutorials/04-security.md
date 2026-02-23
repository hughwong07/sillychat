# 教程 4: 安全设置

本教程介绍如何在 SillyChat 中实现安全功能，包括认证、加密、权限控制等。

## 目录

1. [认证系统](#认证系统)
2. [数据加密](#数据加密)
3. [权限控制](#权限控制)
4. [安全存储](#安全存储)
5. [网络安全](#网络安全)

---

## 认证系统

### JWT 认证

```typescript
import { AuthManager } from '@sillychat/core/gateway';
import jwt from 'jsonwebtoken';

class JWTAuthManager implements AuthManager {
  private secret: string;
  private refreshSecret: string;

  constructor(config: { secret: string; refreshSecret: string }) {
    this.secret = config.secret;
    this.refreshSecret = config.refreshSecret;
  }

  // 生成令牌
  generateTokens(userId: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      this.secret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.refreshSecret,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  // 验证令牌
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret) as JWTPayload;
    } catch (error) {
      throw new AuthError('Invalid token', 'TOKEN_INVALID');
    }
  }

  // 刷新令牌
  refreshAccessToken(refreshToken: string): string {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret) as JWTPayload;
      return jwt.sign(
        { userId: payload.userId, type: 'access' },
        this.secret,
        { expiresIn: '15m' }
      );
    } catch (error) {
      throw new AuthError('Invalid refresh token', 'REFRESH_INVALID');
    }
  }
}
```

### API 密钥认证

```typescript
class APIKeyAuth {
  private keys = new Map<string, APIKeyInfo>();

  generateKey(userId: string, permissions: string[]): string {
    const key = `sk-${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    this.keys.set(hash, {
      userId,
      permissions,
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    });

    return key; // 只返回一次，之后无法获取
  }

  validateKey(key: string): APIKeyInfo {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const info = this.keys.get(hash);

    if (!info) {
      throw new AuthError('Invalid API key', 'API_KEY_INVALID');
    }

    // 更新最后使用时间
    info.lastUsedAt = Date.now();
    return info;
  }

  revokeKey(key: string): void {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    this.keys.delete(hash);
  }
}
```

### 多因素认证

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class MFAService {
  // 设置 TOTP
  setupTOTP(userId: string): Promise<{ secret: string; qrCode: string }> {
    const secret = speakeasy.generateSecret({
      name: `SillyChat:${userId}`,
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // 临时保存 secret，验证后才正式启用
    await this.saveTempSecret(userId, secret.base32);

    return { secret: secret.base32, qrCode };
  }

  // 验证并启用 TOTP
  async verifyAndEnableTOTP(userId: string, token: string): Promise<void> {
    const tempSecret = await this.getTempSecret(userId);

    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 2 // 允许前后2个时间窗口
    });

    if (!verified) {
      throw new AuthError('Invalid TOTP code', 'TOTP_INVALID');
    }

    await this.enableTOTP(userId, tempSecret);
    await this.clearTempSecret(userId);
  }

  // 验证 TOTP
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const secret = await this.getUserSecret(userId);

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
  }
}
```

---

## 数据加密

### 数据库加密

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

class DatabaseEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(password: string, salt: string) {
    this.key = scryptSync(password, salt, 32);
  }

  encrypt(text: string): EncryptedData {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(data: EncryptedData): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// 使用
const encryption = new DatabaseEncryption('master-password', 'unique-salt');

// 加密敏感字段
const encrypted = encryption.encrypt('sensitive data');
await db.run(
  'INSERT INTO secrets (data) VALUES (?)',
  [JSON.stringify(encrypted)]
);

// 解密
const row = await db.get('SELECT data FROM secrets WHERE id = ?', [id]);
const decrypted = encryption.decrypt(JSON.parse(row.data));
```

### 端到端加密

```typescript
import { generateKeyPair, box, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

class E2EEncryption {
  private keyPair: nacl.BoxKeyPair;

  constructor() {
    this.keyPair = generateKeyPair();
  }

  getPublicKey(): string {
    return encodeBase64(this.keyPair.publicKey);
  }

  // 加密消息
  encrypt(message: string, recipientPublicKey: string): EncryptedMessage {
    const nonce = randomBytes(box.nonceLength);
    const publicKey = decodeBase64(recipientPublicKey);

    const encrypted = box(
      Buffer.from(message, 'utf8'),
      nonce,
      publicKey,
      this.keyPair.secretKey
    );

    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      senderPublicKey: this.getPublicKey()
    };
  }

  // 解密消息
  decrypt(encryptedMessage: EncryptedMessage): string {
    const decrypted = box.open(
      decodeBase64(encryptedMessage.encrypted),
      decodeBase64(encryptedMessage.nonce),
      decodeBase64(encryptedMessage.senderPublicKey),
      this.keyPair.secretKey
    );

    if (!decrypted) {
      throw new Error('Failed to decrypt message');
    }

    return Buffer.from(decrypted).toString('utf8');
  }
}

// 使用示例
const alice = new E2EEncryption();
const bob = new E2EEncryption();

// Alice 发送消息给 Bob
const encrypted = alice.encrypt('Hello Bob!', bob.getPublicKey());

// Bob 解密消息
const decrypted = bob.decrypt(encrypted);
console.log(decrypted); // 'Hello Bob!'
```

### 文件加密

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { createCipher, createDecipher } from 'crypto';
import { pipeline } from 'stream/promises';

class FileEncryption {
  async encryptFile(
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<void> {
    const key = scryptSync(password, 'salt', 32);
    const cipher = createCipher('aes-256-cbc', key);

    await pipeline(
      createReadStream(inputPath),
      cipher,
      createWriteStream(outputPath)
    );
  }

  async decryptFile(
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<void> {
    const key = scryptSync(password, 'salt', 32);
    const decipher = createDecipher('aes-256-cbc', key);

    await pipeline(
      createReadStream(inputPath),
      decipher,
      createWriteStream(outputPath)
    );
  }
}
```

---

## 权限控制

### 基于角色的访问控制 (RBAC)

```typescript
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

enum Permission {
  AGENT_CREATE = 'agent:create',
  AGENT_DELETE = 'agent:delete',
  AGENT_USE = 'agent:use',
  CONVERSATION_READ = 'conversation:read',
  CONVERSATION_WRITE = 'conversation:write',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write'
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.USER]: [
    Permission.AGENT_CREATE,
    Permission.AGENT_USE,
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_WRITE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE
  ],
  [Role.GUEST]: [
    Permission.AGENT_USE,
    Permission.CONVERSATION_READ
  ]
};

class RBACService {
  hasPermission(role: Role, permission: Permission): boolean {
    return rolePermissions[role].includes(permission);
  }

  checkPermission(role: Role, permission: Permission): void {
    if (!this.hasPermission(role, permission)) {
      throw new AuthError(
        `Role ${role} does not have permission ${permission}`,
        'PERMISSION_DENIED'
      );
    }
  }
}
```

### 资源级权限

```typescript
interface ResourcePermission {
  userId: string;
  resourceType: 'agent' | 'conversation' | 'file';
  resourceId: string;
  permissions: ('read' | 'write' | 'delete' | 'share')[];
  grantedAt: number;
  expiresAt?: number;
}

class ResourceACL {
  private permissions = new Map<string, ResourcePermission[]>();

  grant(permission: ResourcePermission): void {
    const key = `${permission.resourceType}:${permission.resourceId}`;
    const list = this.permissions.get(key) || [];
    list.push(permission);
    this.permissions.set(key, list);
  }

  check(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string
  ): boolean {
    const key = `${resourceType}:${resourceId}`;
    const list = this.permissions.get(key) || [];

    return list.some(p =>
      p.userId === userId &&
      p.permissions.includes(action as any) &&
      (!p.expiresAt || p.expiresAt > Date.now())
    );
  }

  // 分享资源
  share(
    ownerId: string,
    resourceType: string,
    resourceId: string,
    targetUserId: string,
    permissions: ('read' | 'write')[]
  ): void {
    // 验证所有者权限
    if (!this.check(ownerId, resourceType, resourceId, 'share')) {
      throw new AuthError('Not authorized to share this resource');
    }

    this.grant({
      userId: targetUserId,
      resourceType: resourceType as any,
      resourceId,
      permissions,
      grantedAt: Date.now()
    });
  }
}
```

---

## 安全存储

### 密钥管理

```typescript
import { keytar } from 'keytar';

class SecureKeyManager {
  private serviceName = 'SillyChat';

  // 存储密钥到系统密钥库
  async storeKey(keyName: string, key: string): Promise<void> {
    await keytar.setPassword(this.serviceName, keyName, key);
  }

  // 从系统密钥库获取密钥
  async getKey(keyName: string): Promise<string | null> {
    return keytar.getPassword(this.serviceName, keyName);
  }

  // 删除密钥
  async deleteKey(keyName: string): Promise<boolean> {
    return keytar.deletePassword(this.serviceName, keyName);
  }

  // 生成并存储加密密钥
  async generateEncryptionKey(keyName: string): Promise<string> {
    const key = randomBytes(32).toString('hex');
    await this.storeKey(keyName, key);
    return key;
  }
}
```

### 安全凭证存储

```typescript
class SecureCredentialStore {
  private encryption: DatabaseEncryption;

  constructor(masterKey: string) {
    this.encryption = new DatabaseEncryption(masterKey, 'credentials');
  }

  async storeCredential(
    userId: string,
    service: string,
    credential: Record<string, string>
  ): Promise<void> {
    const encrypted = this.encryption.encrypt(JSON.stringify(credential));

    await db.run(
      `INSERT INTO credentials (user_id, service, data, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, service) DO UPDATE SET
       data = excluded.data, updated_at = excluded.updated_at`,
      [userId, service, JSON.stringify(encrypted), Date.now()]
    );
  }

  async getCredential(
    userId: string,
    service: string
  ): Promise<Record<string, string> | null> {
    const row = await db.get(
      'SELECT data FROM credentials WHERE user_id = ? AND service = ?',
      [userId, service]
    );

    if (!row) return null;

    const decrypted = this.encryption.decrypt(JSON.parse(row.data));
    return JSON.parse(decrypted);
  }
}
```

---

## 网络安全

### TLS 配置

```typescript
import { createServer } from 'https';
import { readFileSync } from 'fs';

const server = createServer(
  {
    key: readFileSync('server.key'),
    cert: readFileSync('server.crt'),
    // 强制 TLS 1.3
    minVersion: 'TLSv1.3',
    // 证书链
    ca: readFileSync('ca.crt')
  },
  app
);
```

### WebSocket 安全

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({
  server,
  // 验证连接
  verifyClient: (info, callback) => {
    const token = info.req.headers['sec-websocket-protocol'];

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      (info.req as any).user = payload;
      callback(true);
    } catch (error) {
      callback(false, 401, 'Unauthorized');
    }
  }
});

wss.on('connection', (ws, req) => {
  const user = (req as any).user;
  console.log(`User ${user.userId} connected`);
});
```

### 请求限流

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 100,      // 100 请求
  duration: 60      // 每 60 秒
});

async function rateLimitMiddleware(req, res, next) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
}
```

### 输入验证

```typescript
import { z } from 'zod';

// 定义验证模式
const messageSchema = z.object({
  content: z.string().min(1).max(10000),
  conversationId: z.string().uuid(),
  attachments: z.array(z.string().uuid()).optional()
});

// 验证中间件
function validateBody(schema: z.ZodSchema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

// 使用
app.post('/messages', validateBody(messageSchema), async (req, res) => {
  const data = req.validatedBody;
  // 处理数据...
});
```

---

## 安全最佳实践

### 1. 安全头部

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 2. 日志脱敏

```typescript
function sanitizeLog(obj: any): any {
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}

logger.info('Request received', sanitizeLog(req.body));
```

### 3. 安全审计

```typescript
class SecurityAudit {
  async log(event: SecurityEvent): Promise<void> {
    await db.run(
      `INSERT INTO audit_log (
        timestamp, user_id, action, resource_type,
        resource_id, ip_address, user_agent, result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now(),
        event.userId,
        event.action,
        event.resourceType,
        event.resourceId,
        event.ipAddress,
        event.userAgent,
        event.result
      ]
    );
  }

  async getRecentEvents(
    userId: string,
    limit = 100
  ): Promise<SecurityEvent[]> {
    return db.all(
      `SELECT * FROM audit_log
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [userId, limit]
    );
  }
}
```

---

## 下一步

- 阅读 [部署指南](../guides/DEPLOYMENT.md) 了解生产环境安全配置
- 查看 [故障排除指南](../../TROUBLESHOOTING.md) 解决安全问题
- 参考 [API 文档](../api/core.md) 了解安全相关 API

---

*您的 SillyChat 应用现在已具备企业级安全保护！*
