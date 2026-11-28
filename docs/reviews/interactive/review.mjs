import { expectationsFor } from './phases.mjs';

const byId = (id) => document.getElementById(id);
const phases = [...byId('phases').querySelectorAll('button')];
const operations = new Set(phases.map((button) => button.dataset.operation));
const initial = new URLSearchParams(location.hash.slice(1));
const search = byId('search');
const verdicts = new Map();
const caseButtons = new Map();
const verdictLabels = {
  pass: 'Matches expectation', fail: 'Does not match expectation', none: 'No expectation',
  checking: 'Checking expectations', unavailable: 'Could not check expectation',
};

let cases = [];
let catalogKey;
let revision;
let selectedId = initial.get('case');
let operation = operations.has(initial.get('phase')) ? initial.get('phase') : 'validate';
let pendingRun;
let imageUrl;
let refreshing = false;
let pendingCatalogChecks;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function json(value) {
  return element('pre', JSON.stringify(value, null, 2), 'code');
}

function disclosure(title, content) {
  const details = element('details');
  details.append(element('summary', title), content);
  return details;
}

function svgElement(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function drawVerdict(target, verdict) {
  if (target.dataset.verdict === verdict) return;
  target.dataset.verdict = verdict;
  target.title = verdictLabels[verdict];
  const strokes = { pass: 'M4 8l3 3 5-6', fail: 'M5 5l6 6m0-6-6 6', none: 'M5 8h6', checking: 'M8 4v4l3 1', unavailable: 'M8 4v5m0 3h.01' };
  const icon = svgElement('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' });
  icon.append(svgElement('circle', { cx: 8, cy: 8, r: 7 }), svgElement('path', { d: strokes[verdict] }));
  target.replaceChildren(icon);
}

function verdictFor(entry, phase) {
  const expected = expectationsFor(entry, phase);
  if (!expected.length) return 'none';
  const result = verdicts.get(entry.id);
  const checked = phase ? result?.[phase] ?? [] : Object.values(result ?? {}).flat();
  if (checked.some(({ outcome }) => outcome === 'fail')) return 'fail';
  if (checked.some(({ outcome }) => outcome === 'unavailable')) return 'unavailable';
  return checked.length === expected.length ? 'pass' : 'checking';
}

function showVerdict(control, entry, phase) {
  const verdict = verdictFor(entry, phase);
  drawVerdict(control.querySelector('.verdict-icon'), verdict);
  control.setAttribute('aria-description', verdictLabels[verdict]);
}

function showExpectations(selected) {
  const panel = byId('expected');
  panel.replaceChildren();
  if (!selected) return;
  const results = verdicts.get(selected.id)?.[operation] ?? [];
  const checks = expectationsFor(selected, operation);
  if (!checks.length) {
    const note = element('p', undefined, 'expectation-note');
    const icon = element('span', undefined, 'verdict-icon');
    drawVerdict(icon, 'none');
    note.append(icon, document.createTextNode('No expectation for this phase.'));
    panel.append(note);
  }
  for (const [index, check] of checks.entries()) {
    const result = results[index];
    const outcome = result?.outcome ?? 'checking';
    const group = element('div', undefined, 'expectation-group');
    const verdict = element('p', undefined, 'expectation-note');
    const icon = element('span', undefined, 'verdict-icon');
    drawVerdict(icon, outcome);
    verdict.append(icon, document.createTextNode(verdictLabels[outcome]));
    group.append(element('h4', `${check.capability} · ${check.operation}`, 'mono'), verdict);
    if (result?.failures.length) {
      const failures = element('ul', undefined, 'expectation-failures');
      for (const failure of result.failures) failures.append(element('li', failure));
      group.append(failures);
    }
    group.append(json(check.expected));
    panel.append(group);
  }
}

function storeVerdicts(entry, results, fromDisplayedRun = false) {
  const previous = verdicts.get(entry.id);
  verdicts.set(entry.id, fromDisplayedRun ? { ...previous, ...results } : { ...results, ...previous });
  const button = caseButtons.get(entry.id);
  if (button) showVerdict(button, entry);
  if (entry.id === selectedId) {
    for (const button of phases) showVerdict(button, entry, button.dataset.operation);
    if (Object.hasOwn(results, operation)) showExpectations(entry);
  }
}

