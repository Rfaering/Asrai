# Live Asrai test explorer

Run this from the repository root:

```sh
node docs/reviews/interactive/preview.mjs
```

Open [the local test explorer](http://127.0.0.1:4173/). Choose a case, then select **Validation**, **Model**, **Layout**, or **SVG**. The output pane shows what Asrai did. The expectations pane shows whether the response matched each check and gives reasons for mismatches. Layout draws the returned node bounds and edge paths. SVG displays the image returned by the engine and gives access to its markup.

A check mark means all expectations for that case or phase match. A cross means at least one differs. A dashed circle with a dash means there is no expectation. A clock marks pending checks, and an exclamation mark marks checks the explorer could not complete. A rejection can match an expectation, as the `invalid-direction` case demonstrates.

The catalog includes authored flowchart fixtures and the evaluator’s seeded generated cases, including cases for work still in progress. The page checks for changes every two seconds while visible. Saving a fixture or generator update refreshes the catalog. Saving product code reruns the selected phase. Every run starts a fresh adapter process, so new engine behavior is available without rebuilding or restarting the explorer. **Refresh now** runs the selected phase immediately.

By default the explorer uses its own checkout. To follow another worktree, pass its path and optionally a different port:

```sh
node docs/reviews/interactive/preview.mjs 4175 --workspace "/path/to/Asrai"
```

The runner binds to loopback, calls Asrai’s regular adapter using the configured process limits, and reads expectations from the chosen worktree. Explorer verdicts are live development feedback. The independent evaluator remains the source of acceptance evidence. SVG comparisons use the repository’s browser tooling. Install it with the commands below when you want to check SVG output.

![Screenshot of the Asrai test explorer](screenshot.png)

The screenshot shows `invalid-direction`, where the actual validation rejection matches the test expectation. The interactive catalog opens on the first fixture by default.

## Browser verification

```sh
npm run reference:install
npm run reference:browser
node docs/reviews/interactive/verify.mjs
```

The browser check starts its own preview and uses a temporary workspace to exercise live fixture changes and rendering. Pass a filename as the first argument to capture the real-workspace model view.
