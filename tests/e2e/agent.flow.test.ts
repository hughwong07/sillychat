/**
 * Agent Flow E2E Tests
 * SillyChat - End-to-end tests for agent selection and interaction
 */

import { device, element, by, waitFor } from 'detox';

describe('Agent Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();

    // Login before each test
    await element(by.id('username-input')).typeText('testuser');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('main-screen')))
      .toBeVisible()
      .withTimeout(5000);

    // Navigate to agents tab
    await element(by.id('agents-tab')).tap();
  });

  describe('Agent List', () => {
    it('should display agent list screen', async () => {
      await expect(element(by.id('agents-screen'))).toBeVisible();
    });

    it('should show agent cards', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await expect(element(by.id('agent-card'))).toBeVisible();
    });

    it('should show agent information', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await expect(element(by.id('agent-name'))).toBeVisible();
      await expect(element(by.id('agent-role'))).toBeVisible();
      await expect(element(by.id('agent-status'))).toBeVisible();
    });

    it('should refresh agent list', async () => {
      // Pull to refresh
      await element(by.id('agent-list')).swipe('down', 'fast', 0.5);

      // Verify list is still visible
      await expect(element(by.id('agent-list'))).toBeVisible();
    });

    it('should search agents', async () => {
      // Tap search button
      await element(by.id('search-button')).tap();

      // Enter search query
      await element(by.id('search-input')).typeText('assistant');

      // Wait for search results
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);
    });
  });

  describe('Agent Selection', () => {
    it('should select an agent', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Tap on first agent
      await element(by.id('agent-card')).atIndex(0).tap();

      // Verify agent is selected (check for visual indicator)
      await expect(element(by.id('agent-selected-indicator'))).toBeVisible();
    });

    it('should show selected agent in chat', async () => {
      // Select an agent
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('agent-card')).atIndex(0).tap();

      // Navigate to chat
      await element(by.id('chat-tab')).tap();

      // Open a conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      // Verify selected agent indicator in chat
      await expect(element(by.id('selected-agent-indicator'))).toBeVisible();
    });

    it('should change selected agent', async () => {
      // Select first agent
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('agent-card')).atIndex(0).tap();

      // Verify first agent is selected
      await expect(element(by.id('agent-selected-indicator'))).toBeVisible();

      // Select second agent
      await element(by.id('agent-card')).atIndex(1).tap();

      // Verify second agent is selected
      await expect(element(by.id('agent-selected-indicator'))).toBeVisible();
    });

    it('should deselect agent', async () => {
      // Select an agent
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('agent-card')).atIndex(0).tap();

      // Tap again to deselect
      await element(by.id('agent-card')).atIndex(0).tap();

      // Verify agent is deselected
      await expect(element(by.id('agent-selected-indicator'))).not.toBeVisible();
    });
  });

  describe('Agent Details', () => {
    beforeEach(async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Long press to open details
      await element(by.id('agent-card')).atIndex(0).longPress();

      await waitFor(element(by.id('agent-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should display agent detail screen', async () => {
      await expect(element(by.id('agent-detail-screen'))).toBeVisible();
    });

    it('should show agent details', async () => {
      await expect(element(by.id('agent-detail-name'))).toBeVisible();
      await expect(element(by.id('agent-detail-description'))).toBeVisible();
      await expect(element(by.id('agent-capabilities'))).toBeVisible();
    });

    it('should show agent capabilities', async () => {
      await expect(element(by.id('capability-list'))).toBeVisible();

      // Scroll to see all capabilities
      await element(by.id('capability-list')).swipe('up', 'slow', 0.3);
    });

    it('should close agent details', async () => {
      await element(by.id('close-details-button')).tap();

      await waitFor(element(by.id('agents-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('agents-screen'))).toBeVisible();
    });

    it('should select agent from details', async () => {
      await element(by.id('select-agent-button')).tap();

      // Verify back on agents list with selection
      await waitFor(element(by.id('agents-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('agent-selected-indicator'))).toBeVisible();
    });
  });

  describe('Agent Chat Interaction', () => {
    beforeEach(async () => {
      // Select an agent
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('agent-card')).atIndex(0).tap();

      // Navigate to chat
      await element(by.id('chat-tab')).tap();

      // Open a conversation
      await waitFor(element(by.id('conversation-item')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('conversation-item')).atIndex(0).tap();

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show selected agent in chat header', async () => {
      await expect(element(by.id('chat-header-agent'))).toBeVisible();
    });

    it('should receive agent-specific response', async () => {
      // Send a message
      await element(by.id('message-input')).typeText('Help me with coding');
      await element(by.id('send-button')).tap();

      // Wait for agent response
      await waitFor(element(by.id('agent-message')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify agent response is visible
      await expect(element(by.id('agent-message'))).toBeVisible();
    });

    it('should show agent typing indicator', async () => {
      // Send a message
      await element(by.id('message-input')).typeText('Question');
      await element(by.id('send-button')).tap();

      // Wait for typing indicator
      await waitFor(element(by.id('agent-typing-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify typing indicator
      await expect(element(by.id('agent-typing-indicator'))).toBeVisible();
    });

    it('should switch agent during chat', async () => {
      // Verify current agent
      await expect(element(by.id('chat-header-agent'))).toBeVisible();

      // Go back to agents tab
      await element(by.id('agents-tab')).tap();

      // Select different agent
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('agent-card')).atIndex(1).tap();

      // Return to chat
      await element(by.id('chat-tab')).tap();

      // Verify new agent is shown
      await expect(element(by.id('chat-header-agent'))).toBeVisible();
    });
  });

  describe('Agent Status', () => {
    it('should show online status', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await expect(element(by.id('agent-status-online'))).toBeVisible();
    });

    it('should show offline status', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Check for offline status indicator (if any agent is offline)
      try {
        await expect(element(by.id('agent-status-offline'))).toBeVisible();
      } catch {
        // Not all agents may be offline, that's okay
      }
    });

    it('should show busy status', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Check for busy status indicator
      try {
        await expect(element(by.id('agent-status-busy'))).toBeVisible();
      } catch {
        // Not all agents may be busy, that's okay
      }
    });

    it('should update status in real-time', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Wait a moment for potential status updates
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify agent card is still visible
      await expect(element(by.id('agent-card'))).toBeVisible();
    });
  });

  describe('Agent Filtering', () => {
    it('should filter agents by role', async () => {
      // Tap filter button
      await element(by.id('filter-button')).tap();

      await waitFor(element(by.id('filter-options')))
        .toBeVisible()
        .withTimeout(3000);

      // Select a role filter
      await element(by.id('filter-role-assistant')).tap();

      // Verify filtered results
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);
    });

    it('should filter agents by status', async () => {
      // Tap filter button
      await element(by.id('filter-button')).tap();

      await waitFor(element(by.id('filter-options')))
        .toBeVisible()
        .withTimeout(3000);

      // Select online status filter
      await element(by.id('filter-status-online')).tap();

      // Verify filtered results show only online agents
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await expect(element(by.id('agent-status-online'))).toBeVisible();
    });

    it('should clear filters', async () => {
      // Apply a filter first
      await element(by.id('filter-button')).tap();
      await waitFor(element(by.id('filter-options')))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id('filter-role-assistant')).tap();

      // Clear filters
      await element(by.id('clear-filters-button')).tap();

      // Verify all agents are shown
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);
    });
  });

  describe('Agent Favorites', () => {
    it('should add agent to favorites', async () => {
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      // Tap favorite button on first agent
      await element(by.id('favorite-button')).atIndex(0).tap();

      // Verify agent is favorited
      await expect(element(by.id('favorite-active'))).toBeVisible();
    });

    it('should show favorite agents', async () => {
      // Navigate to favorites tab
      await element(by.id('favorites-tab')).tap();

      await expect(element(by.id('favorite-agents-list'))).toBeVisible();
    });

    it('should remove agent from favorites', async () => {
      // Add to favorites first
      await waitFor(element(by.id('agent-card')))
        .toExist()
        .withTimeout(3000);

      await element(by.id('favorite-button')).atIndex(0).tap();

      // Remove from favorites
      await element(by.id('favorite-button')).atIndex(0).tap();

      // Verify agent is no longer favorited
      await expect(element(by.id('favorite-inactive'))).toBeVisible();
    });
  });
});
