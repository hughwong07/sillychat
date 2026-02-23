import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@config': '/src/core/config',
      '@agents': '/src/core/agents',
      '@memory': '/src/core/memory',
      '@gateway': '/src/core/gateway',
      '@storage': '/src/core/storage',
      '@protocol': '/src/core/protocol',
      '@utils': '/src/core/utils'
    }
  }
});
