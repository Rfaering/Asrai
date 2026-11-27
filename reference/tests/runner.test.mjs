import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { evaluate } from '../../evaluation/run.mjs';
import { json } from '../../evaluation/lib/io.mjs';
const directory=await mkdtemp(resolve(tmpdir(),'asrai-render-evaluator-'));
const sourceDirectory=resolve(directory,'candidate');await mkdir(sourceDirectory);
const fixtures=await json('fixtures/flowchart/cases.json');
const scene={width:240,height:100,nodes:[{id:'A',x:10,y:10,width:70,height:40},{id:'B',x:160,y:10,width:70,height:40}],edges:[{source:'A',target:'B',points:[{x:80,y:30},{x:160,y:30}]}]};
const svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" width="240" height="100" viewBox="0 0 240 100"><title>Test-only evaluator mock</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"/></marker></defs><g data-node-id="A"><rect data-node-shape="true" x="10" y="10" width="70" height="40"/><text x="20" y="35" fill="white" font-family="Arial" font-size="12">Start</text></g><g data-node-id="B"><rect data-node-shape="true" x="160" y="10" width="70" height="40"/><text x="170" y="35" fill="white" font-family="Arial" font-size="12">Finish</text></g><path data-edge-source="A" data-edge-target="B" d="M80 30 L160 30" stroke="black" marker-end="url(#arrow)"/><text data-edge-source="A" data-edge-target="B" x="110" y="25">yes</text></svg>';
const scenes={
  'layout-lr':scene,
  'layout-rl':{...scene,nodes:[{...scene.nodes[0],x:160},{...scene.nodes[1],x:10}],edges:[{source:'A',target:'B',points:[{x:160,y:30},{x:80,y:30}]}]},
  'layout-tb':{width:100,height:140,nodes:[{id:'A',x:10,y:10,width:70,height:40},{id:'B',x:10,y:90,width:70,height:40}],edges:[{source:'A',target:'B',points:[{x:45,y:50},{x:45,y:90}]}]},
  'layout-bt':{width:100,height:140,nodes:[{id:'A',x:10,y:90,width:70,height:40},{id:'B',x:10,y:10,width:70,height:40}],edges:[{source:'A',target:'B',points:[{x:45,y:90},{x:45,y:50}]}]},
};
async function mock(svgValue) {
  const responses={};
  for(const f of fixtures) {
    const byOperation={validate:{status:'ok',accepted:f.oracle.accepted,diagramType:'flowchart',diagnostics:f.oracle.accepted?[]:[{code:'MOCK_ERROR',severity:'error',line:1,column:1,message:'test only'}]},parse:{status:'ok',model:f.oracle.model}};
    if(f.id==='edge-label'){byOperation.layout={status:'ok',scene};byOperation.render={status:'ok',scene,svg:svgValue};}
    else if(scenes[f.id])byOperation.layout={status:'ok',scene:scenes[f.id]};
    responses[f.source]=byOperation;
  }
  await writeFile(resolve(sourceDirectory,'responses.json'),JSON.stringify(responses));
  const path=resolve(sourceDirectory,'adapter.mjs');
  await writeFile(path,"import {readFile} from 'node:fs/promises';let input='';for await(const c of process.stdin)input+=c;const r=JSON.parse(input),responses=JSON.parse(await readFile(new URL('./responses.json',import.meta.url),'utf8'));console.log(JSON.stringify(responses[r.source]?.[r.operation]??{status:'unimplemented'}));");
  return path;
}
test('full evaluator accepts measured SVG and rejects blank or false SVG independently of a valid declared scene',async()=>{
  // Fixture response table is a test double, never diagram implementation or product evidence.
  const pass=await evaluate({candidate:await mock(svg),capability:'FC010',output:resolve(directory,'pass')});
  assert.equal(pass.summary.failed,0,JSON.stringify(pass.results.filter(r=>r.failures.length)));
  for(const [name,changed]of [['missing-node',svg.replace('data-node-id="A"','data-node-id="wrong"')],['scene-lie',svg.replace('x="10" y="10" width="70"','x="12" y="10" width="70"')],['invisible-label',svg.replace('fill="white"','fill="none"')],['missing-arrow',svg.replace('marker-end="url(#arrow)"','')],['missing-edge-label',svg.replace('>yes</text>','>wrong</text>')]]) {
    const report=await evaluate({candidate:await mock(changed),capability:'FC010',output:resolve(directory,name)});
    assert.ok(report.results.some(r=>r.operation==='render'&&r.outcome==='fail'),name);
  }
});
