import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { candidateRequest } from '../lib/process.mjs';
const directory=await mkdtemp(resolve(tmpdir(),'asrai-harness-'));
async function adapter(name,source){const path=resolve(directory,name+'.mjs');await writeFile(path,source);return path;}
test('process boundary enforces JSON, nonzero exits, timeout and output bound',async()=>{
  assert.deepEqual(await candidateRequest(await adapter('valid',"process.stdin.resume();process.stdin.on('end',()=>console.log(JSON.stringify({status:'ok'})))"),{}),{status:'ok'});
  await assert.rejects(candidateRequest(await adapter('invalid',"process.stdin.resume();process.stdin.on('end',()=>console.log('no'))"),{}),/invalid JSON/);
  await assert.rejects(candidateRequest(await adapter('crash','process.exit(2)'),{}),/exited 2|EPIPE/);
  await assert.rejects(candidateRequest(await adapter('timeout','setInterval(()=>{},1000)'),{},{timeoutMs:100}),/timeout/);
  await assert.rejects(candidateRequest(await adapter('huge',"console.log('x'.repeat(10000))"),{},{maxBytes:200}),/output limit|EPIPE/);
});
