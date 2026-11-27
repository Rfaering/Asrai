# Working with the factory through GitHub

[Issues](https://github.com/Rfaering/Asrai/issues) are the place to request outcomes, discuss priorities and track delivery. [Pull requests](https://github.com/Rfaering/Asrai/pulls) are the place to understand and verify proposed changes. You do not need to run the factory commands yourself for ordinary work; ask an agent to work on an issue and return a reviewable PR.

## Your normal interaction

1. Open a feature, bug or factory-improvement issue. Describe the desired result, give an example and say what would convince you it works. Engineering analysis is the agent's responsibility.
2. Ask: **“Work on issue #N. Follow the factory workflow, run independent evaluation, and open a PR with worked examples and readable evidence. Leave merging to me.”** The agent checks dependencies before starting. A new idea is first a discovery/specification task; an issue alone does not authorize changing the accepted language contract.
3. Read the PR's outcome and worked example, then the interface table. Inspect actual output and the linked checks. Ask for changes in the PR conversation or on the relevant diff.
4. Merge when the explanation, evidence and limitations satisfy you. Agents do not merge or enable auto-merge without your explicit instruction. Closing an issue or merging an implementation PR does not independently certify capability acceptance.

For an overview, filter issues by `kind:capability`, `kind:bug` or `kind:factory`, then by stage. Use `priority:high` to express urgency. Priority never overrides unaccepted technical dependencies. The initial backlog is published as one issue per capability; `factory/github-issues.json` maps IDs to issue numbers and `factory:next` links the selected issue.

| Stage label | Meaning | Next action |
| --- | --- | --- |
| `stage:discovery` | Desired behavior needs investigation/specification | Observe the pinned oracle and propose cases |
| `stage:ready` | Specified and dependencies accepted | Implement one bounded capability |
| `stage:blocked` | A dependency is not accepted | Complete or investigate that dependency |
| `stage:implementing` | An agent is producing a candidate | Implement and correct failures |
| `stage:review` | A PR/evidence is ready for review | Verify behavior and interfaces |
| `stage:accepted` | Independent acceptance has been recorded | Close the completed issue |
| `stage:deferred` | Deliberately outside the current milestone | Revisit scope before implementation |

Issue labels are the human work board, not a second acceptance database. The capability registry, dependencies, fixtures and trusted reports retain technical authority. An agent updates labels when work moves; there is no background agent or automatic issue scheduler. `npm run factory:issues` exports deterministic Markdown drafts without making network changes. Publishing or updating issues is an explicit agent action and must preserve human discussion, edits and issue IDs. Do not blindly overwrite issue bodies with exported drafts.

## What every PR must explain

The template has seven short sections: outcome, why it matters, interfaces/responsibilities, worked example, evidence, verification steps and limitations. Lead with behavior and context. Give implementation detail where it explains a boundary or tradeoff; do not narrate the coding session or list filenames as the explanation.

For meaningful interfaces, explain the input, output, owner, error behavior and consumer. A parser change might show `source → validation → canonical model`; a rendering change might show `model → scene → SVG`; a factory change might show `issue → capability packet → candidate → trusted evaluation`. Show the changed contract with a small JSON/source example and explain the downstream consequence. State explicitly when an interface is unchanged and why that matters to the review.

For visual changes, embed a PNG of **actual Asrai candidate output**, provide the source input and a direct SVG link, and show before/after or a reference beside it when useful. Use immutable commit URLs. Captions must distinguish **Asrai candidate**, **Mermaid reference** and **explanatory illustration**. A Mermaid screenshot is never evidence that Asrai rendered the diagram. For validation/factory changes, actual JSON, diagnostics, issue/task text and CI output are appropriate evidence; do not fabricate a diagram just to fill a visual section.

Store readable previews under `docs/reviews/<capability-or-topic>/` with a caption naming the producer, input, revision and command. Keep digest-bound acceptance reports under `evidence/` only after independent acceptance. CI artifacts contain full reports and generated screenshots; the PR body must still show the small example and key result directly. The [first review walkthrough](reviews/github-interface/README.md) demonstrates this distinction with a clearly labeled Mermaid reference and the real unimplemented Asrai response.

## Review and acceptance boundaries

PR metadata declares `Change type`, `Capability` and `Issue`. CI verifies all seven sections, a worked example, and agreement between declared type and changed paths. It reads protected paths and capability dependencies from the base checkout. This check validates structure, not prose truth, image authenticity or visual quality; you still review the evidence.

- **Implementation PR:** changes product source, with developer tests, notes and preview assets. It must name a specified capability with accepted dependencies. The base-owned harness evaluates the candidate, selected capability and accepted regressions. Protected criteria cannot change in that PR.
- **Factory/contract PR:** changes protected tooling, specs, templates or evaluation. It cannot include product source changes. Foundation/oracle checks and a verified base seal support owner review; their success does not mean a product capability was accepted. This separate path is needed because applying a product-implementation gate to a template/specification change would report unrelated unimplemented capabilities.
- **Documentation PR:** explains existing behavior without product/contract changes. It has the same readable description format and an explicit no-product-acceptance summary.

Implementation PRs use **Refs #N** while acceptance is pending. After an independent evaluator records a report matching the tested candidate and acceptance baseline, a separate acceptance-record PR updates the registry/evidence/seal and uses **Closes #N**. This avoids closing a capability just because unaccepted source was merged. The evaluator records the evaluated pre-promotion baseline digest; promotion changes the next seal. An agent must never promote its own implementation or quietly reduce criteria.

## Repository protection and ownership

The intended required checks are `Foundation (ubuntu-24.04)`, `Foundation (windows-latest)`, `Mermaid oracle`, `PR review contract` and `Independent acceptance`. Main requires PR-based changes, up-to-date passing checks and resolved conversations; force pushes/deletion and auto-merge are disabled. `CODEOWNERS` identifies Rfaering for protected contracts.

The repository currently has a single owner, and agent-created PRs use that same GitHub identity. GitHub does not count an author's own approval as another person's review, so the configuration does not demand an impossible second approval. Your deliberate merge decision is the human checkpoint. Automated product evaluation is separate from that decision. Adding a second reviewer or separate agent identity can support required approving reviews later.

Repository-local workflows are still editable in a factory PR; these controls are not an externally pinned, tamper-proof organization workflow. Contract changes need explicit owner inspection, and ordinary implementation agents are forbidden from changing those files. No model API key, background coding runner or issue-triggered execution service is installed by this setup.

Templates become available in GitHub's issue/PR creation UI once the setup PR is merged into main. The seeded issues and setup PR are usable immediately.
