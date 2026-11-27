import test from 'node:test';
import assert from 'node:assert/strict';
import { geometryFailures } from '../lib/geometry.mjs';
const model={nodes:[{id:'A'},{id:'B'}],edges:[{source:'A',target:'B'}]};
const scene={width:100,height:40,nodes:[{id:'A',x:0,y:0,width:20,height:20},{id:'B',x:50,y:0,width:20,height:20}],edges:[{source:'A',target:'B',points:[{x:20,y:10},{x:50,y:10}]}]};
test('valid scene passes independent geometric checks',()=>assert.deepEqual(geometryFailures(scene,model),[]));
test('rejects overlap, NaN, off-canvas, missing nodes/edges, detached paths',()=>{
  const changes=[s=>s.nodes[1].x=10,s=>s.nodes[0].width=NaN,s=>s.nodes[1].x=99,s=>s.nodes.pop(),s=>s.edges=[],s=>s.edges[0].points[0]={x:35,y:30},s=>s.nodes.push({...s.nodes[0]}),s=>s.edges[0].points.splice(1,0,{x:500,y:10})];
  for(const change of changes){const s=structuredClone(scene);change(s);assert.ok(geometryFailures(s,model).length);}
});
