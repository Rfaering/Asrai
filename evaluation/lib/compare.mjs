import { isDeepStrictEqual } from 'node:util';
export function normalizeModel(model) {
  if (!model || model.type !== 'flowchart' || !['TB','BT','LR','RL'].includes(model.direction)) throw new Error('invalid model header');
  if (!Array.isArray(model.nodes) || !Array.isArray(model.edges)) throw new Error('model needs nodes and edges');
  const nodes = model.nodes.map(({ id, label, shape }) => {
    if (typeof id !== 'string' || typeof label !== 'string' || !['rect','rounded','diamond'].includes(shape)) throw new Error('invalid node');
    return { id, label, shape };
  }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const ids = new Set(nodes.map(n => n.id));
  if (ids.size !== nodes.length) throw new Error('duplicate node id');
  const edges = model.edges.map(({ source, target, label, directed }) => {
    if (!ids.has(source) || !ids.has(target) || typeof label !== 'string' || typeof directed !== 'boolean') throw new Error('invalid edge');
    return { source, target, label, directed };
  }).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
  return { type: 'flowchart', direction: model.direction, nodes, edges };
}
export function compareResponse(actual, check) {
  if (actual?.status === 'unimplemented') return ['unimplemented'];
  if (actual?.status !== 'ok') return ['invalid response status'];
  if (check.operation === 'validate') {
    const failures = [];
    if (actual.accepted !== check.expected.accepted) failures.push('syntax acceptance differs');
    if (!Array.isArray(actual.diagnostics)) failures.push('diagnostics must be an array');
    if (actual.accepted === true && actual.diagnostics?.length) failures.push('accepted validation must have no diagnostics');
    if (actual.accepted === true && actual.diagramType !== 'flowchart') failures.push('diagram type differs');
    if (actual.accepted === false && (!actual.diagnostics?.length || actual.diagnostics.some(d => typeof d.code !== 'string' || !d.code || d.severity !== 'error' || !Number.isInteger(d.line) || d.line < 1 || !Number.isInteger(d.column) || d.column < 1 || typeof d.message !== 'string' || !d.message))) failures.push('invalid structured diagnostic');
    return failures;
  }
  if (check.operation === 'parse') {
    try { return isDeepStrictEqual(normalizeModel(actual.model), normalizeModel(check.expected.model)) ? [] : ['semantic model differs']; }
    catch (error) { return [error.message]; }
  }
  return [];
}
