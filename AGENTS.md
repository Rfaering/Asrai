# Asrai agent instructions

Asrai is an experiment in autonomous software production and an independent diagrams-as-code engine. The README is the product vision. The factory, executable specifications and evidence are the immediate investment. No Mermaid implementation code belongs in product code. Do not claim compatibility without a passing independent report.

## Start here

1. Read `specs/flowchart-core.md`, `specs/protocol.md`, `docs/development.md` and `docs/decisions/0001-foundation.md`.
2. Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, then `npm run factory:next`.
3. Use the task packet in `.factory/task.json`. Select the lowest-priority-number capability whose dependencies are all accepted. Deferred capabilities have no implementation authorization until separately specified. Do not add diagram types or future product infrastructure.

## Boundaries

- Product code lives in `src/`; developer tests can live in `tests/`. Keep parsing, semantic model, layout and SVG rendering separable by plain data. Introduce modules as capabilities need them; do not build speculative plugin systems, animation engines, applications or services.
- Product must not import Mermaid, the oracle, fixtures, evaluator, or factory. Third-party layout/text-measurement libraries may be proposed with an ADR, exact pins and independent acceptance. Do not copy Mermaid's parser, renderer, tests or algorithms. Treat public documentation and observed input/output as discovery evidence.
- Mermaid and Playwright are reference/evaluation tools only, installed separately under `reference/`. Do not inspect upstream implementation source to implement a capability. An evaluator may inspect public type declarations/package metadata to maintain the observation adapter. Record provenance for every imported fixture; current fixtures are authored here.
- The product adapter is the sole process boundary; stdout contains exactly one JSON response. Never consult acceptance data at runtime. Source order and generated identifiers must be deterministic.

## Workflow and roles

Use GitHub issues for requested outcomes, priorities and work discussion; use PRs as the owner's verification surface. Read `docs/github-workflow.md`. Every work PR links its managing issue and follows `.github/pull_request_template.md`: explain behavior, meaningful public/internal interfaces and input/output/error contracts, a complete worked example, actual evidence, verification steps and limitations. Visual changes include inline actual Asrai PNG output plus its SVG and source; label Mermaid references/illustrations separately. Parser/factory changes show actual JSON, diagnostics or workflow output. Use immutable commit URLs for previews and do not bury the only useful evidence in artifact archives.

Keep implementation PRs separate from protected factory/specification changes. CI classifies paths using the base policy; successful factory/documentation checks do not accept product capabilities. Use `Refs #N` for a candidate pending independent acceptance, and `Closes #N` in the independently reviewed completing acceptance PR. Maintain the linked issue's stage honestly; issue closure/labels do not redefine the registry. The owner is the final reader/merger. Do not merge or enable auto-merge without explicit user instruction. No background issue executor is installed.

Follow `factory/workflow.json`: discover → specify → decompose → implement → independently evaluate → correct → accept. These are separate responsibilities, not permission to pretend an implementation agent is an independent reviewer.

Implementation changes normally touch `src/`, `tests/` and focused development/failure notes. Run `npm run evaluate -- --capability FCxxx`; this evaluates the capability, its dependencies and all accepted regressions. Reports, screenshots and benchmarks go under ignored `artifacts/`. Preserve meaningful evidence in `evidence/` only when independently accepted; reference the report path and both source/acceptance digests in the backlog. Do not check in misleading pass reports from test mocks.

`specs/`, `fixtures/`, `evaluation/`, `reference/`, `factory/`, `.github/`, this file and root toolchain manifests are protected acceptance inputs. An implementation agent must not change them to make its implementation pass, regenerate the acceptance seal, remove tests, adjust thresholds, suppress failures or promote its own capability to `accepted`. Add developer regression tests freely. If a contract is wrong or incomplete, record a minimal counterexample in `docs/discoveries/`, propose a separate specification/evaluator change, and leave the implementation result failing until that contract change has independent review. After review, the evaluator verifies Mermaid observations, updates/seals the contract and reruns regressions.

Use `implemented` to describe a candidate awaiting independent evaluation. Only an independent evaluator/reviewer can set `accepted`, attach digest-bound evidence, and refresh the seal in a separately reviewed change. Local integrity hashes detect accidental changes; the trusted-base CI check prevents a candidate from replacing its own evaluator. External repository protection is required to make that check mandatory; see `docs/evaluation.md`.

## Tests and definition of done

- Add focused developer tests for new behaviour and discovered bugs. The acceptance suite is independent; tests that only mirror implementation are insufficient.
- Run `npm run check`, `npm test`, selected-capability evaluation, and accepted regressions. For oracle/spec changes also run `npm run reference:install`, `npm run reference:browser`, `npm run reference:verify` and `node --test reference/tests/*.test.mjs`.
- Correctness gates include acceptance/rejection, canonical semantics, finite bounded geometry, non-overlap, attached paths, safe SVG, labels, deterministic output and process limits. Quality/performance proxies are advisory unless the reviewed policy explicitly makes a budget hard. No pixel-match compatibility claims.
- Done means the trusted evaluation has zero hard failures, evidence matches the candidate and acceptance digests, regressions pass, limitations and decisions are documented, and independent acceptance is recorded. A passing factory self-test is not a passing product.
- On failure, classify it using `factory/workflow.json`, minimize the input, record the cause/correction and retry. After three attempts without improvement, record the blockage and select independent ready work; do not weaken criteria. Never turn infrastructure failure into a skip/pass.

## Records

Use small ADRs under `docs/decisions/` for significant commitments. Use `docs/discoveries/` for observations/uncertainties and `docs/failures/` for failed iterations. Record reference version, command, input, actual/expected, source digest and conclusion. Keep the backlog as the source of work order; avoid parallel prose roadmaps. Do not commit, publish, send messages or change remote repository settings unless the task authorizes it.
