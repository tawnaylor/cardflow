// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/playwright',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  use: { headless: true, baseURL: 'http://localhost:8000' },
  webServer: {
    command: 'python -m http.server 8000',
    port: 8000,
    reuseExistingServer: true
  }
});
