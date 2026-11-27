import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const folder = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(folder, '../../..');
const repo = 'https://github.com/Rfaering/Asrai';
const revisions = {
  base: '8a78dcc981d661a9812f7c3fc01b1f5f376d74c2',
  candidate: 'fa6895db711f611af14cda3521a73a776400a2e9',
};
const git = (...args) => execFileSync('git', args, { cwd: root });
const port = Number(process.argv[2] ?? 4173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Provide a valid port number.');

const files = new Map();
const outputRoot = resolve(root, 'artifacts');
await mkdir(outputRoot, { recursive: true });
const output = await mkdtemp(resolve(outputRoot, 'interactive-review-'));

for (const [side, revision] of Object.entries(revisions)) {
  const checkout = resolve(output, side);
  await mkdir(checkout);
  const tree = side === 'base' ? [] : ['--', 'src/'];
  execFileSync('tar', ['-xf', '-', '-C', checkout], { input: git('archive', '--format=tar', revision, ...tree) });
  const entries = git('ls-tree', '-r', '-z', '--name-only', revision, '--', 'src/').toString().split('\0').filter(Boolean);
  for (const path of entries) {
    const bytes = await readFile(resolve(checkout, path));
    files.set(`/${side}/${path}`, ['text/javascript; charset=utf-8', bytes]);
  }
}

const trusted = resolve(output, 'base');
const { evaluate } = await import(pathToFileURL(resolve(trusted, 'evaluation/run.mjs')));
const { candidateRequest } = await import(pathToFileURL(resolve(trusted, 'evaluation/lib/process.mjs')));
const readTrustedJson = async (path) => JSON.parse(await readFile(resolve(trusted, path), 'utf8'));
const adapter = resolve(output, 'candidate/src/adapter.mjs');
const report = await evaluate({ capability: 'FC004', candidate: adapter, output });
const fixtures = await readTrustedJson('fixtures/flowchart/cases.json');
const backlog = JSON.parse(git('show', `${revisions.candidate}:specs/capabilities.json`));
const policy = await readTrustedJson('specs/policy.json');
const cases = await Promise.all(report.results.map(async (result) => {
  const fixture = fixtures.find(({ id }) => id === result.caseId);
  const check = fixture?.checks.find(({ capability, operation }) =>
    capability === result.capability && operation === result.operation);
  if (!check) return { ...result };
  const request = { protocolVersion: 1, operation: result.operation, source: fixture.source };
  try {
    const actual = await candidateRequest(adapter, request, {
      timeoutMs: policy.candidateTimeoutMs,
      maxBytes: policy.maxOutputBytes,
    });
    return { ...result, request, expected: check.expected, actual };
  } catch (error) {
    return { ...result, request, expected: check.expected, replayError: error.message };
  }
}));

const snapshot = {
  repo, revisions, issue: 5, pull: 23, pilotIssue: 24, example: 'labels-shapes',
  capability: backlog.capabilities.find(({ id }) => id === 'FC004'),
  evidence: {
    baseline: revisions.base,
    candidateDigest: report.candidateTreeSha256,
    acceptanceDigest: report.acceptanceSha256,
    summary: report.summary,
    referenceVersion: report.reference.mermaid,
  },
  cases,
};

files.set('/snapshot.json', ['application/json; charset=utf-8', JSON.stringify(snapshot)]);
files.set('/report.json', ['application/json; charset=utf-8', JSON.stringify(report, null, 2)]);
for (const [path, name, type] of [
  ['/', 'index.html', 'text/html'],
  ['/style.css', 'style.css', 'text/css'],
  ['/review.mjs', 'review.mjs', 'text/javascript'],
]) {
  files.set(path, [`${type}; charset=utf-8`, await readFile(resolve(folder, name))]);
}

const server = createServer((request, response) => {
  const file = files.get(request.url.split('?', 1)[0]);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET' || !file) {
    response.writeHead(request.method === 'GET' ? 404 : 405).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': file[0], 'Cache-Control': 'no-store' });
  response.end(file[1]);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Asrai review preview: http://127.0.0.1:${server.address().port}/`);
  console.log(`Evaluation: ${report.summary.passed}/${report.summary.total} checks passed`);
  console.log(`Report: ${resolve(output, 'report.json')}`);
});
