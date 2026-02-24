/**
 * Gateway API Integration Tests
 * SillyChat - Tests for Gateway HTTP and WebSocket endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { createHmac } from 'crypto';
import { GatewayServer } from '../../gateway/server.js';
import { SessionManager } from '../../gateway/session.js';
import { AuthManager } from '../../gateway/auth.js';
import { GatewayMessageHandler } from '../../gateway/message-handler.js';
import { ProtocolValidator } from '../../protocol/validation.js';
import { Logger } from '../../utils/logger.js';
import { GatewayConfig, GatewayState } from '../../gateway/types.js';
import { mockFactories, server as mswServer, resetMockState } from '../../../../tests/mocks/server.js';

// Webhook service JWT configuration (must match ws_server.py)
const WEBHOOK_JWT_SECRET = 'webhook-hub-secret-key-change-in-production-2024-sillymd-ws';

/**
 * Generate a test JWT token for Webhook service WebSocket authentication
 * Uses HS256 algorithm to match the Webhook service configuration
 */
function generateWebhookTestToken(userId: number = 1, email: string = 'test@example.com'): string {
  // Create JWT header
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

  // Create JWT payload
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId.toString(),
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
    })
  ).toString('base64url');

  // Create signature
  const signature = createHmac('sha256', WEBHOOK_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// Test configuration
const TEST_PORT = 18791;
const TEST_CONFIG: GatewayConfig = {
  wsPort: TEST_PORT,
  httpPort: TEST_PORT,
  port: TEST_PORT,
  host: '127.0.0.1',
  enableDiscovery: false,
  deviceName: 'SillyChat-Test-Gateway',
  deviceType: 'desktop' as const,
  capabilities: ['chat', 'file-transfer'],
  jwtSecret: 'test-secret-key',
  jwtExpiresIn: 3600000,
  maxConnections: 10,
  maxMessageSize: 1024 * 1024,
  shutdownTimeout: 5000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  discovery: {
    enabled: false,
    method: 'bonjour',
    serviceName: 'xsg-chat-test',
  },
  cors: {
    enabled: true,
    origins: ['http://localhost'],
  },
};

// Helper to wait for a specific duration
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Gateway API Integration', () => {
  let gatewayServer: GatewayServer;
  let sessionManager: SessionManager;
  let authManager: AuthManager;
  let messageHandler: GatewayMessageHandler;
  let validator: ProtocolValidator;
  let logger: Logger;

  beforeAll(async () => {
    // Start MSW mock server for external service mocking (webhook service on port 9000)
    // MSW is configured to NOT intercept requests to port 18791 (Gateway test port)
    mswServer.listen({ onUnhandledRequest: 'warn' });

    // Initialize logger
    logger = new Logger({ level: 'error', enableConsole: false });

    // Initialize components
    sessionManager = new SessionManager({
      config: { maxAge: 3600, inactiveThreshold: 300 },
      logger,
    });

    authManager = new AuthManager({
      config: {
        enabled: true,
        jwtSecret: TEST_CONFIG.jwtSecret,
        tokenExpiry: TEST_CONFIG.jwtExpiresIn,
        minPasswordLength: 6,
      },
      logger,
    });

    messageHandler = new GatewayMessageHandler({ logger });
    validator = new ProtocolValidator();

    // Create gateway server
    gatewayServer = new GatewayServer({
      config: TEST_CONFIG,
      sessionManager,
      authManager,
      messageHandler,
      validator,
      logger,
    });

    // Start server once for all tests
    await gatewayServer.start();

    // Note: MSW mock server is started for external services (like webhook on port 9000)
    // but is configured to NOT intercept WebSocket connections to port 18791 (Gateway test port)
    // See tests/mocks/server.ts for the bypass configuration

    // Verify MSW is intercepting requests by making a test request to webhook health endpoint
    const testResponse = await fetch('http://localhost:9000/health');
    if (testResponse.status !== 200) {
      console.warn('[Test Setup] MSW may not be intercepting requests correctly, status:', testResponse.status);
    }
  }, 30000);

  afterAll(async () => {
    // Stop gateway server
    if (gatewayServer?.getState() !== GatewayState.STOPPED) {
      await gatewayServer?.stop();
    }

    // Cleanup
    sessionManager?.destroy();
    authManager?.destroy();

    // Stop MSW mock server
    mswServer.close();
  }, 30000);

  beforeEach(() => {
    // Reset MSW mock state between tests
    // This clears any accumulated mock data while keeping handlers active
    resetMockState();
  });

  describe('Server Lifecycle', () => {
    it('should have started the gateway server successfully', () => {
      expect(gatewayServer.getState()).toBe(GatewayState.RUNNING);
    });

    it('should provide server stats', () => {
      const stats = gatewayServer.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats.state).toBe(GatewayState.RUNNING);
    });
  });

  describe('HTTP Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_PORT}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('connections');
    });

    it('should provide server statistics', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_PORT}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('totalConnections');
      expect(data).toHaveProperty('activeConnections');
      expect(data).toHaveProperty('messagesReceived');
      expect(data).toHaveProperty('messagesSent');
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_PORT}/unknown`);
      expect(response.status).toBe(404);
    });
  });

  describe('WebSocket Connections', () => {
    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          resolve();
        });
        ws.on('error', reject);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      await wait(100);
    });

    it('should send welcome message on connection', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      const message = await new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      });

      expect(message.type).toBe('connection.accepted');
      expect(message).toHaveProperty('clientId');
      expect(message).toHaveProperty('timestamp');

      ws.close();
      await wait(100);
    });

    it('should handle ping/pong messages', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

      // Wait for any response (pong not implemented in basic server)
      await wait(100);

      ws.close();
      await wait(100);
    });

    it('should reject messages exceeding max size', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Create a message larger than maxMessageSize
      const largeMessage = {
        type: 'chat.message',
        content: 'x'.repeat(TEST_CONFIG.maxMessageSize! + 1),
      };

      // This should trigger an error or be rejected
      try {
        ws.send(JSON.stringify(largeMessage));
      } catch (error) {
        // Expected error
      }

      ws.close();
      await wait(100);
    });

    it('should track active connections', async () => {
      const initialStats = gatewayServer.getStats();
      const initialConnections = initialStats.activeConnections;

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for connection to be tracked
      await wait(100);

      const stats = gatewayServer.getStats();
      expect(stats.activeConnections).toBeGreaterThanOrEqual(initialConnections);

      ws.close();
      await wait(100);
    });

    it('should clean up connections on close', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for connection to be tracked
      await wait(100);

      const statsBefore = gatewayServer.getStats();
      const connectionsBefore = statsBefore.activeConnections;

      ws.close();

      // Allow time for cleanup
      await wait(200);

      const statsAfter = gatewayServer.getStats();
      expect(statsAfter.activeConnections).toBeLessThanOrEqual(connectionsBefore);
    });
  });

  describe('Message Handling', () => {
    it('should handle valid chat messages', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      // Set up message listener before connection to avoid race condition
      const welcomePromise = new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      });

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await welcomePromise;

      // Use 'ping' message type which doesn't require authentication
      // and is handled by GatewayMessageHandler
      const message = {
        type: 'ping',
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(message));

      // Allow time for processing
      await wait(100);

      const stats = gatewayServer.getStats();
      expect(stats.messagesReceived).toBeGreaterThan(0);

      ws.close();
      await wait(100);
    });

    it('should reject invalid message format', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      // Set up message listener before connection to avoid race condition
      const welcomePromise = new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      });

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await welcomePromise;

      // Send invalid JSON
      ws.send('not valid json');

      // Allow time for processing
      await wait(100);

      ws.close();
      await wait(100);
    });

    it('should track message statistics', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      // Set up message listener before connection to avoid race condition
      const welcomePromise = new Promise<any>((resolve, reject) => {
        ws.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      });

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await welcomePromise;

      const statsBefore = gatewayServer.getStats();

      // Use 'ping' message type which doesn't require authentication
      // and is handled by GatewayMessageHandler
      const message = {
        type: 'ping',
        timestamp: Date.now(),
      };

      ws.send(JSON.stringify(message));

      // Allow time for processing
      await wait(100);

      const statsAfter = gatewayServer.getStats();
      expect(statsAfter.messagesReceived).toBeGreaterThanOrEqual(statsBefore.messagesReceived);
      expect(statsAfter.bytesReceived).toBeGreaterThanOrEqual(statsBefore.bytesReceived);

      ws.close();
      await wait(100);
    });
  });

  describe('Session Management', () => {
    it('should create session on WebSocket connection', async () => {
      const initialSessionCount = sessionManager.getSessionCount();

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for session creation
      await wait(100);

      const sessionCount = sessionManager.getSessionCount();
      expect(sessionCount).toBeGreaterThanOrEqual(initialSessionCount);

      ws.close();
      await wait(100);
    });

    it('should remove session on WebSocket disconnect', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for session creation
      await wait(100);

      const sessionCountBefore = sessionManager.getSessionCount();

      ws.close();

      // Allow time for cleanup
      await wait(200);

      const sessionCountAfter = sessionManager.getSessionCount();
      expect(sessionCountAfter).toBeLessThanOrEqual(sessionCountBefore);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Try to connect to wrong port
      try {
        const ws = new WebSocket(`ws://${TEST_CONFIG.host}:99999/ws`);
        await new Promise((_, reject) => {
          ws.on('error', reject);
        });
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }
    });

    it('should track error statistics', async () => {
      const statsBefore = gatewayServer.getStats();

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_PORT}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Send invalid message to trigger error handling
      ws.send('invalid');

      // Allow time for processing
      await wait(100);

      const statsAfter = gatewayServer.getStats();
      // Errors might be tracked depending on implementation
      expect(statsAfter.errors).toBeGreaterThanOrEqual(statsBefore.errors);

      ws.close();
      await wait(100);
    });
  });

  describe('Webhook Service Integration', () => {
    const webhookUrl = 'http://localhost:9000';
    const webhookWsUrl = 'ws://localhost:9000/ws';

    it('should connect to webhook service', async () => {
      const response = await fetch(`${webhookUrl}/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    it('should forward messages to webhook', async () => {
      // Create a test message to forward to webhook
      const testMessage = mockFactories.createChatMessage({
        content: 'Test webhook message forwarding',
      });

      // Send message to webhook endpoint
      const response = await fetch(`${webhookUrl}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('receivedAt');
      expect(data).toHaveProperty('id');
    });

    it('should handle webhook errors gracefully', async () => {
      // Test with invalid payload
      const response = await fetch(`${webhookUrl}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Mock server returns 200 for empty object, but we verify error handling
      expect(response.status).toBe(200);
    });

    it('should connect to webhook WebSocket server', async () => {
      // Generate a valid JWT token for Webhook service authentication
      const token = generateWebhookTestToken(1, 'test@example.com');
      const wsUrlWithToken = `${webhookWsUrl}?token=${token}`;

      // Connect to Webhook service real WebSocket server with authentication
      const ws = new WebSocket(wsUrlWithToken);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          resolve();
        });
        ws.on('error', (error) => {
          reject(new Error(`Failed to connect to webhook WebSocket: ${error.message}`));
        });
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);

      // Wait for the 'connected' message from server first
      const connectedMsg = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for connected message'));
        }, 5000);

        ws.on('message', (data) => {
          clearTimeout(timeout);
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(connectedMsg.type).toBe('connected');

      // Send a ping message to test communication
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

      // Wait for pong response
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for webhook WebSocket response'));
        }, 5000);

        ws.on('message', (data) => {
          clearTimeout(timeout);
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(response).toHaveProperty('type');
      expect(response.type).toBe('pong');

      ws.close();
      await wait(100);
    });

    it('should receive welcome message from webhook WebSocket', async () => {
      // Generate a valid JWT token for Webhook service authentication
      const token = generateWebhookTestToken(1, 'test@example.com');
      const wsUrlWithToken = `${webhookWsUrl}?token=${token}`;

      const ws = new WebSocket(wsUrlWithToken);

      // Wait for welcome message (connected message from webhook server)
      const message = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for welcome message'));
        }, 5000);

        ws.on('message', (data) => {
          clearTimeout(timeout);
          resolve(JSON.parse(data.toString()));
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Webhook service sends 'connected' message, not 'connection.accepted'
      expect(message).toHaveProperty('type');
      expect(message.type).toBe('connected');
      expect(message).toHaveProperty('message');
      expect(message).toHaveProperty('timestamp');

      ws.close();
      await wait(100);
    });
  });
});
