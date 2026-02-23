/**
 * Protocol Layer Integration Tests
 * SillyChat - Tests for message serialization/deserialization flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types
  MessageType,
  ContentType,
  SenderRole,
  ChannelType,
  SerializationFormat,
  PermissionLevel,
  SystemEventType,
  FileTransferStatus,
  // Message factories
  createSender,
  createHumanSender,
  createAISender,
  createTarget,
  createDirectTarget,
  createGroupTarget,
  createTextContent,
  createImageContent,
  createFileContent,
  createSkillContent,
  createAuthContext,
  createBaseMessage,
  createChatMessage,
  createTextMessage,
  createAgentCommand,
  createChatCommand,
  createSystemEvent,
  createUserJoinEvent,
  createFileTransfer,
  // Serialization
  serialize,
  deserialize,
  serializeJSON,
  serializeProtobuf,
  deserializeBatch,
  serializeBatch,
  detectFormat,
  // Validation
  validateMessage,
  validateSender,
  validateContent,
  validateChatMessage,
  validateAgentCommand,
  validateSystemEvent,
  validateFileTransfer,
  // Utilities
  isMessageExpired,
  getMessagePreview,
  cloneMessage,
  sanitizeText,
  checkVersionCompatibility,
  // Constants
  PROTOCOL_VERSION,
  MAX_MESSAGE_SIZE,
  MAX_TEXT_LENGTH,
} from '../../protocol/index';
import type {
  XSGMessage,
  ChatMessage,
  AgentCommand,
  SystemEvent,
  FileTransfer,
  Sender,
  Target,
  MessageContent,
  AuthContext,
} from '../../protocol/types';

describe('Protocol Layer Integration', () => {
  const testDeviceId = 'dev-test-123';
  const testUserId = 'user-test-456';
  const testAgentId = 'agent-test-789';
  const testChannelId = 'channel-test-abc';

  let sender: Sender;
  let target: Target;
  let auth: AuthContext;

  beforeEach(() => {
    sender = createHumanSender(testUserId, testDeviceId, 'Test User');
    target = createDirectTarget(testChannelId);
    auth = createAuthContext({ level: PermissionLevel.OWNER });
  });

  describe('Message Creation Flow', () => {
    it('should create a complete text message', () => {
      const message = createTextMessage(sender, target, 'Hello, World!', auth);

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.type).toBe(MessageType.CHAT);
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.sender).toEqual(sender);
      expect(message.target).toEqual(target);
      expect(message.content.type).toBe(ContentType.TEXT);
      expect(message.content.data).toBe('Hello, World!');
      expect(message.auth.level).toBe(PermissionLevel.OWNER);
    });

    it('should create a message with image content', () => {
      const imageContent = createImageContent({
        url: 'https://example.com/image.png',
        width: 800,
        height: 600,
        alt: 'Test image',
      });

      const message = createChatMessage(sender, target, imageContent, auth);

      expect(message.content.type).toBe(ContentType.IMAGE);
      expect(message.content.data).toHaveProperty('url');
      expect(message.content.data).toHaveProperty('width', 800);
      expect(message.content.data).toHaveProperty('height', 600);
    });

    it('should create a message with file content', () => {
      const fileContent = createFileContent({
        fileId: 'file-123',
        fileName: 'document.pdf',
        fileSize: 1024 * 1024,
        mimeType: 'application/pdf',
        url: 'https://example.com/file.pdf',
      });

      const message = createChatMessage(sender, target, fileContent, auth);

      expect(message.content.type).toBe(ContentType.FILE);
      expect(message.content.data).toHaveProperty('fileId', 'file-123');
      expect(message.content.data).toHaveProperty('fileName', 'document.pdf');
    });

    it('should create an agent command', () => {
      const command = createChatCommand(testAgentId, 'Process this text', sender, auth);

      expect(command.type).toBe(MessageType.COMMAND);
      expect(command.agentId).toBe(testAgentId);
      expect(command.command.type).toBe('chat');
      expect(command.command.payload).toHaveProperty('text', 'Process this text');
      expect(command.context).toBeDefined();
      expect(command.context.history).toEqual([]);
      expect(command.context.files).toEqual([]);
      expect(command.context.permissions).toBeDefined();
    });

    it('should create a system event', () => {
      const event = createUserJoinEvent(testUserId, testChannelId, 'New User');

      expect(event.type).toBe(MessageType.EVENT);
      expect(event.eventType).toBe(SystemEventType.USER_JOIN);
      expect(event.data).toHaveProperty('userId', testUserId);
      expect(event.data).toHaveProperty('channelId', testChannelId);
    });

    it('should create a file transfer', () => {
      const transfer = createFileTransfer({
        fileName: 'large-file.zip',
        fileSize: 100 * 1024 * 1024, // 100MB
        sender,
        target,
        auth,
      });

      expect(transfer.type).toBe(MessageType.FILE);
      expect(transfer.fileName).toBe('large-file.zip');
      expect(transfer.fileSize).toBe(100 * 1024 * 1024);
      expect(transfer.status).toBe(FileTransferStatus.PENDING);
      expect(transfer.chunkSize).toBeGreaterThan(0);
      expect(transfer.totalChunks).toBeGreaterThan(0);
    });
  });

  describe('Serialization Flow', () => {
    let message: XSGMessage;

    beforeEach(() => {
      message = createTextMessage(sender, target, 'Serialization test', auth);
    });

    it('should serialize message to JSON', () => {
      const result = serializeJSON(message);

      expect(result.success).toBe(true);
      expect(result.format).toBe(SerializationFormat.JSON);
      expect(typeof result.data).toBe('string');
      expect(result.byteLength).toBeGreaterThan(0);
      expect(result.checksum).toBeDefined();
    });

    it('should deserialize message from JSON', () => {
      const serialized = serializeJSON(message);
      const deserialized = deserialize(serialized.data as string, SerializationFormat.JSON);

      expect(deserialized.success).toBe(true);
      expect(deserialized.data).toBeDefined();
      expect(deserialized.data?.id).toBe(message.id);
      expect(deserialized.data?.content.data).toBe('Serialization test');
    });

    it('should serialize message to Protobuf', () => {
      const result = serializeProtobuf(message);

      expect(result.success).toBe(true);
      expect(result.format).toBe(SerializationFormat.PROTOBUF);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should deserialize message from Protobuf', () => {
      const serialized = serializeProtobuf(message);
      const deserialized = deserialize(serialized.data as Uint8Array, SerializationFormat.PROTOBUF);

      expect(deserialized.success).toBe(true);
      expect(deserialized.data).toBeDefined();
      expect(deserialized.data?.id).toBe(message.id);
    });

    it('should auto-detect JSON format', () => {
      const serialized = serializeJSON(message);
      const detected = detectFormat(serialized.data as string);

      expect(detected).toBe(SerializationFormat.JSON);
    });

    it('should auto-detect Protobuf format', () => {
      const serialized = serializeProtobuf(message);
      const detected = detectFormat(serialized.data as Uint8Array);

      expect(detected).toBe(SerializationFormat.PROTOBUF);
    });

    it('should serialize and deserialize with generic serialize function', () => {
      const jsonResult = serialize(message, { format: SerializationFormat.JSON });
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.format).toBe(SerializationFormat.JSON);

      const protoResult = serialize(message, { format: SerializationFormat.PROTOBUF });
      expect(protoResult.success).toBe(true);
      expect(protoResult.format).toBe(SerializationFormat.PROTOBUF);
    });

    it('should handle batch serialization', () => {
      const messages = [
        createTextMessage(sender, target, 'Message 1', auth),
        createTextMessage(sender, target, 'Message 2', auth),
        createTextMessage(sender, target, 'Message 3', auth),
      ];

      const serialized = serializeBatch(messages, SerializationFormat.JSON);
      expect(serialized.success).toBe(true);

      const deserialized = deserializeBatch(serialized.data as string, SerializationFormat.JSON);
      expect(deserialized.success).toBe(true);
      expect(deserialized.data?.length).toBe(3);
    });

    it('should preserve message integrity through serialization cycle', () => {
      const original = createTextMessage(sender, target, 'Integrity check', auth);

      // JSON cycle
      const jsonSerialized = serializeJSON(original);
      const jsonDeserialized = deserialize(jsonSerialized.data as string, SerializationFormat.JSON);

      expect(jsonDeserialized.data?.id).toBe(original.id);
      expect(jsonDeserialized.data?.timestamp).toBe(original.timestamp);
      expect(jsonDeserialized.data?.sender.userId).toBe(original.sender.userId);
      expect(jsonDeserialized.data?.content.data).toBe(original.content.data);

      // Protobuf cycle
      const protoSerialized = serializeProtobuf(original);
      const protoDeserialized = deserialize(
        protoSerialized.data as Uint8Array,
        SerializationFormat.PROTOBUF
      );

      expect(protoDeserialized.data?.id).toBe(original.id);
      expect(protoDeserialized.data?.sender.userId).toBe(original.sender.userId);
    });
  });

  describe('Validation Flow', () => {
    it('should validate a correct message', () => {
      const message = createTextMessage(sender, target, 'Valid message', auth);
      const result = validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject message with missing id', () => {
      const message = createTextMessage(sender, target, 'Invalid', auth);
      delete (message as any).id;

      const result = validateMessage(message);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject message with missing timestamp', () => {
      const message = createTextMessage(sender, target, 'Invalid', auth);
      delete (message as any).timestamp;

      const result = validateMessage(message);
      expect(result.valid).toBe(false);
    });

    it('should reject message with invalid sender', () => {
      const message = createTextMessage({} as Sender, target, 'Invalid', auth);

      const result = validateMessage(message);
      expect(result.valid).toBe(false);
    });

    it('should validate sender separately', () => {
      const validSender = createHumanSender(testUserId, testDeviceId);
      const validResult = validateSender(validSender);
      expect(validResult.valid).toBe(true);

      const invalidSender = { userId: '' } as Sender;
      const invalidResult = validateSender(invalidSender);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate content separately', () => {
      const validContent = createTextContent('Valid content');
      const validResult = validateContent(validContent);
      expect(validResult.valid).toBe(true);

      const invalidContent = { type: 'invalid', data: null } as MessageContent;
      const invalidResult = validateContent(invalidContent);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate chat message type', () => {
      const chatMessage = createTextMessage(sender, target, 'Chat message', auth);
      const result = validateChatMessage(chatMessage);
      expect(result.valid).toBe(true);

      const nonChatMessage = createAgentCommand({
        id: 'cmd-1',
        type: MessageType.COMMAND,
        agentId: testAgentId,
        command: { type: 'chat', payload: {} },
        context: { history: [], files: [], permissions: [] },
        sender,
        auth,
        timestamp: Date.now(),
      });
      const nonChatResult = validateChatMessage(nonChatMessage as ChatMessage);
      expect(nonChatResult.valid).toBe(false);
    });

    it('should validate agent command', () => {
      const command = createChatCommand(testAgentId, 'Do something', sender, auth);
      const result = validateAgentCommand(command);
      expect(result.valid).toBe(true);

      const invalidCommand = { ...command, agentId: '' };
      const invalidResult = validateAgentCommand(invalidCommand);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate system event', () => {
      const event = createUserJoinEvent(testUserId, testChannelId, 'User');
      const result = validateSystemEvent(event);
      expect(result.valid).toBe(true);

      const invalidEvent = { ...event, eventType: 'invalid' as SystemEventType };
      const invalidResult = validateSystemEvent(invalidEvent);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate file transfer', () => {
      const transfer = createFileTransfer({
        fileName: 'test.pdf',
        fileSize: 1024,
        sender,
        target,
        auth,
      });
      const result = validateFileTransfer(transfer);
      expect(result.valid).toBe(true);

      const invalidTransfer = { ...transfer, fileSize: -1 };
      const invalidResult = validateFileTransfer(invalidTransfer);
      expect(invalidResult.valid).toBe(false);
    });

    it('should enforce message size limits', () => {
      const largeContent = 'x'.repeat(MAX_TEXT_LENGTH + 1);
      const message = createTextMessage(sender, target, largeContent, auth);

      const result = validateMessage(message, { maxMessageSize: MAX_MESSAGE_SIZE });
      expect(result.valid).toBe(false);
    });
  });

  describe('Message Utilities', () => {
    it('should detect expired messages', () => {
      const recentMessage = createTextMessage(sender, target, 'Recent', auth);
      expect(isMessageExpired(recentMessage, 86400000)).toBe(false);

      const oldMessage = createTextMessage(sender, target, 'Old', auth);
      oldMessage.timestamp = Date.now() - 86400001;
      expect(isMessageExpired(oldMessage, 86400000)).toBe(true);
    });

    it('should generate message preview', () => {
      const shortMessage = createTextMessage(sender, target, 'Short text', auth);
      expect(getMessagePreview(shortMessage)).toBe('Short text');

      const longText = 'a'.repeat(200);
      const longMessage = createTextMessage(sender, target, longText, auth);
      const preview = getMessagePreview(longMessage, 50);
      expect(preview.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(preview.endsWith('...')).toBe(true);
    });

    it('should clone messages with new IDs', () => {
      const original = createTextMessage(sender, target, 'Original', auth);
      const cloned = cloneMessage(original);

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.content.data).toBe(original.content.data);
      expect(cloned.timestamp).toBe(original.timestamp);
      expect(cloned.sender).toEqual(original.sender);
    });

    it('should sanitize text content', () => {
      const dirtyText = '<script>alert("xss")</script>';
      const clean = sanitizeText(dirtyText);

      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
    });

    it('should check version compatibility', () => {
      const compatibleResult = checkVersionCompatibility(PROTOCOL_VERSION.name!);
      expect(compatibleResult.compatible).toBe(true);

      const incompatibleResult = checkVersionCompatibility('Incompatible-Protocol-v2');
      expect(incompatibleResult.compatible).toBe(false);
    });
  });

  describe('Complex Message Scenarios', () => {
    it('should handle messages with metadata', () => {
      const message = createTextMessage(sender, target, 'With metadata', auth);
      message.extensions = {
        priority: 'high',
        tags: ['important', 'urgent'],
        customField: { nested: 'value' },
      };

      const serialized = serializeJSON(message);
      const deserialized = deserialize(serialized.data as string, SerializationFormat.JSON);

      expect(deserialized.data?.extensions).toEqual(message.extensions);
    });

    it('should handle reply messages', () => {
      const originalMessage = createTextMessage(sender, target, 'Original', auth);
      const replyMessage = createTextMessage(sender, target, 'Reply', auth);
      replyMessage.replyTo = originalMessage.id;

      expect(replyMessage.replyTo).toBe(originalMessage.id);

      const result = validateMessage(replyMessage);
      expect(result.valid).toBe(true);
    });

    it('should handle edited messages', () => {
      const message = createTextMessage(sender, target, 'Original', auth);
      message.editHistory = [
        { content: 'Original', timestamp: Date.now() - 1000 },
        { content: 'First edit', timestamp: Date.now() - 500 },
      ];
      message.editedAt = Date.now();

      const result = validateMessage(message);
      expect(result.valid).toBe(true);
    });

    it('should handle messages with expiration', () => {
      const message = createTextMessage(sender, target, 'Ephemeral', auth);
      message.expiresAt = Date.now() + 60000; // Expires in 1 minute

      expect(isMessageExpired(message, 120000)).toBe(false);

      message.expiresAt = Date.now() - 1000;
      expect(isMessageExpired(message, 120000)).toBe(true);
    });

    it('should handle different channel types', () => {
      const directTarget = createDirectTarget(testChannelId);
      const groupTarget = createGroupTarget('group-channel-id');

      const directMessage = createTextMessage(sender, directTarget, 'Direct', auth);
      const groupMessage = createTextMessage(sender, groupTarget, 'Group', auth);

      expect(directMessage.target.channelType).toBe(ChannelType.DIRECT);
      expect(groupMessage.target.channelType).toBe(ChannelType.GROUP);
    });

    it('should handle different sender roles', () => {
      const humanSender = createHumanSender(testUserId, testDeviceId, 'Human');
      const aiSender = createAISender(testAgentId, testUserId, testDeviceId, 'AI');

      const humanMessage = createTextMessage(humanSender, target, 'From human', auth);
      const aiMessage = createTextMessage(aiSender, target, 'From AI', auth);

      expect(humanMessage.sender.role).toBe(SenderRole.HUMAN);
      expect(aiMessage.sender.role).toBe(SenderRole.AI);
      expect(aiMessage.sender.agentId).toBe(testAgentId);
    });

    it('should handle skill content', () => {
      const skillContent = createSkillContent({
        skillId: 'skill-123',
        skillName: 'CodeInterpreter',
        command: 'analyze',
        args: { code: 'print("hello")' },
      });

      const message = createChatMessage({ sender, target, content: skillContent, auth });

      expect(message.content.type).toBe(ContentType.SKILL);
      expect(message.content.data).toHaveProperty('skillId', 'skill-123');
      expect(message.content.data).toHaveProperty('command', 'analyze');
    });
  });

  describe('Protocol Constants', () => {
    it('should have correct protocol version', () => {
      expect(PROTOCOL_VERSION.major).toBe(1);
      expect(PROTOCOL_VERSION.minor).toBe(0);
      expect(PROTOCOL_VERSION.patch).toBe(0);
      expect(PROTOCOL_VERSION.name).toBe('SillyChat-Protocol-v1');
    });

    it('should have reasonable size limits', () => {
      expect(MAX_MESSAGE_SIZE).toBeGreaterThan(0);
      expect(MAX_TEXT_LENGTH).toBeGreaterThan(0);
      expect(MAX_MESSAGE_SIZE).toBeGreaterThan(MAX_TEXT_LENGTH);
    });

    it('should have all required message types', () => {
      expect(MessageType.CHAT).toBe('chat');
      expect(MessageType.COMMAND).toBe('command');
      expect(MessageType.EVENT).toBe('event');
      expect(MessageType.SYSTEM).toBe('system');
      expect(MessageType.FILE).toBe('file');
    });

    it('should have all required content types', () => {
      expect(ContentType.TEXT).toBe('text');
      expect(ContentType.IMAGE).toBe('image');
      expect(ContentType.FILE).toBe('file');
      expect(ContentType.SKILL).toBe('skill');
      expect(ContentType.AUDIO).toBe('audio');
      expect(ContentType.VIDEO).toBe('video');
      expect(ContentType.RICHTEXT).toBe('richtext');
    });
  });
});
