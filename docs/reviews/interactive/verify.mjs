import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../reference/node_modules/playwright/index.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const runner = fileURLToPath(new URL('./preview.mjs', import.meta.url));
const artifacts = resolve(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const scratch = await mkdtemp(resolve(artifacts, 'live-explorer-'));
const children = [];

async function serve(workspace) {
  const child = spawn(process.execPath, [runner, '0', '--workspace', workspace], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  children.push(child);
  return new Promise((resolveUrl, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => reject(new Error(`Preview startup timed out. ${errors}`)), 10_000);
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Preview exited ${code}. ${errors}`)); });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const url = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
      if (url) { clearTimeout(timeout); resolveUrl(url); }
    });
  });
}

const browser = await chromium.launch();
try {
  const baseURL = await serve(root);
  const page = await browser.newPage({ baseURL, viewport: { width: 1366, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('heading', { name: 'Test explorer' }).waitFor();
  if (process.argv[2]) {
    await page.getByRole('button', { name: 'Model', exact: true }).click();
    await page.getByText('Direction TB · 0 edges').waitFor();
    await page.screenshot({ path: process.argv[2] });
  }
  const filter = page.getByRole('searchbox', { name: 'Filter cases' });
  await filter.fill('generated-permutation');
  await page.getByRole('button', { name: /generated-permutation-0/ }).waitFor();
  await filter.fill('FC004');
  await page.getByRole('button', { name: /labels-shapes/ }).click();
  await filter.clear();
  await page.getByRole('button', { name: 'Model', exact: true }).click();
  await page.getByRole('cell', { name: 'Choose' }).waitFor();
  await page.locator('#expected').getByText('FC004 · parse').waitFor();
  assert.match(page.url(), /#case=labels-shapes&phase=parse$/);

  await page.getByRole('button', { name: /invalid-direction/ }).click();
  await page.getByRole('button', { name: 'Validation' }).click();
  await page.getByText('Rejected', { exact: true }).waitFor();
  await page.locator('#response p').filter({ hasText: 'ASRAI_SYNTAX' }).waitFor();
  await page.getByRole('button', { name: 'Refresh now' }).click();
  await page.getByText('Rejected', { exact: true }).waitFor();
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  await mobile.goto('/#case=labels-shapes&phase=parse');
  await mobile.getByRole('cell', { name: 'Choose' }).waitFor();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);

  for (const file of ['fixtures/flowchart/cases.json', 'specs/policy.json', 'specs/capabilities.json', 'evaluation/lib/properties.mjs']) {
    const destination = resolve(scratch, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(resolve(root, file), destination);
  }
  await mkdir(resolve(scratch, 'src'));
  await writeFile(resolve(scratch, 'src', 'adapter.mjs'), `
import { label } from './label.mjs';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { operation } = JSON.parse(Buffer.concat(chunks).toString());
const scene = {
  width: 240, height: 90,
  nodes: [{ id: label, x: 20, y: 20, width: 200, height: 50 }],
  edges: [],
};
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="90"><text x="30" y="45">' + label + '</text></svg>';
console.log(JSON.stringify(operation === 'render' ? { status: 'ok', scene, svg } : { status: 'ok', scene }));
`);
  const moduleFile = resolve(scratch, 'src', 'label.mjs');
  await writeFile(moduleFile, "export const label = 'First scene';\n");

  const liveURL = await serve(scratch);
  const live = await browser.newPage({ baseURL: liveURL });
  await live.goto('/#case=labels-shapes&phase=layout');
  await live.getByRole('img', { name: 'Node bounds and edge paths' }).getByText('First scene').waitFor();
  await writeFile(moduleFile, "export const label = 'Updated scene';\n");
  await live.getByRole('img', { name: 'Node bounds and edge paths' }).getByText('Updated scene').waitFor();

  const fixtureFile = resolve(scratch, 'fixtures/flowchart/cases.json');
  const cases = JSON.parse(await readFile(fixtureFile, 'utf8'));
  cases.push({ ...cases[0], id: 'fresh-test', source: 'flowchart LR\nFresh' });
  await writeFile(fixtureFile, JSON.stringify(cases));
  await live.getByRole('button', { name: /fresh-test/ }).click();
  await live.locator('#source').getByText('Fresh', { exact: false }).waitFor();
  await live.getByRole('button', { name: 'SVG', exact: true }).click();
  const image = live.getByRole('img', { name: 'SVG rendered by Asrai' });
  await image.waitFor();
  await live.waitForFunction(() => document.querySelector('#response img')?.naturalWidth === 240);
  await live.getByText('SVG markup', { exact: true }).click();
  await live.locator('#response pre').getByText('Updated scene', { exact: false }).first().waitFor();
  console.log('Asrai explorer passed desktop, mobile, and live workspace checks.');
} finally {
  await browser.close();
  await Promise.all(children.filter((child) => child.exitCode === null && child.signalCode === null).map(async (child) => {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }));
  assert.equal(dirname(scratch), artifacts);
  await rm(scratch, { recursive: true, force: true });
}
