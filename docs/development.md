# Working on Asrai

For the normal issue → agent → readable PR → owner review flow, start with `docs/github-workflow.md`. Commands below are the agent's underlying tools; routine work does not require the owner to operate the terminal.

Use Node 24.13.1 (`.node-version`) and npm 11.10.0 (the validated lockfile generator). Commands below work from the repository root in PowerShell or a POSIX shell.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run factory:next
```

Root installation has no dependencies and does not install Mermaid. Read the specs named in the generated task packet, implement its selected capability under `src/`, and add focused developer tests. Run the evaluation command from the packet. For example, FC001 uses:

```sh
npm run evaluate -- --capability FC001
```

FC001 passed all six validation checks at acceptance. A full `npm run evaluate` is the milestone gap report and remains red until the milestone is complete. Do not change this to a zero exit merely to make CI green. The factory's own self-tests can be green while the product is entirely unimplemented.

The FC001 candidate validates one bare ASCII node on a line after a `flowchart` or `graph` header with direction `TB`, `TD`, `BT`, `LR`, or `RL`. It accepts LF and CRLF line endings, surrounding whitespace, and blank lines. Validation rejections carry a one-based diagnostic. Shapes, edges, additional statements, comments, and semicolon separators are outside this increment. Parse, layout, and render are separate capabilities.

The FC003 candidate adds `parse` for that same input. The model has one rectangular node whose label is its identifier, an empty edge array, and a canonical direction (`TD` becomes `TB`). Both operations use the same parser and return the same diagnostics for rejected source.

For live differential evaluation and SVG inspection, install the separate oracle:

```sh
npm run reference:install
npm run reference:browser
npm run reference:verify
node --test reference/tests/*.test.mjs
```

On Linux, Chromium system libraries may be needed: `npm exec --prefix reference -- playwright install --with-deps chromium`. Downloads are required for initial npm/browser installation, then the oracle serves local assets and blocks external browser requests. Node and the browser binary are pinned; native fonts are host-provided, so only compare visual artifacts within the same environment.

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/` | Independent product boundary and FC001 flowchart validation |
| `reference/` | Isolated pinned Mermaid/Chromium environment and observed reference results |
| `specs/` | Scope, protocol, policy, capability DAG, schema and acceptance seal |
| `fixtures/flowchart/` | Authored, independently oracle-verified examples and expectations |
| `evaluation/` | Trusted comparison, property generation, geometry, limits and evaluator self-tests |
| `factory/` | Work selection, stage contracts, integrity and trusted-base acceptance |
| `tests/` | Implementation-owned developer tests, run by `npm test` |
| `docs/decisions/` | Small architecture decisions |
| `docs/discoveries/`, `docs/failures/` | Minimal findings and corrective-loop records |
| `evidence/` | Independently accepted, durable product reports |
| `.github/workflows/` | Foundation/oracle CI and base-owned product acceptance |
| `artifacts/`, `.factory/` | Ignored local output and task packets |

The workflow is executable stage metadata in `factory/workflow.json`. `npm run factory:status` shows all capabilities; `factory:next` generates a bounded packet using accepted dependencies. No scheduler or agent service is required: an agent reads the packet, changes the product, runs evaluation, reads the structured report and corrects failures. Keep a small record of attempts, elapsed time and interventions for software-factory experiments.

## Specification and evaluator changes

These require their own diff/review, separated from implementation. Discover the behaviour, edit authored cases and backlog criteria, verify the oracle, test the evaluator, then use `npm run acceptance:seal` and `npm run check`. The seal is deliberately a conspicuous acceptance change. Do not use it to bypass a product failure. The initial assignment creates the first baseline; subsequent changes follow the independent role rules in `AGENTS.md`.

Keep reports outside candidate source. Source digests cover every file in the adapter's directory; symlinks are rejected, and source changes during evaluation fail. Source-only proposals can be evaluated from a trusted worktree:

```sh
node factory/ci-accept.mjs --candidate C:/path/to/candidate --base <full-trusted-base-sha>
```

Run that command from the trusted checkout. It rejects protected-path changes in the candidate and defaults to the first ready task. The baseline is now committed and published at `Rfaering/Asrai`; its initial Windows/Linux/oracle CI run passed. PRs supply the named capability through the review contract and use the base checkout for product evaluation. See the GitHub workflow guide for the separately reviewed factory/contract path.

## Common failure actions

- **Acceptance integrity error:** inspect protected diffs. Restore accidental changes; proposed contract changes go through separate review. Do not reseal reflexively.
- **Browser executable missing:** install the pinned reference package and browser. Do not skip visual checks.
- **Oracle mismatch:** preserve input/observed/expected/version; investigate pin/config drift or a wrong assumption before changing expectations.
- **Candidate timeout/invalid response/permission denial:** inspect the product protocol and source boundary. Debug logs belong on stderr; reference/evaluator access is forbidden.
- **Product failure:** minimize the counterexample, add a developer regression, correct the implementation and rerun the selected capability plus accepted regressions.

Significant choices go in ADRs; failures/discoveries use the small templates in their directories. License selection remains an owner decision; publishing the repository does not assign a project license. Remote protections and the single-owner review limits are documented in `docs/github-workflow.md`.
