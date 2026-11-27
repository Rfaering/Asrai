# Evaluation and trust

| Dimension | Executed now | Gate |
| --- | --- | --- |
| Syntax | Authored accept/reject cases; structured negative diagnostics | Hard |
| Semantics | Canonical node IDs/labels/shapes/directions; edge multiset | Hard |
| Differential | Live pinned Mermaid vs independently authored expected models | Hard oracle gate |
| Properties | 12 seeded statement permutations, 12 renamings, 12 whitespace/comment variants | Hard when owning capability selected |
| Geometry | Finite/positive bounds, canvas containment, unique node/edge coverage, non-overlap, boundary-attached paths; simple direction | Hard |
| SVG/security | Browser XML parser, static element/attribute allowlists, actual SVG node/edge coverage and measured bounds, visible per-node labels, label containment, accessible title/role; no active/external content | Hard |
| Determinism | Two identical render requests in fresh processes | Hard |
| Performance | Five timed requests; median and samples include process startup | Advisory median; hard per-request timeout/output limits |
| Visual regression | PNG capture, SVG hash and optional prior report comparison | Advisory |
| Quality | Canvas area, node density, bend count; reviewer screenshots | Advisory |

No product checks are passing at foundation completion. The stub fails honestly. Unit tests intentionally exercise both pass and fail paths with test-only transport mocks. These are evaluator tests, never compatibility evidence.

`npm run evaluate -- --capability FC001` includes transitive dependencies and all accepted-capability regressions. Without a capability, it evaluates the full current milestone. Exit 0 means all selected hard checks passed; exit 1 means compatibility gaps; errors also fail. Reports live at `artifacts/evaluation/report.json`. To inspect a separate checkout, use `--candidate C:/path/to/checkout/src/adapter.mjs`. Candidate source must be self-contained under that directory; third-party runtime packaging requires a future boundary decision.

For an advisory visual comparison use `--visual-baseline <previous-report.json>`. This reports SVG changes and writes current PNGs; there is no pixel-distance gate yet. It does not claim perceptual equivalence: font-dependent raster differences, crossings, label clipping, contrast and visual readability need further evaluated cases/metrics. Keep visual baselines tied to one OS/browser/font environment. Repeated deterministic SVG and separate geometry tests have higher authority than resemblance to Mermaid output.

## Acceptance authority

The manifest hashes the actual protected inputs, including harness scripts, policy, cases, reference pins and CI instructions. `evaluate` verifies it before running. `check` also validates the capability DAG, fixture coverage, oracle provenance and runtime boundary. A coding agent can propose specification changes, but cannot turn them into acceptance by editing local expectations and claiming a product pass.

The PR workflow checks out the base into `trusted/` and candidate into `candidate/`. The review-contract step classifies actual paths against the base policy, verifies description sections and checks capability dependencies. Product PRs cannot mix protected changes; `trusted/factory/ci-accept.mjs` evaluates candidate `src/adapter.mjs` using the named capability and accepted regressions. Factory/contract and documentation proposals run foundation/oracle checks and base integrity verification, with an explicit no-product-acceptance summary and owner review. This keeps a template/specification proposal from being judged as an unrelated unimplemented product capability. The classifier/description tool is candidate code in a protected factory proposal, so the owner must review it; it is not an externally immutable authority. No `pull_request_target`, write token or candidate-controlled install scripts are used.

The foundation is committed and published at `Rfaering/Asrai`. Main is configured for PR-based owner review and required checks as described in `docs/github-workflow.md`. A workflow stored only in a candidate branch cannot defend itself against an author replacing its jobs; an externally pinned organization workflow and additional reviewer identity would strengthen that boundary. A sole owner cannot supply a second-person approval on their own PR. Do not describe current owner review or local workflow checks as that stronger external enforcement.

Candidate processes get no filesystem-write or child-process permission and read access only to their source directory. The evaluator controls the request, timeout and accepted data, with a small environment and no secrets. This blocks straightforward file/test replacement. Node permissions are not a sandbox against a malicious runtime exploit; untrusted public submissions require OS-level isolation and egress/resource controls before execution. Current process termination is suitable for this self-contained adapter, not a process-tree manager for arbitrary native tools.

## Evidence and promotion

The report binds candidate source and the exact evaluated acceptance manifest, plus selected capabilities, per-case failures/metrics, environment and seed. Independently accepted reports should be copied into `evidence/` with source/acceptance digests in the backlog; the acceptance digest refers to the pre-promotion evaluated baseline, since promotion itself changes backlog metadata and the next seal. Inspect the diff, check report coverage and rerun using the trusted baseline before promotion. Merely manufacturing a JSON report or running the positive mock is never acceptance.

Preserve minimized counterexamples and failure categories. A spec mistake returns to discovery/specification review; an implementation mistake returns to implementation; browser installation/network problems are infrastructure failures. Do not convert any of these into skipped checks. A future private challenge corpus should be owned by the evaluator, use rotated seeds and remain unavailable to implementers. The current generated corpus is reproducible and public, not a hidden test system.
