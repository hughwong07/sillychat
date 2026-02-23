/**
 * Detox Test Setup
 * SillyChat Mobile - E2E Test Configuration
 */

import { device } from 'detox';

beforeAll(async () => {
  // Wait for device to be ready
  await device.launchApp({
    newInstance: true,
    permissions: {
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
      microphone: 'YES',
    },
  });
});

beforeEach(async () => {
  // Reload the app before each test for clean state
  await device.reloadReactNative();
});

afterAll(async () => {
  // Clean up after all tests
  await device.terminateApp();
});
