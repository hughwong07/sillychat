/**
 * Mock Service Worker Configuration
 * SillyChat - MSW Server Setup for Integration Tests
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse, ws } from 'msw';
import type {
  XSGMessage,
  ChatMessage,
  AgentCommand,
  SystemEvent,
  FileTransfer,
} from '../../src/core/protocol/types.js';
import {
  MessageType,
  ContentType,
  SenderRole,
  SystemEventType,
  FileTransferStatus,
  PermissionLevel,
} from '../../src/core/protocol/types.js';

// ============================================================================
// Mock Data Factories
// ============================================================================

export const mockFactories = {
  /**
   * Generate a unique ID
   */
  generateId: (prefix: string = 'id'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  },

  /**
   * Create a mock sender
   */
  createSender: (options: {
    userId?: string;
    deviceId?: string;
    role?: SenderRole;
    displayName?: string;
  } = {}) => {
    return {
      userId: options.userId || mockFactories.generateId('user'),
      deviceId: options.deviceId || mockFactories.generateId('dev'),
      role: options.role || SenderRole.HUMAN,
      displayName: options.displayName || 'Test User',
    };
  },

  /**
   * Create a mock target
   */
  createTarget: (options: { channelId?: string; userId?: string } = {}) => {
    return {
      channelId: options.channelId || mockFactories.generateId('channel'),
      userId: options.userId,
    };
  },

  /**
   * Create a mock auth context
   */
  createAuthContext: (options: { level?: PermissionLevel } = {}) => {
    return {
      level: options.level || PermissionLevel.OWNER,
      token: `mock_token_${mockFactories.generateId()}`,
    };
  },

  /**
   * Create a mock chat message
   */
  createChatMessage: (options: {
    id?: string;
    content?: string;
    sender?: ReturnType<typeof mockFactories.createSender>;
    target?: ReturnType<typeof mockFactories.createTarget>;
    auth?: ReturnType<typeof mockFactories.createAuthContext>;
  } = {}): XSGMessage => {
    const now = Date.now();
    return {
      id: options.id || mockFactories.generateId('msg'),
      type: MessageType.CHAT,
      timestamp: now,
      sender: options.sender || mockFactories.createSender(),
      target: options.target || mockFactories.createTarget(),
      content: {
        type: ContentType.TEXT,
        data: options.content || 'Hello, this is a test message',
      },
      auth: options.auth || mockFactories.createAuthContext(),
    };
  },

  /**
   * Create a mock agent command
   */
  createAgentCommand: (options: {
    agentId?: string;
    command?: string;
    sender?: ReturnType<typeof mockFactories.createSender>;
  } = {}): AgentCommand => {
    return {
      id: mockFactories.generateId('cmd'),
      type: MessageType.COMMAND,
      agentId: options.agentId || mockFactories.generateId('agent'),
      command: {
        type: 'chat',
        payload: { text: options.command || 'Process this message' },
      },
      context: {
        history: [],
        files: [],
        permissions: ['read', 'write'],
      },
      sender: options.sender || mockFactories.createSender({ role: SenderRole.HUMAN }),
      auth: mockFactories.createAuthContext(),
      timestamp: Date.now(),
    };
  },

  /**
   * Create a mock system event
   */
  createSystemEvent: (options: {
    eventType?: SystemEventType;
    data?: unknown;
  } = {}): SystemEvent => {
    return {
      id: mockFactories.generateId('evt'),
      type: MessageType.EVENT,
      eventType: options.eventType || SystemEventType.USER_JOIN,
      timestamp: Date.now(),
      data: options.data || { userId: mockFactories.generateId('user') },
    };
  },

  /**
   * Create a mock file transfer
   */
  createFileTransfer: (options: {
    fileName?: string;
    fileSize?: number;
    status?: FileTransferStatus;
  } = {}): FileTransfer => {
    return {
      id: mockFactories.generateId('file'),
      type: MessageType.FILE,
      fileId: mockFactories.generateId('file'),
      fileName: options.fileName || 'test-document.pdf',
      fileSize: options.fileSize || 1024 * 1024, // 1MB
      mimeType: 'application/pdf',
      sender: mockFactories.createSender(),
      target: mockFactories.createTarget(),
      status: options.status || FileTransferStatus.PENDING,
      chunkSize: 64 * 1024,
      totalChunks: Math.ceil((options.fileSize || 1024 * 1024) / (64 * 1024)),
      auth: mockFactories.createAuthContext(),
    };
  },

  /**
   * Create a mock user
   */
  createUser: (options: { username?: string; email?: string } = {}) => {
    const id = mockFactories.generateId('user');
    return {
      id,
      username: options.username || `user_${id.slice(-8)}`,
      email: options.email || `user_${id.slice(-8)}@example.com`,
      createdAt: Date.now(),
      lastLoginAt: null as number | null,
    };
  },

  /**
   * Create a mock conversation
   */
  createConversation: (options: { title?: string; participants?: string[] } = {}) => {
    const id = mockFactories.generateId('conv');
    return {
      id,
      title: options.title || `Conversation ${id.slice(-8)}`,
      participants: options.participants || [mockFactories.generateId('user')],
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };
  },

  /**
   * Create a mock agent
   */
  createAgent: (options: { name?: string; role?: string } = {}) => {
    const id = mockFactories.generateId('agent');
    return {
      id,
      name: options.name || `Agent ${id.slice(-8)}`,
      role: options.role || 'assistant',
      status: 'online',
      capabilities: ['chat', 'file-processing'],
      createdAt: Date.now(),
    };
  },
};

