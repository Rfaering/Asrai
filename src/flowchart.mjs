const header = /^(?:flowchart|graph)[ \t]+(TB|TD|BT|LR|RL)$/;
const nodeIdentifier = /^[A-Za-z_][A-Za-z0-9_]*/;
const nodeShapes = {
  '[': { closing: ']', shape: 'rect' },
  '(': { closing: ')', shape: 'rounded' },
  '{': { closing: '}', shape: 'diamond' },
};
const edgeOperator = /^(?:-->|---)(?![-<>])/;

function reject(line, column, message, code = 'ASRAI_SYNTAX') {
  return {
    status: 'ok',
    accepted: false,
    diagnostics: [{ code, severity: 'error', line, column, message }],
  };
}

function findLabelEnd(text, closing) {
  const label = text.slice(1).trimStart();
  if (label.startsWith('"')) {
    const closingQuote = text.indexOf('"', text.length - label.length + 1);
    return closingQuote === -1 ? -1 : text.indexOf(closing, closingQuote + 1);
  }
  return text.indexOf(closing, 1);
}

// Diagnose malformed edges even while complete edge statements are unsupported.
function diagnoseNodeSuffix(suffix, line, column) {
  let rest = suffix;
  while (rest) {
    const closing = nodeShapes[rest[0]]?.closing;
    if (closing) {
      const labelEnd = findLabelEnd(rest, closing);
      if (labelEnd === -1) {
        return reject(line, column + suffix.length - rest.length, `Expected ${closing} to close the node label.`);
      }
      rest = rest.slice(labelEnd + 1).trimStart();
    }

    const operator = edgeOperator.exec(rest)?.[0];
    if (!operator) return;

    const operatorColumn = column + suffix.length - rest.length;
    rest = rest.slice(operator.length).trimStart();
    if (rest.startsWith('|')) {
      if (operator !== '-->') return;
      const labelEnd = findLabelEnd(rest, '|');
      if (labelEnd === -1) {
        return reject(line, column + suffix.length - rest.length, 'Expected | to close the edge label.');
      }
      rest = rest.slice(labelEnd + 1).trimStart();
    }

    const target = nodeIdentifier.exec(rest)?.[0];
    if (!target) return reject(line, operatorColumn, 'Expected an edge target after the edge operator.');
    if (target === 'end') {
      return reject(line, column + suffix.length - rest.length, 'The identifier end is reserved.');
    }
    rest = rest.slice(target.length).trimStart();
  }
}

function parseNodeStatement(statement, line, column) {
  const id = nodeIdentifier.exec(statement)?.[0];
  if (!id || id === 'end') {
    return reject(line, column, 'Expected an ASCII node identifier other than end.');
  }

  const suffix = statement.slice(id.length).trimStart();
  if (!suffix) return { node: { id, label: id, shape: 'rect' } };

  const suffixColumn = column + statement.length - suffix.length;
  const nodeShape = nodeShapes[suffix[0]];
  const labelEnd = nodeShape ? findLabelEnd(suffix, nodeShape.closing) : -1;
  if (nodeShape && labelEnd === -1) {
    return reject(line, suffixColumn, `Expected ${nodeShape.closing} to close the node label.`);
  }

  const rest = suffix.slice(labelEnd + 1).trimStart();
  if (rest) {
    const restColumn = suffixColumn + suffix.length - rest.length;
    return diagnoseNodeSuffix(rest, line, restColumn)
      ?? reject(line, suffixColumn, 'Only standalone bare or labeled nodes are supported.', 'ASRAI_UNSUPPORTED');
  }
  if (suffixColumn !== column + id.length) {
    return reject(line, suffixColumn, 'The label opener must immediately follow the node identifier.');
  }

  let label = suffix.slice(1, labelEnd);
  if (nodeShape.shape === 'rect' && /^[(/\\]/.test(label)) {
    return reject(line, suffixColumn, 'Only rectangle, rounded and diamond shapes are supported.', 'ASRAI_UNSUPPORTED');
  }
  if (label.startsWith('"')) {
    const quoted = /^"([^"]*)"\s*$/.exec(label);
    if (!quoted) {
      return reject(line, suffixColumn, 'Only one quoted label is supported per node.', 'ASRAI_UNSUPPORTED');
    }
    label = quoted[1];
  } else if (/[\[\](){}"]/.test(label)) {
    return reject(line, suffixColumn, 'Expected a plain or double-quoted node label.');
  }
  if (!label) return reject(line, suffixColumn, 'Expected text inside the node label.');

  return { node: { id, label: label.trim(), shape: nodeShape.shape } };
}

export function parseFlowchart(source) {
  const lines = source.split(/\r?\n/);
  let direction;
  const nodes = new Map();

  for (const [index, line] of lines.entries()) {
    const trimmedStart = line.trimStart();
    const statement = trimmedStart.trimEnd();
    if (statement === '') continue;

    const lineNumber = index + 1;
    const column = line.length - trimmedStart.length + 1;
    if (!direction) {
      const match = header.exec(statement);
      if (!match) {
        return reject(lineNumber, column, 'Expected flowchart or graph followed by TB, TD, BT, LR, or RL.');
      }
      direction = match[1] === 'TD' ? 'TB' : match[1];
      continue;
    }

    const result = parseNodeStatement(statement, lineNumber, column);
    if (!result.node) return result;

    const { node } = result;
    if (nodes.has(node.id)) {
      return reject(lineNumber, column, 'Node redeclarations are unsupported.', 'ASRAI_UNSUPPORTED');
    }
    nodes.set(node.id, node);
  }

  if (!nodes.size) {
    const message = direction ? 'Expected a node.' : 'Expected a flowchart or graph header.';
    return reject(lines.length, lines.at(-1).length + 1, message);
  }
  return {
    status: 'ok',
    model: {
      type: 'flowchart',
      direction,
      nodes: [...nodes.values()],
      edges: [],
    },
  };
}

export function validateFlowchart(source) {
  const result = parseFlowchart(source);
  if (!result.model) return result;

  return { status: 'ok', accepted: true, diagramType: 'flowchart', diagnostics: [] };
}
