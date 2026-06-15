# Agent Workflow - Lessons Learned

A cumulative, append-only log of concrete rules distilled from real
incidents in this multi-agent build. Each entry has recognizable trigger
flags and a concrete corrective behavior, so the same mistake is caught
pre-emptively next time. Add a new numbered lesson whenever an incident
reveals a rule that would have prevented it.

---

## Lesson 1 - "Optimization that targets code that isn't there" is a signal, not a dead end

**Context:** Jules created sessions writing tests/benchmarks for a
`computePitchSimilarity` optimization that did not exist at `main`. The
optimization HAD existed (PR #59) but was merged and then lost in a later
bad merge. An initial "it doesn't exist, stand down" judgment was wrong.

**Trigger flags:** Jules writes tests for an optimization/function not in
the current code; "the code doesn't match the prompt"; a plan references a
symbol missing from `main`.

**Rule:** Treat any such signal as a trigger to check git history and
open/closed PRs BEFORE advising. Classify as stale / lost / future and act
accordingly (full procedure: see `JULES_OVERSIGHT_RULES.md` Rule 1). Never
tell Jules to abandon work without doing the archaeology first.

**Status:** Codified as Rule 1 in `JULES_OVERSIGHT_RULES.md`.

---

<!-- Append Lesson 2, 3, ... as new incidents arise. -->
