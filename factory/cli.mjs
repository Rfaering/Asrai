import { json, writeJson } from '../evaluation/lib/io.mjs';
const caps=(await json('specs/capabilities.json')).capabilities;
let github;try{github=await json('factory/github-issues.json');}catch(error){if(error.code!=='ENOENT')throw error;}
const issueFor=c=>github?.issues[c.id]?`https://github.com/${github.repository}/issues/${github.issues[c.id]}`:null;
const accepted=new Set(caps.filter(c=>c.status==='accepted').map(c=>c.id));
if(process.argv[2]==='status') {
  for(const c of caps)console.log(`${c.id} ${c.status.padEnd(12)} ${c.description}${issueFor(c)?' · '+issueFor(c):''}`);
} else if(process.argv[2]==='next') {
  const capability=caps.filter(c=>!['accepted','deferred'].includes(c.status)&&c.dependencies.every(id=>accepted.has(id))).sort((a,b)=>a.priority-b.priority)[0];
  if(!capability){console.log('No ready capability. Review blocked dependencies or specify the next milestone.');process.exitCode=1;}
  else {
    const packet={schemaVersion:1,capability,issue:issueFor(capability),read:['AGENTS.md','specs/flowchart-core.md','specs/protocol.md','docs/development.md','docs/github-workflow.md'],implementationPaths:['src/','tests/'],evaluateCommand:`npm run evaluate -- --capability ${capability.id}`,acceptanceAuthority:'Independent evaluation against a trusted base. An implementation report alone cannot promote acceptance.'};
    await writeJson('.factory/task.json',packet);console.log(JSON.stringify(packet,null,2));
  }
} else throw new Error('Usage: node factory/cli.mjs next|status');
