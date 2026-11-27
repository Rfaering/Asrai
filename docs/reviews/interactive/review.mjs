const byId = (id) => document.getElementById(id);
const phases = [...byId('phases').querySelectorAll('button')];
const operations = new Set(phases.map((button) => button.dataset.operation));
const initial = new URLSearchParams(location.hash.slice(1));
const renderChecks = new Set(['benchmark', 'determinism', 'security']);
const search = byId('search');

let cases = [];
let catalogKey;
let revision;
let selectedId = initial.get('case');
let operation = operations.has(initial.get('phase')) ? initial.get('phase') : 'validate';
let pendingRun;
let imageUrl;
let refreshing = false;

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
    const { result } = await fetchJson(`./api/run?${query}`, { signal: request.signal });
    if (request.signal.aborted) return;
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
  if (!matches.length) list.append(element('p', 'No cases match your search.', 'empty'));
  let active;
  for (const entry of matches) {
    const button = element('button', undefined, 'case-choice');
    button.type = 'button';
    button.dataset.caseId = entry.id;
    button.setAttribute('aria-pressed', String(entry.id === selectedId));
    const capabilities = [...new Set(entry.checks.map((check) => check.capability))].join(' · ');
    button.append(element('strong', entry.id), element('span', capabilities, 'mono'));
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
  const expectations = byId('expected');
  expectations.replaceChildren();
  for (const button of phases) button.setAttribute('aria-pressed', String(button.dataset.operation === operation));

  if (selected) {
    const checks = selected.checks.filter((check) => (renderChecks.has(check.operation) ? 'render' : check.operation) === operation);
    for (const check of checks) {
      expectations.append(element('h4', `${check.capability} · ${check.operation}`, 'mono'), json(check.expected));
    }
    if (!checks.length) expectations.append(element('p', 'This case has no expectation for this phase.', 'muted'));
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
    if (changed) {
      cases = current.cases;
      catalogKey = nextKey;
      if (!cases.some((entry) => entry.id === selectedId)) selectedId = cases[0]?.id;
      showList();
    }
    if (changed || revision !== current.revision || force) {
      revision = current.revision;
      showSelection(true);
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
