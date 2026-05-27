## Description
This repository should not store PR-specific descriptions in a tracked `pr_description.md` file.

### Usage
- Put change-specific summaries, acceptance criteria, and review notes in the pull request body.
- If a local scratch file is needed to draft a PR description, keep it untracked or generate it outside the repository.
- Only commit content here if it is stable, long-lived documentation that is not tied to a single PR.

### Rationale
Replacing this file with unrelated PR text on each change causes churn in version control and makes it easy to lose the intended purpose of the document.

### Note
If the project needs a committed template, keep this file generic and reusable rather than filling it with implementation-specific details for one pull request.
