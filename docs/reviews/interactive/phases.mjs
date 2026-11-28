export function phaseFor(operation) {
  return ['determinism', 'benchmark', 'security'].includes(operation) ? 'render' : operation;
}

export function expectationsFor(entry, phase) {
  return (entry?.checks ?? []).filter(({ expected, operation }) =>
    expected != null && (phase === undefined || phaseFor(operation) === phase));
}
