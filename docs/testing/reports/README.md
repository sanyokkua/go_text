# Live Testing Reports

This folder holds **dated execution reports** produced by running
[`../LIVE_TESTING_PLAN.md`](../LIVE_TESTING_PLAN.md) against a real build of GoText.

The plan file itself never accumulates run history — it is the stable, reusable checklist.
Each time it is executed (a pre-release gate, or a targeted re-run after a feature change),
the results go in a new file here named:

```
YYYY-MM-DD-live-testing-report.md
```

## Report format

Follow the Findings-table convention established by
`docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`:

```markdown
# GoText Live Testing Report — YYYY-MM-DD

Plan version executed: <changelog version from LIVE_TESTING_PLAN.md, e.g. v1.0>
Scope: <"Full plan P0-P15" or "Targeted re-run: P9, P11 only (new action family shipped)">
Build under test: <git commit sha> / <wails dev | wails build binary path>

## Environment
- Ollama models loaded: ...
- LM Studio models loaded: ...
- OS / hardware: ...

## Results by phase

| Phase | Pass/Fail | Notes |
|---|---|---|
| P0 Environment & Pre-flight | PASS | |
| P1 Provider Management | PASS | |
| ... | ... | ... |

## Findings

| # | Test case | Verdict | Evidence |
|---|---|---|---|
| 1 | P11-T7 rate_limited via fault proxy | CONFIRMED bug / REFUTED / FIXED | file:line, screenshot ref, log excerpt |

## Overall assessment

<Ready for release / blocked on findings #N, #M / follow-up tasks needed>

## Follow-up tasks opened

- T<NN> — <short description>, tracks finding #<n>
```

## Rules

- Never edit a past report after it's filed — corrections go in a new report or an explicit
  addendum section appended to the same file (see the 2026-07-01 doc's "Closing-Gate
  Re-Verification" addendum for the pattern).
- Every `CONFIRMED` finding must result in a new or extended automated test case per
  `CLAUDE.md`'s rule ("For each found bug or reported issue, create a new test case or adopt
  an existing one"). Reference that test's file path in the Findings table.
- If a finding reveals the master plan itself is missing coverage, update
  `LIVE_TESTING_PLAN.md` (bump its changelog) in the same PR as the fix.