// ============================================================================
// Mock State
// ============================================================================

export const mockState = {
  users: new Map<string, ReturnType<typeof mockFactories.createUser>>(),
  conversations: new Map<string, ReturnType<typeof mockFactories.createConversation>>(),
  messages: new Map<string, XSGMessage>(),
  agents: new Map<string, ReturnType<typeof mockFactories.createAgent>>(),
  sessions: new Map<string, { token: string; userId: string; expiresAt: number }>(),

  reset: () => {
    mockState.users.clear();
    mockState.conversations.clear();
    mockState.messages.clear();
    mockState.agents.clear();
    mockState.sessions.clear();
  },

  addUser: (user: ReturnType<typeof mockFactories.createUser>) => {
    mockState.users.set(user.id, user);
    return user;
  },

  addConversation: (conversation: ReturnType<typeof mockFactories.createConversation>) => {
    mockState.conversations.set(conversation.id, conversation);
    return conversation;
  },

  addMessage: (message: XSGMessage) => {
    mockState.messages.set(message.id, message);
    return message;
  },

  addAgent: (agent: ReturnType<typeof mockFactories.createAgent>) => {
    mockState.agents.set(agent.id, agent);
    return agent;
  },

  addSession: (session: { token: string; userId: string; expiresAt: number }) => {
    mockState.sessions.set(session.token, session);
    return session;
  },
};

// ============================================================================
// HTTP Request Handlers
// ============================================================================

