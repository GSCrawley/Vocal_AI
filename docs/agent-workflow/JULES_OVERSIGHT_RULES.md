# Jules Oversight Rules

Governance rules for any human or AI agent (e.g., Claude) overseeing Jules
coding sessions in this repository. These rules exist to keep the
Jules <-> Copilot <-> reviewer workflow grounded in the actual state of the
codebase and to prevent recurring failure modes observed during the build.

> Read this file before advising Jules, approving a plan, or merging a
> Jules-authored PR.

---

## Rule 1 - The Missing-Code Triage Rule (stale vs. lost vs. future)

**Trigger flags - any ONE of these fires this rule:**
- Jules proposes tests/benchmarks for an optimization, function, or behavior
  that does not appear in the current codebase.
- Jules reports that "the code doesn't match the prompt/plan."
- A plan references a symbol, file, or capability you cannot find at `main`.
- Jules appears to be working from a planning doc that describes work as if
  it were already implemented.

**Mandatory response - do this BEFORE giving Jules any advice:**
Never conclude "it doesn't exist, stand down." Jules tasks are not invented
from thin air. Investigate, in order:
1. Search the codebase for the referenced symbol/file.
2. Check commit history for when it appeared and/or disappeared.
3. Search BOTH open and closed PRs - especially merged-then-reverted ones.
4. Check planning docs to see if this is intended future work.

**Then classify into exactly one bucket and act:**
- **(a) Stale premise** - Jules is working from an outdated prompt.
  -> Redirect Jules to current reality.
- **(b) Lost / deleted code** - it existed and was dropped (e.g., in a bad
  merge). -> Find the exact commit and re-integrate it **surgically**
  (see Rule 4). Address the loss; do not just rewrite from scratch.
- **(c) Future groundwork** - it is planned but unbuilt.
  -> Ensure the underlying work actually gets done, not skipped.

Only after classifying may you advise.

---

## Rule 2 - Do Not Write Code Except To Fix Mistakes

The overseer's job is to advise, approve, investigate, and merge - not to
author features. Write/commit code yourself ONLY when you have identified a
concrete mistake and fixing it yourself avoids further complications.
Otherwise, direct Jules to make the change.

---

## Rule 3 - Merge Authorization Criteria

A Jules PR may be merged (and its branch deleted) only when ALL hold:
- A review has been done.
- Any Copilot suggestions/fixes have been vetted AND either
  (i) completed and merged, or (ii) deliberately deferred to a new branch -
  never silently ignored.
- The branch is up to date and any merge conflicts are resolved.
- All tests are green, **especially CI build-and-test**.

When all criteria are met, the overseer may merge and delete the branch
independently. If anything is ambiguous, pause and flag it.

---

## Rule 4 - Surgical Restore, Never Wholesale Revert

When restoring lost code (Rule 1b), restore only the specific lost content.
Do NOT revert whole files, because that would also discard newer, valid
changes layered on top since the loss (e.g., keep current
`computeKaraokeScore` / `dominantFailureMode` logic while restoring only
the lost `computePitchSimilarity` optimization).

---

## Rule 5 - Don't Fragment Messages To Jules

The Jules chat composer fragments multi-line pastes into out-of-order
bubbles. Prefer single-line messages, or point Jules to an exact commit/file
as the source of truth rather than pasting large code blocks.

