import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('adapter preserves a Unicode label split across UTF-8 input chunks', t => {
  const directory = mkdtempSync(join(tmpdir(), 'asrai-adapter-'));
  const path = join(directory, 'request.json');
  t.after(() => {
    rmSync(path, { force: true });
    rmdirSync(directory);
  });

  const request = JSON.stringify({ protocolVersion: 1, operation: 'parse', source: 'graph LR\nA["界"]' });
  // Place the first byte of 界 at the end of Node's first 64 KiB file read.
  const labelOffset = Buffer.byteLength(request.slice(0, request.indexOf('界')));
  writeFileSync(path, ' '.repeat(64 * 1024 - 1 - labelOffset) + request);

  const input = openSync(path, 'r');
  try {
    const adapter = fileURLToPath(new URL('../src/adapter.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [adapter], { stdio: [input, 'pipe', 'pipe'], encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).model.nodes, [{ id: 'A', label: '界', shape: 'rect' }]);
  } finally {
    closeSync(input);
  }
});
