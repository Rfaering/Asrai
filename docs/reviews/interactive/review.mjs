const byId = (id) => document.getElementById(id);
const source = byId('source');
const filter = byId('filter');
const phaseButtons = [...byId('phases').querySelectorAll('button')];
let operation = 'parse';
let selectedCase;
let snapshot;
let engines;
let runCount = 0;

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

function renderOutput(container, result) {
  container.replaceChildren();
  const diagnostic = result.diagnostics?.[0];
  if (result.error) {
    container.append(element('span', 'Execution error', 'status bad'), element('p', result.error));
  } else if (result.status === 'unimplemented') {
    container.append(element('span', 'Unimplemented', 'status neutral'), element('p', result.code, 'mono'));
  } else if (diagnostic) {
    const location = `Line ${diagnostic.line}, column ${diagnostic.column}`;
    container.append(element('span', 'Rejected', 'status bad'), element('p', diagnostic.message),
      element('p', `${location} · ${diagnostic.code}`, 'muted mono'));
  } else if (result.model) {
    container.append(element('span', 'Parsed', 'status good'),
      element('p', `Direction ${result.model.direction}`, 'muted mono'));
    const table = element('table');
    const head = table.createTHead().insertRow();
    for (const text of ['ID', 'Label', 'Shape']) {
      const cell = element('th', text);
      cell.scope = 'col';
      head.append(cell);
    }
    const body = table.createTBody();
    for (const node of result.model.nodes) {
      const row = body.insertRow();
      for (const value of [node.id, node.label, node.shape]) row.insertCell().textContent = value;
    }
    container.append(table);
  } else {
    container.append(element('span', result.accepted ? 'Accepted' : result.status, 'status good'));
  }
  container.append(disclosure('Response JSON', json(result)));
}

async function run() {
  const count = ++runCount;
  const request = { protocolVersion: 1, operation, source: source.value };
  byId('run').disabled = true;
  byId('run-status').textContent = 'Running both revisions…';
  const results = await Promise.all(engines.map(async (engine) => {
    try {
      return await engine.execute(request);
    } catch (error) {
      return { error: error.message };
    }
  }));
  if (count !== runCount) return;
  renderOutput(byId('base-output'), results[0]);
  renderOutput(byId('candidate-output'), results[1]);
  byId('run').disabled = false;
  byId('run-status').textContent = source.value === request.source
    ? `Ran ${request.operation} on both revisions.`
    : 'Source edited. Run both to refresh the results.';
}

function setOperation(next) {
  operation = next;
  for (const button of phaseButtons) button.setAttribute('aria-pressed', String(button.dataset.operation === next));
}

function shownCases() {
  if (filter.value === 'focus') return snapshot.cases.filter((entry) => entry.capability === snapshot.capability.id);
  if (filter.value === 'fail') return snapshot.cases.filter((entry) => entry.outcome === 'fail');
  return snapshot.cases;
}

function field(title, value) {
  const section = element('div', undefined, 'case-value');
  section.append(element('h4', title), value);
  return section;
}

function showCase(entry) {
  const detail = byId('case-detail');
  detail.replaceChildren();
  if (!entry) {
    detail.append(element('p', 'No checks match this filter.'));
    return;
  }

  const header = element('div', undefined, 'case-header');
  const title = element('div');
  title.append(element('h3', entry.caseId), element('p', `${entry.capability} · ${entry.operation}`, 'muted mono'));
  header.append(title, element('span', entry.outcome === 'pass' ? 'Passed' : 'Failed',
    `status ${entry.outcome === 'pass' ? 'good' : 'bad'}`));
  detail.append(header);

  if (entry.failures.length) {
    const list = element('ul', undefined, 'failures');
    for (const failure of entry.failures) list.append(element('li', failure));
    detail.append(list);
  }
  if (!entry.request) return;

  const toolbar = element('div', undefined, 'case-toolbar');
  const open = element('button', 'Open in playground', 'secondary');
  open.type = 'button';
  open.addEventListener('click', () => {
    source.value = entry.request.source;
    setOperation(entry.request.operation);
    void run();
    byId('playground').scrollIntoView();
    source.focus({ preventScroll: true });
  });
  toolbar.append(element('h4', 'Input'), open);
  detail.append(toolbar, element('pre', entry.request.source || '(empty source)', 'code'));
  const pair = element('div', undefined, 'case-pair');
  pair.append(field('Expected result', json(entry.expected)),
    field('Replayed Asrai response', json(entry.actual ?? { error: entry.replayError })));
  detail.append(pair, disclosure('Protocol request JSON', json(entry.request)));
}

