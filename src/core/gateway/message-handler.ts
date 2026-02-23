import WebSocket from 'ws';
import { MessageContext, GatewayMessage, ChatMessage, MessageHandler } from './types.js';
import { Logger } from '@utils/logger.js';

export interface MessageHandlerOptions {
  logger: Logger;
}

export class GatewayMessageHandler implements MessageHandler {
  private logger: Logger;
  private handlers: Map<string, (message: GatewayMessage, context: MessageContext) => Promise<void>> = new Map();

  constructor(options: MessageHandlerOptions) {
    this.logger = options.logger.createChild('MessageHandler');
    this.registerDefaultHandlers();
  }

  async handle(message: GatewayMessage, context: MessageContext): Promise<void> {
    const handler = this.handlers.get(message.type);

    if (handler) {
      try {
        await handler(message, context);
      } catch (error) {
        this.logger.error(`Handler error for message type ${message.type}`, { error });
        this.sendError(context.ws, 'HANDLER_ERROR', 'Failed to process message');
      }
    } else {
      this.logger.warn(`No handler for message type: ${message.type}`);
      this.sendError(context.ws, 'UNKNOWN_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  register(type: string, handler: (message: GatewayMessage, context: MessageContext) => Promise<void>): void {
    this.handlers.set(type, handler);
    this.logger.debug(`Registered handler for ${type}`);
  }

  unregister(type: string): void {
    this.handlers.delete(type);
    this.logger.debug(`Unregistered handler for ${type}`);
  }

  private registerDefaultHandlers(): void {
    // Ping handler
    this.register('ping', async (message, context) => {
      this.send(context.ws, {
        type: 'pong',
        timestamp: Date.now(),
        echo: message,
      });
    });

    // Authentication handlers
    this.register('auth.login', async (message, context) => {
      const { username, password } = message as { username: string; password: string };

      const result = await context.authManager.login({ username, password });

      if (result.success) {
        // Associate session with user
        const session = context.sessionManager.getSessionByClientId(context.clientId);
        if (session && result.userId) {
          context.sessionManager.authenticateSession(session.id, result.userId);
        }

        this.send(context.ws, {
          type: 'auth.success',
          userId: result.userId,
          token: result.token,
          expiresAt: result.expiresAt,
          timestamp: Date.now(),
        });
      } else {
        this.sendError(context.ws, 'AUTH_FAILED', result.error || 'Authentication failed');
      }
    });

    this.register('auth.register', async (message, context) => {
      const { username, password } = message as { username: string; password: string };

      const result = await context.authManager.register({ username, password });

      if (result.success) {
        this.send(context.ws, {
          type: 'auth.registered',
          userId: result.userId,
          timestamp: Date.now(),
        });
      } else {
        this.sendError(context.ws, 'REGISTRATION_FAILED', result.error || 'Registration failed');
      }
    });

    this.register('auth.logout', async (message, context) => {
      const session = context.sessionManager.getSessionByClientId(context.clientId);
      if (session?.userId) {
        await context.authManager.logoutAll(session.userId);
      }

      this.send(context.ws, {
        type: 'auth.logged_out',
        timestamp: Date.now(),
      });
    });

    // Chat handlers
    this.register('chat.message', async (message, context) => {
      const chatMessage = message as ChatMessage;
      const session = context.sessionManager.getSessionByClientId(context.clientId);

      if (!session?.authenticated) {
        this.sendError(context.ws, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      // Echo message back with acknowledgment
      this.send(context.ws, {
        type: 'chat.ack',
        messageId: chatMessage.id,
        timestamp: Date.now(),
      });

      // Broadcast to other participants if it's a group chat
      if (chatMessage.receiverId) {
        // This would be handled by the chat service
        this.logger.debug(`Chat message from ${session.userId} to ${chatMessage.receiverId}`);
      }
    });

    // Session handlers
    this.register('session.info', async (message, context) => {
      const session = context.sessionManager.getSessionByClientId(context.clientId);

      if (!session) {
        this.sendError(context.ws, 'SESSION_NOT_FOUND', 'Session not found');
        return;
      }

      this.send(context.ws, {
        type: 'session.info',
        session: {
          id: session.id,
          authenticated: session.authenticated,
          userId: session.userId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
        },
        timestamp: Date.now(),
      });
    });

    // System handlers
    this.register('system.stats', async (message, context) => {
      const session = context.sessionManager.getSessionByClientId(context.clientId);

      if (!session?.authenticated) {
        this.sendError(context.ws, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      // Check permission
      if (session.userId && !context.authManager.hasPermission(session.userId, 'system.stats')) {
        this.sendError(context.ws, 'FORBIDDEN', 'Insufficient permissions');
        return;
      }

      this.send(context.ws, {
        type: 'system.stats',
        stats: {
          sessions: context.sessionManager.getSessionCount(),
          activeSessions: context.sessionManager.getActiveSessionCount(),
          timestamp: Date.now(),
        },
      });
    });
  }

  private send(ws: WebSocket, message: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    this.send(ws, {
      type: 'error',
      code,
      message,
      timestamp: Date.now(),
    });
  }
}
