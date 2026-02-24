import { createServer, Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { GatewayConfig, GatewayState, GatewayStats, GatewayServerState, ConnectionInfo } from './types.js';
import { SessionManager } from './session.js';
import { AuthManager } from './auth.js';
import type { MessageHandler } from './types.js';
import { DiscoveryService } from './discovery.js';
import { Logger } from '@utils/logger.js';
import { ProtocolValidator } from '@protocol/validation.js';

export interface GatewayServerOptions {
  config: GatewayConfig;
  sessionManager: SessionManager;
  authManager: AuthManager;
  messageHandler: MessageHandler;
  validator: ProtocolValidator;
  logger: Logger;
}

export class GatewayServer extends EventEmitter {
  private config: GatewayConfig;
  private httpServer: HttpServer | null = null;
  private wsServer: WebSocketServer | null = null;
  private sessionManager: SessionManager;
  private authManager: AuthManager;
  private messageHandler: MessageHandler;
  private discovery: DiscoveryService | null = null;
  private validator: ProtocolValidator;
  private logger: Logger;
  private state: GatewayState = GatewayState.STOPPED;
  private stats: GatewayStats;
  private connections: Map<string, WebSocket> = new Map();
  private shutdownTimeout: NodeJS.Timeout | null = null;

  constructor(options: GatewayServerOptions) {
    super();
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.authManager = options.authManager;
    this.messageHandler = options.messageHandler;
    this.validator = options.validator;
    this.logger = options.logger.createChild('GatewayServer');

    this.stats = {
      state: GatewayState.STOPPED,
      uptime: 0,
      wsConnections: 0,
      httpRequests: 0,
      activeSessions: 0,
      totalMessages: 0,
      messagesPerSecond: 0,
      memoryUsage: 0,
      totalConnections: 0,
      activeConnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      errors: 0,
      startTime: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.state === GatewayState.RUNNING) {
      this.logger.warn('Server already running');
      return;
    }

    this.state = GatewayState.STARTING;
    this.logger.info('Starting gateway server...');

    try {
      // Create HTTP server
      this.httpServer = createServer(this.handleHttpRequest);

      // Create WebSocket server
      this.wsServer = new WebSocketServer({
        server: this.httpServer,
        path: '/ws',
        maxPayload: this.config.maxMessageSize,
      });

      // Setup WebSocket handlers
      this.wsServer.on('connection', this.handleConnection);
      this.wsServer.on('error', this.handleServerError.bind(this));

      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.listen(this.config.port, this.config.host, () => {
          this.logger.info(`Gateway server listening on ${this.config.host}:${this.config.port}`);
          resolve();
        });
        this.httpServer!.on('error', reject);
      });

      // Start discovery service if enabled
      if (this.config.discovery.enabled) {
        this.discovery = new DiscoveryService({
          config: this.config.discovery,
          port: this.config.port,
          logger: this.logger,
        });
        await this.discovery.start();
      }

      this.state = GatewayState.RUNNING;
      this.emit('started');
      this.logger.info('Gateway server started successfully');
    } catch (error) {
      this.state = GatewayState.ERROR;
      this.stats.errors++;
      this.logger.error('Failed to start gateway server', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state === GatewayState.STOPPED) {
      return;
    }

    this.state = GatewayState.STOPPING;
    this.logger.info('Stopping gateway server...');

    // Set shutdown timeout
    if (this.config.shutdownTimeout > 0) {
      this.shutdownTimeout = setTimeout(() => {
        this.logger.warn('Shutdown timeout reached, forcing close');
        this.forceClose();
      }, this.config.shutdownTimeout);
    }

    try {
      // Stop discovery service
      if (this.discovery) {
        await this.discovery.stop();
        this.discovery = null;
      }

      // Close all WebSocket connections
      for (const [clientId, ws] of this.connections) {
        this.logger.debug(`Closing connection: ${clientId}`);
        ws.close(1001, 'Server shutting down');
      }
      this.connections.clear();

      // Close WebSocket server
      if (this.wsServer) {
        await new Promise<void>((resolve) => {
          this.wsServer!.close(() => resolve());
        });
        this.wsServer = null;
      }

      // Close HTTP server
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => resolve());
        });
        this.httpServer = null;
      }

      // Clear shutdown timeout
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
        this.shutdownTimeout = null;
      }

      this.state = GatewayState.STOPPED;
      this.emit('stopped');
      this.logger.info('Gateway server stopped');
    } catch (error) {
      this.state = GatewayState.ERROR;
      this.stats.errors++;
      this.logger.error('Error stopping gateway server', { error });
      throw error;
    }
  }

  private forceClose(): void {
    for (const ws of this.connections.values()) {
      ws.terminate();
    }
    this.connections.clear();
  }

  private handleHttpRequest = (req: import('http').IncomingMessage, res: import('http').ServerResponse): void => {
    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: this.state,
        uptime: Date.now() - this.stats.startTime,
        connections: this.stats.activeConnections,
      }));
      return;
    }

    // Stats endpoint
    if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStats()));
      return;
    }

    // Default response
    res.writeHead(404);
    res.end('Not Found');
  }

  private handleConnection = (ws: WebSocket, req: import('http').IncomingMessage): void => {
    const clientId = this.generateClientId();
    const remoteAddress = req.socket.remoteAddress || 'unknown';

    this.logger.info(`New connection: ${clientId} from ${remoteAddress}`);

    // Check max connections
    if (this.stats.activeConnections >= this.config.maxConnections) {
      this.logger.warn(`Max connections reached, rejecting ${clientId}`);
      ws.close(1013, 'Max connections reached');
      return;
    }

    // Store connection
    this.connections.set(clientId, ws);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    // Create connection info
    const connectionInfo: ConnectionInfo = {
      clientId,
      remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Setup WebSocket event handlers
    ws.on('message', (data) => this.handleMessage(clientId, ws, data));
    ws.on('close', (code, reason) => this.handleClose(clientId, code, reason));
    ws.on('error', (error) => this.handleError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send welcome message
    this.send(ws, {
      type: 'connection.accepted',
      clientId,
      timestamp: Date.now(),
    });

    this.emit('connection', connectionInfo);
  }

  private async handleMessage(clientId: string, ws: WebSocket, data: Buffer): Promise<void> {
    try {
      this.stats.messagesReceived++;
      this.stats.bytesReceived += data.length;

      // Parse message
      const message = JSON.parse(data.toString());

      // Validate message
      const validationResult = this.validator.validateMessage(message);
      if (!validationResult.success) {
        this.send(ws, {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: validationResult.errors?.join(', '),
          timestamp: Date.now(),
        });
        return;
      }

      // Check authentication for protected messages
      if (this.requiresAuth(message.type)) {
        const session = this.sessionManager.getSessionByClientId(clientId);
        if (!session || !session.authenticated) {
          this.send(ws, {
            type: 'error',
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: Date.now(),
          });
          return;
        }
      }

      // Handle message
      await this.messageHandler.handle(message, {
        clientId,
        ws,
        sessionManager: this.sessionManager,
        authManager: this.authManager,
      });
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error handling message from ${clientId}`, { error });

      this.send(ws, {
        type: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to process message',
        timestamp: Date.now(),
      });
    }
  }

  private handleClose(clientId: string, code: number, reason: Buffer): void {
    this.logger.info(`Connection closed: ${clientId} (code: ${code}, reason: ${reason.toString()})`);

    this.connections.delete(clientId);
    this.stats.activeConnections--;

    // Clean up session
    this.sessionManager.removeSessionByClientId(clientId);

    this.emit('disconnection', { clientId, code });
  }

  private handleError(clientId: string, error: Error): void {
    this.stats.errors++;
    this.logger.error(`Connection error for ${clientId}`, { error });
    this.emit('error', { clientId, error });
  }

  private handlePong(clientId: string): void {
    this.sessionManager.updateActivity(clientId);
  }

  private handleServerError(error: Error): void {
    this.stats.errors++;
    this.logger.error('Server error', { error });
    this.emit('error', { error });
  }

  private send(ws: WebSocket, message: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      ws.send(data);
      this.stats.messagesSent++;
      this.stats.bytesSent += data.length;
    }
  }

  private requiresAuth(messageType: string): boolean {
    const publicTypes = ['auth.login', 'auth.register', 'ping'];
    return !publicTypes.includes(messageType);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getState(): GatewayState {
    return this.state;
  }

  getStats(): GatewayStats {
    return {
      ...this.stats,
      state: this.state as unknown as GatewayServerState,
    };
  }

  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  kickClient(clientId: string, reason: string): boolean {
    const ws = this.connections.get(clientId);
    if (ws) {
      ws.close(1008, reason);
      return true;
    }
    return false;
  }

  broadcast(message: unknown, excludeClientId?: string): void {
    const data = JSON.stringify(message);
    for (const [clientId, ws] of this.connections) {
      if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        this.stats.messagesSent++;
        this.stats.bytesSent += data.length;
      }
    }
  }
}
