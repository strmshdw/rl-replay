/**
 * RL-Replay Playback Engine Module
 * Manages playback timers, animation frames, linear interpolation, and UI state synchronization.
 */

class ReplayEngine {
    constructor() {
        this.arena = new ReplayArena('arenaCanvas');
        this.replayData = null;
        
        // Playback state
        this.isPlaying = false;
        this.currentTime = 0;
        this.playbackSpeed = 1.0;
        this.lastFrameTime = 0;
        this.animationId = null;
        
        // Path trails tracking (store history of last 150 frames)
        this.playerPaths = {};
        this.maxPathLength = 150;

        // Active telemetry display states
        this.activeHeatmapPlayer = null;

        // Bind DOM elements
        this.initUI();
    }

    initUI() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.loadExampleBtn = document.getElementById('loadExampleBtn');
        this.loadingContainer = document.getElementById('loadingContainer');
        this.loadingStatus = document.getElementById('loadingStatus');
        this.loadingPercent = document.getElementById('loadingPercent');
        this.loadingFill = document.getElementById('loadingFill');

        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.timelineScrubber = document.getElementById('timelineScrubber');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timelineTicks = document.getElementById('timelineTicks');
        
        this.matchTitle = document.getElementById('matchTitle');
        this.matchSub = document.getElementById('matchSub');
        this.scoreboard = document.getElementById('scoreboard');
        this.scoreBlue = document.getElementById('scoreBlue');
        this.scoreOrange = document.getElementById('scoreOrange');
        
        this.playersList = document.getElementById('playersList');
        this.analyticsPanel = document.getElementById('analyticsPanel');

