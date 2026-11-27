# Candidate protocol v1

The candidate is a Node ESM entry point, default `src/adapter.mjs`. It reads one UTF-8 JSON document from stdin and writes exactly one JSON document to stdout, then exits 0. Put debug logs on stderr. Each request runs in a fresh process with fixed TZ, locale and seed, a small environment, a 3-second wall limit, a combined 2 MB stdout/stderr bound and Node filesystem permissions limited to the candidate source directory. Child process creation, native addons, workers and filesystem writes are not granted. This is an engineering guardrail, not a hostile-code sandbox.

```json
{"protocolVersion":1,"operation":"validate","source":"flowchart LR\nA"}
```

`operation` is `validate`, `parse`, `layout` or `render`. The product's only initial implementation is `{ "status": "unimplemented", "code": "ASRAI_NOT_IMPLEMENTED" }` for every request. Unimplemented always fails acceptance. The factory can function before any diagram code exists.

Validation success:

```json
{"status":"ok","accepted":true,"diagramType":"flowchart","diagnostics":[]}
```

Syntax rejection is a successful protocol exchange with `accepted:false`, and at least one diagnostic `{ "code":"ASRAI_SYNTAX", "severity":"error", "line":1, "column":1, "message":"..." }`. Locations are positive, one-based line/column numbers. Error prose does not need to match Mermaid. `ASRAI_UNSUPPORTED` distinguishes deliberate scope rejection.

Parse success:

```json
{
  "status":"ok",
  "model":{
    "type":"flowchart","direction":"LR",
    "nodes":[{"id":"A","label":"A","shape":"rect"},{"id":"B","label":"B","shape":"rect"}],
    "edges":[{"source":"A","target":"B","label":"","directed":true}]
  }
}
```

Node shapes are `rect`, `rounded` or `diamond`. Nodes are compared by ID, edges by multiset. Output ordering is not semantic, but repeated requests must be deterministic. `TD` is normalized to `TB`. Do not expose Mermaid DB objects or depend on its internal IDs.

Layout success returns `{ "status":"ok", "scene":... }`. Scene coordinates are top-left SVG user units; all numbers are finite. Node `x`,`y`,`width`,`height` describe its bounding box, edges retain `source`,`target` and at least two `{x,y}` points. Keep parallel edges as separate entries.

```json
{"width":100,"height":40,"nodes":[{"id":"A","x":0,"y":0,"width":20,"height":20},{"id":"B","x":50,"y":0,"width":20,"height":20}],"edges":[{"source":"A","target":"B","points":[{"x":20,"y":10},{"x":50,"y":10}]}]}
```

Render success returns `{ "status":"ok", "scene":..., "svg":"<svg ...>...</svg>" }`. Use the SVG namespace, a viewBox `0 0 width height`, explicit dimensions, an accessible title, visible `<text>` labels and static presentation attributes. Group every node in `<g data-node-id="A">`, mark its geometric shape with `data-node-shape="true"`, and mark each edge `<path data-edge-source="A" data-edge-target="B">`. The evaluator independently measures these actual SVG elements and compares coverage/bounds/labels against the semantic and scene contracts; metadata cannot substitute for drawing. Labels must fit the node bounding box. The evaluator's SVG allowlist is part of the reviewed contract. Inline styles and arbitrary CSS are currently outside that contract.

Directed SVG edges must use a local `marker-end="url(#arrowId)"` referring to a defined `<marker>`; open edges have no end marker. Nonempty edge labels use visible `<text data-edge-source="A" data-edge-target="B">label</text>`. The evaluator compares edge direction and label multisets and rejects invisible shapes, paths and node labels.

Invalid transport, thrown exceptions, nonzero exits, malformed results, timeout, missing browser tools, permission errors and unsupported product responses are hard failures. Nothing is silently skipped. The adapter is a factory integration seam, not a commitment to a final public Mermaid drop-in API.
