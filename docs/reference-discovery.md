# Mermaid reference discovery

Final oracle: Mermaid **11.17.2**, Playwright **1.65.1**, Node **24.13.1**. Machine evidence: `reference/observations.json`, with configuration, lockfile and fixture SHA-256 digests. `reference/config.json` is part of the oracle contract. `reference/package-lock.json` pins transitive dependencies and integrity hashes.

The npm registry reported 12.4.0 as latest at discovery; that is not this project's target. Live documentation can describe newer features. Prefer the [v11.17.2 usage documentation](https://github.com/mermaid-js/mermaid/blob/mermaid%4011.17.2/packages/mermaid/src/docs/config/usage.md), [flowchart language documentation](https://github.com/mermaid-js/mermaid/blob/mermaid%4011.17.2/packages/mermaid/src/docs/syntax/flowchart.md) and [package metadata](https://github.com/mermaid-js/mermaid/blob/mermaid%4011.17.2/packages/mermaid/package.json). Discovery initially consulted the corresponding v11.12.2 docs, then verified this corpus directly against the final pin. No upstream implementation code was used for product code.

## Interfaces and rendering

The public library is an ESM module with a default `mermaid` export and TypeScript declarations. `initialize(config)` configures it; async `parse(text,{suppressErrors})` validates without rendering; async `render(id,text)` returns SVG and optional event-binding functions; `run(...)` integrates with DOM nodes; `detectType(text)` identifies a diagram family. Legacy `init` and direct `mermaidAPI` usage exist, but are not Asrai's API compatibility target. DOM scanning, binding callbacks, editor integration, CDN loading and the separate Mermaid CLI are surrounding integrations, not core obligations. See the [official API usage guide](https://mermaid.js.org/config/usage.html).

Mermaid parses diagram-specific languages into diagram databases and then lays out/renders SVG with browser text measurement. SVG may contain embedded HTML labels and interaction hooks depending on configuration. Themes, configuration/frontmatter/directives, shape syntax and layout selection affect observable output. The reference fixes those inputs instead of comparing unspecified defaults across releases. This factory uses only `initialize`, `parse` and `render` as public behavioural surfaces; a reference-only `mermaidAPI.getDiagramFromText(...).db` adapter observes flowchart nodes/edges/direction. Those DB methods are version-specific instrumentation, not a stable public semantic API. Their drift must fail oracle verification and be separately reviewed.

## Supported families and syntax breadth

The v11 documentation includes flowcharts, sequence, class, state, entity-relationship, journey, Gantt, pie, quadrant, requirement, GitGraph, C4, mindmap, timeline, ZenUML integration, Sankey, XY, block, packet, kanban, architecture, radar and treemap. Some families/layouts use optional integrations; listing them does not claim Asrai support or that each has been exercised. Only the flowchart core corpus is verified here. Diagram frontmatter/configuration, directives, custom themes, accessibility metadata, images/icons, expanded shapes, HTML/Markdown/math labels, styling and events extend well beyond this milestone.

The observed flowchart corpus verifies header aliases and direction normalization, default nodes, three shapes, Unicode labels, directed/open and labelled links, comments/semicolons, last-label wins, chained links, malformed syntax, cycles, self-links and parallel edges. Reserved lowercase `end` is rejected. `hostile-label` records reference sanitization and an intentional stricter Asrai rendering policy. Do not infer complete grammar equivalence from these examples.

## Fixtures and provenance

Upstream provides documentation examples, parser/DB/unit tests and Cypress rendering fixtures, including [flowchart rendering tests](https://github.com/mermaid-js/mermaid/blob/mermaid%4011.17.2/cypress/integration/rendering/flowchart.spec.js). Discovery identified their location and testing dimensions, without copying that implementation/test suite. Asrai's current 24 fixture inputs and expected canonical models were authored independently and then checked against the oracle. Generated properties are independently constructed in `evaluation/lib/properties.mjs`. New imported fixtures must record original URL, pinned revision and license attribution; import data only with independent evaluator review.

## External dependencies and boundaries

The exact inventory lives in the pinned lockfile. Mermaid delegates to D3/dagre tooling for graph rendering/layout, Cytoscape and extensions for certain graph families, parser tooling for some languages, DOMPurify and URL sanitization for security, KaTeX for math, and libraries for Markdown, colors, dates, IDs and rough drawing. Those dependencies demonstrate that layout and measurement can be delegated; they do not authorize copying Mermaid composition or algorithms. Asrai chooses its own dependencies only when needed.

Mermaid is installed solely under `reference/node_modules`. Its ESM assets are served on an ephemeral loopback port; browser routes to other origins are aborted. Candidate source runs in a different process with no read access to reference files through the granted Node permission scope. Browser tooling may inspect candidate SVG, but the product cannot load the oracle at runtime.

## Reproduction and unresolved questions

Run `npm run reference:install`, `npm run reference:browser`, then `npm run reference:verify`. `reference:capture` additionally writes PNG/SVG artifacts and replaces the tracked observation summary; it is an evaluator change requiring review and resealing. Verification compares canonical authored expectations to the live pinned oracle, including rendering/node counts for geometry/render cases. It does not enforce cross-platform SVG hash equality.

Open questions: broader lexical ambiguities; source-span conventions; Unicode/entity edge cases; safe text measurement and fonts; edge routing around nodes; nested subgraph semantics and layout; sustainable visual-quality thresholds; a hidden challenge corpus and true hostile-code isolation. These should become small discovery tasks when dependencies are ready, not speculative product modules now.
