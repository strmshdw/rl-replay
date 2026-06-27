/**
 * RL-Replay Analytics Module
 * Performs match telemetry analysis and renders custom SVG charts for dashboards.
 */

class ReplayAnalytics {
    constructor() {
        this.replayData = null;
        this.playerCoords = {};
        this.boostStats = {};
        this.speedStats = {};
    }

    init(replayData) {
        this.replayData = replayData;
        this.calculateTelemetry();
        this.renderOverviewStats();
        this.renderBoostCharts();
        this.renderSpeedCharts();
        this.setupHeatmapControls();
    }

    calculateTelemetry() {
        const frames = this.replayData.frames;
        const meta = this.replayData.meta;
        
        // Initialize stats
        this.playerCoords = {};
        this.boostStats = {};
        this.speedStats = {};
        
        meta.playerStats.forEach(p => {
            this.playerCoords[p.Name] = [];
            this.boostStats[p.Name] = {
                accumulatedBoost: 0,
                frameCount: 0,
                boostCollected: 0,
                boostWasted: 0
            };
            this.speedStats[p.Name] = {
                supersonicFrames: 0,
                boostSpeedFrames: 0,
                slowFrames: 0,
                totalFrames: 0,
                accumulatedSpeed: 0
            };
        });

        // Scan frames for calculations
        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const prevFrame = i > 0 ? frames[i - 1] : null;
            const dt = prevFrame ? frame.time - prevFrame.time : 0.033;
            
            // Only count active gameplay frames for statistics
            const isActiveFrame = frame.state === undefined || frame.state === 'Active';
            
            Object.keys(frame.players).forEach(name => {
                const p = frame.players[name];
                
                // Track positions for heatmaps
                if (this.playerCoords[name]) {
                    this.playerCoords[name].push({ x: p.x, y: p.y });
                }
                
                // Boost stats tracking
                if (this.boostStats[name] && isActiveFrame) {
                    const stats = this.boostStats[name];
                    stats.accumulatedBoost += p.boost;
                    stats.frameCount++;
                    
                    if (prevFrame && prevFrame.players[name]) {
                        const prevBoost = prevFrame.players[name].boost;
                        // Boost collected indicator: boost increased
                        if (p.boost > prevBoost) {
                            const diff = p.boost - prevBoost;
                            stats.boostCollected += diff;
                            // Boost wasted: collected boost when already close to max (100)
                            if (prevBoost >= 95) {
                                stats.boostWasted += diff;
                            }
                        }
                    }
                }
                
                // Speed stats tracking (active frames only)
                if (this.speedStats[name] && isActiveFrame) {
                    const stats = this.speedStats[name];
                    stats.totalFrames++;
                    stats.accumulatedSpeed += p.speed;
                    
                    // Supersonic speed threshold: ~79 km/h (2200 UU/s)
                    // Boosting speed threshold: ~50 km/h (1400 UU/s)
                    if (p.speed >= 79) {
                        stats.supersonicFrames++;
                    } else if (p.speed >= 50) {
                        stats.boostSpeedFrames++;
                    } else {
                        stats.slowFrames++;
                    }
                }
            });
        }
    }

    getPlayerCoordinates(name) {
        return this.playerCoords[name] || [];
    }

    renderOverviewStats() {
        const grid = document.getElementById('overviewStatsGrid');
        if (!grid) return;

        let html = `
            <table class="stats-grid-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Team</th>
                        <th>Score</th>
                        <th>Goals</th>
                        <th>Assists</th>
                        <th>Saves</th>
                        <th>Shots</th>
                        <th>Avg Speed</th>
                        <th>Avg Boost</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.replayData.meta.playerStats.forEach(p => {
            const teamText = p.Team === 0 ? '<span style="color:var(--color-blue); font-weight:bold;">Blue</span>' : '<span style="color:var(--color-orange); font-weight:bold;">Orange</span>';
            
            // Average speed
            let avgSpeedKmh = 0;
            const speed = this.speedStats[p.Name];
            if (speed && speed.totalFrames > 0) {
                avgSpeedKmh = Math.round(speed.accumulatedSpeed / speed.totalFrames);
            }
            
            // Average boost
            let avgBoost = 0;
            const boost = this.boostStats[p.Name];
            if (boost && boost.frameCount > 0) {
                avgBoost = Math.round(boost.accumulatedBoost / boost.frameCount);
            }

            html += `
                <tr>
                    <td style="font-weight: 600;">${p.Name}</td>
                    <td>${teamText}</td>
                    <td>${p.Score}</td>
                    <td>${p.Goals}</td>
                    <td>${p.Assists}</td>
                    <td>${p.Saves}</td>
                    <td>${p.Shots}</td>
                    <td>${avgSpeedKmh} km/h</td>
                    <td>${avgBoost}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        grid.innerHTML = html;
    }

    renderBoostCharts() {
        const container = document.getElementById('boostLevelChart');
        if (!container) return;

        // Custom SVG Bar Chart for average boost levels
        const width = 450;
        const height = 150;
        const players = this.replayData.meta.playerStats;
        const padding = 30;
        const barHeight = 16;
        const gap = 12;

        let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

        // Background lines
        for (let i = 0; i <= 4; i++) {
            const x = padding + 130 + (i / 4) * (width - padding - 150);
            const val = i * 25;
            svgHtml += `
                <line x1="${x}" y1="10" x2="${x}" y2="${height - 25}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                <text x="${x}" y="${height - 8}" fill="var(--text-muted)" font-size="10" font-family="Inter" text-anchor="middle">${val}</text>
            `;
        }

        players.forEach((p, idx) => {
            const boost = this.boostStats[p.Name];
            const avgBoost = boost && boost.frameCount > 0 ? Math.round(boost.accumulatedBoost / boost.frameCount) : 33;
            
            const y = 15 + idx * (barHeight + gap);
            const teamColor = p.Team === 0 ? 'var(--color-blue)' : 'var(--color-orange)';
            const teamColorGlow = p.Team === 0 ? 'var(--color-blue-glow)' : 'var(--color-orange-glow)';
            
            // Bar width scaled to average boost (0 to 100)
            const maxBarWidth = width - padding - 150;
            const barWidth = (avgBoost / 100) * maxBarWidth;

            svgHtml += `
                <!-- Player Name Label -->
                <text x="${padding}" y="${y + 12}" fill="var(--text-primary)" font-size="11" font-family="Outfit" font-weight="600" text-anchor="start">${p.Name}</text>
                
                <!-- Track Bar -->
                <rect x="${padding + 130}" y="${y}" width="${maxBarWidth}" height="${barHeight}" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
                
                <!-- Filled Value Bar -->
                <rect x="${padding + 130}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${teamColor}" filter="drop-shadow(0 0 3px ${teamColorGlow})"/>
                
                <!-- Value tag -->
                <text x="${padding + 130 + barWidth + 8}" y="${y + 12}" fill="${teamColor}" font-size="11" font-family="Inter" font-weight="700">${avgBoost}</text>
            `;
        });

        svgHtml += '</svg>';
        container.innerHTML = svgHtml;
    }

    renderSpeedCharts() {
        const container = document.getElementById('speedDistChart');
        if (!container) return;

        // Custom Stacked Bar Chart for Speed Distribution (Supersonic vs Boost vs Slow)
        const width = 450;
        const height = 150;
        const players = this.replayData.meta.playerStats;
        const padding = 30;
        const barHeight = 16;
        const gap = 12;

        let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

        // Color representations
        // Slow = rgba(255,255,255,0.1), Boost = rgba(99, 102, 241, 0.6), Supersonic = team colors

        players.forEach((p, idx) => {
            const speed = this.speedStats[p.Name];
            const total = speed ? speed.totalFrames : 1;
            
            const pSlow = speed ? (speed.slowFrames / total) : 0.5;
            const pBoost = speed ? (speed.boostSpeedFrames / total) : 0.3;
            const pSupersonic = speed ? (speed.supersonicFrames / total) : 0.2;

            const y = 15 + idx * (barHeight + gap);
            const teamColor = p.Team === 0 ? 'var(--color-blue)' : 'var(--color-orange)';
            const maxBarWidth = width - padding - 150;
            
            // Scaled widths
            const wSlow = pSlow * maxBarWidth;
            const wBoost = pBoost * maxBarWidth;
            const wSupersonic = pSupersonic * maxBarWidth;

            const xStart = padding + 130;

            svgHtml += `
                <!-- Player Name Label -->
                <text x="${padding}" y="${y + 12}" fill="var(--text-primary)" font-size="11" font-family="Outfit" font-weight="600" text-anchor="start">${p.Name}</text>
                
                <!-- Stacked Bars -->
                <!-- Slow -->
                <rect x="${xStart}" y="${y}" width="${wSlow}" height="${barHeight}" fill="rgba(255,255,255,0.06)" rx="2"/>
                <!-- Boost -->
                <rect x="${xStart + wSlow}" y="${y}" width="${wBoost}" height="${barHeight}" fill="rgba(99, 102, 241, 0.4)"/>
                <!-- Supersonic -->
                <rect x="${xStart + wSlow + wBoost}" y="${y}" width="${wSupersonic}" height="${barHeight}" fill="${teamColor}" rx="2"/>
                
                <!-- Speed value tag (Supersonic percentage) -->
                <text x="${xStart + maxBarWidth + 8}" y="${y + 12}" fill="var(--text-secondary)" font-size="10" font-family="Inter">${Math.round(pSupersonic * 100)}% supersonic</text>
            `;
        });

        // Legend details at bottom
        svgHtml += `
            <rect x="${padding + 130}" y="${height - 18}" width="8" height="8" fill="rgba(255,255,255,0.06)" rx="1"/>
            <text x="${padding + 143}" y="${height - 10}" fill="var(--text-secondary)" font-size="9" font-family="Inter">Slow</text>
            
            <rect x="${padding + 200}" y="${height - 18}" width="8" height="8" fill="rgba(99, 102, 241, 0.4)" rx="1"/>
            <text x="${padding + 213}" y="${height - 10}" fill="var(--text-secondary)" font-size="9" font-family="Inter">Boost</text>
            
            <rect x="${padding + 270}" y="${height - 18}" width="8" height="8" fill="#6366f1" rx="1"/>
            <text x="${padding + 283}" y="${height - 10}" fill="var(--text-secondary)" font-size="9" font-family="Inter">Supersonic</text>
        `;

        svgHtml += '</svg>';
        container.innerHTML = svgHtml;
    }

    setupHeatmapControls() {
        const container = document.getElementById('heatmapToggles');
        if (!container) return;

        container.innerHTML = '';
        const players = this.replayData.meta.playerStats;

        players.forEach(p => {
            const btn = document.createElement('button');
            btn.className = `heatmap-toggle-btn team-${p.Team}`;
            btn.textContent = p.Name;
            btn.dataset.player = p.Name;
            
            btn.addEventListener('click', (e) => {
                const isActive = e.target.classList.contains('active');
                
                // Clear active states
                document.querySelectorAll('.heatmap-toggle-btn').forEach(b => b.classList.remove('active'));
                
                if (!isActive) {
                    e.target.classList.add('active');
                    window.AppEngine.activeHeatmapPlayer = e.target.dataset.player;
                    document.getElementById('toggleHeatmap').checked = true; // Turn overlay on
                } else {
                    window.AppEngine.activeHeatmapPlayer = null;
                    document.getElementById('toggleHeatmap').checked = false; // Turn overlay off
                }
                
                window.AppEngine.renderCurrentState();
            });
            
            container.appendChild(btn);
        });
    }
}

// Bind to window globally
window.ReplayAnalytics = new ReplayAnalytics();
