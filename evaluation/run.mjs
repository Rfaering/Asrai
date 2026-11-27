import { resolve } from 'node:path';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { json, root, options, writeJson } from './lib/io.mjs';
import { candidateRequest } from './lib/process.mjs';
import { compareResponse, normalizeModel } from './lib/compare.mjs';
import { geometryFailures, qualityMetrics } from './lib/geometry.mjs';
import { generatedChecks } from './lib/properties.mjs';
import { verifyAcceptance } from '../factory/integrity.mjs';
export async function digestTree(directory) {
  const hash=createHash('sha256');
  async function walk(path,prefix='') {
    for(const entry of (await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const name=prefix+entry.name;
      if(entry.isSymbolicLink()) throw new Error('symlinks are forbidden in candidate source');
      if(entry.isDirectory()) await walk(resolve(path,entry.name),name+'/');
      else { hash.update(name+'\0');hash.update(await readFile(resolve(path,entry.name)));hash.update('\0'); }
    }
  }
  await walk(directory);return hash.digest('hex');
}
export function selectedIds(backlog, requested) {
  const byId=new Map(backlog.map(c=>[c.id,c]));
  const ids=new Set();
  const visit=id=>{if(ids.has(id)) return;const cap=byId.get(id);if(!cap)throw new Error(`Unknown capability ${id}`);if(cap.status==='deferred')throw new Error(`Deferred capability ${id} has no acceptance contract`);ids.add(id);cap.dependencies.forEach(visit);};
  backlog.filter(c=>c.status==='accepted').forEach(c=>visit(c.id));
  if(requested) visit(requested); else backlog.filter(c=>c.milestone==='flowchart-core-v1').forEach(c=>visit(c.id));
  return ids;
}
export async function evaluate(opts={}) {
  await verifyAcceptance();
  const backlog=(await json('specs/capabilities.json')).capabilities;
  const policy=await json('specs/policy.json');
  const ids=selectedIds(backlog,opts.capability);
  const cases=[...await json('fixtures/flowchart/cases.json'),...generatedChecks(ids,policy.seed)];
  const adapter=resolve(opts.candidate??resolve(root,'src/adapter.mjs'));
  const request=(operation,source)=>candidateRequest(adapter,{protocolVersion:1,operation,source},{timeoutMs:policy.candidateTimeoutMs,maxBytes:policy.maxOutputBytes});
  const rows=[];let browser;
  const getBrowser=async()=>browser??=await (await import('../reference/browser.mjs')).createBrowser();
  const output=resolve(root,opts.output??'artifacts/evaluation');
  await mkdir(output,{recursive:true});
  const initialDigest=await digestTree(resolve(adapter,'..'));
  try {
    for(const fixture of cases) for(const check of fixture.checks.filter(c=>ids.has(c.capability))) {
      const row={caseId:fixture.id,capability:check.capability,operation:check.operation,failures:[],metrics:{}};
      const operation=['determinism','benchmark','security'].includes(check.operation)?'render':check.operation;
      try {
        const start=performance.now();
        const actual=await request(operation,fixture.source);
        row.metrics.elapsedMs=performance.now()-start;
        row.failures.push(...compareResponse(actual,check));
        if(actual.status==='ok') {
          if(operation==='layout' || operation==='render') {
            row.failures.push(...geometryFailures(actual.scene,check.expected.model));
            if(!row.failures.length) row.metrics.quality=qualityMetrics(actual.scene);
            // Direction applies to the two-node, single-edge cases only; cycles have no total order.
            if(check.capability==='FC008' && actual.scene?.nodes?.length===2) {
              const a=actual.scene.nodes.find(n=>n.id==='A'),b=actual.scene.nodes.find(n=>n.id==='B');
              const dir=check.expected.model.direction;
              if(a&&b && !(dir==='LR'?a.x<b.x:dir==='RL'?a.x>b.x:dir==='TB'?a.y<b.y:a.y>b.y)) row.failures.push('layout direction differs');
            }
          }
          if(operation==='render') {
            if(typeof actual.svg!=='string') row.failures.push('missing SVG');
            else {
              const inspection=await (await import('../reference/browser.mjs')).inspectSvg(await getBrowser(),actual.svg,{screenshot:resolve(output,fixture.id+'.png')});
              row.failures.push(...inspection.failures);
              if(!inspection.failures.length) {
                row.failures.push(...geometryFailures(inspection.scene,check.expected.model));
                const edgeDirections=edges=>edges.map(e=>JSON.stringify([e.source,e.target,e.directed])).sort();
                if(!isDeepStrictEqual(edgeDirections(inspection.scene.edges),edgeDirections(check.expected.model.edges)))row.failures.push('SVG arrow directions differ');
                const labels=edges=>edges.map(e=>JSON.stringify([e.source,e.target,e.label])).sort();
                if(!isDeepStrictEqual(labels(inspection.edgeLabels),labels(check.expected.model.edges.filter(e=>e.label))))row.failures.push('SVG edge labels differ');
                for(const node of check.expected.model.nodes) {
                  const drawn=inspection.scene.nodes.find(n=>n.id===node.id),declared=actual.scene?.nodes?.find(n=>n.id===node.id);
                  if(drawn?.label!==node.label)row.failures.push(`missing SVG label ${node.id}`);
                  if(drawn&&declared&&['x','y','width','height'].some(k=>Math.abs(drawn[k]-declared[k])>1))row.failures.push('SVG node geometry differs from scene');
                }
                if(actual.scene&&['width','height'].some(k=>Math.abs(actual.scene[k]-inspection.scene[k])>1))row.failures.push('SVG canvas differs from scene');
              }
              if(!/\brole=["']img["']/.test(actual.svg) || !/<title(?:\s|>)/.test(actual.svg)) row.failures.push('SVG needs an accessible title and image role');
              row.metrics.svgSha256=createHash('sha256').update(actual.svg).digest('hex');
              // Candidate-to-candidate visual regression is advisory; Mermaid pixels are never a correctness gate.
              if(opts['visual-baseline']) {
                const baseline=JSON.parse(await readFile(resolve(opts['visual-baseline']),'utf8'));
                const previous=baseline.results.find(r=>r.caseId===row.caseId&&r.operation===row.operation);
                row.metrics.svgChanged=previous?.metrics.svgSha256!==row.metrics.svgSha256;
              }
            }
          }
          if(check.operation==='determinism') {
            const repeated=await request(operation,fixture.source);
            if(!isDeepStrictEqual(actual,repeated)) row.failures.push('fresh-process output differs');
          }
          if(check.operation==='benchmark') {
            const samples=[row.metrics.elapsedMs];
            for(let i=1;i<policy.benchmark.samples;i++) {const start=performance.now();const sample=await request(operation,fixture.source);samples.push(performance.now()-start);if(sample.status!=='ok')row.failures.push('benchmark request failed');}
            samples.sort((a,b)=>a-b);row.metrics.benchmark={samplesMs:samples,medianMs:samples[Math.floor(samples.length/2)],includesProcessStartup:true};
            row.metrics.benchmark.advisoryBudgetExceeded=row.metrics.benchmark.medianMs>policy.benchmark.advisoryMedianMs;
          }
        }
      } catch(error) {row.failures.push(error.message);}
      row.outcome=row.failures.length?'fail':'pass';rows.push(row);
    }
  } finally {if(browser)await browser.close();}
  const finalDigest=await digestTree(resolve(adapter,'..'));
  if(initialDigest!==finalDigest)rows.push({caseId:'candidate-integrity',capability:'factory',operation:'integrity',outcome:'fail',failures:['candidate source changed during evaluation'],metrics:{}});
  if(!rows.length)throw new Error('No executable acceptance checks selected');
  const acceptance=await json('specs/acceptance-manifest.json');
  const observed=await json('reference/observations.json');
  const report={schemaVersion:1,requestedCapability:opts.capability??null,capabilities:[...ids].sort(),candidateTreeSha256:initialDigest,acceptanceSha256:createHash('sha256').update(JSON.stringify(acceptance)).digest('hex'),reference:{mermaid:observed.mermaid,lockSha256:observed.lockSha256,fixturesSha256:observed.fixturesSha256,configSha256:observed.configSha256},environment:{node:process.version,platform:process.platform,seed:policy.seed},summary:{total:rows.length,passed:rows.filter(r=>r.outcome==='pass').length,failed:rows.filter(r=>r.outcome==='fail').length},results:rows};
  await writeJson(resolve(output,'report.json'),report);
  return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const opts=options(process.argv.slice(2));
  for(const key of Object.keys(opts))if(!['candidate','capability','output','visual-baseline'].includes(key))throw new Error(`Unknown option ${key}`);
  const report=await evaluate(opts);
  console.log(JSON.stringify(report.summary));
  console.log(`Evidence: ${resolve(root,opts.output??'artifacts/evaluation','report.json')}`);
  process.exitCode=report.summary.failed?1:0;
}
