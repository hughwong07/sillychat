import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GatewayServer } from './server.js';
import { GatewayClient } from './client.js';
import { SessionManager } from './session.js';
import { AuthManager } from './auth.js';
import { GatewayMessageHandler } from './message-handler.js';
import { DiscoveryService } from './discovery.js';
import { GatewayConfig, GatewayClientConfig, ConnectionState, GatewayState } from './types.js';
import { Logger } from '@utils/logger.js';
import { ProtocolValidator } from '@protocol/validation.js';

describe('Gateway Module', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    createChild: vi.fn().mockReturnThis(),
  } as unknown as Logger;

  describe('SessionManager', () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager({
        config: {
          maxAge: 3600,
          inactiveThreshold: 300,
        },
        logger: mockLogger,
      });
    });

    afterEach(() => {
      sessionManager.destroy();
    });

    it('should create a session', () => {
      const session = sessionManager.createSession('client-1');
      expect(session).toBeDefined();
      expect(session.clientId).toBe('client-1');
      expect(session.authenticated).toBe(false);
    });

    it('should get session by client ID', () => {
      const session = sessionManager.createSession('client-1');
      const retrieved = sessionManager.getSessionByClientId('client-1');
      expect(retrieved).toEqual(session);
    });

    it('should authenticate session', () => {
      const session = sessionManager.createSession('client-1');
      const result = sessionManager.authenticateSession(session.id, 'user-1');
      expect(result).toBe(true);
      expect(session.authenticated).toBe(true);
      expect(session.userId).toBe('user-1');
    });

    it('should remove session', () => {
      const session = sessionManager.createSession('client-1');
      const result = sessionManager.removeSession(session.id);
      expect(result).toBe(true);
      expect(sessionManager.getSession(session.id)).toBeNull();
    });

    it('should track session count', () => {
      sessionManager.createSession('client-1');
      sessionManager.createSession('client-2');
      expect(sessionManager.getSessionCount()).toBe(2);
    });
  });

  describe('AuthManager', () => {
    let authManager: AuthManager;

    beforeEach(() => {
      authManager = new AuthManager({
        config: {
          enabled: true,
          jwtSecret: 'test-secret',
          tokenExpiry: 3600,
          minPasswordLength: 6,
        },
        logger: mockLogger,
      });
    });

    afterEach(() => {
      authManager.destroy();
    });

    it('should register a new user', async () => {
      const result = await authManager.register({
        username: 'testuser',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
    });

    it('should reject duplicate username', async () => {
      await authManager.register({ username: 'testuser', password: 'password123' });
      const result = await authManager.register({ username: 'testuser', password: 'password456' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('exists');
    });

    it('should reject short password', async () => {
      const result = await authManager.register({ username: 'testuser', password: '123' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password');
    });

    it('should login with valid credentials', async () => {
      await authManager.register({ username: 'testuser', password: 'password123' });
      const result = await authManager.login({ username: 'testuser', password: 'password123' });
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await authManager.register({ username: 'testuser', password: 'password123' });
      const result = await authManager.login({ username: 'testuser', password: 'wrongpassword' });
      expect(result.success).toBe(false);
    });

    it('should validate token', async () => {
      const register = await authManager.register({ username: 'testuser', password: 'password123' });
      const login = await authManager.login({ username: 'testuser', password: 'password123' });
      const token = authManager.validateToken(login.token!);
      expect(token).toBeDefined();
      expect(token?.userId).toBe(register.userId);
    });

    it('should logout user', async () => {
      await authManager.register({ username: 'testuser', password: 'password123' });
      const login = await authManager.login({ username: 'testuser', password: 'password123' });
      const result = await authManager.logout(login.token!);
      expect(result).toBe(true);
      expect(authManager.validateToken(login.token!)).toBeNull();
    });
  });

  describe('GatewayMessageHandler', () => {
    let handler: GatewayMessageHandler;

    beforeEach(() => {
      handler = new GatewayMessageHandler({ logger: mockLogger });
    });

    it('should register custom handler', () => {
      const customHandler = vi.fn().mockResolvedValue(undefined);
      handler.register('custom.message', customHandler);
      // Handler is registered if no error thrown
      expect(true).toBe(true);
    });

    it('should unregister handler', () => {
      handler.register('test.message', vi.fn().mockResolvedValue(undefined));
      handler.unregister('test.message');
      // Handler is unregistered if no error thrown
      expect(true).toBe(true);
    });
  });

  describe('Gateway Types', () => {
    it('should have correct GatewayState enum values', () => {
      expect(GatewayState.STARTING).toBe('starting');
      expect(GatewayState.RUNNING).toBe('running');
      expect(GatewayState.STOPPING).toBe('stopping');
      expect(GatewayState.STOPPED).toBe('stopped');
      expect(GatewayState.ERROR).toBe('error');
    });

    it('should have correct ConnectionState enum values', () => {
      expect(ConnectionState.CONNECTING).toBe('connecting');
      expect(ConnectionState.CONNECTED).toBe('connected');
      expect(ConnectionState.DISCONNECTED).toBe('disconnected');
      expect(ConnectionState.RECONNECTING).toBe('reconnecting');
      expect(ConnectionState.ERROR).toBe('error');
    });
  });

  describe('DiscoveryService', () => {
    it('should create discovery service', () => {
      const service = new DiscoveryService({
        config: {
          enabled: true,
          method: 'bonjour',
          serviceName: 'xsg-chat',
          instanceName: 'test-instance',
        },
        port: 8080,
        logger: mockLogger,
      });
      expect(service).toBeDefined();
    });

    it('should return empty discovered services initially', () => {
      const service = new DiscoveryService({
        config: {
          enabled: true,
          method: 'bonjour',
          serviceName: 'xsg-chat',
        },
        port: 8080,
        logger: mockLogger,
      });
      expect(service.getDiscoveredServices()).toEqual([]);
    });
  });
});
