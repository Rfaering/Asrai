import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
export async function writeJson(path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value, null, 2) + '\n');
}
export function options(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Expected --name value: ${args[i]}`);
    const key = args[i++].slice(2);
    if (Object.hasOwn(result, key)) throw new Error(`Duplicate option: ${key}`);
    result[key] = args[i];
  }
  return result;
}
