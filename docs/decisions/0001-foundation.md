# ADR 0001: a small executable factory before product code

Status: accepted for this foundation assignment. Date: 2026-11-27.

## Decisions

- Use Node 24.13.1, JavaScript ESM, built-in `node:test`, JSON contracts and npm lockfiles. This supports the browser oracle and future JS/browser engine without adding a build system or root dependencies. JSDoc/types can grow with real modules; a TypeScript compilation pipeline is postponed until it earns its cost.
- Keep Mermaid 11.17.2 and Playwright 1.65.1 in an independent `reference/` package. A complete lockfile pins transitive resolutions and Playwright pins a Chromium build. Mermaid is a behavioural oracle only. Root/product has no dependency on either package.
- Target the maintained v11 line rather than automatically track latest (12.4.0 at discovery). Initial probing used 11.12.2; audit identified high-severity transitive advisories, so final observations use patched 11.17.2. Two low-severity audit entries remain, both due to KaTeX and its propagation to Mermaid; math is outside the evaluated subset. Do not upgrade the oracle or override dependencies invisibly. Change pin/lock/config/observations/spec together under independent review.
- Run Mermaid in real pinned Chromium with local ESM assets, strict security, text labels, fixed viewport/locale/seed and no external browser network requests. A DOM emulator cannot reliably reproduce font measurement and layout. SVG hashes record observations; geometry/pixels vary with host fonts. Semantic gates are portable. Visual baselines require the same OS/browser/fonts.
- Use a normalized graph contract and a minimal scene contract. Keep parser → semantics → layout → SVG separate as actual code grows. Defer internal AST shape, parser generator, layout engine, text measurement, final public API, CLI/playground, packaging and animation architecture. Dagre or ELK and a text-measurement library are plausible future delegates, requiring ADR/license/pin/evaluation before selection.
- Use a capability DAG as the work queue. Specifications and evaluators are protected inputs; implementation and acceptance are different roles. Trusted-base CI runs base evaluator code against candidate product processes. No services, agent orchestration platform, database, queue or cloud infrastructure is needed for this first loop.

## Consequences and limits

Fresh processes favor isolation/determinism over benchmark throughput. Node permissions prevent ordinary candidate code from reading/replacing acceptance files, but are not a security boundary against a determined hostile author. There are no secrets in candidate processes. Untrusted third-party submissions require a separate OS/container sandbox with network disabled and resource controls before execution.

The initial repository has no commits or remote, so external required checks/owner approval cannot be activated here. The workflow and trusted-base evaluator are established locally; protected branch/ruleset administration remains external. A local self-resealable manifest alone cannot enforce independence. That limitation is explicit, not papered over with local hashes.
