import test from 'node:test';
import assert from 'node:assert/strict';
import { json } from '../lib/io.mjs';
import { validateBacklog } from '../../factory/validate.mjs';
import { generatedChecks } from '../lib/properties.mjs';
import { selectedIds } from '../run.mjs';
test('backlog validates; cycles, unknown fixtures, empty criteria and unearned acceptance fail',async()=>{
  const original=await json('specs/capabilities.json'),fixtures=await json('fixtures/flowchart/cases.json');
  assert.deepEqual(validateBacklog(original,fixtures),[]);
  const changes = [
    b => b.capabilities[0].dependencies.push('FC013'),
    b => b.capabilities[0].referenceBehaviour.fixtures.push('missing'),
    b => b.capabilities[0].acceptanceCriteria = [],
    b => {
      b.capabilities[0].status = 'accepted';
      b.capabilities[0].evidence = [];
    },
  ];
  for (const change of changes) {
    const backlog = structuredClone(original);
    change(backlog);
    assert.ok(validateBacklog(backlog, fixtures).length);
  }
});
test('capability selection includes dependencies and all accepted regressions',()=>{
  const caps=[
    {id:'FC001',status:'accepted',dependencies:[]},
    {id:'FC002',status:'pending',dependencies:['FC001']},
    {id:'FC003',status:'accepted',dependencies:['FC001']},
    {id:'FC004',status:'pending',dependencies:['FC002']},
    {id:'FC005',status:'pending',dependencies:['FC004']},
    {id:'FC014',status:'deferred',dependencies:['FC005']},
  ];
  assert.deepEqual(selectedIds(caps,'FC001'),new Set(['FC001','FC003']));
  assert.deepEqual(selectedIds(caps,'FC005'),new Set(['FC001','FC002','FC003','FC004','FC005']));
  assert.throws(()=>selectedIds(caps,'missing'));
  assert.throws(()=>selectedIds(caps,'FC014'));
});
test('generated properties are deterministic, seed-sensitive and have independent expected models',()=>{
  const ids=new Set(['FC007','FC012']);
  assert.equal(generatedChecks(ids).length,36);
  assert.deepEqual(generatedChecks(ids),generatedChecks(ids));
  assert.notDeepEqual(generatedChecks(ids,1),generatedChecks(ids,2));
  assert.equal(generatedChecks(ids)[0].oracle.model.nodes.length,3);
});
