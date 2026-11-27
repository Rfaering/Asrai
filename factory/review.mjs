import { readFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { options, writeJson } from '../evaluation/lib/io.mjs';

export const sections=['Outcome','Why this change','Interfaces and responsibilities','Worked example','Evidence','How to verify','Limitations and follow-up'];
export function reviewMetadata(body='') {
  const clean=body.replace(/<!--[\s\S]*?-->/g,'');
  const kind=/^Change type: (implementation|factory|documentation)\s*$/m.exec(clean)?.[1];
  const capability=/^Capability: (FC\d{3}|none)\s*$/m.exec(clean)?.[1];
  const issue=Number(/^Issue: #(\d+)\s*$/m.exec(clean)?.[1]);
  return {clean,kind,capability,issue};
}
export function classifyChanges(files,protectedPaths) {
  const product=files.some(path=>path.startsWith('src/'));
  const contract=files.some(path=>protectedPaths.some(p=>p.endsWith('/')?path.startsWith(p):path===p));
  if(product&&contract)throw new Error('Product implementation and protected acceptance changes require separate PRs.');
  return product?'implementation':contract?'factory':'documentation';
}
export function validateReview(body,files,policy,backlog) {
  const failures=[],meta=reviewMetadata(body);
  let actualKind;
  try{actualKind=classifyChanges(files,policy.protectedPaths);}catch(error){failures.push(error.message);}
  if(!meta.kind)failures.push('Set Change type: implementation, factory or documentation.');
  if(meta.kind&&actualKind&&meta.kind!==actualKind)failures.push(`Changed paths require Change type: ${actualKind}.`);
  if(!Number.isInteger(meta.issue)||meta.issue<1)failures.push('Link the managing issue with Issue: #N.');
  if(!meta.capability)failures.push('Set Capability: FCxxx or none.');
  if(meta.kind==='implementation') {
    const cap=backlog.find(c=>c.id===meta.capability);
    if(!cap||cap.status==='deferred')failures.push('Implementation must name a specified capability from the trusted base.');
    else if(cap.dependencies.some(id=>backlog.find(c=>c.id===id)?.status!=='accepted'))failures.push('Capability dependencies must be accepted before implementation.');
  }
  for(const section of sections) {
    const escaped=section.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const content=new RegExp(`^## ${escaped}\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,'m').exec(meta.clean)?.[1]?.trim();
    if(!content||content.length<20||/\b(?:TBD|TODO|FCxxx)\b|#0\b/.test(content))failures.push(`Complete the ${section} section with concrete review information.`);
  }
  const example=/^## Worked example\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(meta.clean)?.[1]??'';
  if(!/```/.test(example))failures.push('Worked example needs a fenced input, command or output.');
  return {kind:actualKind,capability:meta.capability,issue:meta.issue,failures};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const opts=options(process.argv.slice(2));
  if(!opts.event||!opts.trusted||!opts.candidate)throw new Error('Required: --event <event.json> --trusted <base checkout> --candidate <head checkout>');
  const event=JSON.parse(await readFile(resolve(opts.event),'utf8')),pr=event.pull_request;
  if(!pr||!/^\d+$/.test(String(pr.number))||!/^[a-f0-9]{40}$/.test(pr.base.sha)||!/^[a-f0-9]{40}$/.test(pr.head.sha))throw new Error('Expected a pull_request event with full base/head SHAs.');
  const readTrusted=async path=>JSON.parse(await readFile(resolve(opts.trusted,path),'utf8'));
  const diff=spawnSync('git',['-C',resolve(opts.candidate),'diff','--name-only','-z','--no-renames',pr.base.sha,pr.head.sha],{encoding:'utf8',windowsHide:true});
  if(diff.status!==0)throw new Error(diff.stderr);
  const files=diff.stdout.split('\0').filter(Boolean);
  const review=validateReview(pr.body??'',files,await readTrusted('specs/policy.json'),(await readTrusted('specs/capabilities.json')).capabilities);
  await writeJson(resolve(opts.output??'artifacts/review/context.json'),{...review,files,baseSha:pr.base.sha,headSha:pr.head.sha});
  if(process.env.GITHUB_OUTPUT&&review.kind)await appendFile(process.env.GITHUB_OUTPUT,`kind=${review.kind}\ncapability=${review.capability??'none'}\n`);
  const summary=`## PR review context\n\nChange type: **${review.kind??'invalid'}** · Issue: **#${review.issue||'?'}** · Capability: **${review.capability??'invalid'}**\n\n${review.kind==='implementation'?'Product acceptance is evaluated by the base-owned harness.':'This is a '+review.kind+' proposal. This check does not accept product capabilities; the owner reviews the contract or documentation change.'}\n\n${review.failures.length?review.failures.map(f=>'- '+f).join('\n'):'All seven review sections and a worked example are present. This structural check does not judge the truth or quality of the explanation.'}\n`;
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
  console.log(summary);process.exitCode=review.failures.length?1:0;
}