function checkCatalog() {
  pendingCatalogChecks?.abort();
  const controller = new AbortController();
  pendingCatalogChecks = controller;
  const queue = cases.filter((entry) => expectationsFor(entry).length);
  queue.sort((left, right) => Number(right.id === selectedId) - Number(left.id === selectedId));
  const signal = controller.signal;
  async function work() {
    while (queue.length && !signal.aborted) {
      const entry = queue.shift();
      try {
        const query = new URLSearchParams({ case: entry.id });
        const { results } = await fetchJson(`./api/check?${query}`, { signal });
        if (!signal.aborted) storeVerdicts(entry, results);
      } catch (error) {
        if (signal.aborted) return;
        const results = {};
        for (const button of phases) {
          const phase = button.dataset.operation;
          results[phase] = expectationsFor(entry, phase).map(() => ({ outcome: 'unavailable', failures: [error.message] }));
        }
        storeVerdicts(entry, results);
      }
    }
  }
  const workers = Math.min(3, queue.length);
  for (let i = 0; i < workers; i++) void work();
}

function sceneDrawing(scene) {
  const { width, height, nodes, edges } = scene;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0
      || !Array.isArray(nodes) || !Array.isArray(edges)) return null;
  const drawing = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Node bounds and edge paths' });
  for (const edge of edges) {
    if (!Array.isArray(edge.points) || !edge.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))) continue;
    drawing.append(svgElement('polyline', {
      points: edge.points.map(({ x, y }) => `${x},${y}`).join(' '),
      fill: 'none', stroke: '#4266a5', 'stroke-width': 2,
    }));
  }
  for (const node of nodes) {
    const { x, y, width, height } = node;
    if (![x, y, width, height].every(Number.isFinite)) continue;
    drawing.append(svgElement('rect', { x, y, width, height, fill: '#e8efff', stroke: '#4266a5' }));
    const label = svgElement('text', {
      x: x + width / 2, y: y + height / 2, 'text-anchor': 'middle',
      'dominant-baseline': 'middle', 'font-size': 14, fill: '#172642',
    });
    label.textContent = node.id;
    drawing.append(label);
  }
  return drawing;
}

function modelTable(model) {
  const table = element('table');
  const head = table.createTHead().insertRow();
  for (const text of ['ID', 'Label', 'Shape']) {
    const cell = element('th', text);
    cell.scope = 'col';
    head.append(cell);
  }
  const body = table.createTBody();
  for (const node of model.nodes) {
    const row = body.insertRow();
    for (const value of [node.id, node.label, node.shape]) row.insertCell().textContent = value;
  }
  return table;
}

function showResult(result) {
  const output = byId('response');
  if (result.status === 'unimplemented') {
    output.append(element('p', result.code, 'mono'));
  } else if (result.diagnostics?.length) {
    const list = element('ul', undefined, 'diagnostics');
    for (const diagnostic of result.diagnostics) {
      const entry = element('li');
      entry.append(element('p', diagnostic.message),
        element('p', `Line ${diagnostic.line}, column ${diagnostic.column} · ${diagnostic.code}`, 'muted mono'));
      list.append(entry);
    }
    output.append(list);
  } else if (typeof result.svg === 'string') {
    imageUrl = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }));
    const preview = element('img', undefined, 'drawing');
    preview.alt = 'SVG rendered by Asrai';
    preview.src = imageUrl;
    output.append(preview, disclosure('SVG markup', element('pre', result.svg, 'code')));
  } else if (result.scene) {
    const drawing = sceneDrawing(result.scene);
    if (drawing) {
      drawing.classList.add('drawing');
      output.append(drawing);
    }
  } else if (result.model && Array.isArray(result.model.nodes)) {
    output.append(element('p', `Direction ${result.model.direction} · ${result.model.edges?.length ?? 0} edges`, 'muted mono'),
      modelTable(result.model));
  }
  const raw = disclosure('Response JSON', json(result));
  if (result.scene && !result.svg) raw.open = true;
  output.append(raw);
}

