const header = /^(?:flowchart|graph)[ \t]+(TB|TD|BT|LR|RL)$/;
const nodeIdentifier = /^[A-Za-z_][A-Za-z0-9_]*/;
const nodeShapes = {
  '[': { closing: ']', shape: 'rect', alternateOpeners: ['[', '(', '/', '\\'] },
  '(': { closing: ')', shape: 'rounded', alternateOpeners: ['[', '('] },
  '{': { closing: '}', shape: 'diamond', alternateOpeners: ['{'] },
};
// A directly attached o or x extends the open operator to an unsupported link type.
const edgeOperator = /^(?:-->(?![-<>])|---(?![-<>ox]))/;
const quotedLabel = /^"([^"]*)"\s*$/;
const plainLabelDelimiters = /[\[\](){}"]/;

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

function parseLabel(text, closing, kind, line, column) {
  const labelEnd = findLabelEnd(text, closing);
  if (labelEnd === -1) {
    return reject(line, column, `Expected ${closing} to close the ${kind} label.`);
  }
  if (nodeShapes[text[0]]?.alternateOpeners.includes(text[1])) {
    return reject(line, column, 'Only rectangle, rounded and diamond shapes are supported.', 'ASRAI_UNSUPPORTED');
  }
  let label = text.slice(1, labelEnd);
  if (label.startsWith('"')) {
    const quoted = quotedLabel.exec(label);
    if (!quoted) {
      return reject(line, column, `Only one quoted label is supported per ${kind}.`, 'ASRAI_UNSUPPORTED');
    }
    label = quoted[1];
  } else if (plainLabelDelimiters.test(label)) {
    return reject(line, column, `Expected a plain or double-quoted ${kind} label.`);
  }
  if (!label) return reject(line, column, `Expected text inside the ${kind} label.`);
  return { label: label.trim(), rest: text.slice(labelEnd + 1).trimStart() };
}

function parseNode(text, line, column, operatorColumn) {
  const id = nodeIdentifier.exec(text)?.[0];
  if (!id || id === 'end') {
    if (operatorColumn !== undefined) {
      return id === 'end'
        ? reject(line, column, 'The identifier end is reserved.')
        : reject(line, operatorColumn, 'Expected an edge target after the edge operator.');
    }
    return reject(line, column, 'Expected an ASCII node identifier other than end.');
  }

  const suffix = text.slice(id.length).trimStart();
  const shape = nodeShapes[suffix[0]];
  if (!shape) {
    return { node: { id, label: id, shape: 'rect' }, rest: suffix, labeled: false, column };
  }

  const labelColumn = column + text.length - suffix.length;
  const parsed = parseLabel(suffix, shape.closing, 'node', line, labelColumn);
  if (!Object.hasOwn(parsed, 'label')) return parsed;
  if (labelColumn !== column + id.length) {
    return reject(line, labelColumn, 'The label opener must immediately follow the node identifier.');
  }
  return { node: { id, label: parsed.label, shape: shape.shape }, rest: parsed.rest, labeled: true, column };
}

function parseLink(text, line, column) {
  const operator = edgeOperator.exec(text)?.[0];
  if (!operator) {
    return reject(line, column, 'Expected a supported edge operator or the end of the statement.', 'ASRAI_UNSUPPORTED');
  }
  const directed = operator === '-->';
  let label = '';
  let rest = text.slice(operator.length).trimStart();
  if (rest.startsWith('|')) {
    const labelColumn = column + text.length - rest.length;
    if (!directed) {
      return reject(line, labelColumn, 'Pipe-delimited labels require a directed edge.', 'ASRAI_UNSUPPORTED');
    }
    const parsed = parseLabel(rest, '|', 'edge', line, labelColumn);
    if (!Object.hasOwn(parsed, 'label')) return parsed;
    ({ label, rest } = parsed);
  }

  const target = parseNode(rest, line, column + text.length - rest.length, column);
  if (!target.node) return target;
  return { target, label, directed };
}

function parseStatement(statement, line, column) {
  const source = parseNode(statement, line, column);
  if (!source.node) return source;
  if (!source.rest) return { endpoints: [source] };

  const link = parseLink(source.rest, line, column + statement.length - source.rest.length);
  if (!link.target) return link;
  const { target, label, directed } = link;
  if (target.rest) {
    // Keep precise syntax diagnostics for malformed chains outside this increment.
    let rest = target.rest;
    while (edgeOperator.test(rest)) {
      const next = parseLink(rest, line, column + statement.length - rest.length);
      if (!next.target) return next;
      rest = next.target.rest;
    }
    return reject(line, column + statement.length - target.rest.length,
      'Unexpected syntax after the first edge target.', 'ASRAI_UNSUPPORTED');
  }

  return {
    endpoints: [source, target],
    edge: { source: source.node.id, target: target.node.id, label, directed },
  };
}

export function parseFlowchart(source) {
  const lines = source.split(/\r?\n/);
  let direction;
  const nodes = new Map();
  const edges = [];

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

    const result = parseStatement(statement, lineNumber, column);
    if (!result.endpoints) return result;

    for (const endpoint of result.endpoints) {
      const { node, labeled } = endpoint;
      const declared = labeled || !result.edge;
      const existing = nodes.get(node.id);
      if (declared && existing?.declared) {
        return reject(lineNumber, endpoint.column, 'Node redeclarations are unsupported.', 'ASRAI_UNSUPPORTED');
      }
      if (declared || !existing) nodes.set(node.id, { node, declared });
    }
    if (result.edge) edges.push(result.edge);
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
      nodes: [...nodes.values()].map(({ node }) => node),
      edges,
    },
  };
}

export function validateFlowchart(source) {
  const result = parseFlowchart(source);
  if (!result.model) return result;

  return { status: 'ok', accepted: true, diagramType: 'flowchart', diagnostics: [] };
}
