import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const braveExecutable = process.env.PLAYWRIGHT_BRAVE_PATH
  ?? ['/usr/bin/brave-browser', '/usr/bin/brave'].find(existsSync);

if (!braveExecutable || !existsSync(braveExecutable)) {
  throw new Error(
    'Brave is required for the browser matrix. Install Brave or set PLAYWRIGHT_BRAVE_PATH to its executable.',
  );
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.spec.ts',
  use: { baseURL: 'http://127.0.0.1:5173' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    {
      name: 'brave',
      use: {
        browserName: 'chromium',
        launchOptions: { executablePath: braveExecutable },
      },
    },
  ],
  webServer: {
    command: 'npm run dev --prefix ..',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
