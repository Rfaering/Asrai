import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
export function candidateRequest(adapter, request, { timeoutMs = 3000, maxBytes = 2_000_000 } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--permission', `--allow-fs-read=${dirname(resolve(adapter))}`, resolve(adapter)], {
      cwd: dirname(resolve(adapter)), windowsHide: true,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, TZ: 'UTC', LANG: 'C', ASRAI_SEED: '1729' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '', errors = '', bytes = 0, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) { child.kill('SIGKILL'); reject(error); } else resolveResult(value);
    };
    const timer = setTimeout(() => finish(new Error('candidate timeout')), timeoutMs);
    for (const [stream, isError] of [[child.stdout, false], [child.stderr, true]]) stream.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) return finish(new Error('candidate output limit exceeded'));
      if (isError) errors += chunk; else output += chunk;
    });
    child.on('error', error => finish(error));
    child.stdin.on('error', error => finish(error));
    child.on('close', code => {
      if (code !== 0) return finish(new Error(`candidate exited ${code}: ${errors.slice(0, 500)}`));
      try { finish(null, JSON.parse(output)); } catch { finish(new Error('candidate returned invalid JSON')); }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
