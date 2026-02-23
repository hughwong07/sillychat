/**
 * Chat Flow E2E Tests
 * SillyChat - End-to-end tests for chat functionality
 */

import { device, element, by, waitFor } from 'detox';

describe('Chat Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();

    // Login before each test
    await element(by.id('username-input')).typeText('testuser');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('main-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate to chat tab
    await element(by.id('chat-tab')).tap();
  });

  describe('Conversation List', () => {
    it('should display conversation list', async () => {
      await expect(element(by.id('conversation-list'))).toBeVisible();
    });

    it('should show conversation items', async () => {
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await expect(element(by.id('conversation-item'))).toBeVisible();
    });

    it('should show new conversation button', async () => {
      await expect(element(by.id('new-conversation-button'))).toBeVisible();
    });

    it('should open new conversation dialog', async () => {
      await element(by.id('new-conversation-button')).tap();

      await waitFor(element(by.id('new-conversation-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('conversation-title-input'))).toBeVisible();
      await expect(element(by.id('create-conversation-button'))).toBeVisible();
    });

    it('should create new conversation', async () => {
      // Open new conversation dialog
      await element(by.id('new-conversation-button')).tap();

      await waitFor(element(by.id('new-conversation-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      // Enter conversation title
      await element(by.id('conversation-title-input')).typeText('Test Conversation');
      await element(by.id('conversation-title-input')).tapReturnKey();

      // Create conversation
      await element(by.id('create-conversation-button')).tap();

      // Verify new conversation appears in list
      await waitFor(element(by.text('Test Conversation')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should search conversations', async () => {
      // Tap search button
      await element(by.id('search-button')).tap();

      // Enter search query
      await element(by.id('search-input')).typeText('test');

      // Wait for search results
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);
    });

    it('should refresh conversation list', async () => {
      // Pull to refresh
      await element(by.id('conversation-list')).swipe('down', 'fast', 0.5);

      // Verify list is still visible after refresh
      await expect(element(by.id('conversation-list'))).toBeVisible();
    });
  });

  describe('Chat Screen', () => {
    beforeEach(async () => {
      // Open first conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should display chat screen', async () => {
      await expect(element(by.id('chat-screen'))).toBeVisible();
    });

    it('should show message list', async () => {
      await expect(element(by.id('message-list'))).toBeVisible();
    });

    it('should show message input', async () => {
      await expect(element(by.id('message-input'))).toBeVisible();
    });

    it('should show send button', async () => {
      await expect(element(by.id('send-button'))).toBeVisible();
    });

    it('should send text message', async () => {
      // Type message
      await element(by.id('message-input')).typeText('Hello, this is a test message');

      // Send message
      await element(by.id('send-button')).tap();

      // Verify message appears in list
      await waitFor(element(by.text('Hello, this is a test message')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show typing indicator', async () => {
      // Type in input
      await element(by.id('message-input')).typeText('Typing...');

      // Typing indicator should appear in conversation
      await waitFor(element(by.id('typing-indicator')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should receive AI response', async () => {
      // Send a message
      await element(by.id('message-input')).typeText('What is AI?');
      await element(by.id('send-button')).tap();

      // Wait for AI response
      await waitFor(element(by.id('ai-message')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify AI message is visible
      await expect(element(by.id('ai-message'))).toBeVisible();
    });

    it('should scroll through message history', async () => {
      // Send multiple messages to create scrollable content
      for (let i = 0; i < 5; i++) {
        await element(by.id('message-input')).typeText(`Message ${i}`);
        await element(by.id('send-button')).tap();
        await waitFor(element(by.text(`Message ${i}`)))
          .toBeVisible()
          .withTimeout(3000);
      }

      // Scroll up in message list
      await element(by.id('message-list')).swipe('up', 'slow', 0.5);

      // Verify list is still visible
      await expect(element(by.id('message-list'))).toBeVisible();
    });

    it('should show message timestamps', async () => {
      // Send a message
      await element(by.id('message-input')).typeText('Test message');
      await element(by.id('send-button')).tap();

      // Wait for message to appear
      await waitFor(element(by.text('Test message')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify timestamp is visible
      await expect(element(by.id('message-timestamp'))).toBeVisible();
    });
  });

  describe('Message Actions', () => {
    beforeEach(async () => {
      // Open first conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Send a message
      await element(by.id('message-input')).typeText('Message to interact with');
      await element(by.id('send-button')).tap();

      await waitFor(element(by.text('Message to interact with')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should copy message', async () => {
      // Long press on message
      await element(by.text('Message to interact with')).longPress();

      // Wait for context menu
      await waitFor(element(by.id('message-context-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap copy
      await element(by.id('copy-message-button')).tap();

      // Verify success toast
      await waitFor(element(by.text('Message copied')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should delete message', async () => {
      // Long press on message
      await element(by.text('Message to interact with')).longPress();

      // Wait for context menu
      await waitFor(element(by.id('message-context-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap delete
      await element(by.id('delete-message-button')).tap();

      // Confirm deletion
      await waitFor(element(by.id('delete-confirm-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('confirm-delete-button')).tap();

      // Verify message is removed
      await waitFor(element(by.text('Message to interact with')))
        .not.toBeVisible()
        .withTimeout(3000);
    });

    it('should edit message', async () => {
      // Long press on message
      await element(by.text('Message to interact with')).longPress();

      // Wait for context menu
      await waitFor(element(by.id('message-context-menu')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap edit
      await element(by.id('edit-message-button')).tap();

      // Edit the message
      await element(by.id('edit-message-input')).clearText();
      await element(by.id('edit-message-input')).typeText('Edited message');

      // Save changes
      await element(by.id('save-edit-button')).tap();

      // Verify edited message
      await waitFor(element(by.text('Edited message')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('File Attachments', () => {
    beforeEach(async () => {
      // Open first conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show attachment button', async () => {
      await expect(element(by.id('attachment-button'))).toBeVisible();
    });

    it('should open attachment options', async () => {
      await element(by.id('attachment-button')).tap();

      await waitFor(element(by.id('attachment-options')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('camera-option'))).toBeVisible();
      await expect(element(by.id('gallery-option'))).toBeVisible();
      await expect(element(by.id('file-option'))).toBeVisible();
    });

    it('should cancel attachment selection', async () => {
      await element(by.id('attachment-button')).tap();

      await waitFor(element(by.id('attachment-options')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('cancel-attachment-button')).tap();

      await expect(element(by.id('attachment-options'))).not.toBeVisible();
    });
  });

  describe('Chat Settings', () => {
    beforeEach(async () => {
      // Open first conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should open chat settings', async () => {
      // Tap settings button
      await element(by.id('chat-settings-button')).tap();

      await waitFor(element(by.id('chat-settings-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('chat-settings-screen'))).toBeVisible();
    });

    it('should archive conversation', async () => {
      // Open settings
      await element(by.id('chat-settings-button')).tap();

      await waitFor(element(by.id('chat-settings-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap archive
      await element(by.id('archive-conversation-button')).tap();

      // Confirm
      await waitFor(element(by.id('archive-confirm-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('confirm-archive-button')).tap();

      // Verify back on conversation list
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should delete conversation', async () => {
      // Open settings
      await element(by.id('chat-settings-button')).tap();

      await waitFor(element(by.id('chat-settings-screen')))
        .toBeVisible()
        .withTimeout(3000);

      // Tap delete
      await element(by.id('delete-conversation-button')).tap();

      // Confirm
      await waitFor(element(by.id('delete-confirm-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('confirm-delete-button')).tap();

      // Verify back on conversation list
      await waitFor(element(by.id('conversation-list')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });
});
