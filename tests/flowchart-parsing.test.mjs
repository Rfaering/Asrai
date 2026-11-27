import assert from 'node:assert/strict';
import test from 'node:test';
import { execute } from '../src/index.mjs';

test('parses a bare node and normalizes TD to TB', async () => {
  const cases = [
    ['flowchart TB\n_Queue2', 'TB'],
    ['\r\n  graph\tTD \r\n\r\n\t_Queue2  \r\n', 'TB'],
    ['flowchart BT\n_Queue2', 'BT'],
    ['graph LR\n_Queue2', 'LR'],
    ['flowchart RL\n_Queue2', 'RL'],
  ];
  for (const [source, direction] of cases) {
    assert.deepEqual(await execute({ protocolVersion: 1, operation: 'parse', source }), {
      status: 'ok',
      model: {
        type: 'flowchart',
        direction,
        nodes: [{ id: '_Queue2', label: '_Queue2', shape: 'rect' }],
        edges: [],
      },
    }, source);
  }
});

test('parses standalone bare and labeled nodes in source order', async () => {
  const source = [
    'graph TD',
    '  foyer[  Main foyer  ]',
    '  cafeStop(" café ) 北 ")',
    '  gate{"välj } väg"}',
    '  _Exit',
  ].join('\r\n');

  assert.deepEqual(await execute({ protocolVersion: 1, operation: 'parse', source }), {
    status: 'ok',
    model: {
      type: 'flowchart',
      direction: 'TB',
      nodes: [
        { id: 'foyer', label: 'Main foyer', shape: 'rect' },
        { id: 'cafeStop', label: 'café ) 北', shape: 'rounded' },
        { id: 'gate', label: 'välj } väg', shape: 'diamond' },
        { id: '_Exit', label: '_Exit', shape: 'rect' },
      ],
      edges: [],
    },
  });
  assert.deepEqual(await execute({ protocolVersion: 1, operation: 'validate', source }), {
    status: 'ok', accepted: true, diagramType: 'flowchart', diagnostics: [],
  });
});

test('parse returns validation diagnostics for malformed or unsupported input', async () => {
  const cases = [
    ['graph TB\n  A[broken', 'ASRAI_SYNTAX', 2, 4],
    ['flowchart LR\nA -->', 'ASRAI_SYNTAX', 2, 3],
    ['flowchart TB\nA\n  A[Duplicate]', 'ASRAI_UNSUPPORTED', 3, 3],
    ['graph TD\n  A[(Archive)]', 'ASRAI_UNSUPPORTED', 2, 4],
    ['graph TD\n  A["Sø" tail]', 'ASRAI_UNSUPPORTED', 2, 4],
  ];
  for (const [source, code, line, column] of cases) {
    const parse = await execute({ protocolVersion: 1, operation: 'parse', source });
    const validation = await execute({ protocolVersion: 1, operation: 'validate', source });
    assert.deepEqual(parse, validation, source);
    assert.equal(parse.status, 'ok', source);
    assert.equal(parse.accepted, false, source);
    assert.equal(Object.hasOwn(parse, 'model'), false, source);
    const { message, ...diagnostic } = parse.diagnostics[0];
    assert.deepEqual(diagnostic, { code, severity: 'error', line, column }, source);
    assert.ok(message.length > 0, source);
  }
});
