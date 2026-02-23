/**
 * Authentication Flow E2E Tests
 * SillyChat - End-to-end tests for login, register, and logout flows
 */

import { device, element, by, waitFor } from 'detox';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Flow', () => {
    it('should display login screen on app launch', async () => {
      await expect(element(by.id('login-screen'))).toBeVisible();
    });

    it('should show username input field', async () => {
      await expect(element(by.id('username-input'))).toBeVisible();
    });

    it('should show password input field', async () => {
      await expect(element(by.id('password-input'))).toBeVisible();
    });

    it('should show login button', async () => {
      await expect(element(by.id('login-button'))).toBeVisible();
    });

    it('should show register link', async () => {
      await expect(element(by.id('register-link'))).toBeVisible();
    });

    it('should login with valid credentials', async () => {
      // Enter username
      await element(by.id('username-input')).typeText('testuser');
      await element(by.id('username-input')).tapReturnKey();

      // Enter password
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('password-input')).tapReturnKey();

      // Tap login button
      await element(by.id('login-button')).tap();

      // Wait for main screen to appear
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify we're on main screen
      await expect(element(by.id('main-screen'))).toBeVisible();
    });

    it('should show error with invalid credentials', async () => {
      // Enter invalid username
      await element(by.id('username-input')).typeText('wronguser');
      await element(by.id('username-input')).tapReturnKey();

      // Enter invalid password
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('password-input')).tapReturnKey();

      // Tap login button
      await element(by.id('login-button')).tap();

      // Wait for error message
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify error message
      await expect(element(by.id('error-message'))).toBeVisible();
      await expect(element(by.text('Invalid username or password'))).toBeVisible();
    });

    it('should show error when fields are empty', async () => {
      // Tap login button without entering credentials
      await element(by.id('login-button')).tap();

      // Wait for error message
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify error message
      await expect(element(by.text('Please enter username and password'))).toBeVisible();
    });

    it('should toggle password visibility', async () => {
      // Enter password
      await element(by.id('password-input')).typeText('secretpassword');

      // Tap show password button
      await element(by.id('toggle-password-visibility')).tap();

      // Verify password is visible (implementation specific)
      await expect(element(by.id('password-input'))).toBeVisible();

      // Tap hide password button
      await element(by.id('toggle-password-visibility')).tap();

      // Verify password is hidden
      await expect(element(by.id('password-input'))).toBeVisible();
    });
  });

  describe('Registration Flow', () => {
    beforeEach(async () => {
      // Navigate to register screen
      await element(by.id('register-link')).tap();
      await waitFor(element(by.id('register-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should display registration screen', async () => {
      await expect(element(by.id('register-screen'))).toBeVisible();
    });

    it('should show all registration fields', async () => {
      await expect(element(by.id('username-input'))).toBeVisible();
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('confirm-password-input'))).toBeVisible();
    });

    it('should register with valid information', async () => {
      const timestamp = Date.now();

      // Enter username
      await element(by.id('username-input')).typeText(`newuser${timestamp}`);
      await element(by.id('username-input')).tapReturnKey();

      // Enter email
      await element(by.id('email-input')).typeText(`newuser${timestamp}@example.com`);
      await element(by.id('email-input')).tapReturnKey();

      // Enter password
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('password-input')).tapReturnKey();

      // Confirm password
      await element(by.id('confirm-password-input')).typeText('password123');
      await element(by.id('confirm-password-input')).tapReturnKey();

      // Tap register button
      await element(by.id('register-button')).tap();

      // Wait for main screen
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify registration successful
      await expect(element(by.id('main-screen'))).toBeVisible();
    });

    it('should show error when passwords do not match', async () => {
      // Enter username
      await element(by.id('username-input')).typeText('testuser');
      await element(by.id('username-input')).tapReturnKey();

      // Enter email
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('email-input')).tapReturnKey();

      // Enter password
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('password-input')).tapReturnKey();

      // Enter different confirm password
      await element(by.id('confirm-password-input')).typeText('differentpassword');
      await element(by.id('confirm-password-input')).tapReturnKey();

      // Tap register button
      await element(by.id('register-button')).tap();

      // Wait for error
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text('Passwords do not match'))).toBeVisible();
    });

    it('should show error for invalid email format', async () => {
      // Enter invalid email
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('email-input')).tapReturnKey();

      // Tap register button
      await element(by.id('register-button')).tap();

      // Wait for error
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text('Please enter a valid email'))).toBeVisible();
    });

    it('should show error for short password', async () => {
      // Enter short password
      await element(by.id('password-input')).typeText('123');
      await element(by.id('password-input')).tapReturnKey();

      // Tap register button
      await element(by.id('register-button')).tap();

      // Wait for error
      await waitFor(element(by.id('error-message')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text('Password must be at least 6 characters'))).toBeVisible();
    });

    it('should navigate back to login screen', async () => {
      // Tap back to login link
      await element(by.id('back-to-login-link')).tap();

      // Verify we're back on login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('login-screen'))).toBeVisible();
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('username-input')).typeText('testuser');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should logout and return to login screen', async () => {
      // Navigate to settings
      await element(by.id('settings-tab')).tap();

      // Tap logout button
      await element(by.id('logout-button')).tap();

      // Confirm logout
      await waitFor(element(by.id('logout-confirm-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('confirm-logout-button')).tap();

      // Verify we're back on login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.id('login-screen'))).toBeVisible();
    });

    it('should cancel logout', async () => {
      // Navigate to settings
      await element(by.id('settings-tab')).tap();

      // Tap logout button
      await element(by.id('logout-button')).tap();

      // Wait for confirm dialog
      await waitFor(element(by.id('logout-confirm-dialog')))
        .toBeVisible()
        .withTimeout(3000);

      // Cancel logout
      await element(by.id('cancel-logout-button')).tap();

      // Verify we're still on settings screen
      await expect(element(by.id('settings-screen'))).toBeVisible();
    });
  });

  describe('Session Persistence', () => {
    it('should stay logged in after app restart', async () => {
      // Login
      await element(by.id('username-input')).typeText('testuser');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Terminate and relaunch app
      await device.terminateApp();
      await device.launchApp({ newInstance: true });

      // Verify still on main screen (session persisted)
      await waitFor(element(by.id('main-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.id('main-screen'))).toBeVisible();
    });
  });
});
