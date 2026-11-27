# Foundation validation

Validated locally on 2026-11-27, Windows, Node 24.13.1, npm 11.10.0, Mermaid 11.17.2, Playwright 1.65.1 and Chromium 159.0.8154.6. Diagram product functionality is intentionally unimplemented.

| Check | Observed result |
| --- | --- |
| Root npm install/lockfile | No runtime or development dependencies; installation works |
| Separate pinned reference installation and Chromium download | Successful |
| `npm run check` | 15-capability DAG, 24 fixtures, reference provenance, JS syntax, product import boundary and acceptance integrity valid |
| `npm test` | 13 evaluator/factory tests pass, including temporary Git trusted-base checks |
| `npm run reference:verify` | 24 authored cases agree with the pinned live oracle |
| `node --test reference/tests/*.test.mjs` | 3 integration tests pass, including all 36 seeded property cases against Mermaid and positive/negative full SVG evaluation |
| `npm run factory:next` | Produces `.factory/task.json` for FC001 with inputs, boundaries and evaluation command |
| `npm run evaluate -- --capability FC001` | Expected exit 1: 0/6 product checks pass; all report unimplemented |
| `npm run evaluate -- --output artifacts/milestone-gap` | Expected exit 1: 0/73 product checks pass; all report unimplemented |

Evaluator tests cover semantic mutations, malformed/duplicate/unknown data, invalid diagnostics, dependency cycles, unearned acceptance, deterministic property generation, geometric failures, process crashes/timeouts/output limits, restricted filesystem access, actual SVG/scene disagreement and SVG active content. The trusted-base test operates only in temporary repositories: a source-only transport mock passes the selected syntax checks, while resealed acceptance changes and corrupted protected files are rejected. Those mock results are not product compatibility evidence.

Local reports and PNG/SVG captures are under ignored `artifacts/`. The checked-in reference observations carry exact version and input/adapter/lock/config digests. The product reports bind source and acceptance digests and name their selected checks; no accepted product evidence exists yet. Do not infer Linux CI success from local Windows execution: the prepared CI matrix must run after the repository has a reviewed baseline commit and remote.

Remaining uncertainties are explicit: broader Mermaid grammar and subgraphs; parser/layout/text-measurement choices; fonts and portable visual baselines; stronger perceptual/readability metrics; private challenge tests; hostile-code OS isolation; remote required-workflow/ruleset configuration. The reference audit has two low-severity entries arising from unused KaTeX functionality; see ADR 0001. No project license, remote settings or publication was changed.

Next autonomous implementation task: **FC001**. Read `AGENTS.md` and the generated task packet, implement header/direction/bare-node validation under `src/`, add developer tests under `tests/`, and obtain a zero-failure selected-capability report from the trusted evaluator. Do not begin layout or rendering before their dependency capabilities are accepted.
