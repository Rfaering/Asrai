# Initial oracle findings

Date: 2026-11-27. Reference: Mermaid 11.17.2 with `reference/config.json`.

- `TD` is observed as `TB`; `graph` and `flowchart` both detect as `flowchart-v2`. The product's canonical family name is `flowchart`.
- Labels default to IDs; the last explicit node label wins, and implicit references preserve it. Parallel/self edges remain distinct semantic edges.
- With strict security, the hostile input `A["<img src=x onerror=alert(1)>"]` exposes a sanitized DB label `<img src="x">`. An initial authored expectation incorrectly assumed the original text. The reference verification failed, the discrepancy was investigated, and the oracle expectation was corrected. Asrai's separate render expectation requires the original label as inert text; this intentional boundary is documented in the specification.
- The renderer's internal SVG DOM contains additional paths, so total descendant path count is not a semantic edge count. Reference visual inventory selects `path.flowchart-link`; canonical edges come from the reference-only DB adapter. Neither DOM detail is a product contract.
- Browser font metrics affect SVG geometry/hashes. Record environment; compare semantics portably and visual baselines within the same environment.

Reproduce: `npm run reference:verify`. Exact observations and digests are in `reference/observations.json`. Current fixtures are authored here, not copied from upstream implementation/tests.
