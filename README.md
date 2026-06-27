# 🏎️ RL-Replay: Rocket League Replay Visualizer

A standalone analytical application designed to parse, analyze, and visually reconstruct Rocket league matches using replay files (e.g., standard exported JSON schemas like `res/example.json` or binary `.replay` format).

---

## 🎯 Project Overview

Rocket League matches generate a rich stream of telemetry data—positioning coordinates, velocities, boost states, and event markers. **RL-Replay** parses this data to build a standalone, interactive dashboard for players and coaches to visualize spatial patterns, play styles, and match timelines.

### Key Visualizer Goals
1. 🗺️ **Arena View (2D/3D Positioning)**: Plot player coordinate paths and ball trajectories on a calibrated representation of the standard Rocket League arena.
2. 📊 **Telemetry Dashboards**: Render heatmaps of player positioning (offensive vs. defensive third), boost usage efficiency, and average speeds.
3. ⏱️ **Interactive Event Timeline**: A playback scrubber allowing users to jump directly to key events—goals, assists, saves, and demolitions.
4. 📈 **Stat Overlays**: Tabular comparison of team and individual stats parsed from the replay header properties.


---

## ⚙️ Data Generation & Parsing

Replay files (`.replay`) are parsed into the JSON format expected by this application using [RocketLeagueReplayParser](https://github.com/jjbott/RocketLeagueReplayParser) by jjbott.

To convert a `.replay` file to the JSON format used in `res/`, you can compile or download the parser tool from its repository and execute it:
```bash
# Example command to parse a replay file to JSON
RocketLeagueReplayParser.exe "my_match.replay" > "my_match.json"
```

---

## 🏗️ Technical Architecture & Directory Structure

```
rl-replay/
├── .agents/               # Custom IDE development skills and rules
│   ├── AGENTS.md          # Workspace rules for the Loop Engineering lifecycle
│   └── skills/            # Automated helper skills (triage, worktree-isolation, verification)
├── res/                   # Data resources and mock files
│   └── example.json       # Parsed Rocket League replay data structure (~29MB)
├── scripts/               # Project automation and orchestrator scripts
│   └── run-loop.ps1       # Loop Engineering controller
├── progress.md            # Persistent state database for the loop lifecycle
└── README.md              # Project documentation (this file)
```

---

## 🧭 Loop Engineering Workflow

This repository runs on the **Loop Engineering** lifecycle (discovery, isolation, implementation, and verification). The agent develops features and resolves backlog tasks automatically.

### 1. State Tracking (`progress.md`)
The [progress.md](file:///d:/code/rl-replay/progress.md) file acts as the repository's database. It tracks:
* Active iteration details and overall system health.
* Discovered issues and pending backlog tasks.
* Active Git Worktrees.
* Verification test statuses.

### 2. Worktree Isolation
To prevent branch collisions when working on features or bug fixes in parallel, use the `$worktree-isolation` skill instructions. 
Always create a dedicated git worktree in the scratch workspace for your changes:
```powershell
git worktree add -b <branch-name> C:\Users\strmshdw\.gemini\antigravity-ide\scratch\worktrees\<task-id> main
```

### 3. Maker/Checker Verification
Before checking in code:
1. Run target tests in your active worktree.
2. Run standard verification checks (`git status`, linters, or test suites).
3. Log results to the **Verification Board** in `progress.md`.

---

## 🚀 Quick Start Guide

### Step 1: Open Workspace
Set this directory (`d:/code/rl-replay`) as your active workspace in your agent IDE to load local rules and skills.

### Step 2: Check Loop Status
Run the PowerShell orchestrator script to inspect the loop state:
```powershell
.\scripts\run-loop.ps1 status
```

### Step 3: Run the Visualizer Web App
Start the local HTTP server and automatically open it in your browser:
```powershell
.\scripts\run-server.ps1
```
You can also specify a custom port:
```powershell
.\scripts\run-server.ps1 -Port 3000
```

### Step 4: Run Triage
Do a local git status and recent log check:
```powershell
.\scripts\run-loop.ps1 triage
```

### Step 4: Run the Goal Automation
Recommend `/goal` to kick off automated task cycles:
* *"Use `/goal` to triage and implement the highest priority pending task"*
* *"Use `/goal` to implement the basic parser layout, verify, and merge"*
