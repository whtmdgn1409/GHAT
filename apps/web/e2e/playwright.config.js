import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  use: {
    baseURL: 'http://127.0.0.1:5173'
  },
  webServer: {
    command: 'npm --prefix .. run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true
  }
});
