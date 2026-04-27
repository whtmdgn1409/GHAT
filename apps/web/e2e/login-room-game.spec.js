import { test, expect } from '@playwright/test';

test('login to video page flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password1234');
  await page.click('button:has-text("로그인")');
  await expect(page).toHaveURL(/\/video/);
  await expect(page.getByText('GHAT Video Room')).toBeVisible();
});
