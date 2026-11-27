import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { json } from '../lib/io.mjs';
import { evaluate } from '../run.mjs';
const directory=await mkdtemp(resolve(tmpdir(),'asrai-runner-'));
const mockCapabilities = new Set(['FC001', 'FC002', 'FC003', 'FC004']);
const checkCount = 20;
test('honest empty product yields failing evidence, never false compatibility',async()=>{
  const path=resolve(directory,'unimplemented.mjs');
  await writeFile(path,"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({status:'unimplemented'})))");
  const report=await evaluate({capability:'FC001',candidate:path,output:resolve(directory,'stub')});
  assert.deepEqual(report.summary, { total: checkCount, passed: 0, failed: checkCount });
  assert.ok(report.results.every(r=>r.failures.includes('unimplemented')));
  assert.match(report.candidateTreeSha256,/^[a-f0-9]{64}$/);
});
test('test-only acceptance mock proves a passing evaluator path',async()=>{
  const path=resolve(directory,'mock.mjs');
  // Test-only transport responses from the fixtures. Never use this as product evidence.
  const fixtures = await json('fixtures/flowchart/cases.json');
  const responses = fixtures.flatMap(({ source, checks }) => checks
    .filter(({ capability }) => mockCapabilities.has(capability))
    .map(({ operation, expected }) => {
      const response = { status: 'ok', ...expected };
      if (operation === 'validate' && expected.accepted) {
        response.diagramType = 'flowchart';
        response.diagnostics = [];
      } else if (operation === 'validate') {
        response.diagnostics = [
          { code: 'ASRAI_SYNTAX', severity: 'error', line: 1, column: 1, message: 'Fixture rejection' },
        ];
      }
      return [JSON.stringify([operation, source]), response];
    }));
  await writeFile(path, `
    const responses = new Map(${JSON.stringify(responses)});
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', () => {
      const { operation, source } = JSON.parse(input);
      const response = responses.get(JSON.stringify([operation, source]));
      console.log(JSON.stringify(response ?? { status: 'unimplemented' }));
    });
  `);
  const report=await evaluate({capability:'FC001',candidate:path,output:resolve(directory,'mock-report')});
  assert.deepEqual(report.summary, { total: checkCount, passed: checkCount, failed: 0 });
});
