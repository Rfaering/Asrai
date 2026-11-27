import test from 'node:test';
import assert from 'node:assert/strict';
import { compareResponse, normalizeModel } from '../lib/compare.mjs';
const model={type:'flowchart',direction:'LR',nodes:[{id:'A',label:'start',shape:'rect'},{id:'B',label:'end',shape:'rect'}],edges:[{source:'A',target:'B',label:'go',directed:true}]};
test('semantic equality ignores order but preserves labels, direction and edge multiplicity',()=>{
  const check={operation:'parse',expected:{model}};
  assert.deepEqual(compareResponse({status:'ok',model:{...model,nodes:[...model.nodes].reverse()}},check),[]);
  for(const mutation of [{...model,direction:'TB'},{...model,edges:[]},{...model,edges:[...model.edges,...model.edges]},{...model,nodes:model.nodes.map(n=>({...n,label:'wrong'}))}])assert.ok(compareResponse({status:'ok',model:mutation},check).length);
});
test('malformed models and duplicate/unknown ids cannot pass',()=>{
  assert.throws(()=>normalizeModel({...model,nodes:[model.nodes[0],model.nodes[0]]}));
  assert.throws(()=>normalizeModel({...model,edges:[{...model.edges[0],target:'missing'}]}));
  assert.ok(compareResponse({status:'ok',model:null},{operation:'parse',expected:{model}}).length);
});
test('unimplemented, missing response, and malformed diagnostics fail closed',()=>{
  const check={operation:'validate',expected:{accepted:false}};
  for(const response of [{status:'unimplemented'},null,{status:'ok',accepted:false,diagnostics:[]},{status:'ok',accepted:false,diagnostics:[{code:'bad',line:0}]}])assert.ok(compareResponse(response,check).length);
  assert.deepEqual(compareResponse({status:'ok',accepted:false,diagnostics:[{code:'ASRAI_SYNTAX',message:'Invalid syntax',severity:'error',line:1,column:1}]},check),[]);
  assert.ok(compareResponse({status:'ok',accepted:true,diagramType:'flowchart',diagnostics:[{severity:'error'}]},{operation:'validate',expected:{accepted:true}}).length);
});
