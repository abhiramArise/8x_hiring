import { test as base, expect, type Page, type Locator } from '@playwright/test';

// Playwright's page/context fixtures are test-scoped: no shared context,
// authentication, storage seed, or persistent browser profile is used.
export const test = base.extend<{ forceFailure: boolean }>({
  forceFailure: [false, { option: true }],
  page: async ({ page, forceFailure }, use) => {
    await page.addInitScript((fail) => {
      Math.random = () => fail ? 0 : 0.5;
    }, forceFailure);
    await use(page);
  },
});
export { expect };
export const JOB_TIMEOUT = 40_000;
export const generateButton = (page: Page) => page.getByRole('button', { name: /^Generate \d+ credits$/ });
export const library = (page: Page) => page.locator('#library');
export const credits = (page: Page) => page.getByRole('banner').locator('.budget');
export const take = (page: Page, prompt: string) => page.getByRole('article').filter({
  has: page.getByRole('heading', { name: prompt, exact: true }),
});

export async function openWorkspace(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Create a video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset demo credits', exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Opening your workspace', exact: true })).not.toBeVisible();
}
export async function submit(page: Page, prompt: string) {
  await page.getByRole('textbox', { name: 'Describe your scene' }).fill(prompt);
  await expect(generateButton(page)).toBeEnabled();
  await generateButton(page).click();
  await expect(take(page, prompt)).toHaveCount(1);
  return take(page, prompt);
}
export async function finished(card: Locator, prompt: string) {
  await expect(card.getByRole('button', { name: `Open take ${prompt}`, exact: true })).toBeVisible({ timeout: JOB_TIMEOUT });
  await expect(card.getByText('Mock render', { exact: true })).toBeVisible();
}
export async function saved(page: Page) {
  await expect(library(page).getByText(/Saved on this device/)).toBeVisible();
}
export async function swift(page: Page) {
  await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('swift');
}
