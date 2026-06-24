---
name: triage
description: Inspects the workspace repository for errors, failed builds, code comments (TODOs), or git status changes, and triages them into the state board (progress.md).
---

# Triage Skill

This skill is invoked to discover problems or tasks in the workspace and log them to the triage inbox in [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md).

## Instructions

1. **Scan the Workspace**:
   - Check `git status` for untracked or modified files.
   - Look for `TODO` or `FIXME` comments in files if applicable.
   - Run tests if a test script is present (e.g. `npm test` or dotnet/python equivalents) and identify any failures.
   - Read the last 5 Git commit messages to understand what was recently changed.

2. **Categorize Discoveries**:
   - Classify discovered items as:
     - **Bug**: Build failures, compiler errors, failing tests.
     - **Feature/Refactor**: Code TODOs, missing features, optimization items.
     - **Admin**: Document updates, environment adjustments.

3. **Update progress.md**:
   - Read the existing list of tasks in [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md).
   - If an item is already logged, do not duplicate it.
   - Add new discoveries to the **Triage Inbox & Backlog** table.
   - Assign a sequential ID (`TASK-002`, `TASK-003`, etc.).
   - Assign a priority (High, Medium, Low).
   - Set status to `[ ] Pending`.
   - Update the **Last Run** timestamp and set **Active Iteration** if a specific task is active.
