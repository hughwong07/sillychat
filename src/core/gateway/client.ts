import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { GatewayClientConfig, ConnectionState, GatewayMessage } from './types.js';
import { Logger } from '@utils/logger.js';

export interface GatewayClientOptions {
  config: GatewayClientConfig;
  logger: Logger;
}

export class GatewayClient extends EventEmitter {
  private config: GatewayClientConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private messageQueue: unknown[] = [];
  private logger: Logger;
  private clientId: string | null = null;

  constructor(options: GatewayClientOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger.createChild('GatewayClient');
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      this.logger.warn('Already connecting or connected');
      return;
    }

    this.state = ConnectionState.CONNECTING;
    this.emit('stateChange', this.state);

    const url = `ws://${this.config.host}:${this.config.port}/ws`;
    this.logger.info(`Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url, {
        headers: this.config.token ? { Authorization: `Bearer ${this.config.token}` } : undefined,
      });

      this.setupEventHandlers();

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          this.cleanupPromiseHandlers();
          resolve();
        };
        const onError = (error: Error) => {
          this.cleanupPromiseHandlers();
          reject(error);
        };

        this.ws!.once('open', onOpen);
        this.ws!.once('error', onError);
      });
    } catch (error) {
      this.state = ConnectionState.ERROR;
      this.emit('stateChange', this.state);
      this.logger.error('Connection failed', { error });

      if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }

      throw error;
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting...');

    // Clear reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear ping
    this.stopPingInterval();

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.state = ConnectionState.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.emit('stateChange', this.state);
  }

  send(message: unknown): boolean {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      this.logger.warn('Cannot send message, not connected');
      this.messageQueue.push(message);
      return false;
    }

    try {
      const data = JSON.stringify(message);
      this.ws.send(data);
      this.emit('messageSent', message);
      return true;
    } catch (error) {
      this.logger.error('Failed to send message', { error });
      this.messageQueue.push(message);
      return false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', this.handleOpen.bind(this));
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
    this.ws.on('ping', this.handlePing.bind(this));
  }

  private handleOpen(): void {
    this.logger.info('Connection established');
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.emit('stateChange', this.state);
    this.emit('connected');

    // Start ping interval
    this.startPingInterval();

    // Flush message queue
    this.flushMessageQueue();
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as GatewayMessage;

      // Handle connection accepted
      if (message.type === 'connection.accepted') {
        this.clientId = (message as { clientId?: string }).clientId || null;
        this.logger.info(`Connected with client ID: ${this.clientId}`);
        return;
      }

      // Handle errors
      if (message.type === 'error') {
        this.logger.error('Server error', { message });
        this.emit('errorMessage', message);
        return;
      }

      this.emit('message', message);
    } catch (error) {
      this.logger.error('Failed to parse message', { error, data });
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    this.logger.info(`Connection closed (code: ${code}, reason: ${reason.toString()})`);

    this.stopPingInterval();
    this.ws = null;

    const wasConnected = this.state === ConnectionState.CONNECTED;
    this.state = ConnectionState.DISCONNECTED;
    this.emit('stateChange', this.state);
    this.emit('disconnected', { code, reason: reason.toString() });

    // Auto reconnect if enabled and was previously connected
    if (wasConnected && this.config.reconnect && code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.logger.error('WebSocket error', { error });
    this.state = ConnectionState.ERROR;
    this.emit('stateChange', this.state);
    this.emit('error', error);
  }

  private handlePing(): void {
    // Respond with pong (automatic in most WebSocket implementations)
    this.logger.debug('Received ping');
  }

  private startPingInterval(): void {
    if (this.config.heartbeatInterval <= 0) return;

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();

        // Set pong timeout
        this.pongTimeout = setTimeout(() => {
          this.logger.warn('Pong timeout, closing connection');
          this.ws?.terminate();
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    this.state = ConnectionState.RECONNECTING;
    this.emit('stateChange', this.state);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        this.logger.error('Reconnect failed', { error });
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private cleanupPromiseHandlers(): void {
    this.ws?.removeAllListeners('open');
    this.ws?.removeAllListeners('error');
  }

  getState(): ConnectionState {
    return this.state;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