export const handlers = [
  // Webhook Service Mock (port 9000)
  http.get('http://localhost:9000/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      service: 'webhook',
      uptime: 3600,
      timestamp: Date.now(),
    });
  }),

  http.post('http://localhost:9000/webhook', async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // If JSON parsing fails, return 400
      return HttpResponse.json(
        {
          success: false,
          error: 'Invalid JSON payload',
        },
        { status: 400 }
      );
    }

    // Validate webhook payload
    if (!body || typeof body !== 'object') {
      return HttpResponse.json(
        {
          success: false,
          error: 'Invalid webhook payload',
        },
        { status: 400 }
      );
    }

    // Mock successful webhook processing - empty object is valid
    return HttpResponse.json({
      success: true,
      message: 'Webhook received',
      receivedAt: Date.now(),
      id: mockFactories.generateId('webhook'),
    });
  }),

  // Health check endpoint for non-test ports (only port 9000 - webhook service)
  http.get('http://localhost:9000/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      service: 'webhook',
      uptime: 3600,
      timestamp: Date.now(),
    });
  }),

  // Stats endpoint for webhook service (port 9000)
  http.get('http://localhost:9000/stats', () => {
    return HttpResponse.json({
      totalConnections: 100,
      activeConnections: 5,
      messagesReceived: 1000,
      messagesSent: 950,
      bytesReceived: 1024 * 1024 * 10,
      bytesSent: 1024 * 1024 * 8,
      errors: 2,
      startTime: Date.now() - 3600000,
    });
  }),

  // Auth - Login (only intercept webhook service port 9000)
  http.post('http://localhost:9000/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };

    // Validate credentials (mock validation)
    if (!body.username || !body.password) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Username and password are required',
          code: 400,
        },
        { status: 400 }
      );
    }

    const user = mockFactories.createUser({ username: body.username });
    mockState.addUser(user);

    const token = `jwt_${mockFactories.generateId()}`;
    const session = {
      token,
      userId: user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    mockState.addSession(session);

    return HttpResponse.json({
      success: true,
      data: {
        token,
        user,
      },
      code: 200,
    });
  }),

  // Auth - Register (only intercept webhook service port 9000)
  http.post('http://localhost:9000/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      username: string;
      password: string;
      email: string;
    };

    if (!body.username || !body.password || !body.email) {
      return HttpResponse.json(
        {
          success: false,
          error: 'All fields are required',
          code: 400,
        },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Password must be at least 6 characters',
          code: 400,
        },
        { status: 400 }
      );
    }

    const user = mockFactories.createUser({
      username: body.username,
      email: body.email,
    });
    mockState.addUser(user);

    const token = `jwt_${mockFactories.generateId()}`;
    const session = {
      token,
      userId: user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    mockState.addSession(session);

    return HttpResponse.json({
      success: true,
      data: {
        token,
        user,
      },
      code: 201,
    });
  }),

  // Get current user (only intercept webhook service port 9000)
  http.get('http://localhost:9000/api/v1/users/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 401,
        },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const session = mockState.sessions.get(token);

    if (!session || session.expiresAt < Date.now()) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Session expired',
          code: 401,
        },
        { status: 401 }
      );
    }

    const user = mockState.users.get(session.userId);
    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          error: 'User not found',
          code: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: user,
      code: 200,
    });
  }),

  // Get conversations (only intercept webhook service port 9000)
  http.get('http://localhost:9000/api/v1/conversations', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const conversations = Array.from(mockState.conversations.values()).slice(
      (page - 1) * limit,
      page * limit
    );

    return HttpResponse.json({
      success: true,
      data: conversations,
      code: 200,
    });
  }),

  // Create conversation (only intercept webhook service port 9000)
  http.post('http://localhost:9000/api/v1/conversations', async ({ request }) => {
    const body = (await request.json()) as { title: string; participants: string[] };

    const conversation = mockFactories.createConversation({
      title: body.title,
      participants: body.participants,
    });
    mockState.addConversation(conversation);

    return HttpResponse.json({
      success: true,
      data: conversation,
      code: 201,
    });
  }),

  // Get messages for a conversation (only intercept webhook service port 9000)
  http.get('http://localhost:9000/api/v1/conversations/:id/messages', ({ params }) => {
    const { id } = params;

    const messages = Array.from(mockState.messages.values()).filter(
      (msg) => msg.target.channelId === id
    );

    return HttpResponse.json({
      success: true,
      data: messages,
      code: 200,
    });
  }),

  // Send message (only intercept webhook service port 9000)
  http.post('http://localhost:9000/api/v1/conversations/:id/messages', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { content: string };

    const message = mockFactories.createChatMessage({
      content: body.content,
      target: mockFactories.createTarget({ channelId: id as string }),
    });
    mockState.addMessage(message);

    return HttpResponse.json({
      success: true,
      data: message,
      code: 201,
    });
  }),

  // Get agents (only intercept webhook service port 9000)
  http.get('http://localhost:9000/api/v1/agents', () => {
    const agents = Array.from(mockState.agents.values());

    return HttpResponse.json({
      success: true,
      data: agents,
      code: 200,
    });
  }),

  // Get agent detail (only intercept webhook service port 9000)
  http.get('http://localhost:9000/api/v1/agents/:id', ({ params }) => {
    const { id } = params;
    const agent = mockState.agents.get(id as string);

    if (!agent) {
      return HttpResponse.json(
        {
          success: false,
          error: 'Agent not found',
          code: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: agent,
      code: 200,
    });
  }),

  // File upload (only intercept webhook service port 9000)
  http.post('http://localhost:9000/api/v1/upload', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return HttpResponse.json(
        {
          success: false,
          error: 'No file provided',
          code: 400,
        },
        { status: 400 }
      );
    }

    const fileTransfer = mockFactories.createFileTransfer({
      fileName: file.name,
      fileSize: file.size,
      status: FileTransferStatus.COMPLETED,
    });

    return HttpResponse.json({
      success: true,
      data: {
        fileId: fileTransfer.fileId,
        fileName: fileTransfer.fileName,
        fileSize: fileTransfer.fileSize,
        status: fileTransfer.status,
      },
      code: 201,
    });
  }),
];

