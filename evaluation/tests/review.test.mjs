import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, validateReview, classifyChanges } from '../../factory/review.mjs';
import { capabilityIssue } from '../../factory/github.mjs';
import { json } from '../lib/io.mjs';
const policy=await json('specs/policy.json'),caps=(await json('specs/capabilities.json')).capabilities;
const body=(kind='implementation',cap='FC001')=>`Change type: ${kind}\nCapability: ${cap}\nIssue: #2\n\n`+sections.map(section=>`## ${section}\n\n${section==='Worked example'?'```json\n{"accepted": true}\n```\n':''}Concrete behavior, boundaries and evidence explained for the owner.\n`).join('\n');
test('review contract accepts a complete scoped description and rejects missing context or mixed acceptance edits',()=>{
  assert.deepEqual(validateReview(body(),['src/index.mjs'],policy,caps).failures,[]);
  assert.ok(validateReview(body().replace('## Interfaces and responsibilities','## Files'),['src/index.mjs'],policy,caps).failures.length);
  assert.ok(validateReview(body('factory','none'),['src/index.mjs'],policy,caps).failures.length);
  const blockedBacklog = caps.map(cap => cap.id === 'FC004' ? { ...cap, status: 'pending', evidence: [] } : cap);
  assert.deepEqual(validateReview(body('implementation','FC005'),['src/index.mjs'],policy,blockedBacklog).failures,
    ['Capability dependencies must be accepted before implementation.']);
  assert.ok(validateReview(body().replace('#2','#0'),['src/index.mjs'],policy,caps).failures.length);
  assert.throws(()=>classifyChanges(['src/index.mjs','specs/policy.json'],policy.protectedPaths),/separate PRs/);
  assert.equal(classifyChanges(['docs/reviews/FC001/output.svg'],policy.protectedPaths),'documentation');
  assert.deepEqual(validateReview(body('factory','none'),['.github/ISSUE_TEMPLATE/feature.yml'],policy,caps).failures,[]);
  assert.ok(validateReview(body().replace('```json\n{"accepted": true}\n```','plain prose only'),['src/index.mjs'],policy,caps).failures.length);
});
test('issue exports preserve capability criteria, dependencies, provenance and deferred scope',async()=>{
  const fixtures=await json('fixtures/flowchart/cases.json');
  const firstCapability = { ...caps[0], status: 'ready', evidence: [] };
  const dependentCapability = { ...caps[1], status: 'pending', evidence: [] };
  const links = { FC001: 2 };
  const first = capabilityIssue(firstCapability, fixtures);
  const dependent = capabilityIssue(dependentCapability, fixtures, links);
  const deferred = capabilityIssue(caps.find(c => c.id === 'FC014'), fixtures);
  assert.ok(first.labels.includes('stage:ready'));assert.match(first.body,/header-tb:validate/);assert.match(first.body,/not an implemented result/);
  assert.match(dependent.body,/FC001: #2/);assert.ok(dependent.labels.includes('stage:blocked'));
  assert.ok(capabilityIssue({ ...firstCapability, status: 'accepted' }, fixtures).labels.includes('stage:accepted'));
  assert.ok(capabilityIssue(dependentCapability, fixtures, links, new Set(['FC001'])).labels.includes('stage:ready'));
  assert.ok(deferred.labels.includes('stage:deferred'));assert.match(deferred.body,/before implementation/);
});
