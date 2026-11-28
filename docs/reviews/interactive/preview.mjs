import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { candidateRequest } from '../../../evaluation/lib/process.mjs';
import { checkExpectation } from './expectations.mjs';
import { expectationsFor, phaseFor } from './phases.mjs';

const folder = fileURLToPath(new URL('.', import.meta.url));
const { values, positionals } = parseArgs({
  options: { workspace: { type: 'string' } },
  allowPositionals: true,
});
const workspace = resolve(values.workspace ?? resolve(folder, '../../..'));
const port = Number(positionals[0] ?? 4173);
if (positionals.length > 1 || !Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('Usage: node docs/reviews/interactive/preview.mjs [port] [--workspace path]');
}

const sourceDir = resolve(workspace, 'src');
const adapter = resolve(sourceDir, 'adapter.mjs');
const generator = resolve(workspace, 'evaluation/lib/properties.mjs');
const readJson = async (path) => JSON.parse(await readFile(resolve(workspace, path), 'utf8'));
const pages = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/review.mjs', ['review.mjs', 'text/javascript']],
  ['/phases.mjs', ['phases.mjs', 'text/javascript']],
]);

let inspector;

async function inspect(svg) {
  inspector ??= import('../../../reference/browser.mjs').then(async ({ createBrowser, inspectSvg }) => {
    const browser = await createBrowser();
    return { browser, inspectSvg };
  }).catch((error) => {
    inspector = undefined;
    throw error;
  });
  const { browser, inspectSvg } = await inspector;
  return inspectSvg(browser, svg);
}

async function runPhase(entry, operation, policy) {
  const repeat = async () => {
    try {
      const actual = await candidateRequest(adapter, { protocolVersion: 1, source: entry.source, operation }, {
        timeoutMs: policy.candidateTimeoutMs, maxBytes: policy.maxOutputBytes,
      });
      return { actual };
    } catch (error) {
      return { error: error.message };
    }
  };
  const observation = await repeat();
  const checks = [];
  for (const check of expectationsFor(entry, operation)) {
    checks.push(await checkExpectation(observation, check, { repeat, inspect, benchmarkSamples: policy.benchmark.samples }));
  }
  return { result: observation.actual, error: observation.error, checks };
}

async function catalog() {
  const [authored, backlog, policy, generatorFile] = await Promise.all([
    readJson('fixtures/flowchart/cases.json'),
    readJson('specs/capabilities.json'),
    readJson('specs/policy.json'),
    stat(generator),
  ]);
  const generatorUrl = pathToFileURL(generator);
  generatorUrl.searchParams.set('revision', `${generatorFile.mtimeMs}-${generatorFile.ctimeMs}`);
  const { generatedChecks } = await import(generatorUrl);
  const capabilities = new Set(backlog.capabilities.map(({ id }) => id));
  const generated = generatedChecks(capabilities, policy.seed);
  const cases = [...authored, ...generated].map(({ id, source, checks = [] }) => ({ id, source, checks }));
  return { cases, policy };
}

async function sourceRevision() {
  const entries = await readdir(sourceDir, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => resolve(entry.parentPath, entry.name)).sort();
  const stamps = await Promise.all(files.map(async (file) => {
    const { mtimeMs, ctimeMs, size } = await stat(file);
    return [file, mtimeMs, ctimeMs, size];
  }));
  return createHash('sha256').update(JSON.stringify(stamps)).digest('hex');
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const actualPort = server.address().port;
  const allowedHosts = [`127.0.0.1:${actualPort}`, `localhost:${actualPort}`];
  if (!allowedHosts.includes(request.headers.host)) {
    return send(response, 403, { error: 'Open the preview using its local address.' });
  }
  if (request.method !== 'GET') return send(response, 405, { error: 'Use GET for this endpoint.' });

  try {
    const url = new URL(request.url, `http://127.0.0.1:${actualPort}`);
    if (url.pathname.startsWith('/api/') && request.headers['sec-fetch-site'] === 'cross-site') {
      return send(response, 403, { error: 'Open the preview to run tests.' });
    }
    const page = pages.get(url.pathname);
    if (page) {
      const [file, type] = page;
      const body = await readFile(resolve(folder, file));
      response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
      return response.end(body);
    }

    if (url.pathname === '/api/catalog') {
      const [{ cases, policy }, sourceStamp] = await Promise.all([catalog(), sourceRevision()]);
      const revision = createHash('sha256').update(JSON.stringify([sourceStamp, policy])).digest('hex');
      return send(response, 200, { cases, revision });
    }

    if (url.pathname === '/api/run' || url.pathname === '/api/check') {
      const { cases, policy } = await catalog();
      const id = url.searchParams.get('case');
      const selected = cases.find((entry) => entry.id === id);
      if (!selected) return send(response, 404, { error: 'That case is no longer in the catalog.' });

      if (url.pathname === '/api/run') {
        const operation = url.searchParams.get('operation');
        if (!policy.supportedOperations.includes(operation)) return send(response, 400, { error: 'Unknown pipeline operation.' });
        return send(response, 200, await runPhase(selected, operation, policy));
      }

      const results = {};
      const phases = new Set(expectationsFor(selected).map(({ operation }) => phaseFor(operation)));
      for (const phase of phases) {
        if (response.destroyed) return;
        results[phase] = (await runPhase(selected, phase, policy)).checks;
      }
      return send(response, 200, { results });
    }

    return send(response, 404, { error: 'Page not found.' });
  } catch (error) {
    return send(response, 500, { error: error.message });
  }
});

await Promise.all([catalog(), stat(adapter)]);
server.listen(port, '127.0.0.1', () => {
  console.log(`Asrai test explorer: http://127.0.0.1:${server.address().port}/`);
  console.log(`Workspace: ${workspace}`);
});
