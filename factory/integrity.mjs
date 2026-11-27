import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { json, root, writeJson } from '../evaluation/lib/io.mjs';
const manifestPath='specs/acceptance-manifest.json';
export async function acceptanceFiles() {
  const policy=await json('specs/policy.json');
  const files=[];
  async function walk(relative) {
    for(const entry of await readdir(resolve(root,relative),{withFileTypes:true})) {
      if(entry.name==='node_modules' || entry.name==='acceptance-manifest.json')continue;
      const path=relative+entry.name;
      if(entry.isSymbolicLink())throw new Error(`Protected symlink: ${path}`);
      if(entry.isDirectory())await walk(path+'/');else files.push(path);
    }
  }
  for(const path of policy.protectedPaths) path.endsWith('/')?await walk(path):files.push(path);
  const hashes={};
  for(const path of files.sort())hashes[path]=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
  return {schemaVersion:1,algorithm:'sha256',files:hashes};
}
export async function verifyAcceptance() {
  const expected=await json(manifestPath),actual=await acceptanceFiles();
  if(JSON.stringify(expected)!==JSON.stringify(actual))throw new Error('Acceptance files changed. Specification/evaluator changes require separate review; do not reseal to fix an implementation failure.');
  return actual;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv[2]==='seal') {await writeJson(manifestPath,await acceptanceFiles());console.log('Acceptance manifest sealed. This is a reviewable evaluator change.');}
  else if(process.argv[2]==='verify') {await verifyAcceptance();console.log('Acceptance integrity verified.');}
  else throw new Error('Usage: node factory/integrity.mjs seal|verify');
}
