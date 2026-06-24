---
name: worktree-isolation
description: Isolates code modifications into a separate git worktree directory to prevent collisions during parallel task executions.
---

# Worktree Isolation Skill

This skill teaches you how to create, use, and prune isolated Git Worktrees in this workspace.

## Instructions

When implementing code changes for a task (e.g. `TASK-001`):

### 1. Identify the Task
Read the details of the task from [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md). Determine the branch name to use (e.g. `feature/task-001`).

### 2. Create the Git Worktree
Run the following git commands from the root directory of the workspace:
```bash
# Formulate a worktree directory name inside the scratch space (sibling to the main repository, or a subdirectory like .worktrees/)
# E.g., C:/Users/strmshdw/.gemini/antigravity-ide/scratch/worktrees/task-001
git worktree add -b <branch-name> <path-to-worktree> main
```
*Note: Make sure to create the target directory or let Git handle it. If Git complains that there are unstaged changes, commit them first in the main checkout.*

### 3. Register the Worktree in progress.md
Add an entry to the "Active Worktrees" table in [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md):
- **Worktree Path**: The absolute path to the worktree directory.
- **Branch**: The branch name you created.
- **Target Task**: The ID of the task being worked on (e.g. `TASK-001`).
- **Created**: Current date.
- **Status**: `Active`.

### 4. Perform the Implementation
Execute your code modifications and run local tests **inside the worktree path** (set the `Cwd` of your command execution tools to the worktree path).

### 5. Finalize and Cleanup
Once verification succeeds and changes are committed:
1. In the worktree, push the branch to remote (or if working purely locally, merge it to `main`).
2. Run from the main repository directory:
   ```bash
   git worktree remove <path-to-worktree>
   git worktree prune
   ```
3. Update [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md) to remove the worktree from the "Active Worktrees" list and set the task status to `[x] Completed`.
