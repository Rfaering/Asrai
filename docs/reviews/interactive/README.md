# Interactive Asrai review preview

Try [FC004’s node-shape change](https://github.com/Rfaering/Asrai/pull/23) against the exact pre-change and merged revisions.

From the repository root, with Node 24, Git, and tar available:

```sh
node docs/reviews/interactive/preview.mjs
```

Open [the local review preview](http://127.0.0.1:4173/). You can pass a different port as the first argument. The server binds to loopback and serves the page, pinned browser modules, and evaluation data. Startup runs the trusted base evaluator against the pinned candidate, then replays each case through the same candidate process runner so responses can be inspected. The evaluator report remains under the printed path in `artifacts/`.

The opening example is `labels-shapes`. The earlier revision returns `ASRAI_UNSUPPORTED`. The merged revision returns a model with rectangle, rounded, and diamond nodes. To try a regression case, choose **All checks**, select **invalid-direction**, then choose **Open in playground**. Layout and SVG display the pinned engine’s unimplemented responses.

![Screenshot of the interactive Asrai review preview](screenshot.png)

The screenshot shows browser output from the pinned comparison and evaluator. The page links the source revisions and displays both evidence digests. Evaluator verdicts and replayed adapter responses are labeled on every case. The registry link shows FC004’s status at the pinned candidate revision.

## Browser verification

With the preview running, the optional browser check uses the existing pinned reference browser tooling.

```sh
npm run reference:install
npm run reference:browser
node docs/reviews/interactive/verify.mjs
```

Pass the local preview URL to the verification script if you selected a different port.
