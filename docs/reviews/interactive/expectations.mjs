import { isDeepStrictEqual } from 'node:util';
import { compareResponse } from '../../../evaluation/lib/compare.mjs';
import { geometryFailures } from '../../../evaluation/lib/geometry.mjs';
import { phaseFor } from './phases.mjs';

function sameEdges(left, right, property) {
  const tuples = (edges) => edges.map((edge) => JSON.stringify([edge.source, edge.target, edge[property]])).sort();
  return isDeepStrictEqual(tuples(left), tuples(right));
}

async function svgFailures(actual, model, inspect) {
  if (typeof actual.svg !== 'string') return ['missing SVG'];
  const drawn = await inspect(actual.svg);
  const failures = [...drawn.failures];
  if (!failures.length) {
    failures.push(...geometryFailures(drawn.scene, model));
    if (!sameEdges(drawn.scene.edges, model.edges, 'directed')) failures.push('SVG arrow directions differ');
    if (!sameEdges(drawn.edgeLabels, model.edges.filter(({ label }) => label), 'label')) failures.push('SVG edge labels differ');
    const dimensions = ['x', 'y', 'width', 'height'];
    for (const node of model.nodes) {
      const rendered = drawn.scene.nodes.find(({ id }) => id === node.id);
      const declared = actual.scene?.nodes?.find(({ id }) => id === node.id);
      if (rendered?.label !== node.label) failures.push(`missing SVG label ${node.id}`);
      if (rendered && declared && dimensions.some((key) => Math.abs(rendered[key] - declared[key]) > 1)) {
        failures.push('SVG node geometry differs from scene');
      }
    }
    if (actual.scene && ['width', 'height'].some((key) => Math.abs(actual.scene[key] - drawn.scene[key]) > 1)) {
      failures.push('SVG canvas differs from scene');
    }
  }
  if (!/\brole=["']img["']/.test(actual.svg) || !/<title(?:\s|>)/.test(actual.svg)) {
    failures.push('SVG needs an accessible title and image role');
  }
  return failures;
}

export async function checkExpectation(observation, check, { repeat, inspect, benchmarkSamples }) {
  const { operation, capability, expected } = check;
  const result = { operation, capability };
  try {
    const { actual, error } = observation;
    const failures = error ? [error] : compareResponse(actual, check);
    const phase = phaseFor(operation);
    if (actual?.status === 'ok' && (phase === 'layout' || phase === 'render')) {
      failures.push(...geometryFailures(actual.scene, expected.model));
      if (capability === 'FC008' && actual.scene?.nodes?.length === 2) {
        const a = actual.scene.nodes.find(({ id }) => id === 'A');
        const b = actual.scene.nodes.find(({ id }) => id === 'B');
        const dir = expected.model.direction;
        const ordered = a && b && { LR: a.x < b.x, RL: a.x > b.x, TB: a.y < b.y, BT: a.y > b.y }[dir];
        if (a && b && !ordered) failures.push('layout direction differs');
      }
      if (phase === 'render') failures.push(...await svgFailures(actual, expected.model, inspect));
      if (operation === 'determinism') {
        const again = await repeat();
        if (again.error) failures.push(again.error);
        else if (!isDeepStrictEqual(actual, again.actual)) failures.push('fresh-process output differs');
      }
      if (operation === 'benchmark') {
        for (let i = 1; i < benchmarkSamples; i++) {
          const sample = await repeat();
          if (sample.error || sample.actual?.status !== 'ok') failures.push(sample.error ?? 'benchmark request failed');
        }
      }
    }
    return { ...result, outcome: failures.length ? 'fail' : 'pass', failures: [...new Set(failures)] };
  } catch (error) {
    return { ...result, outcome: 'unavailable', failures: [error.message] };
  }
}