async function fetchJson(path, options) {
  const response = await fetch(path, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return payload;
}

async function runCase(selected) {
  pendingRun?.abort();
  const status = byId('run-status');
  byId('response').replaceChildren();
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = undefined;
  if (!selected) {
    status.textContent = 'Select a case to run a phase.';
    return;
  }
  const request = new AbortController();
  pendingRun = request;
  status.textContent = 'Running…';
  status.className = 'muted';
  try {
    const query = new URLSearchParams({ case: selected.id, operation });
    const { result, error, checks } = await fetchJson(`./api/run?${query}`, { signal: request.signal });
    if (request.signal.aborted) return;
    storeVerdicts(selected, { [operation]: checks }, true);
    if (error) throw new Error(error);
    const rejected = result.accepted === false || result.status === 'rejected';
    const label = result.status === 'unimplemented' ? 'Unimplemented'
      : rejected ? 'Rejected' : result.accepted === true ? 'Accepted' : result.status === 'ok' ? 'Completed' : result.status;
    status.textContent = label;
    status.className = `status ${rejected ? 'bad' : result.status === 'ok' ? 'good' : 'neutral'}`;
    showResult(result);
  } catch (error) {
    if (request.signal.aborted) return;
    status.className = 'status bad';
    status.textContent = 'Execution error';
    byId('response').append(element('p', error.message));
  }
}

function showList() {
  const list = byId('case-list');
  const query = search.value.trim().toLowerCase();
  const matches = cases.filter(({ id, checks }) => [id, ...checks.map((check) => check.capability)]
    .some((part) => part.toLowerCase().includes(query)));
  const focusedId = document.activeElement?.dataset.caseId;
  byId('case-count').textContent = query ? `${matches.length} / ${cases.length}` : String(cases.length);
  list.replaceChildren();
  caseButtons.clear();
  if (!matches.length) list.append(element('p', 'No cases match your search.', 'empty'));
  let active;
  for (const entry of matches) {
    const button = element('button', undefined, 'case-choice');
    button.type = 'button';
    button.dataset.caseId = entry.id;
    button.setAttribute('aria-pressed', String(entry.id === selectedId));
    const capabilities = [...new Set(entry.checks.map((check) => check.capability))].join(' · ');
    const label = element('span', undefined, 'case-label');
    const icon = element('span', undefined, 'verdict-icon');
    label.append(element('strong', entry.id), element('span', capabilities, 'mono'));
    button.append(icon, label);
    caseButtons.set(entry.id, button);
    showVerdict(button, entry);
    button.addEventListener('click', () => {
      selectedId = entry.id;
      for (const item of list.querySelectorAll('button')) item.setAttribute('aria-pressed', String(item === button));
      showSelection(true);
      if (matchMedia('(max-width: 46rem)').matches) {
        byId('case-heading').scrollIntoView({ block: 'start' });
      }
    });
    list.append(button);
    if (entry.id === selectedId) active = button;
    if (entry.id === focusedId) button.focus({ preventScroll: true });
  }
  if (active) {
    const buttonRect = active.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    if (buttonRect.top < listRect.top) list.scrollTop += buttonRect.top - listRect.top;
    if (buttonRect.bottom > listRect.bottom) list.scrollTop += buttonRect.bottom - listRect.bottom;
  }
}

function showSelection(updateUrl = false) {
  const selected = cases.find((entry) => entry.id === selectedId);
  byId('case-heading').textContent = selected?.id ?? 'Select a test case';
  byId('source').textContent = selected ? selected.source || '(empty source)' : '';
  byId('case-meta').textContent = selected ? [...new Set(selected.checks.map((check) => check.capability))].join(' · ') : '';
  for (const button of phases) {
    button.setAttribute('aria-pressed', String(button.dataset.operation === operation));
    showVerdict(button, selected, button.dataset.operation);
  }
  showExpectations(selected);

  if (selected) {
    if (updateUrl) {
      const hash = new URLSearchParams({ case: selected.id, phase: operation });
      history.replaceState(null, '', `#${hash}`);
    }
  }
  void runCase(selected);
}

async function refresh(force = false) {
  if (refreshing) return;
  refreshing = true;
  const error = byId('load-error');
  const button = byId('refresh');
  button.disabled = true;
  try {
    const current = await fetchJson('./api/catalog');
    const nextKey = JSON.stringify(current.cases);
    const changed = nextKey !== catalogKey;
    const rerun = changed || revision !== current.revision || force;
    if (rerun) verdicts.clear();
    if (changed) {
      cases = current.cases;
      catalogKey = nextKey;
      if (!cases.some((entry) => entry.id === selectedId)) selectedId = cases[0]?.id;
    }
    if (rerun) {
      showList();
      revision = current.revision;
      showSelection(true);
      checkCatalog();
    }
    error.hidden = true;
  } catch (failure) {
    const message = `Could not refresh tests. ${failure.message}`;
    if (error.textContent !== message) error.textContent = message;
    error.hidden = false;
  } finally {
    refreshing = false;
    button.disabled = false;
  }
}

for (const button of phases) {
  button.addEventListener('click', () => {
    operation = button.dataset.operation;
    showSelection(true);
  });
}
search.addEventListener('input', showList);
byId('refresh').addEventListener('click', () => void refresh(true));
await refresh();
setInterval(() => { if (!document.hidden) void refresh(); }, 2000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