        // File upload bindings
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });
        this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('dragover'));
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.loadReplayFile(e.dataTransfer.files[0]);
            }
        });

        // Load example button
        this.loadExampleBtn.addEventListener('click', () => this.loadExampleReplay());

        // Playback buttons
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        
        // Speed buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.playbackSpeed = parseFloat(e.target.dataset.speed);
            });
        });

        // Scrubber bindings
        this.timelineScrubber.addEventListener('input', (e) => {
            if (!this.replayData) return;
            const pct = parseFloat(e.target.value);
            const totalDuration = this.replayData.frames[this.replayData.frames.length - 1].time;
            this.seekTo(totalDuration * (pct / 100));
        });

        // Toggle overlays redrawing immediately
        document.querySelectorAll('.toggle-list input').forEach(input => {
            input.addEventListener('change', () => {
                if (this.replayData) this.renderCurrentState();
            });
        });

        // Analytics tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab).classList.add('active');
            });
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.arena.resize();
            if (this.replayData) this.renderCurrentState();
        });
    }

    async loadExampleReplay() {
        this.setLoadingState(true);
        this.updateLoading('Connecting to server...', 10);
        
        try {
            const response = await fetch('res/example.json');
            if (!response.ok) throw new Error('Failed to fetch sample replay.');
            
            // Get content-length for download progress
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 29965465; // Fallback size
            
            this.updateLoading('Downloading replay (30MB)...', 20);
            
            const reader = response.body.getReader();
            let receivedLength = 0;
            let chunks = [];
            
            while(true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                
                const pct = Math.floor(20 + (receivedLength / total) * 50);
                this.updateLoading(`Downloading data: ${Math.round(receivedLength / (1024*1024))}MB`, Math.min(70, pct));
            }
            
            this.updateLoading('Replay downloaded. Parsing JSON schema...', 75);
            
            // Concatenate chunks
            let allChunks = new Uint8Array(receivedLength);
            let position = 0;
            for (let chunk of chunks) {
                allChunks.set(chunk, position);
                position += chunk.length;
            }
            
            const utf8Decoder = new TextDecoder("utf-8");
            const jsonText = utf8Decoder.decode(allChunks);
            
            const json = JSON.parse(jsonText);
            this.processLoadedJson(json);
            
        } catch (err) {
            console.error(err);
            this.updateLoading(`Error: ${err.message}`, 100);
            alert('Failed to load replay. Ensure you are running locally or server is active.');
        }
    }

    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.loadReplayFile(e.target.files[0]);
        }
    }

    loadReplayFile(file) {
        this.setLoadingState(true);
        this.updateLoading('Loading file from disk...', 10);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.updateLoading('Analyzing JSON structure...', 30);
                const json = JSON.parse(e.target.result);
                this.processLoadedJson(json);
            } catch (err) {
                console.error(err);
                this.updateLoading('Parsing failed. Invalid JSON.', 100);
                alert('Invalid JSON file. Please upload a valid Rocket League replay export.');
            }
        };
        reader.readAsText(file);
    }

    setLoadingState(active) {
        if (active) {
            this.loadingContainer.style.display = 'block';
            this.loadExampleBtn.disabled = true;
            this.dropZone.style.pointerEvents = 'none';
        } else {
            this.loadingContainer.style.display = 'none';
            this.loadExampleBtn.disabled = false;
            this.dropZone.style.pointerEvents = 'auto';
        }
    }

    updateLoading(status, percent) {
        this.loadingStatus.textContent = status;
        this.loadingPercent.textContent = `${percent}%`;
        this.loadingFill.style.width = `${percent}%`;
    }

    processLoadedJson(json) {
        this.updateLoading('Processing replay timeline...', 80);
        
        ReplayParser.parseReplay(json, (status, percent) => {
            this.updateLoading(status, percent);
        }).then(data => {
            this.replayData = data;
            this.setLoadingState(false);
            
            // Build helper mappings
            this.playerTeams = {};
            this.replayData.meta.playerStats.forEach(p => {
                this.playerTeams[p.Name] = p.Team;
            });
            
            // Reset player path trails
            this.playerPaths = {};
            this.replayData.meta.playerStats.forEach(p => {
                this.playerPaths[p.Name] = [];
            });
            
            this.initMatchView();
            this.seekTo(0);
        }).catch(err => {
            console.error(err);
            this.updateLoading('Failed to parse telemetry.', 100);
            alert('Replay structure is incompatible with the telemetry parser.');
        });
    }

    initMatchView() {
        const meta = this.replayData.meta;
        this.matchTitle.textContent = meta.title;
        this.matchSub.textContent = `${meta.playlist.replace('TAGame.', '')} | Team Size: ${meta.teamSize}v${meta.teamSize} | Length: ${Math.round(meta.totalSeconds)}s`;
        
        this.scoreBlue.textContent = meta.team0Score;
        this.scoreOrange.textContent = meta.team1Score;
        this.scoreboard.style.display = 'flex';
        
        this.playPauseBtn.disabled = false;
        this.timelineScrubber.disabled = false;
        
        // Build Goal Timeline Marks
        this.timelineTicks.innerHTML = '';
        const totalDuration = this.replayData.frames[this.replayData.frames.length - 1].time;
        meta.goals.forEach(goal => {
            const pct = (goal.Time / totalDuration) * 100;
            const tick = document.createElement('div');
            tick.className = 'timeline-tick-goal';
            tick.style.left = `${pct}%`;
            tick.title = `Goal by ${goal.PlayerName} (${Math.round(goal.Time)}s)`;
            tick.addEventListener('click', (e) => {
                e.stopPropagation();
                // Seek to 3 seconds before the goal
                this.seekTo(Math.max(0, goal.Time - 3));
            });
            this.timelineTicks.appendChild(tick);
        });

        // Initialize custom layouts
        this.playersList.innerHTML = '';
        meta.playerStats.forEach(p => {
            const item = document.createElement('div');
            item.className = `player-item team-${p.Team}`;
            item.id = `player-row-${p.Name.replace(/\s+/g, '_')}`;
            item.innerHTML = `
                <span class="player-name-lbl" title="${p.Name}">${p.Name}</span>
                <div class="player-telemetry">
                    <span class="player-stat-speed" id="speed-${p.Name.replace(/\s+/g, '_')}">0 km/h</span>
                    <span class="player-stat-boost" id="boost-${p.Name.replace(/\s+/g, '_')}">33%</span>
                </div>
            `;
            this.playersList.appendChild(item);
        });

        // Setup Analytics Panels
        this.analyticsPanel.style.display = 'block';
        window.ReplayAnalytics.init(this.replayData);
    }

    togglePlay() {
        if (!this.replayData) return;
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.playPauseBtn.innerHTML = '<span class="play-icon">❚❚</span>';
            this.lastFrameTime = performance.now();
            this.animate();
        } else {
            this.playPauseBtn.innerHTML = '<span class="play-icon">▶</span>';
            if (this.animationId) cancelAnimationFrame(this.animationId);
        }
    }

    animate() {
        if (!this.isPlaying) return;
        
        const now = performance.now();
        const dt = (now - this.lastFrameTime) / 1000; // time in seconds
        this.lastFrameTime = now;
        
        const totalDuration = this.replayData.frames[this.replayData.frames.length - 1].time;
        this.currentTime += dt * this.playbackSpeed;
        
        if (this.currentTime >= totalDuration) {
            this.currentTime = totalDuration;
            this.togglePlay(); // Stop play
        }
        
        this.updateFrameState();
        this.renderCurrentState();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    seekTo(time) {
        this.currentTime = time;
        // Clear history trails to avoid jump lines
        Object.keys(this.playerPaths).forEach(name => {
            this.playerPaths[name] = [];
        });
        
        this.updateFrameState();
        this.renderCurrentState();
    }

    updateFrameState() {
        const frames = this.replayData.frames;
        const totalDuration = frames[frames.length - 1].time;
        
        // Update timeline range scrubber
        const pct = (this.currentTime / totalDuration) * 100;
        this.timelineScrubber.value = pct;
        
        // Update time display text
        this.timeDisplay.textContent = `${this.formatTime(this.currentTime)} / ${this.formatTime(totalDuration)}`;

        // Find current and next frames for interpolation
        let currentFrameIdx = 0;
        while (currentFrameIdx < frames.length - 2 && frames[currentFrameIdx + 1].time < this.currentTime) {
            currentFrameIdx++;
        }

        const fK = frames[currentFrameIdx];
        const fK1 = frames[currentFrameIdx + 1];
        
        let alpha = 0;
        if (fK1.time !== fK.time) {
            alpha = (this.currentTime - fK.time) / (fK1.time - fK.time);
        }

        // Interpolate Ball
        this.currentBallPos = {
            x: fK.ball.x + alpha * (fK1.ball.x - fK.ball.x),
            y: fK.ball.y + alpha * (fK1.ball.y - fK.ball.y),
            z: fK.ball.z + alpha * (fK1.ball.z - fK.ball.z)
        };

        // Interpolate Players
        this.currentPlayersState = {};
        
        Object.keys(fK.players).forEach(name => {
            const pK = fK.players[name];
            const pK1 = fK1.players[name] || pK; // Fallback to current if next doesn't exist
            
            // Linear position interpolation
            const x = pK.x + alpha * (pK1.x - pK.x);
            const y = pK.y + alpha * (pK1.y - pK.y);
            const z = pK.z + alpha * (pK1.z - pK.z);
            
            // Smooth angular yaw interpolation (handling wrap around)
            let diff = pK1.yaw - pK.yaw;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const yaw = pK.yaw + alpha * diff;
            
            // Boost amount does not need high interpolation
            const boost = pK.boost;

            this.currentPlayersState[name] = { x, y, z, yaw, boost };

            // Update path history trail (every few frames to keep smooth trails)
            if (this.isPlaying && Math.random() < 0.3) {
                const path = this.playerPaths[name];
                path.push({ x, y });
                if (path.length > this.maxPathLength) {
                    path.shift();
                }
            }

            // Update speed telemetry in sidebar list (approximate speed in km/h)
            const speedKmh = Math.round(pK.speed + alpha * ((pK1.speed !== undefined ? pK1.speed : pK.speed) - pK.speed));
            const rowName = name.replace(/\s+/g, '_');
            const speedEl = document.getElementById(`speed-${rowName}`);
            const boostEl = document.getElementById(`boost-${rowName}`);
            if (speedEl) speedEl.textContent = `${speedKmh} km/h`;
            if (boostEl) boostEl.textContent = `${boost}%`;
        });
    }

    calculateSpeedKmh(pK, pK1, t0, t1) {
        if (!pK || !pK1) return 0;
        const dx = pK1.x - pK.x;
        const dy = pK1.y - pK.y;
        const dz = pK1.z - pK.z;
        const dt = t1 - t0;
        if (dt <= 0) return 0;
        
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        // Rocket League coordinates are roughly 1 unit = 1 cm.
        // So speed is in cm/s.
        // Speed in km/h = (speed in cm/s) * 0.036
        const speedCms = dist / dt;
        return Math.min(141, Math.round(speedCms * 0.036)); // Supersonic cap is around 141 km/h
    }

    renderCurrentState() {
        this.arena.clear();
        
        const showPaths = document.getElementById('togglePaths').checked;
        const showHeatmap = document.getElementById('toggleHeatmap').checked;
        const showNames = document.getElementById('toggleNames').checked;
        const showBoost = document.getElementById('toggleBoost').checked;

        // 1. Draw Arena Field Base
        this.arena.drawField({ showBoost });

        // 2. Draw Positioning Paths (Trails)
        if (showPaths) {
            this.arena.drawPaths(this.playerPaths, this.playerTeams, Object.keys(this.currentPlayersState));
        }

        // 3. Draw Heatmap overlay if toggled
        if (showHeatmap && this.activeHeatmapPlayer && this.replayData) {
            const playerFrames = window.ReplayAnalytics.getPlayerCoordinates(this.activeHeatmapPlayer);
            const team = this.playerTeams[this.activeHeatmapPlayer];
            const color = team === 0 ? '#00d2ff' : '#ff7b00';
            this.arena.drawHeatmap(playerFrames, color);
        }

        // 4. Draw Ball
        if (this.currentBallPos) {
            this.arena.drawBall(this.currentBallPos);
        }

        // 5. Draw Players
        if (this.currentPlayersState) {
            this.arena.drawPlayers(this.currentPlayersState, this.playerTeams, {
                showNames,
                showBoostRing: showBoost
            });
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Instantiate globally when DOM loaded
window.addEventListener('DOMContentLoaded', () => {
    window.AppEngine = new ReplayEngine();
});
