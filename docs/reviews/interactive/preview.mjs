import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { candidateRequest } from '../../../evaluation/lib/process.mjs';

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
]);

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
  const cases = [...authored, ...generated].map(({ id, source, checks }) => ({ id, source, checks }));
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
      const [{ cases }, revision] = await Promise.all([catalog(), sourceRevision()]);
      return send(response, 200, { cases, revision });
    }

    if (url.pathname === '/api/run') {
      const { cases, policy } = await catalog();
      const operation = url.searchParams.get('operation');
      if (!policy.supportedOperations.includes(operation)) return send(response, 400, { error: 'Unknown pipeline operation.' });
      const id = url.searchParams.get('case');
      const selected = cases.find((entry) => entry.id === id);
      if (!selected) return send(response, 404, { error: 'That case is no longer in the catalog.' });

      const input = { protocolVersion: 1, source: selected.source, operation };
      try {
        const result = await candidateRequest(adapter, input, {
          timeoutMs: policy.candidateTimeoutMs, maxBytes: policy.maxOutputBytes,
        });
        return send(response, 200, { result });
      } catch (error) {
        return send(response, 502, { error: error.message });
      }
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
