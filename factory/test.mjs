import { globSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { root } from '../evaluation/lib/io.mjs';
const files=[...globSync(['evaluation/tests/**/*.test.mjs','tests/**/*.test.mjs'],{cwd:root})].sort();
if(!files.length)throw new Error('No factory/developer tests found');
const child=spawn(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
