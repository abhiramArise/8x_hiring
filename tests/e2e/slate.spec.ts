import { test, expect, JOB_TIMEOUT, generateButton, library, credits, take, openWorkspace, submit, finished, saved, swift } from './fixtures';

test('01 first load: signed-out empty workspace has 240 credits and Generate 12 credits', async ({ page, context }) => {
  expect(await context.cookies()).toEqual([]);
  await openWorkspace(page);
  await expect(credits(page)).toHaveText('240 credits left');
  await expect(generateButton(page)).toHaveText('Generate 12 credits');
  await expect(generateButton(page)).toBeDisabled(); // Empty prompt, not insufficient credits.
  await expect(library(page).getByRole('article')).toHaveCount(0);
  await expect(library(page).getByRole('heading', { name: 'Every great film starts with a first take.' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue('balanced');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio', exact: true })).toHaveValue('16:9');
  await expect(page.getByRole('combobox', { name: 'Resolution', exact: true })).toHaveValue('720p');
});

test('02 generate: a queued take finishes within 40 seconds', async ({ page }) => {
  await openWorkspace(page);
  const prompt = 'E2E sunrise on a quiet lake';
  const card = await submit(page, prompt);
  await expect(card.getByText('In the queue', { exact: true })).toBeVisible();
  await expect(card.getByRole('progressbar')).toBeVisible();
  await expect(card.getByText(/Finding the frame · \d+%/)).toBeVisible();
  await finished(card, prompt);
  await expect(credits(page)).toHaveText('228 credits left');
});

test.describe('forced provider failure', () => {
  test.use({ forceFailure: true });
  test('03 failure: visible reason, refund and a linked successful Retry', async ({ page }) => {
    await openWorkspace(page);
    const prompt = 'E2E controlled failure';
    await submit(page, prompt);
    await expect(credits(page)).toHaveText('228 credits left');
    const failed = take(page, prompt).filter({ has: page.getByText('This take needs another try', { exact: true }) });
    await expect(failed).toHaveCount(1, { timeout: JOB_TIMEOUT });
    // Math.random=0 gives Balanced a 10s delay; delay % 3 selects timeout.
    await expect(failed.getByText('The render timed out. Please retry.', { exact: true })).toBeVisible();
    await expect(failed.getByRole('button', { name: /^Retry.*12 credits$/ })).toBeEnabled();
    await expect(credits(page)).toHaveText('240 credits left');
    await page.evaluate(() => { Math.random = () => 0.5; });
    await failed.getByRole('button', { name: /^Retry.*12 credits$/ }).click();
    await expect(take(page, prompt)).toHaveCount(2);
    await expect(failed).toHaveCount(1); // Retrying must preserve the failed original.
    const retry = take(page, prompt).filter({ has: page.getByRole('button', { name: `Open take ${prompt}`, exact: true }) });
    await expect(retry).toHaveCount(1, { timeout: JOB_TIMEOUT });
    await expect(credits(page)).toHaveText('228 credits left');
    await retry.getByRole('button', { name: `Open take ${prompt}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: `Open parent take: ${prompt}`, exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'This attempt has no finished clip.' })).toBeVisible();
    await expect(dialog.getByText('The render timed out. Please retry.', { exact: true })).toBeVisible();
  });
});

test('04 refresh: finished takes persist and an in-flight take fails as interrupted', async ({ page }) => {
  await openWorkspace(page);
  await swift(page);
  const keptPrompt = 'E2E saved mountain';
  await finished(await submit(page, keptPrompt), keptPrompt);
  await saved(page);
  const activePrompt = 'E2E interrupted valley';
  const active = await submit(page, activePrompt);
  await expect(active.getByText(/Finding the frame · \d+%/)).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(take(page, keptPrompt).getByRole('button', { name: `Open take ${keptPrompt}`, exact: true })).toBeVisible();
  const interrupted = take(page, activePrompt);
  await expect(interrupted.getByText('This take was interrupted when the workspace closed. No credits charged. Retry when ready.', { exact: true })).toBeVisible();
  await expect(interrupted.getByText('This take needs another try', { exact: true })).toBeVisible();
  await expect(interrupted.getByRole('button', { name: /^Retry.*8 credits$/ })).toBeEnabled();
  await expect(credits(page)).toHaveText('232 credits left');
  await expect(library(page).getByRole('article')).toHaveCount(2);
});

test('05 budget: spend to zero, explain disabled Generate, confirm reset and retain takes', async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('cinematic');
  await page.getByRole('combobox', { name: 'Duration', exact: true }).selectOption('8');
  await page.getByRole('combobox', { name: 'Resolution', exact: true }).selectOption('1080p');
  await expect(generateButton(page)).toHaveText('Generate 80 credits');
  await expect(page.locator('#cost-breakdown')).toHaveText('5 cr/s × 8 s × 2× = 80 credits');
  const prompts = ['E2E budget one', 'E2E budget two', 'E2E budget three'];
  for (const prompt of prompts) await submit(page, prompt);
  await expect(credits(page)).toHaveText('0 credits left');
  await expect(generateButton(page)).toBeDisabled();
  await expect(page.getByText('Not enough credits: you have 0, this needs 80.', { exact: true })).toBeVisible();
  await Promise.all(prompts.map(prompt => finished(take(page, prompt), prompt)));
  await expect(library(page).getByText(/240\s*\/\s*240 credits used/)).toBeVisible();
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('240');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Reset demo credits', exact: true }).click();
  await expect(credits(page)).toHaveText('0 credits left');
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('All takes stay saved');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Reset demo credits', exact: true }).click();
  await expect(credits(page)).toHaveText('240 credits left');
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.locator('#credit-reason')).toHaveCount(0);
  for (const prompt of prompts) {
    await expect(take(page, prompt)).toContainText('80 cr');
    await expect(take(page, prompt).getByRole('button', { name: `Open take ${prompt}`, exact: true })).toBeVisible();
  }
  await saved(page);
  await page.reload();
  await expect(credits(page)).toHaveText('240 credits left');
  await expect(library(page).getByRole('article')).toHaveCount(3);
});

test('06 remix: recipe prefills and the new take opens its readable parent', async ({ page }) => {
  await openWorkspace(page);
  await swift(page);
  await page.getByRole('combobox', { name: 'Duration', exact: true }).selectOption('6');
  await page.getByRole('combobox', { name: 'Aspect ratio', exact: true }).selectOption('9:16');
  await page.getByRole('combobox', { name: 'Resolution', exact: true }).selectOption('1080p');
  await page.getByRole('button', { name: '⟳ Orbit', exact: true }).click();
  const parent = 'E2E parent scene over water';
  await finished(await submit(page, parent), parent);
  await take(page, parent).getByRole('button', { name: `Open take ${parent}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remix this take', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Describe your scene' })).toHaveValue(parent);
  for (const [name, value] of [['Model','swift'], ['Duration','6'], ['Aspect ratio','9:16'], ['Resolution','1080p']]) {
    await expect(page.getByRole('combobox', { name, exact: true })).toHaveValue(value);
  }
  await expect(page.getByRole('button', { name: '⟳ Orbit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const child = 'E2E remixed scene over water';
  await finished(await submit(page, child), child);
  await take(page, child).getByRole('button', { name: `Open take ${child}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  const parentLink = dialog.getByRole('button', { name: `Open parent take: ${parent}`, exact: true });
  await expect(parentLink).toHaveText(parent);
  await parentLink.click();
  await expect(dialog.getByRole('heading', { name: parent, exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: child, exact: true })).toHaveCount(0);
});

test('07 compare: synchronized moving frames and a Keeper survives refresh', async ({ page }) => {
  await openWorkspace(page);
  await swift(page);
  // Identical recipes make synchronization observable: both moving canvas
  // frames must be identical, while changing from their initial still frame.
  const prompt = 'E2E identical recipe sync study';
  await submit(page, prompt);
  await page.getByRole('button', { name: 'Generate 8 credits', exact: true }).click();
  const cards = take(page, prompt);
  await expect(cards).toHaveCount(2);
  await expect(cards.getByRole('button', { name: `Open take ${prompt}`, exact: true })).toHaveCount(2, { timeout: JOB_TIMEOUT });
  for (const card of await cards.all()) await card.getByRole('button', { name: /^Select take \d+ for comparison$/ }).click();
  await page.getByRole('button', { name: 'Compare (2/2)', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const canvases = dialog.locator('canvas');
  await expect(canvases).toHaveCount(2);
  await expect.poll(() => canvases.first().evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(255);
  const initial = await canvases.first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await dialog.getByRole('button', { name: 'Play in sync', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect.poll(async () => {
    const frames = await canvases.evaluateAll(elements => elements.map(canvas => (canvas as HTMLCanvasElement).toDataURL()));
    return { synchronized: frames[0] === frames[1], moving: frames[0] !== initial };
  }).toEqual({ synchronized: true, moving: true });
  const movingFrame = await canvases.first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await expect.poll(() => canvases.first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(movingFrame);
  await dialog.getByRole('button', { name: 'Pause', exact: true }).click();
  await dialog.getByRole('button', { name: 'Keep this take', exact: true }).first().click();
  await expect(dialog.getByRole('button', { name: 'Keeper', exact: true })).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Close result', exact: true }).click();
  await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Keepers', exact: true }).click();
  await expect(library(page).getByRole('article')).toHaveCount(1);
  await expect(library(page).getByRole('button', { name: 'Remove Keeper', exact: true })).toHaveCount(1);
});

test('08 dialog: centered at three sizes, contains keyboard focus, Esc restores opener', async ({ page }) => {
  await openWorkspace(page);
  await swift(page);
  const prompt = 'E2E focus return study';
  await finished(await submit(page, prompt), prompt);
  const opener = take(page, prompt).getByRole('button', { name: `Open take ${prompt}`, exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close result', exact: true });
  await expect(close).toBeFocused();
  for (const viewport of [{width:1440,height:900}, {width:768,height:1024}, {width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => dialog.evaluate(el => {
      const r = el.getBoundingClientRect();
      return Math.max(Math.abs(r.left+r.width/2-document.documentElement.clientWidth/2), Math.abs(r.top+r.height/2-document.documentElement.clientHeight/2));
    }), { message: `Dialog center offset at ${viewport.width}x${viewport.height}` }).toBeLessThanOrEqual(2);
  }
  const focusables = dialog.locator('button:visible:not([disabled]), a[href]:visible, input:visible:not([disabled]), select:visible:not([disabled]), textarea:visible:not([disabled]), [tabindex="0"]:visible');
  expect(await focusables.count()).toBeGreaterThanOrEqual(3);
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await test.info().attach('shift-tab-focus', {
    body: JSON.stringify(await page.evaluate(() => ({
      documentFocused: document.hasFocus(),
      tag: document.activeElement?.tagName,
      label: document.activeElement?.getAttribute('aria-label'),
      insideDialog: document.querySelector('dialog')?.contains(document.activeElement),
    })), null, 2),
    contentType: 'application/json',
  });
  // Soft assertions still fail the test. Continue so Escape and focus return
  // are exercised even when the application's keyboard containment fails.
  await expect.soft(focusables.last(), 'Shift+Tab from Close must wrap to the last dialog control').toBeFocused();
  await page.keyboard.press('Tab');
  await expect.soft(close, 'Tab from the last dialog control must wrap to Close').toBeFocused();
  for (let i = 0; i < (await focusables.count()) + 2; i++) {
    await page.keyboard.press('Tab');
    expect.soft(await dialog.evaluate(el => el.contains(document.activeElement)), 'Tab focus must stay inside the dialog').toBe(true);
    expect.soft(await page.evaluate(() => document.hasFocus()), 'Tab must not move focus to browser chrome').toBe(true);
  }
  await close.focus(); // Independent Escape check; containment errors remain failures.
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('09 mobile 390px: no horizontal scroll, preset labels >=11px and touch targets >=44px', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await openWorkspace(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const presets = page.locator('.preset-grid .preset');
  await expect(presets).toHaveCount(10);
  for (const preset of await presets.all()) {
    await expect(preset).toBeVisible();
    const metrics = await preset.evaluate(el => {
      const label = el.querySelector(':scope > span:last-child')!;
      const r = el.getBoundingClientRect();
      const text = label.getBoundingClientRect();
      return {font:parseFloat(getComputedStyle(label).fontSize), width:r.width, height:r.height, labelFits:text.right<=r.right+1 && text.left>=r.left-1};
    });
    expect(metrics.font).toBeGreaterThanOrEqual(11);
    expect(metrics.width).toBeGreaterThanOrEqual(44);
    expect(metrics.height).toBeGreaterThanOrEqual(44);
    expect(metrics.labelFits).toBe(true);
  }
});

test('10 blocked IndexedDB: Session only warning appears and generation still works', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable:true, get() { throw new DOMException('Storage blocked by E2E test', 'SecurityError'); } });
  });
  await openWorkspace(page);
  await expect(library(page).getByText(/Session only/)).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText:/Browser storage is unavailable or could not be read/ })).toBeVisible();
  await swift(page);
  const prompt = 'E2E generation without storage';
  await finished(await submit(page, prompt), prompt);
  await expect(credits(page)).toHaveText('232 credits left');
  await expect(library(page).getByText(/Session only/)).toBeVisible();
});

test('11 no MediaRecorder: take preview works and Download is hidden', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'MediaRecorder', { configurable:true, value:undefined }); });
  await openWorkspace(page);
  await swift(page);
  const prompt = 'E2E browser without recorder';
  await finished(await submit(page, prompt), prompt);
  await take(page, prompt).getByRole('button', { name:`Open take ${prompt}`, exact:true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img', { name:/Procedural mock landscape/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name:/Download/i })).toHaveCount(0);
  await expect(dialog.getByText(/WebM download is unavailable in this browser/)).toBeVisible();
});
