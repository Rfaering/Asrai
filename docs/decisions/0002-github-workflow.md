# ADR 0002: issues for intent, PRs for readable evidence

Status: proposed for owner review in the setup PR. Date: 2026-11-27.

Use the public `Rfaering/Asrai` repository, GitHub feature/bug/factory issue forms and one issue per initial capability. Keep the machine-readable capability DAG and executable criteria authoritative for technical readiness/acceptance; issues hold intent, discussion and visible work stage. Add deterministic draft export and stable issue links, not a background synchronization bot that overwrites human edits.

Use one PR description format with seven behavior-focused sections, meaningful interface contracts, a complete worked example, inline evidence and concrete owner verification. Visual changes require labeled actual candidate PNG/SVG plus source input. Parser/factory changes use their actual JSON, diagnostics or workflow output. A structural description check catches omissions without claiming it can judge technical truth or visual quality.

Separate product implementation from factory/specification changes using base-owned path/dependency data. Product PRs use the trusted base evaluator; factory/documentation PRs verify the base seal and explicitly report that no product acceptance is being claimed. Candidate-edited contract tooling requires owner review. Preserve the existing independent promotion step and avoid automatically closing capability issues on unaccepted implementation merges.

Require PRs and automated checks on main, resolve review conversations, disable force pushes/deletion/auto-merge, and identify protected ownership. A sole owner cannot approve their own agent-authored PR as an independent second person, so do not configure a review count that makes every PR unmergeable. The owner deliberately merges; agents do not. Separate identities, additional reviewers and externally pinned organization workflows remain possible future improvements.

No hosted coding agent, model API secret, GitHub App credential or automatic issue executor is introduced. The owner can direct agents through issues/chat now, with a reviewable PR as the output of each bounded task.
