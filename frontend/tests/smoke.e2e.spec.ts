import { expect, test } from '@playwright/test';

test('opens the global rankings and health endpoint', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'UEFA Club and Association Rankings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await expect(page.getByText('Mock data', { exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Albion Rovers');
  await page.getByRole('tab', { name: 'Countries' }).click();
  await expect(page.getByRole('heading', { name: 'Global association ranking' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Island');
  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: await response.json() };
  });
  expect(health).toEqual({ status: 200, body: { status: 'ok' } });
});
