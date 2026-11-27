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
test('capability selection includes dependencies and all accepted regressions',async()=>{
  const caps=(await json('specs/capabilities.json')).capabilities;
  assert.deepEqual([...selectedIds(caps,'FC001')],['FC001']);
  assert.ok(selectedIds(caps,'FC005').has('FC002'));
  assert.throws(()=>selectedIds(caps,'missing'));
  assert.throws(()=>selectedIds(caps,'FC014'));
  const cloned=structuredClone(caps);cloned.find(c=>c.id==='FC006').status='accepted';
  assert.ok(selectedIds(cloned,'FC001').has('FC006'));
});
test('generated properties are deterministic, seed-sensitive and have independent expected models',()=>{
  const ids=new Set(['FC007','FC012']);
  assert.equal(generatedChecks(ids).length,36);
  assert.deepEqual(generatedChecks(ids),generatedChecks(ids));
  assert.notDeepEqual(generatedChecks(ids,1),generatedChecks(ids,2));
  assert.equal(generatedChecks(ids)[0].oracle.model.nodes.length,3);
});
