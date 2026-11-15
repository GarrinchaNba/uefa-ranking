import { expect, test } from '@playwright/test';

const widths = [320, 375, 768, 1024, 1440];

test('defaults to dark and persists the selected theme', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('keeps every ranking value and detail reachable without page-level horizontal overflow', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `page should not overflow horizontally at ${width}px`).toBe(false);
    if (width < 768) {
      const card = page.locator('.ranking-card').first();
      for (const season of ['2022/23', '2023/24', '2024/25', '2025/26', '2026/27']) {
        await expect(card.getByText(`${season} contribution`, { exact: true })).toBeVisible();
      }
      await expect(card.getByText('Final coefficient', { exact: true })).toBeVisible();
    } else {
      const table = page.getByRole('table');
      for (const season of ['2022/23', '2023/24', '2024/25', '2025/26', '2026/27']) {
        await expect(table.getByRole('columnheader', { name: `${season} contribution` })).toBeVisible();
      }
      await expect(table.getByRole('columnheader', { name: 'Final coefficient' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Show season details for Albion Rovers' }).click();
    await expect(page.getByRole('region', { name: 'Albion Rovers 2026-27 season details' })).toContainText('Season points:');
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const firstClub = page.locator('.ranking-card').filter({ has: page.getByRole('heading', { name: 'Albion Rovers' }) });
  const initialRank = await firstClub.locator('.ranking-card-rank strong').textContent();
  await page.getByRole('combobox', { name: 'Sort by season contribution' }).selectOption('2022-23');
  await expect(firstClub.locator('.ranking-card-rank strong')).toHaveText(initialRank ?? '');
  await page.getByRole('tab', { name: 'Countries' }).click();
  const associationCard = page.locator('.ranking-card').filter({ has: page.getByRole('heading', { name: 'Albion' }) });
  await expect(associationCard.getByText('Five-season coefficient')).toBeVisible();
  for (const season of ['2022/23', '2023/24', '2024/25', '2025/26', '2026/27']) {
    await expect(associationCard.getByText(`${season} contribution`, { exact: true })).toBeVisible();
  }
  await associationCard.getByRole('button', { name: 'Show competition details for Albion' }).click();
  await expect(page.getByRole('region', { name: 'Albion 2026-27 competition details' })).toContainText('Club-point subtotal:');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('supports keyboard operation, touch-sized controls, and contrast in both themes', async ({ page }) => {
  await page.goto('/');
  const season = page.getByRole('combobox', { name: 'Season' });
  const themeToggle = page.getByRole('button', { name: 'Use light theme' });
  const sortButton = page.getByRole('button', { name: '2022/23 contribution' });
  const detailButton = page.getByRole('button', { name: 'Show season details for Albion Rovers' });
  for (const control of [season, themeToggle, sortButton, detailButton]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByRole('tab', { name: 'Clubs' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Global association ranking' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await page.getByRole('button', { name: '2022/23 contribution' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('columnheader', { name: /2022\/23 contribution ascending|descending/ })).toBeVisible();
  expect(await page.getByRole('button', { name: /2022\/23 contribution ascending|descending/ })
    .evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
  await page.getByRole('button', { name: 'Show season details for Albion Rovers' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Albion Rovers 2026-27 season details' })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  for (const control of [
    page.getByRole('combobox', { name: 'Season' }),
    page.getByRole('combobox', { name: 'Sort by season contribution' }),
    page.getByRole('button', { name: 'Use light theme' }),
    page.getByRole('button', { name: 'Sort ascending' }),
    page.getByRole('button', { name: 'Show season details for Albion Rovers' }),
  ]) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  for (const theme of ['dark', 'light']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) {
      await page.getByRole('button', { name: `Use ${theme} theme` }).click();
    }
    const contrast = await page.evaluate(() => {
      const parse = (value: string) => {
        const hex = value.trim().replace(/^#/, '');
        if (!/^[\da-f]{6}$/i.test(hex)) return null;
        return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
      };
      const luminance = (color: number[]) => color.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const root = getComputedStyle(document.documentElement);
      const surface = parse(root.getPropertyValue('--surface'));
      const canvas = parse(root.getPropertyValue('--canvas'));
      if (!surface || !canvas) return null;
      const ratio = (foreground: number[], background: number[]) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return {
        primary: ratio(parse(root.getPropertyValue('--text'))!, surface),
        muted: ratio(parse(root.getPropertyValue('--muted'))!, surface),
        accent: ratio(parse(root.getPropertyValue('--accent'))!, surface),
        accentStrong: ratio(parse(root.getPropertyValue('--accent-strong'))!, surface),
        positive: ratio(parse(root.getPropertyValue('--positive'))!, surface),
        negative: ratio(parse(root.getPropertyValue('--negative'))!, surface),
        border: ratio(parse(root.getPropertyValue('--border'))!, surface),
        focus: ratio(parse(root.getPropertyValue('--focus'))!, surface),
        primaryCanvas: ratio(parse(root.getPropertyValue('--text'))!, canvas),
        mutedCanvas: ratio(parse(root.getPropertyValue('--muted'))!, canvas),
      };
    });
    expect(contrast).not.toBeNull();
    for (const [name, value] of Object.entries(contrast!)) {
      expect(value, `${theme} ${name} contrast`).toBeGreaterThanOrEqual(name === 'border' ? 3 : 4.5);
    }
  }
});

test('preserves access to ranking information with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByRole('heading', { name: 'Global club ranking' })).toBeVisible();
  await expect(page.locator('.ranking-card').first().getByText('2026/27 contribution', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Show season details for Albion Rovers' }).click();
  await expect(page.getByRole('region', { name: 'Albion Rovers 2026-27 season details' })).toBeVisible();
});
