# Asrai — Diagrams as Code

## Current foundation

The software factory is established; diagram functionality is intentionally unimplemented. Start with [agent instructions](AGENTS.md) and the [development guide](docs/development.md).

Manage work through [GitHub issues](https://github.com/Rfaering/Asrai/issues) and verify proposals in [pull requests](https://github.com/Rfaering/Asrai/pulls). The [GitHub workflow guide](docs/github-workflow.md) explains the issue forms, PR evidence format, owner review and acceptance boundaries.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run factory:next
```

Node 24.13.1 is pinned. The independent Mermaid 11.17.2 reference is installed separately: `npm run reference:install`, `npm run reference:browser`, `npm run reference:verify`.

The [capability backlog](specs/capabilities.json) drives development. The first task is FC001. `npm run evaluate -- --capability FC001` currently exits 1 and reports six unimplemented checks; this is the intended product baseline. Factory tests passing does not claim Mermaid compatibility. See the [bounded initial scope](specs/flowchart-core.md), [reference findings](docs/reference-discovery.md), [evaluation and trust model](docs/evaluation.md), and [architecture decision](docs/decisions/0001-foundation.md).

The following sections describe the product vision and long-term direction.

Asrai is an independent, open-source diagramming engine built from scratch, initially targeting compatibility with Mermaid, with a long-term vision of supporting animated and interactive diagrams as code.

## Motivation

The project has two primary objectives:

- **Software factory experimentation:** Explore how an autonomous, AI-driven software factory can reimplement an existing software library from scratch using specifications, behavioural discovery, automated testing and iterative evaluation.
- **Product development:** Create a modern, extensible diagramming engine that can eventually move beyond static diagrams and visualize how systems behave over time.

Mermaid serves as the initial reference implementation, rather than the foundation of the codebase.

## Initial Scope

The first milestone is to independently reproduce a subset of Mermaid's functionality, starting with flowcharts.

The engine should support:

- Parsing Mermaid-compatible syntax.
- Constructing a semantic representation of diagrams.
- Automatic graph layout and edge routing.
- Node shapes, labels, relationships and subgraphs.
- SVG rendering.
- Styling and theming.
- Syntax validation and structured diagnostics.
- A programmatic API, CLI and browser-based playground.

Compatibility should focus on syntax and semantic correctness rather than pixel-perfect reproduction of Mermaid's visual output.

Existing third-party libraries may be used for underlying capabilities such as graph layout and text measurement. Asrai should not depend on Mermaid itself at runtime.

## Architecture

The engine should be modular, with clear boundaries between the following components:

1. **Parser** — transforms textual diagram definitions into an abstract syntax tree.
2. **Semantic model** — represents diagram structures independently of their input syntax.
3. **Layout engine** — determines node positions, dimensions and edge paths.
4. **Scene model** — represents visual elements independently of the rendering technology.
5. **Renderer** — transforms the scene into SVG or other output formats.
6. **Animation engine** — eventually introduces time, transitions and dynamic state into the scene model.

Each component should be independently testable, replaceable and extensible.

## Software Factory

A central aspect of the project is to minimize manual implementation and instead invest in the harness that enables autonomous software development.

The software factory should be capable of:

- Discovering capabilities from the reference implementation.
- Generating executable specifications and acceptance criteria.
- Maintaining and prioritizing a capability backlog.
- Implementing functionality autonomously.
- Generating unit, integration and property-based tests.
- Performing differential testing against Mermaid.
- Evaluating geometric correctness and visual quality.
- Identifying regressions and initiating corrective iterations.
- Measuring compatibility, performance, development cost and human intervention.

The implementation agents should ideally work from specifications and observable behaviour rather than copying Mermaid's source code.

The evaluation harness should be sufficiently independent from the implementation agents to prevent overfitting to self-generated tests.

## Evaluation Strategy

Success should be measured across multiple dimensions:

- Syntax compatibility.
- Semantic correctness.
- Geometric correctness.
- Node overlap and edge crossings.
- Diagram readability and visual quality.
- Rendering performance.
- Deterministic behaviour.
- Security and robustness.
- Autonomous implementation success.
- Required human intervention.

Visual differences from Mermaid are acceptable and potentially desirable, provided the diagrams remain semantically correct and readable.

## Long-Term Vision

Once a solid foundation for static diagrams has been established, Asrai should evolve into an engine for animated and interactive system visualization.

Potential future capabilities include:

- Declarative animation syntax.
- Messages and data travelling between components.
- Dynamic node states and counters.
- Sequential and parallel execution scenarios.
- Failure propagation and retry visualization.
- Timeline-based playback and scrubbing.
- Camera movement and transitions.
- Stable layouts across diagram changes.
- Animation export to GIF and video.
- OpenTelemetry and distributed trace visualization.
- AI-native interfaces through structured APIs and MCP.
- Additional diagram types and rendering technologies.

The ambition is to make time and behaviour first-class concepts in diagrams as code.

## Guiding Principles

- Build from scratch, but do not unnecessarily reinvent dependencies.
- Prioritize semantic correctness over visual compatibility.
- Keep architecture modular and extensible.
- Make behaviour deterministic and independently verifiable.
- Invest in the software factory and evaluation harness rather than manual implementation.
- Establish compatibility before introducing innovation.
- Treat visual quality as a measurable engineering objective.
- Keep the core engine independent of applications, infrastructure and user interfaces.

## Product Vision

If Mermaid is a language for describing what systems look like, Asrai should eventually become a language for describing how systems behave.

**Asrai — Diagrams as code. Systems in motion.**
