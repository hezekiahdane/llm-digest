import { expect, test } from '@playwright/test';

test.describe('Dashboard page', () => {
  test('renders the dashboard heading', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /AI Digest Dashboard/i }),
    ).toBeVisible();
  });

  test('shows all 4 provider status cards', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('OpenAI')).toBeVisible();
    await expect(page.getByText('Anthropic')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();
    await expect(page.getByText('Meta')).toBeVisible();
  });

  test('shows benchmark panel with tabs', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('MMLU')).toBeVisible();
    await expect(page.getByText('HumanEval')).toBeVisible();
    await expect(page.getByText('MATH')).toBeVisible();
  });

  test('shows pricing table', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/per 1M Tokens/i)).toBeVisible();
  });

  test('root / redirects to /dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
