---
name: verification
description: Implements the maker/checker verification process to validate code changes against test suites and guidelines before merging.
---

# Verification Skill

This skill enforces verification gates to ensure code quality and avoid breaking changes in the main branch.

## Instructions

Whenever changes have been implemented in an isolated worktree branch:

### 1. Identify Test Commands
Read the verification requirements for the task from [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md).
If no commands are specified, perform standard verification based on language:
- **JavaScript/TypeScript**: `npm run lint`, `npm test`
- **Python**: `pytest`, `flake8` / `pylint`
- **Shell/PowerShell**: Run the scripts with mock inputs.

### 2. Run Tests in the Worktree
Execute the test commands. Make sure you set the `Cwd` to the absolute path of the active worktree, NOT the main repo.

### 3. Review Code Changes (Maker/Checker Split)
Before completing the task:
- Summarize the code changes.
- Check for styling and logic correctness.
- (If sub-agents are supported or a separate LLM prompt is possible) Call a checker prompt:
  ```
  "You are an adversarial code reviewer. Review the following changes for potential bugs, security issues, or compliance with AGENTS.md. Diff: [Insert Diff]"
  ```

### 4. Log Results in progress.md
Update the "Verification Board" table in [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md):
- Set **Results** to `Passed` or `Failed` with a snippet of the test output.
- Set **Status** to `Verified` (if passed).
- If tests failed, mark the status as `Failed` and detail the errors in the Triage table so they can be fixed.