// ============================================================================
// WebSocket Mock
// ============================================================================

export const wsHandlers = [
  // Only intercept WebSocket connections to ports other than 18791 (Gateway test port)
  // Use a pattern that excludes the test server port
  ws.link('ws://localhost:1879[0,2-9]/ws').addEventListener('connection', ({ client }) => {
    // Send welcome message
    client.send(
      JSON.stringify({
        type: 'connection.accepted',
        clientId: mockFactories.generateId('client'),
        timestamp: Date.now(),
      })
    );

    client.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);

        // Echo back the message with type transformed
        if (message.type === 'chat.message') {
          client.send(
            JSON.stringify({
              ...message,
              id: mockFactories.generateId('msg'),
              timestamp: Date.now(),
              delivered: true,
            })
          );
        }

        // Handle ping
        if (message.type === 'ping') {
          client.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }

        // Handle auth
        if (message.type === 'auth.login') {
          client.send(
            JSON.stringify({
              type: 'auth.success',
              token: `jwt_${mockFactories.generateId()}`,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        client.send(
          JSON.stringify({
            type: 'error',
            code: 'INVALID_MESSAGE',
            message: 'Failed to parse message',
            timestamp: Date.now(),
          })
        );
      }
    });
  }),

  // Webhook Service WebSocket Mock (port 9000)
  // Intercepts connections to ws://localhost:9000/ws
  ws.link('ws://localhost:9000/ws').addEventListener('connection', ({ client }) => {
    // Send connected message (webhook service uses 'connected' type)
    client.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to webhook service',
        timestamp: Date.now(),
      })
    );

    client.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);

        // Handle ping from client
        if (message.type === 'ping') {
          client.send(
            JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        client.send(
          JSON.stringify({
            type: 'error',
            code: 'INVALID_MESSAGE',
            message: 'Failed to parse message',
            timestamp: Date.now(),
          })
        );
      }
    });
  }),
];

// ============================================================================
// MSW Server Setup
// ============================================================================

export const server = setupServer(...handlers, ...wsHandlers);

/**
 * Start the mock server
 */
export function startMockServer(): void {
  server.listen({ onUnhandledRequest: 'warn' });
  console.log('[MSW] Mock server started');
}

/**
 * Stop the mock server
 */
export function stopMockServer(): void {
  server.close();
  console.log('[MSW] Mock server stopped');
}

/**
 * Reset mock state between tests
 */
export function resetMockState(): void {
  mockState.reset();
  server.resetHandlers();
}

// Export all for convenience
export { http, HttpResponse, ws };
