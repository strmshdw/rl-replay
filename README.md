# Loop Engineering Development Workspace

This workspace is a pre-configured, git-initialized development playground designed to enable the **Loop Engineering** paradigm as described by Addy Osmani (in his [blog post](https://addyosmani.com/blog/loop-engineering/)).

Instead of manually prompting the agent turn-by-turn, you design autonomous loops where the agent discovers tasks, isolates development, implements solutions, verifies them, and manages state.

---

## 🏗️ The 5 Building Blocks + State Memory

This workspace maps the loop engineering primitives directly to capabilities within this agent IDE:

### 1. Automations (The Heartbeat)
Automations run on schedules or cadences.
- **How to invoke**: Recommend the `/schedule` slash command to run a triage prompt on a schedule (e.g. every morning or every 2 hours).
- **Run-Until-Done**: Use the `/goal` slash command (e.g., `/goal Run triage, fix any pending bugs, and verify until the build is clean`). This will trigger a goal loop that executes until a verifiable stopping condition is met.

### 2. Worktrees (Isolation)
To run multiple tasks in parallel without branch collisions:
- **Skill**: `$worktree-isolation` (defined in [.agents/skills/worktree-isolation/SKILL.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/.agents/skills/worktree-isolation/SKILL.md)) teaches the agent to spin up a separate git worktree directory for each feature/bug-fix branch.
- **Benefits**: Edits do not affect your main branch checkout; workspace checkouts remain clean and parallelizable.

### 3. Skills (Codified Project Knowledge)
Workspace-scoped skills prevent the agent from starting "cold" and guessing project layouts.
- **Skills Directory**: Located in [.agents/skills/](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/.agents/skills/).
- **Triage** (`$triage`): Scans git log, status, and code comments to update the task board.
- **Worktree Isolation** (`$worktree-isolation`): Handles git worktree creation and cleanup.
- **Verification** (`$verification`): Handles automated test execution and maker/checker review gates.

### 4. Connectors & Plugins
Connect the loop to your real-world systems.
- Connectors speak the **Model Context Protocol (MCP)**, allowing the agent to write PRs, read/write Linear tickets, query databases, or ping Slack channels.

### 5. Sub-agents (Maker/Checker Split)
To prevent the model that wrote the code from grading its own homework:
- The `$verification` skill instructs the agent to run an adversarial code review prompt or verification check.
- You can delegate specific tasks (e.g. security audits, visual UI checks) to sub-agents (like the browser sub-agent) before approving code.

### 6. State & Memory (The Repository Spine)
- **State File**: [progress.md](file:///C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace/progress.md) is the persistent storage layer on disk.
- **Why it matters**: Since agents forget context between sessions, the state file stores what has been triaged, what branches are active, and test verification logs. The agent reads this file first thing upon wakeup.

---

## 🚀 Quick Start Guide

### Step 1: Open Workspace
Set this directory (`C:/Users/strmshdw/.gemini/antigravity-ide/scratch/loop-engineering-workspace`) as your **active workspace** in the IDE. This loads the custom rules and skills.

### Step 2: Check Loop Status
Run the PowerShell orchestrator script to inspect the loop state:
```powershell
.\scripts\run-loop.ps1 status
```

### Step 3: Run Triage
Do a git and file triage check locally:
```powershell
.\scripts\run-loop.ps1 triage
```

### Step 4: Automate the Loop
Ask the agent to set up an automated schedule or start a run-until-done loop:
- **Triage Schedule**: *"Use `/schedule` to run the triage skill every day at 9:00 AM."*
- **Continuous Fix**: *"Use `/goal` to check the triage inbox in progress.md, resolve the highest priority pending task in a worktree, verify it, and merge."*
