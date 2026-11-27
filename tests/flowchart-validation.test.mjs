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

test('rejects additional node syntax instead of accepting a valid prefix', async () => {
  const cases = [
    ['graph TD\n  A[Label]', 2, 4],
    ['graph LR\nA --> B', 2, 3],
    ['graph TB\nA\n  B', 3, 3],
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

test('dispatches only validation requests for protocol version 1', async () => {
  const source = 'flowchart TB\nA';
  for (const operation of ['parse', 'layout', 'render']) {
    assert.deepEqual(await execute({ protocolVersion: 1, operation, source }), {
      status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED',
    });
  }
  assert.deepEqual(await execute({ protocolVersion: 2, operation: 'validate', source }), {
    status: 'unimplemented', code: 'ASRAI_NOT_IMPLEMENTED',
  });
  await assert.rejects(validate(null), TypeError);
});
