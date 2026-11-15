import { expect, test } from '@playwright/test';

test('opens the application', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'UEFA Club and Association Rankings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await expect(page.getByText('Mock data', { exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Albion Rovers');
  await expect(page.getByText('Provisional:', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'Season' }).selectOption('2023-24');
  await expect(page.getByRole('table')).toContainText('2019/20–2023/24');
  await expect(page.getByText('Provisional:')).not.toBeVisible();
  await page.getByRole('tab', { name: 'Countries' }).click();
  await expect(page.getByRole('heading', { name: 'Global association ranking' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Season' })).toHaveValue('2023-24');
  await expect(page.getByRole('table')).toContainText('Island');
  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: await response.json() };
  });
  expect(health).toEqual({ status: 200, body: { status: 'ok' } });
});
