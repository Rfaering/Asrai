<!-- Replace guidance with concrete evidence. Write for a reader who has not followed the coding chat.
     Keep the main story short; put detailed implementation notes in a collapsed block.
     Change type: implementation | factory | documentation. Capability: FCxxx | none.
     Use Refs #N while capability acceptance is pending. Use Closes #N only when this PR completes the issue. -->
Change type: implementation
Capability: FCxxx
Issue: #0

## Outcome

<!-- In two or three sentences: the concrete problem, the trigger, and the behavior after this change. -->

## Why this change

<!-- Explain the user-facing value and where this fits in the diagram pipeline or factory workflow. State the bounded scope. -->

## Interfaces and responsibilities

<!-- Describe meaningful boundaries, including internal interfaces. Explain ownership, inputs, outputs, error behavior and downstream effects. Avoid a list of changed files. -->
| Boundary | Before | After | Why this boundary matters |
| --- | --- | --- | --- |
| Source → validation / model / scene / SVG, or issue → task → evaluation | | | |

## Worked example

<!-- Provide a complete small input, the exact command, and representative actual output. Explain before/after behavior. Include a rejection case when relevant. -->

## Evidence

<!-- Show actual Asrai output inline for visual changes, plus a direct SVG link and the source input.
     For parser/factory-only changes show actual JSON, diagnostics, generated issue/task text or CI output instead.
     Label every image as Asrai candidate / Mermaid reference / explanatory illustration.
     Name the source commit, evaluator baseline and report; distinguish automated facts from human visual judgment.
     Use immutable commit URLs for images. Do not put the only meaningful evidence in a downloadable archive. -->

## How to verify

<!-- Give 2–4 specific steps the owner can follow, with observable expected results and links to checks/reports. -->

## Limitations and follow-up

<!-- Explain unsupported cases, remaining uncertainty, intentional differences and follow-up issue links. For protected changes state why owner review is required. -->

### Owner review

- [ ] The outcome and worked example match the requested feature.
- [ ] I understand the interface changes and their consequences.
- [ ] The evidence supports the claim, and visual output is readable where applicable.
- [ ] I am satisfied with the remaining limitations.
