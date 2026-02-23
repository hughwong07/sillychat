import { EventEmitter } from 'events';
import { Session, SessionInfo, SessionManagerConfig, SessionState } from './types.js';
import { Logger } from '@utils/logger.js';

export interface SessionManagerOptions {
  config: SessionManagerConfig;
  logger: Logger;
}

export class SessionManager extends EventEmitter {
  private config: SessionManagerConfig;
  private sessions: Map<string, Session> = new Map(); // sessionId -> Session
  private clientSessionMap: Map<string, string> = new Map(); // clientId -> sessionId
  private userSessionMap: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private cleanupInterval: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(options: SessionManagerOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger.createChild('SessionManager');

    // Start cleanup interval
    this.startCleanupInterval();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all sessions
    this.sessions.clear();
    this.clientSessionMap.clear();
    this.userSessionMap.clear();

    this.logger.info('Session manager destroyed');
  }

  createSession(clientId: string, userId?: string): Session {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: Session = {
      id: sessionId,
      clientId,
      userId: userId || null,
      clientIds: new Set([clientId]),
      state: SessionState.ACTIVE,
      createdAt: now,
      lastActivity: now,
      lastActivityAt: now,
      authenticated: !!userId,
      metadata: {},
      data: new Map(),
      subscribedChannels: new Set(),
    };

    this.sessions.set(sessionId, session);
    this.clientSessionMap.set(clientId, sessionId);

    if (userId) {
      const userSessions = this.userSessionMap.get(userId);
      if (userSessions) {
        userSessions.add(sessionId);
      } else {
        this.userSessionMap.set(userId, new Set([sessionId]));
      }
    }

    this.logger.info(`Session created: ${sessionId} for client ${clientId}`);
    this.emit('sessionCreated', session);

    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (session && this.isSessionValid(session)) {
      return session;
    }
    return null;
  }

  getSessionByClientId(clientId: string): Session | null {
    const sessionId = this.clientSessionMap.get(clientId);
    if (sessionId) {
      return this.getSession(sessionId);
    }
    return null;
  }

  getSessionsByUserId(userId: string): Session[] {
    const sessionIds = this.userSessionMap.get(userId);
    if (!sessionIds) return [];

    const sessions: Session[] = [];
    for (const sessionId of sessionIds) {
      const session = this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  updateSession(sessionId: string, updates: Partial<Session>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    Object.assign(session, updates);
    session.lastActivity = Date.now();

    this.emit('sessionUpdated', session);
    return true;
  }

  authenticateSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Remove from old user if any
    if (session.userId) {
      const oldUserSessions = this.userSessionMap.get(session.userId);
      if (oldUserSessions) {
        oldUserSessions.delete(sessionId);
      }
    }

    // Update session
    session.userId = userId;
    session.authenticated = true;
    session.lastActivity = Date.now();

    // Add to new user
    const userSessions = this.userSessionMap.get(userId);
    if (userSessions) {
      userSessions.add(sessionId);
    } else {
      this.userSessionMap.set(userId, new Set([sessionId]));
    }

    this.logger.info(`Session ${sessionId} authenticated for user ${userId}`);
    this.emit('sessionAuthenticated', session);

    return true;
  }

  removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Clean up mappings
    this.clientSessionMap.delete(session.clientId);

    if (session.userId) {
      const userSessions = this.userSessionMap.get(session.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessionMap.delete(session.userId);
        }
      }
    }

    this.sessions.delete(sessionId);

    this.logger.info(`Session removed: ${sessionId}`);
    this.emit('sessionRemoved', session);

    return true;
  }

  removeSessionByClientId(clientId: string): boolean {
    const sessionId = this.clientSessionMap.get(clientId);
    if (sessionId) {
      return this.removeSession(sessionId);
    }
    return false;
  }

  removeSessionsByUserId(userId: string): number {
    const sessionIds = this.userSessionMap.get(userId);
    if (!sessionIds) return 0;

    let count = 0;
    for (const sessionId of [...sessionIds]) {
      if (this.removeSession(sessionId)) {
        count++;
      }
    }

    return count;
  }

  updateActivity(clientId: string): void {
    const session = this.getSessionByClientId(clientId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  getAllSessions(): SessionInfo[] {
    const now = Date.now();
    const sessions: SessionInfo[] = [];

    for (const session of this.sessions.values()) {
      sessions.push({
        ...session,
        isActive: this.isSessionActive(session, now),
        isValid: this.isSessionValid(session, now),
      });
    }

    return sessions;
  }

  getActiveSessionCount(): number {
    const now = Date.now();
    let count = 0;

    for (const session of this.sessions.values()) {
      if (this.isSessionActive(session, now)) {
        count++;
      }
    }

    return count;
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  private isSessionActive(session: Session, now = Date.now()): boolean {
    const inactiveThreshold = this.config.inactiveThreshold * 1000;
    return now - session.lastActivity < inactiveThreshold;
  }

  private isSessionValid(session: Session, now = Date.now()): boolean {
    const maxAge = this.config.maxAge * 1000;
    return now - session.createdAt < maxAge;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private startCleanupInterval(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (!this.isSessionValid(session, now)) {
        this.removeSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired sessions`);
    }
  }
}
