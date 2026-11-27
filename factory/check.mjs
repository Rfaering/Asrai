import { readdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { json, root } from '../evaluation/lib/io.mjs';
import { normalizeModel } from '../evaluation/lib/compare.mjs';
import { validateBacklog } from './validate.mjs';
import { verifyAcceptance } from './integrity.mjs';
const fixtures=await json('fixtures/flowchart/cases.json');
const backlog=await json('specs/capabilities.json');
const errors=validateBacklog(backlog,fixtures);
try {
  const links=await json('factory/github-issues.json');
  const numbers=Object.values(links.issues??{});
  if(links.schemaVersion!==1||!/^[-\w.]+\/[-\w.]+$/.test(links.repository)||numbers.some(n=>!Number.isInteger(n)||n<1)||new Set(numbers).size!==numbers.length||backlog.capabilities.some(c=>!links.issues?.[c.id])||Object.keys(links.issues??{}).some(id=>!backlog.capabilities.some(c=>c.id===id)))errors.push('Invalid or incomplete GitHub capability issue map');
}catch(error){if(error.code!=='ENOENT')throw error;}
for(const f of fixtures)if(f.oracle.model)normalizeModel(f.oracle.model);
async function checkDirectory(directory) {
  for(const entry of await readdir(resolve(root,directory),{withFileTypes:true})) {
    if(entry.name==='node_modules')continue;
    const path=directory+'/'+entry.name;
    if(entry.isDirectory())await checkDirectory(path);
    else if(entry.name.endsWith('.mjs')) {
      const result=spawnSync(process.execPath,['--check',resolve(root,path)],{encoding:'utf8',windowsHide:true});
      if(result.status!==0)errors.push(result.stderr);
      if(directory==='src'||directory.startsWith('src/')) {
        const text=await readFile(resolve(root,path),'utf8');
        for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?|\brequire\s*\()\s*['"]([^'"]+)['"]/g)) {
          const specifier=match[1];
          if(specifier.startsWith('node:'))continue;
          if(!specifier.startsWith('.')||!resolve(root,directory,specifier).startsWith(resolve(root,'src')+sep))errors.push(`Product boundary violation: ${path} imports ${specifier}`);
        }
      }
    }
  }
}
for(const directory of ['src','factory','evaluation','reference'])await checkDirectory(directory);
const pkg=await json('package.json');
if(Object.keys(pkg.dependencies??{}).length)errors.push('Product runtime dependencies need an architecture decision and boundary-check update');
const pin=await json('reference/package.json'),lock=await json('reference/package-lock.json');
for(const [name,version]of Object.entries(pin.dependencies))if(!/^\d+\.\d+\.\d+$/.test(version)||lock.packages['node_modules/'+name]?.version!==version)errors.push(`Unpinned reference dependency ${name}`);
const observations=await json('reference/observations.json');
if(observations.failures!==0 || observations.mermaid!==pin.dependencies.mermaid || observations.observations.length!==fixtures.length)errors.push('Missing or stale reference observations');
for(const [path,key]of [['reference/config.json','configSha256'],['reference/package-lock.json','lockSha256'],['fixtures/flowchart/cases.json','fixturesSha256'],['reference/browser.mjs','adapterSha256'],['reference/cli.mjs','cliSha256']]) {
  const {createHash}=await import('node:crypto');
  if(createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')!==observations[key])errors.push(`Stale reference observation: ${path}`);
}
try {await verifyAcceptance();}catch(error){errors.push(error.message);}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Foundation valid: ${backlog.capabilities.length} capabilities; ${fixtures.length} reference cases; acceptance integrity verified.`);
