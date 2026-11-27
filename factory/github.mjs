// Deterministic issue drafts; publication remains an explicit agent/owner action.
import { json, root, writeJson } from '../evaluation/lib/io.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export function capabilityIssue(capability, fixtures, links={}, accepted=new Set()) {
  const example=fixtures.find(f=>f.checks.some(c=>c.capability===capability.id));
  const dependencies=capability.dependencies.length?capability.dependencies.map(id=>links[id]?`- ${id}: #${links[id]}`:`- ${id}`).join('\n'):'None. This is the first independently verifiable increment.';
  const expected=example?.checks.find(c=>c.capability===capability.id)?.expected;
  const stage=({deferred:'deferred',accepted:'accepted',implemented:'review',implementing:'implementing'})[capability.status]??(capability.dependencies.every(id=>accepted.has(id))?'ready':'blocked');
  const evaluation=capability.status==='deferred'?'Discover the behavior and propose executable criteria in a separately reviewed specification PR before implementation.':`\`npm run evaluate -- --capability ${capability.id}\` must pass this capability, its dependencies and all accepted regressions. Attach the digest-bound report; independent acceptance is required.`;
  return {
    title:`[${capability.id}] ${capability.description}`,
    labels:['kind:capability',`stage:${stage}`,capability.priority===1?'priority:high':'priority:normal'],
    body:`<!-- asrai-capability:${capability.id} -->\n## Desired outcome\n\n${capability.description}.\n\nThis is one bounded increment toward independently parsing, laying out and rendering Mermaid-compatible flowcharts. It does not authorize broader Mermaid support.\n\n## Scope and interfaces\n\nCapability: **${capability.id}** · Milestone: **${capability.milestone}** · Factory priority: **${capability.priority}**.\n\nThe implementation agent must explain which source → validation → model → scene → SVG boundary changes, its input/output contract, error behavior and downstream consumers. Use the existing [protocol](https://github.com/Rfaering/Asrai/blob/main/specs/protocol.md) and [scope](https://github.com/Rfaering/Asrai/blob/main/specs/flowchart-core.md); avoid speculative modules.\n\n## Example input and expected result\n\n${example?'```text\n'+example.source+'\n```\n\nExpected contract data (not an implemented result):\n\n```json\n'+JSON.stringify(expected,null,2)+'\n```':'No executable example is approved yet. The deliverable is a discovery/specification proposal, not product implementation.'}\n\n## Dependencies\n\n${dependencies}\n\n## Acceptance criteria\n\n${capability.acceptanceCriteria.length?capability.acceptanceCriteria.map(c=>'- [ ] `'+c+'`').join('\n'):'- [ ] A bounded specification and independently verified executable examples are reviewed before implementation.'}\n\n${evaluation}\n\n## Evidence required in the PR\n\n- Explain the behavior change and interface contracts in plain language.\n- Provide a complete worked example and actual before/after JSON or diagnostics.\n- For visual behavior, embed actual Asrai PNG output and link its SVG and input. Label any Mermaid reference separately.\n- Link automated checks and the evaluated source/acceptance digests; describe limitations.\n\n## Reference and work rules\n\nReference: Mermaid ${capability.referenceBehaviour.version}; [discovery](https://github.com/Rfaering/Asrai/blob/main/${capability.referenceBehaviour.source}). The capability registry remains the executable acceptance authority. Issue text, labels and issue closure do not change that contract. Implementers cannot change protected criteria or promote their own acceptance. Use **Refs #issue** until independent acceptance is recorded; the completing acceptance PR uses **Closes #issue**.\n`,
  };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(root,'factory/github.mjs')) {
  if(process.argv[2]!=='export')throw new Error('Usage: node factory/github.mjs export');
  const caps=(await json('specs/capabilities.json')).capabilities,fixtures=await json('fixtures/flowchart/cases.json');
  let links={};try{links=(await json('factory/github-issues.json')).issues;}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(resolve(root,'.factory/github'),{recursive:true});
  const index=[];
  const accepted=new Set(caps.filter(c=>c.status==='accepted').map(c=>c.id));
  for(const capability of caps) {const issue=capabilityIssue(capability,fixtures,links,accepted);await writeFile(resolve(root,'.factory/github',capability.id+'.md'),issue.body);index.push({capability:capability.id,...issue});}
  await writeJson('.factory/github/issues.json',index);console.log(`Exported ${index.length} issue drafts to .factory/github/. No network changes made.`);
}
