import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createBrowser, observe } from './browser.mjs';
import { json, root, writeJson } from '../evaluation/lib/io.mjs';
import { normalizeModel } from '../evaluation/lib/compare.mjs';
import { isDeepStrictEqual } from 'node:util';
const mode=process.argv[2];
if (!['capture','verify'].includes(mode)) throw new Error('Usage: node reference/cli.mjs capture|verify');
const cases=await json('fixtures/flowchart/cases.json');
const config=await json('reference/config.json');
const browser=await createBrowser();
const output=resolve(root,'artifacts/reference');
await mkdir(output,{recursive:true});
let failures=0;
const observations=[];
try {
  for (const fixture of cases) {
    const render=fixture.checks.some(c=>['layout','render'].includes(c.operation));
    const observed=await observe(browser,fixture.source,config,{render,screenshot:mode==='capture'&&render?resolve(output,fixture.id+'.png'):undefined});
    const errors=[];
    const expectation=fixture.oracle;
    if (observed.accepted!==expectation.accepted) errors.push('reference acceptance differs from specification');
    if (expectation.model && !isDeepStrictEqual(normalizeModel(observed.model),normalizeModel(expectation.model))) errors.push('reference semantics differ from specification');
    if (render && observed.accepted && (!observed.svg || observed.visual.nodeCount!==expectation.model.nodes.length)) errors.push('reference render node coverage differs');
    if (observed.svg && mode==='capture') await writeFile(resolve(output,fixture.id+'.svg'),observed.svg);
    const {svg,...summary}=observed;
    observations.push({id:fixture.id,...summary,failures:errors});
    failures+=errors.length;
    console.log(`${errors.length?'FAIL':'PASS'} ${fixture.id}${errors.length?': '+errors.join(', '):''}`);
  }
} finally { await browser.close(); }
const digest=async path=>createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
const report={schemaVersion:1,mermaid:'11.17.2',playwright:'1.65.1',chromium:browser.version,node:process.version,platform:process.platform,configSha256:await digest('reference/config.json'),lockSha256:await digest('reference/package-lock.json'),fixturesSha256:await digest('fixtures/flowchart/cases.json'),adapterSha256:await digest('reference/browser.mjs'),cliSha256:await digest('reference/cli.mjs'),failures,observations};
await writeJson('artifacts/reference/report.json',report);
if (mode==='capture') await writeJson('reference/observations.json',report);
process.exitCode=failures?1:0;
