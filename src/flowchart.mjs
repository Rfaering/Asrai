const header = /^(?:flowchart|graph)[ \t]+(?:TB|TD|BT|LR|RL)$/;
const nodeIdentifier = /^[A-Za-z_][A-Za-z0-9_]*/;

function reject(line, column, message, code = 'ASRAI_SYNTAX') {
  return {
    status: 'ok',
    accepted: false,
    diagnostics: [{ code, severity: 'error', line, column, message }],
  };
}

export function validateFlowchart(source) {
  const lines = source.split(/\r?\n/);
  let hasHeader = false;
  let hasNode = false;

  for (const [index, line] of lines.entries()) {
    const trimmedStart = line.trimStart();
    const statement = trimmedStart.trimEnd();
    if (statement === '') continue;

    const lineNumber = index + 1;
    const column = line.length - trimmedStart.length + 1;
    if (!hasHeader) {
      if (!header.test(statement)) {
        return reject(lineNumber, column, 'Expected flowchart or graph followed by TB, TD, BT, LR, or RL.');
      }
      hasHeader = true;
      continue;
    }

    if (hasNode) {
      return reject(lineNumber, column, 'Only one bare node is supported.', 'ASRAI_UNSUPPORTED');
    }

    const identifier = nodeIdentifier.exec(statement)?.[0];
    if (!identifier || identifier === 'end') {
      return reject(lineNumber, column, 'Expected a bare ASCII node identifier other than end.');
    }
    if (identifier !== statement) {
      const suffix = statement.slice(identifier.length).trimStart();
      return reject(lineNumber, column + statement.length - suffix.length, 'Only bare nodes are supported.', 'ASRAI_UNSUPPORTED');
    }
    hasNode = true;
  }

  if (!hasNode) {
    const message = hasHeader ? 'Expected a bare node.' : 'Expected a flowchart or graph header.';
    return reject(lines.length, lines.at(-1).length + 1, message);
  }
  return { status: 'ok', accepted: true, diagramType: 'flowchart', diagnostics: [] };
}
