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

## 🚀 Quick Start Guide

Start the local HTTP server and automatically open the visualizer web app in your browser:
```powershell
.\scripts\run-server.ps1
```

You can also specify a custom port if the default port `8000` is already in use:
```powershell
.\scripts\run-server.ps1 -Port 3000
```
