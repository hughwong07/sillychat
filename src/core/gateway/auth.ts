import { EventEmitter } from 'events';
import { AuthConfig, AuthCredentials, AuthResult, AuthToken, UserInfo } from './types.js';
import { Logger } from '@utils/logger.js';
import { createHash, randomBytes } from 'crypto';

export interface AuthManagerOptions {
  config: AuthConfig;
  logger: Logger;
}

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  permissions: string[];
  createdAt: number;
  lastLoginAt: number | null;
}

export class AuthManager extends EventEmitter {
  private config: AuthConfig;
  private users: Map<string, StoredUser> = new Map(); // userId -> StoredUser
  private usernameIndex: Map<string, string> = new Map(); // username -> userId
  private tokens: Map<string, AuthToken> = new Map(); // token -> AuthToken
  private tokenUserIndex: Map<string, Set<string>> = new Map(); // userId -> tokens
  private cleanupInterval: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(options: AuthManagerOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger.createChild('AuthManager');

    // Start cleanup interval
    this.startCleanupInterval();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.users.clear();
    this.usernameIndex.clear();
    this.tokens.clear();
    this.tokenUserIndex.clear();

    this.logger.info('Auth manager destroyed');
  }

  async register(credentials: AuthCredentials): Promise<AuthResult> {
    const { username, password } = credentials;

    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }

    if (password.length < this.config.minPasswordLength) {
      return { success: false, error: `Password must be at least ${this.config.minPasswordLength} characters` };
    }

    // Check if username exists
    if (this.usernameIndex.has(username)) {
      return { success: false, error: 'Username already exists' };
    }

    try {
      const userId = this.generateUserId();
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword(password, salt);

      const user: StoredUser = {
        id: userId,
        username,
        passwordHash,
        salt,
        permissions: ['user'],
        createdAt: Date.now(),
        lastLoginAt: null,
      };

      this.users.set(userId, user);
      this.usernameIndex.set(username, userId);

      this.logger.info(`User registered: ${username} (${userId})`);
      this.emit('userRegistered', { userId, username });

      return { success: true, userId };
    } catch (error) {
      this.logger.error('Registration failed', { error });
      return { success: false, error: 'Registration failed' };
    }
  }

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const { username, password } = credentials;

    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const userId = this.usernameIndex.get(username);
    if (!userId) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const passwordHash = this.hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    user.lastLoginAt = Date.now();

    // Create token
    const token = this.createToken(userId);

    this.logger.info(`User logged in: ${username} (${userId})`);
    this.emit('userLoggedIn', { userId, username, token: token.token });

    return {
      success: true,
      userId,
      token: token.token,
      expiresAt: token.expiresAt,
    };
  }

  async logout(token: string): Promise<boolean> {
    const authToken = this.tokens.get(token);
    if (!authToken) return false;

    this.revokeToken(token);

    this.logger.info(`User logged out: ${authToken.userId}`);
    this.emit('userLoggedOut', { userId: authToken.userId });

    return true;
  }

  async logoutAll(userId: string): Promise<number> {
    const tokens = this.tokenUserIndex.get(userId);
    if (!tokens) return 0;

    let count = 0;
    for (const token of [...tokens]) {
      if (this.revokeToken(token)) {
        count++;
      }
    }

    this.logger.info(`User logged out from all sessions: ${userId} (${count} tokens revoked)`);
    return count;
  }

  validateToken(token: string): AuthToken | null {
    const authToken = this.tokens.get(token);
    if (!authToken) return null;

    if (Date.now() >= authToken.expiresAt) {
      this.revokeToken(token);
      return null;
    }

    return authToken;
  }

  getUser(userId: string): UserInfo | null {
    const user = this.users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      permissions: user.permissions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  getUserByUsername(username: string): UserInfo | null {
    const userId = this.usernameIndex.get(username);
    if (!userId) return null;
    return this.getUser(userId);
  }

  updateUser(userId: string, updates: Partial<UserInfo>): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    if (updates.permissions) {
      user.permissions = updates.permissions;
    }

    this.emit('userUpdated', { userId, updates });
    return true;
  }

  deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    // Revoke all tokens
    this.logoutAll(userId);

    // Remove user
    this.usernameIndex.delete(user.username);
    this.users.delete(userId);

    this.logger.info(`User deleted: ${userId}`);
    this.emit('userDeleted', { userId });

    return true;
  }

  hasPermission(userId: string, permission: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    return user.permissions.includes('admin') || user.permissions.includes(permission);
  }

  private createToken(userId: string): AuthToken {
    const token = this.generateToken();
    const now = Date.now();
    const expiresAt = now + this.config.tokenExpiry * 1000;

    const authToken: AuthToken = {
      token,
      userId,
      createdAt: now,
      expiresAt,
    };

    this.tokens.set(token, authToken);

    const userTokens = this.tokenUserIndex.get(userId);
    if (userTokens) {
      userTokens.add(token);
    } else {
      this.tokenUserIndex.set(userId, new Set([token]));
    }

    return authToken;
  }

  private revokeToken(token: string): boolean {
    const authToken = this.tokens.get(token);
    if (!authToken) return false;

    this.tokens.delete(token);

    const userTokens = this.tokenUserIndex.get(authToken.userId);
    if (userTokens) {
      userTokens.delete(token);
      if (userTokens.size === 0) {
        this.tokenUserIndex.delete(authToken.userId);
      }
    }

    return true;
  }

  private hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }

  private generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 300000);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, authToken] of this.tokens) {
      if (now >= authToken.expiresAt) {
        this.revokeToken(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired tokens`);
    }
  }
}
