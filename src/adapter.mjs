// One JSON request on stdin, one JSON response on stdout. Diagnostics go to stderr.
import { execute } from './index.mjs';
process.stdin.setEncoding('utf8');
let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
  const response = await execute(JSON.parse(input));
  process.stdout.write(JSON.stringify(response) + '\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
