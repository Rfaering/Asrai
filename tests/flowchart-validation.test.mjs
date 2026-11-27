import assert from 'node:assert/strict';
import test from 'node:test';
import { execute } from '../src/index.mjs';

const validate = source => execute({ protocolVersion: 1, operation: 'validate', source });

test('accepts both header keywords with every supported direction', async () => {
  for (const keyword of ['flowchart', 'graph']) {
    for (const direction of ['TB', 'TD', 'BT', 'LR', 'RL']) {
      const source = `\r\n  ${keyword}\t${direction} \r\n\r\n\t_Queue2  \r\n`;
      assert.deepEqual(await validate(source), {
        status: 'ok',
        accepted: true,
        diagramType: 'flowchart',
        diagnostics: [],
      }, source);
    }
  }
});

test('rejects missing or invalid headers and bare node identifiers', async () => {
  const cases = [
    ['', 1, 1],
    ['\n  flowchart ZZ\nA', 2, 3],
    ['flowchartLR\nA', 1, 1],
    ['graph LRextra\nA', 1, 1],
    ['flowchart BT\n', 2, 1],
    ['graph TD\r\n  9Node', 2, 3],
    ['graph TB\nÅ', 2, 1],
    ['graph RL\nend', 2, 1],
  ];
  for (const [source, line, column] of cases) {
    const response = await validate(source);
    assert.equal(response.status, 'ok', source);
    assert.equal(response.accepted, false, source);
    assert.equal(response.diagnostics.length, 1, source);
    const { message, ...diagnostic } = response.diagnostics[0];
    assert.deepEqual(diagnostic, { code: 'ASRAI_SYNTAX', severity: 'error', line, column }, source);
    assert.ok(message.length > 0, source);
  }
});

test('rejects unsupported shapes, edges and redeclarations', async () => {
  const cases = [
    ['graph TD\nA[(Archive)]', 2, 2],
    ['graph TD\nA[/Slant/]', 2, 2],
    ['graph TD\nA((Circle))', 2, 2],
    ['graph TD\nA@{ shape: circle }', 2, 2],
    ['graph LR\nA --> B', 2, 3],
    ['graph LR\nA -->|yes| B', 2, 3],
    ['graph LR\nA --- B', 2, 3],
    ['graph LR\nA ----> B', 2, 3],
    ['graph TB\nA\n  A', 3, 3],
  ];
  for (const [source, line, column] of cases) {
    const response = await validate(source);
    assert.equal(response.status, 'ok', source);
    assert.equal(response.accepted, false, source);
    const [diagnostic] = response.diagnostics;
    assert.equal(diagnostic.code, 'ASRAI_UNSUPPORTED', source);
    assert.equal(diagnostic.line, line, source);
    assert.equal(diagnostic.column, column, source);
  }
});

test('reports malformed shapes and incomplete edges as syntax errors', async () => {
  const cases = [
    ['flowchart TB\nA[broken', 2, 2, 'close the node label'],
    ['graph LR\r\n\r\n  A (broken]', 3, 5, 'close the node label'],
    ['graph TB\nA{"A } in a label"', 2, 2, 'close the node label'],
    ['graph TB\nA["missing end quote]', 2, 2, 'close the node label'],
    ['graph TB\nA[]', 2, 2, 'Expected text'],
    ['graph TB\nA[""]', 2, 2, 'Expected text'],
    ['graph TB\nA [Label]', 2, 3, 'immediately follow'],
    ['flowchart TB\nA -->', 2, 3, 'edge target'],
    ['graph LR\n  A[Start] ---  ', 2, 12, 'edge target'],
    ['graph LR\nA -->|yes|', 2, 3, 'edge target'],
    ['graph LR\nA -->|yes', 2, 6, 'close the edge label'],
    ['graph LR\nA --> B -->', 2, 9, 'edge target'],
    ['graph LR\nA --> end', 2, 7, 'reserved'],
    ['graph TB\nA\n  B{broken', 3, 4, 'close the node label'],
  ];
  for (const [source, line, column, expectedMessage] of cases) {
    const response = await validate(source);
    assert.equal(response.status, 'ok', source);
    assert.equal(response.accepted, false, source);
    assert.equal(response.diagnostics.length, 1, source);
    const { message, ...diagnostic } = response.diagnostics[0];
    assert.deepEqual(diagnostic, { code: 'ASRAI_SYNTAX', severity: 'error', line, column }, source);
    assert.ok(message.includes(expectedMessage), source);
  }
});

test('dispatches validation and parsing only for protocol version 1', async () => {
  const source = 'flowchart TB\nA';
  for (const operation of ['layout', 'render']) {
    assert.deepEqual(await execute({ protocolVersion: 1, operation, source }), {
      status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED',
    });
  }
  for (const operation of ['validate', 'parse']) {
    assert.deepEqual(await execute({ protocolVersion: 2, operation, source }), {
      status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED',
    });
  }
  await assert.rejects(validate(null), TypeError);
  await assert.rejects(execute({ protocolVersion: 1, operation: 'parse', source: null }), TypeError);
});
