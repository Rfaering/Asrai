import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { evaluate } from '../run.mjs';
const directory=await mkdtemp(resolve(tmpdir(),'asrai-runner-'));
test('honest empty product yields failing evidence, never false compatibility',async()=>{
  const path=resolve(directory,'unimplemented.mjs');
  await writeFile(path,"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({status:'unimplemented'})))");
  const report=await evaluate({capability:'FC001',candidate:path,output:resolve(directory,'stub')});
  assert.equal(report.summary.total,6);assert.equal(report.summary.failed,6);
  assert.ok(report.results.every(r=>r.failures.includes('unimplemented')));
  assert.match(report.candidateTreeSha256,/^[a-f0-9]{64}$/);
});
test('test-only acceptance mock proves a passing evaluator path',async()=>{
  const path=resolve(directory,'mock.mjs');
  // Deliberate transport mock, no parser. Must never be used as product evidence.
  await writeFile(path,"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({status:'ok',accepted:true,diagramType:'flowchart',diagnostics:[]})))");
  const report=await evaluate({capability:'FC001',candidate:path,output:resolve(directory,'mock-report')});
  assert.equal(report.summary.failed,0);assert.equal(report.summary.passed,6);
});
