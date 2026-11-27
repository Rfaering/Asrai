import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { candidateRequest } from '../lib/process.mjs';
import { root } from '../lib/io.mjs';
test('candidate cannot read acceptance data or write even within its own source',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'asrai-permissions-'));
  for(const [name,operation] of [['read',`await readFile(${JSON.stringify(resolve(root,'fixtures/flowchart/cases.json'))})`],['write',`await writeFile(${JSON.stringify(resolve(directory,'tampered'))},'bad')`]]) {
    const path=resolve(directory,name+'.mjs');
    await writeFile(path,`import {readFile,writeFile} from 'node:fs/promises'; process.stdin.resume(); process.stdin.on('end',async()=>{try{${operation};console.log(JSON.stringify({denied:false}))}catch(e){console.log(JSON.stringify({denied:e.code==='ERR_ACCESS_DENIED'}))}});`);
    assert.deepEqual(await candidateRequest(path,{}),{denied:true});
  }
});
