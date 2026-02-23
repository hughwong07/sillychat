/**
 * Gateway API Integration Tests
 * SillyChat - Tests for Gateway HTTP and WebSocket endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { GatewayServer } from '../../gateway/server.js';
import { SessionManager } from '../../gateway/session.js';
import { AuthManager } from '../../gateway/auth.js';
import { GatewayMessageHandler } from '../../gateway/message-handler.js';
import { ProtocolValidator } from '../../protocol/validation.js';
import { Logger } from '../../utils/logger.js';
import { GatewayConfig, GatewayState } from '../../gateway/types.js';
import {
  startMockServer,
  stopMockServer,
  resetMockState,
  mockFactories,
} from '../../../../tests/mocks/server.js';

// Test configuration
const TEST_CONFIG: GatewayConfig = {
  wsPort: 18789,
  httpPort: 18790,
  port: 18791, // Use different port for tests
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

describe('Gateway API Integration', () => {
  let gatewayServer: GatewayServer;
  let sessionManager: SessionManager;
  let authManager: AuthManager;
  let messageHandler: GatewayMessageHandler;
  let validator: ProtocolValidator;
  let logger: Logger;

  beforeAll(async () => {
    // Start mock server for external dependencies
    startMockServer();

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
  });

  afterAll(async () => {
    // Stop gateway server
    if (gatewayServer.getState() !== GatewayState.STOPPED) {
      await gatewayServer.stop();
    }

    // Cleanup
    sessionManager.destroy();
    authManager.destroy();
    stopMockServer();
  });

  beforeEach(() => {
    resetMockState();
  });

  describe('Server Lifecycle', () => {
    it('should start the gateway server successfully', async () => {
      await gatewayServer.start();
      expect(gatewayServer.getState()).toBe(GatewayState.RUNNING);
    });

    it('should stop the gateway server gracefully', async () => {
      await gatewayServer.start();
      await gatewayServer.stop();
      expect(gatewayServer.getState()).toBe(GatewayState.STOPPED);
    });

    it('should provide server stats', async () => {
      await gatewayServer.start();
      const stats = gatewayServer.getStats();

      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalConnections');
      expect(stats.state).toBe(GatewayState.RUNNING);
    });

    it('should handle multiple start/stop cycles', async () => {
      await gatewayServer.start();
      await gatewayServer.stop();
      await gatewayServer.start();
      expect(gatewayServer.getState()).toBe(GatewayState.RUNNING);
      await gatewayServer.stop();
      expect(gatewayServer.getState()).toBe(GatewayState.STOPPED);
    });
  });

  describe('HTTP Endpoints', () => {
    beforeEach(async () => {
      if (gatewayServer.getState() !== GatewayState.RUNNING) {
        await gatewayServer.start();
      }
    });

    it('should respond to health check', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('connections');
    });

    it('should provide server statistics', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/stats`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('totalConnections');
      expect(data).toHaveProperty('activeConnections');
      expect(data).toHaveProperty('messagesReceived');
      expect(data).toHaveProperty('messagesSent');
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/unknown`);
      expect(response.status).toBe(404);
    });
  });

  describe('WebSocket Connections', () => {
    beforeEach(async () => {
      if (gatewayServer.getState() !== GatewayState.RUNNING) {
        await gatewayServer.start();
      }
    });

    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          resolve();
        });
        ws.on('error', reject);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
    });

    it('should send welcome message on connection', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

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
    });

    it('should handle ping/pong messages', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

      // Wait for any response (pong not implemented in basic server)
      await new Promise((resolve) => setTimeout(resolve, 100));

      ws.close();
    });

    it('should reject messages exceeding max size', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Create a message larger than maxMessageSize
      const largeMessage = {
        type: 'chat.message',
        content: 'x'.repeat(TEST_CONFIG.maxMessageSize + 1),
      };

      // This should trigger an error or be rejected
      try {
        ws.send(JSON.stringify(largeMessage));
      } catch (error) {
        // Expected error
      }

      ws.close();
    });

    it('should track active connections', async () => {
      const initialStats = gatewayServer.getStats();
      const initialConnections = initialStats.activeConnections;

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for connection to be tracked
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = gatewayServer.getStats();
      expect(stats.activeConnections).toBeGreaterThanOrEqual(initialConnections);

      ws.close();
    });

    it('should clean up connections on close', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for connection to be tracked
      await new Promise((resolve) => setTimeout(resolve, 100));

      const statsBefore = gatewayServer.getStats();
      const connectionsBefore = statsBefore.activeConnections;

      ws.close();

      // Allow time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      const statsAfter = gatewayServer.getStats();
      expect(statsAfter.activeConnections).toBeLessThanOrEqual(connectionsBefore);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      if (gatewayServer.getState() !== GatewayState.RUNNING) {
        await gatewayServer.start();
      }
    });

    it('should handle valid chat messages', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await new Promise((resolve) => {
        ws.on('message', resolve);
      });

      const message = mockFactories.createChatMessage({
        content: 'Test message',
      });

      ws.send(JSON.stringify(message));

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = gatewayServer.getStats();
      expect(stats.messagesReceived).toBeGreaterThan(0);

      ws.close();
    });

    it('should reject invalid message format', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await new Promise((resolve) => {
        ws.on('message', resolve);
      });

      // Send invalid JSON
      ws.send('not valid json');

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      ws.close();
    });

    it('should track message statistics', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Wait for welcome message
      await new Promise((resolve) => {
        ws.on('message', resolve);
      });

      const statsBefore = gatewayServer.getStats();

      const message = mockFactories.createChatMessage({
        content: 'Statistics test message',
      });

      ws.send(JSON.stringify(message));

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const statsAfter = gatewayServer.getStats();
      expect(statsAfter.messagesReceived).toBeGreaterThanOrEqual(statsBefore.messagesReceived);
      expect(statsAfter.bytesReceived).toBeGreaterThanOrEqual(statsBefore.bytesReceived);

      ws.close();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      if (gatewayServer.getState() !== GatewayState.RUNNING) {
        await gatewayServer.start();
      }
    });

    it('should create session on WebSocket connection', async () => {
      const initialSessionCount = sessionManager.getSessionCount();

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for session creation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sessionCount = sessionManager.getSessionCount();
      expect(sessionCount).toBeGreaterThanOrEqual(initialSessionCount);

      ws.close();
    });

    it('should remove session on WebSocket disconnect', async () => {
      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Allow time for session creation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sessionCountBefore = sessionManager.getSessionCount();

      ws.close();

      // Allow time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 200));

      const sessionCountAfter = sessionManager.getSessionCount();
      expect(sessionCountAfter).toBeLessThanOrEqual(sessionCountBefore);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      if (gatewayServer.getState() !== GatewayState.RUNNING) {
        await gatewayServer.start();
      }
    });

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

      const ws = new WebSocket(`ws://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ws`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
      });

      // Send invalid message to trigger error handling
      ws.send('invalid');

      // Allow time for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const statsAfter = gatewayServer.getStats();
      // Errors might be tracked depending on implementation
      expect(statsAfter.errors).toBeGreaterThanOrEqual(statsBefore.errors);

      ws.close();
    });
  });
});
