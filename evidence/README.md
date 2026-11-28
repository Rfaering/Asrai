# Accepted capability evidence

FC001 was accepted by the repository owner on 2026-11-27 after its implementation merged in `2e008d6`. The [FC001 report](FC001.json) passed all six validation checks using the trusted pre-merge baseline `857edb7`.

The repository owner accepted FC002 and FC003 on 2026-11-27. Independent evaluations used the merged product and trusted pre-promotion evaluator at `eb461f0`. The [FC002 report](FC002.json) passed 11 checks, and the [FC003 report](FC003.json) passed 12. Both include the six accepted FC001 regressions.

The [FC004 report](FC004.json) evaluates the merged implementation at `fa6895d` with the trusted pre-merge evaluator at `8a78dcc`. All 20 checks passed, including 17 accepted regressions.

The [FC005 report](FC005.json) evaluates the merged implementation at `edc1eec` with the trusted pre-merge evaluator at `3569a7f`. All 23 checks passed, including 20 accepted regressions.

An independent evaluator may store a passing trusted report here and link it from `specs/capabilities.json` with `candidateSha256` and `acceptanceSha256`. The report must match the actual candidate and evaluated acceptance baseline, cover every criterion/dependency and include all accepted regressions. Promotion and the resulting acceptance-seal change are reviewed independently from implementation. Never store test-mock pass reports as product evidence.
