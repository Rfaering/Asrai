# Flowchart core v1

This is a bounded compatibility target, not a claim of full Mermaid support. The executable corpus is `fixtures/flowchart/cases.json`; the dependency-ordered acceptance units are `specs/capabilities.json`. No product capabilities are accepted yet.

## Language boundary

| Included in this milestone | Deliberately deferred |
| --- | --- |
| `flowchart` and `graph`; TB/TD, BT, LR, RL | Other diagram families |
| ASCII identifiers matching `[A-Za-z_][A-Za-z0-9_]*` | Full Mermaid identifier grammar and ambiguous punctuation |
| Bare nodes, `A[label]`, `A(label)`, `A{label}` | Expanded shape syntax, icons, images, math |
| Plain labels and double-quoted Unicode labels | Markdown, HTML formatting, entity compatibility, multiline labels |
| `-->`, `---`, `-->|label|`, simple chains | Dotted/thick/cross/circle/bidirectional links, edge IDs and animations |
| Newline/semicolon separation, full-line `%%` comments | Inline comment corner cases and directives |
| Implicit endpoints, last explicit label wins, parallel/self edges | Subgraphs (FC014), styles/themes (FC015), click callbacks |
| Four layout directions; static accessible SVG | Other formats, CLI product, browser playground, animation |

TB and TD normalize to TB. A bare node's label is its identifier. Nodes have unique IDs; edges form a multiset, so parallel edges are retained. A plain reference to an existing node preserves its explicit label. The fixtures define observed examples; they do not imply support for every combination in Mermaid's larger grammar. When a new ambiguous case is found, discover and specify it before claiming it.

Asrai's public API is initially `execute(request)` at `src/index.mjs`, with the factory adapter described in `protocol.md`. It is intentionally narrower than Mermaid's DOM integration API. Exact SVG bytes, CSS, IDs, error wording and undocumented Mermaid object shapes are not compatibility obligations. Canonical graph semantics and acceptance/rejection within the stated subset are hard requirements. Incorrect syntax in the subset must produce structured diagnostics; valid-but-unsupported constructs should produce `ASRAI_UNSUPPORTED` diagnostics rather than silently dropping information. Unsupported coverage beyond the current cases requires new specification work.

## Observable output boundary

Layout must cover all semantic nodes and edges, use finite positive dimensions, fit nodes in the canvas, avoid node overlap, attach path endpoints, and obey direction for simple acyclic two-node cases. Cycles do not impose an impossible total ordering. These initial checks do not prove optimal routing or prevent every edge/node intersection; quality improvements need additional cases.

SVG must be valid, static, accessible (`role="img"` and a title), contain visible text labels, and follow the small element/attribute allowlist in the evaluator. No HTML, embedded scripts, stylesheets, event handlers or external resources. The render result also carries the scene for geometric inspection. This is an intentional safe subset of SVG, not Mermaid's exact SVG structure.

For the hostile-label fixture, Mermaid exposes a sanitized model label (`<img src="x">`). Asrai instead preserves the original source label as inert, escaped SVG text. This is an explicit security boundary, excluded from exact semantic differential comparison; the fixture stores separate oracle and candidate expectations.

## Compatibility and evidence

The hard gate is all checks for a selected capability, its dependencies, and every previously accepted capability. Generated semantic properties use seed 1729 and fresh process requests. A report names the candidate-source digest, acceptance-manifest digest, reference fixture provenance and execution environment. An independent evaluator promotes accepted status; an implementation author cannot self-certify.

Visual hashes/screenshots, node density, bend count and benchmark medians are advisory. They help identify regressions and guide review; resemblance to Mermaid pixels never overrides semantic or safety failure. Initial benchmark timing includes process startup. The 3-second per-request execution limit and 2 MB combined-output bound are hard harness limits, not a product throughput claim. Large graph/resource-stress targets must be separately specified before extending this milestone's compatibility claim.
