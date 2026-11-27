import assert from 'node:assert/strict';
import { chromium } from '../../../reference/node_modules/playwright/index.mjs';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ baseURL, viewport: { width: 1366, height: 1030 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByText('20/20 evaluator checks passed').waitFor();
  const before = page.locator('#base-output');
  const after = page.locator('#candidate-output');
  await before.getByText('ASRAI_UNSUPPORTED', { exact: false }).filter({ visible: true }).waitFor();
  await after.getByText('Choose', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Layout', exact: true }).click();
  await after.getByText('ASRAI_NOT_IMPLEMENTED', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'SVG', exact: true }).click();
  await page.getByText('Ran render on both revisions.').waitFor();

  await page.getByRole('button', { name: /unicode-label/ }).click();
  await page.getByRole('button', { name: 'Open in playground' }).click();
  await after.getByText('Hej æøå 世界', { exact: true }).waitFor();

  const source = page.getByRole('textbox', { name: 'Flowchart source' });
  const run = page.getByRole('button', { name: 'Run both' });
  await source.fill('flowchart TD\nA[Ready]');
  await run.click();
  await after.getByText('Direction TB').waitFor();
  await source.fill('');
  await run.click();
  await after.getByText('Rejected', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reset example' }).click();
  await after.getByText('Choose', { exact: true }).waitFor();

  const filter = page.getByLabel('Checks');
  await filter.selectOption('all');
  assert.equal(await page.locator('#case-list button').count(), 20);
  await page.getByRole('button', { name: /invalid-direction/ }).click();
  assert.match(await page.locator('#case-detail').innerText(), /ASRAI_SYNTAX/);
  await filter.selectOption('fail');
  await page.getByText('No checks match this filter.').waitFor();

  const report = await (await page.request.get('/report.json')).json();
  const snapshot = await (await page.request.get('/snapshot.json')).json();
  assert.deepEqual(report.summary, { total: 20, passed: 20, failed: 0 });
  assert.equal(snapshot.evidence.candidateDigest, report.candidateTreeSha256);
  assert.equal(snapshot.evidence.acceptanceDigest, report.acceptanceSha256);
  assert.equal(snapshot.cases.filter((row) => row.request && row.expected && row.actual).length, 20);
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  await mobile.goto('/');
  await mobile.locator('#candidate-output').getByText('Choose', { exact: true }).waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  console.log('Desktop and mobile preview checks passed.');
} finally {
  await browser.close();
}
