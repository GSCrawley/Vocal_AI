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

## Lesson 2 - Non-blocking Copilot review nits: apply them, don't ask

**Context:** On a Jules test PR (#153), Copilot left three Low-severity,
non-blocking review comments (duplicate function invocation in tests, a
misleading type cast, reliance on issues[0]). CI was already green.

**Trigger flags:** Copilot leaves "Low"/non-blocking *comments* (not a
"Request changes" block) on a Jules PR; CI green; suggestions are confined
to the changed files and are safe, mechanical improvements.

**Rule:** Default to having JULES apply the suggestions (not writing the
code yourself - Rule 2), re-confirm CI green, then hand the PR to the user
merge-ready. Do not ask the user whether to apply low-risk, non-blocking
Copilot nits - just apply them. Only escalate if a suggestion is risky,
ambiguous, or changes behavior. (User confirmed this is how they would
handle it themselves.)

**Status:** Standing default for the Jules oversight workflow.

---

<!-- Append Lesson 2, 3, ... as new incidents arise. -->
