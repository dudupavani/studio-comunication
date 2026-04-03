import { expect, test } from '@playwright/test';

test('login page renders the auth form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Senha')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});
