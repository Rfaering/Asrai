import { readFile, appendFile, writeFile } from 'node:fs/promises';
import { options } from '../evaluation/lib/io.mjs';
const opts=options(process.argv.slice(2));
if(!opts.report)throw new Error('Required: --report <report.json>');
const report=JSON.parse(await readFile(opts.report,'utf8'));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('|','\\|').replaceAll('\n',' ');
let summary;
if(Array.isArray(report.observations)) {
  summary=`## Mermaid reference verification\n\nReference: **Mermaid ${escape(report.mermaid)}** · ${report.observations.length} authored cases · ${report.failures} failures.\n\nThese are oracle checks, **not Asrai compatibility results**.\n\n| Case | Result |\n| --- | --- |\n${report.observations.map(r=>`| ${escape(r.id)} | ${r.failures.length?'FAIL: '+escape(r.failures.join('; ')):'PASS'} |`).join('\n')}\n`;
} else if(report.summary&&Array.isArray(report.results)) {
  summary=`## Independent product evaluation\n\n**${report.summary.passed}/${report.summary.total} checks pass; ${report.summary.failed} fail.**\n\nCandidate source: \`${escape(report.candidateTreeSha256)}\`  \nAcceptance baseline: \`${escape(report.acceptanceSha256)}\`\n\n| Capability | Case | Check | Result |\n| --- | --- | --- | --- |\n${report.results.map(r=>`| ${escape(r.capability)} | ${escape(r.caseId)} | ${escape(r.operation)} | ${r.outcome==='pass'?'PASS':'FAIL: '+escape(r.failures.join('; '))} |`).join('\n')}\n`;
} else throw new Error('Unknown evaluation report format');
if(opts.output)await writeFile(opts.output,summary);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
console.log(summary);
