import { expect, test } from '@playwright/test';

test('covers club and association rankings, details, sorting, history, and keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await expect(page.getByText('Mock data', { exact: true })).toBeVisible();

  const season = page.getByRole('combobox', { name: 'Season' });
  await expect(season.locator('option')).toHaveText(['2023/24', '2026/27']);
  const clubTable = page.getByRole('table');
  for (const label of ['2022/23', '2023/24', '2024/25', '2025/26', '2026/27']) {
    await expect(clubTable.getByRole('columnheader', { name: `${label} contribution` })).toBeVisible();
  }
  await expect(clubTable.getByRole('columnheader', { name: 'Movement' })).toBeVisible();
  await expect(clubTable.locator('tbody tr').first().locator('td:nth-child(2) [aria-label]'))
    .toHaveAttribute('aria-label', /^(Up|Down|Unchanged|Movement unavailable)/);
  await expect(clubTable.getByText(/\(applied\)$/).first()).toBeVisible();
  await expect(clubTable.getByText(/\(not applied\)$/).first()).toBeVisible();

  const albionRovers = clubTable.getByRole('row', { name: /Albion Rovers/ });
  const rankBeforeSort = await albionRovers.locator('td').first().textContent();
  await clubTable.getByRole('button', { name: '2022/23 contribution' }).click();
  await expect(clubTable.getByRole('row', { name: /Albion Rovers/ }).locator('td').first())
    .toHaveText(rankBeforeSort ?? '');

  await page.getByRole('button', { name: 'Show season details for Albion Rovers' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Albion Rovers 2026-27 season details' })).toContainText('Season points:');

  await season.selectOption('2023-24');
  await expect(clubTable).toContainText('2019/20–2023/24');
  await expect(clubTable.getByRole('row', { name: /Unverified United/ })).toContainText('Unavailable');

  await page.getByRole('tab', { name: 'Clubs' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Countries' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Global association ranking' })).toBeVisible();
  await expect(season).toHaveValue('2023-24');
  const associationTable = page.getByRole('table');
  for (const label of ['2019/20', '2020/21', '2021/22', '2022/23', '2023/24']) {
    await expect(associationTable.getByRole('columnheader', { name: `${label} contribution` })).toBeVisible();
  }
  const historicalAlbion = associationTable.getByRole('row', { name: /Albion/ });
  const historicalRank = await historicalAlbion.locator('td').first().textContent();
  await associationTable.getByRole('button', { name: '2019/20 contribution' }).click();
  await expect(associationTable.getByRole('row', { name: /Albion/ }).locator('td').first())
    .toHaveText(historicalRank ?? '');

  await season.selectOption('2026-27');
  const albion = associationTable.getByRole('row', { name: /^.*Albion/ });
  await albion.getByRole('button', { name: 'Show competition details for Albion' }).click();
  const associationDetails = page.getByRole('region', { name: 'Albion 2026-27 competition details' });
  const championsLeague = associationDetails.getByRole('region', { name: 'UEFA Champions League' });
  const europaLeague = associationDetails.getByRole('region', { name: 'UEFA Europa League' });
  await expect(championsLeague.getByText('Unverified United')).toBeVisible();
  await expect(europaLeague.getByText('Unverified United')).toBeVisible();

  const health = await page.evaluate(async () => {
    const response = await fetch('/api/health');
    return { status: response.status, body: await response.json() };
  });
  expect(health).toEqual({ status: 200, body: { status: 'ok' } });
});

test('shows structured API failures instead of an empty ranking', async ({ page }) => {
  await page.route('**/api/v1/club-rankings**', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'SOURCE_UNAVAILABLE', message: 'Ranking source is unavailable' } }),
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Ranking source is unavailable');
  await expect(page.getByRole('table')).toHaveCount(0);
});