function updateCases() {
  const list = byId('case-list');
  const cases = shownCases();
  if (!cases.includes(selectedCase)) selectedCase = cases[0];
  list.replaceChildren();
  for (const entry of cases) {
    const button = element('button', undefined, 'case-choice');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(entry === selectedCase));
    button.append(element('strong', entry.caseId), element('span', `${entry.operation} · ${entry.outcome}`, 'mono'));
    button.addEventListener('click', () => {
      selectedCase = entry;
      for (const item of list.children) item.setAttribute('aria-pressed', String(item === button));
      showCase(entry);
    });
    list.append(button);
  }
  showCase(selectedCase);
}

function link(label, url) {
  const node = element('a', label);
  node.href = url;
  return node;
}

function showEvidence() {
  const { evidence, repo, revisions, issue, pull, pilotIssue, capability } = snapshot;
  const { passed, total, failed } = evidence.summary;
  byId('summary').textContent = `${passed}/${total} evaluator checks passed`;
  byId('summary').classList.toggle('summary-fail', failed > 0);
  byId('provenance').replaceChildren(...[
    ['Work item', link(`FC004 · Issue #${issue}`, `${repo}/issues/${issue}`)],
    ['Worked example', link(`Merged PR #${pull}`, `${repo}/pull/${pull}`)],
    ['Preview pilot', link(`Issue #${pilotIssue}`, `${repo}/issues/${pilotIssue}`)],
    ['Capability registry', link(capability.status, `${repo}/blob/${revisions.candidate}/specs/capabilities.json`)],
    ['Base revision', link(revisions.base, `${repo}/commit/${revisions.base}`)],
    ['Candidate revision', link(revisions.candidate, `${repo}/commit/${revisions.candidate}`)],
    ['Evaluator checkout', link(evidence.baseline, `${repo}/commit/${evidence.baseline}`)],
    ['Candidate source digest', element('code', evidence.candidateDigest)],
    ['Acceptance digest', element('code', evidence.acceptanceDigest)],
    ['Reference', element('span', `Mermaid ${evidence.referenceVersion}`)],
  ].map(([label, value]) => {
    const row = element('div');
    const definition = element('dd');
    definition.append(value);
    row.append(element('dt', label), definition);
    return row;
  }));
}

function loadExample() {
  source.value = snapshot.cases.find((entry) => entry.caseId === snapshot.example)?.request.source ?? '';
  setOperation('parse');
  void run();
}

async function initialize() {
  const response = await fetch('./snapshot.json');
  if (!response.ok) throw new Error(`Evaluation snapshot returned HTTP ${response.status}.`);
  snapshot = await response.json();
  engines = await Promise.all([import('./base/src/index.mjs'), import('./candidate/src/index.mjs')]);
  for (const [side, revision] of Object.entries(snapshot.revisions)) {
    const anchor = byId(`${side}-link`);
    anchor.textContent = revision.slice(0, 7);
    anchor.href = `${snapshot.repo}/commit/${revision}`;
    anchor.title = revision;
  }

  source.disabled = filter.disabled = byId('reset').disabled = false;
  for (const button of phaseButtons) {
    button.addEventListener('click', () => {
      setOperation(button.dataset.operation);
      void run();
    });
  }
  byId('editor').addEventListener('submit', (event) => {
    event.preventDefault();
    void run();
  });
  source.addEventListener('input', () => {
    byId('run-status').textContent = 'Source edited. Run both to refresh the results.';
  });
  byId('reset').addEventListener('click', loadExample);
  filter.addEventListener('change', updateCases);

  selectedCase = snapshot.cases.find((entry) => entry.caseId === snapshot.example && entry.operation === 'parse');
  showEvidence();
  updateCases();
  loadExample();
}

initialize().catch((error) => {
  const message = byId('load-error');
  message.textContent = `Could not load the preview. ${error.message}`;
  message.hidden = false;
  byId('summary').textContent = 'Evaluation unavailable';
  byId('run-status').textContent = 'Playground unavailable.';
  byId('case-detail').textContent = 'Evaluation cases unavailable.';
});
