const header = /^(?:flowchart|graph)[ \t]+(TB|TD|BT|LR|RL)$/;
const nodeIdentifier = /^[A-Za-z_][A-Za-z0-9_]*/;
const shapeClosers = { '[': ']', '(': ')', '{': '}' };
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

// Classify malformed shape and edge suffixes during bare-node validation.
function diagnoseNodeSuffix(suffix, line, column) {
  let rest = suffix;
  while (rest) {
    const closing = shapeClosers[rest[0]];
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

export function parseFlowchart(source) {
  const lines = source.split(/\r?\n/);
  let direction;
  let nodeId;

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

    const identifier = nodeIdentifier.exec(statement)?.[0];
    if (!identifier || identifier === 'end') {
      return reject(lineNumber, column, 'Expected a bare ASCII node identifier other than end.');
    }
    const suffix = statement.slice(identifier.length).trimStart();
    const suffixColumn = column + statement.length - suffix.length;
    if (suffix) {
      const malformed = diagnoseNodeSuffix(suffix, lineNumber, suffixColumn);
      if (malformed) return malformed;
    }
    if (nodeId) {
      return reject(lineNumber, column, 'Only one bare node is supported.', 'ASRAI_UNSUPPORTED');
    }
    if (suffix) {
      return reject(lineNumber, suffixColumn, 'Only bare nodes are supported.', 'ASRAI_UNSUPPORTED');
    }
    nodeId = identifier;
  }

  if (!nodeId) {
    const message = direction ? 'Expected a bare node.' : 'Expected a flowchart or graph header.';
    return reject(lines.length, lines.at(-1).length + 1, message);
  }
  return {
    status: 'ok',
    model: {
      type: 'flowchart',
      direction,
      nodes: [{ id: nodeId, label: nodeId, shape: 'rect' }],
      edges: [],
    },
  };
}

export function validateFlowchart(source) {
  const result = parseFlowchart(source);
  if (!result.model) return result;

  return { status: 'ok', accepted: true, diagramType: 'flowchart', diagnostics: [] };
}
