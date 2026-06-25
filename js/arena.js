/**
 * RL-Replay Arena Renderer Module
 * Draws the bird's-eye 2D projection of the Rocket League field and active telemetry entities.
 */

class ReplayArena {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Field coordinate bounds (standard Rocket League field dimensions)
        this.fieldXMax = 3072; // Width is 6144
        this.fieldYMax = 5120; // Length is 10240
        this.padding = 35;     // Extra padding around the boundaries
        
        this.resize();
        
        // Static boost pad coordinates
        this.boostPads = [
            // 6 Large pads
            { x: 3072, y: 4096, isLarge: true },
            { x: -3072, y: 4096, isLarge: true },
            { x: 3072, y: -4096, isLarge: true },
            { x: -3072, y: -4096, isLarge: true },
            { x: 3072, y: 0, isLarge: true },
            { x: -3072, y: 0, isLarge: true },
            
            // Representative small pads
            { x: 0, y: 0, isLarge: false },
            { x: -1000, y: 0, isLarge: false },
            { x: 1000, y: 0, isLarge: false },
            { x: 0, y: -1000, isLarge: false },
            { x: 0, y: 1000, isLarge: false },
            
            { x: -1000, y: -1000, isLarge: false },
            { x: 1000, y: -1000, isLarge: false },
            { x: -1000, y: 1000, isLarge: false },
            { x: 1000, y: 1000, isLarge: false },
            
            { x: 0, y: -2800, isLarge: false },
            { x: 0, y: 2800, isLarge: false },
            { x: -1800, y: -2500, isLarge: false },
            { x: 1800, y: -2500, isLarge: false },
            { x: -1800, y: 2500, isLarge: false },
            { x: 1800, y: 2500, isLarge: false },
            
            { x: -2800, y: -1800, isLarge: false },
            { x: 2800, y: -1800, isLarge: false },
            { x: -2800, y: 1800, isLarge: false },
            { x: 2800, y: 1800, isLarge: false },
            
            { x: 0, y: -4600, isLarge: false },
            { x: 0, y: 4600, isLarge: false },
            { x: -1000, y: -4200, isLarge: false },
            { x: 1000, y: -4200, isLarge: false },
            { x: -1000, y: 4200, isLarge: false },
            { x: 1000, y: 4200, isLarge: false }
        ];
    }

    resize() {
        // Set canvas internal dimensions to match the display size of the wrapper
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.updateScale();
    }

    updateScale() {
        const availWidth = this.canvas.width - 2 * this.padding;
        const availHeight = this.canvas.height - 2 * this.padding;
        
        const scaleX = availWidth / (2 * this.fieldXMax);
        const scaleY = availHeight / (2 * this.fieldYMax);
        
        // Preserve aspect ratio by using the smaller scale factor
        this.scale = Math.min(scaleX, scaleY);
        
        // Center the field on canvas
        this.offsetX = this.padding + (availWidth - (2 * this.fieldXMax) * this.scale) / 2;
        this.offsetY = this.padding + (availHeight - (2 * this.fieldYMax) * this.scale) / 2;
    }

    // Convert game coordinate X to Canvas coordinate X
    toCanvasX(x) {
        return this.offsetX + (x + this.fieldXMax) * this.scale;
    }

    // Convert game coordinate Y to Canvas coordinate Y (Rocket League Y goes up to orange goal, down to blue)
    toCanvasY(y) {
        // Flip Y-axis for top-down view
        return this.canvas.height - (this.offsetY + (y + this.fieldYMax) * this.scale);
    }

    // Convert Canvas coordinate to Game coordinates (useful for clicks or mapping back)
    toGameCoords(cx, cy) {
        const gx = ((cx - this.offsetX) / this.scale) - this.fieldXMax;
        const gy = ((this.canvas.height - cy - this.offsetY) / this.scale) - this.fieldYMax;
        return { x: gx, y: gy };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawField(options = {}) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const p = this.padding;

        // Draw background grid lines (ambient overlay)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridCells = 16;
        for (let i = 0; i <= gridCells; i++) {
            // Horizontal lines
            const y = p + (i / gridCells) * (h - 2 * p);
            ctx.beginPath();
            ctx.moveTo(p, y);
            ctx.lineTo(w - p, y);
            ctx.stroke();

            // Vertical lines
            const x = p + (i / gridCells) * (w - 2 * p);
            ctx.beginPath();
            ctx.moveTo(x, p);
            ctx.lineTo(x, h - p);
            ctx.stroke();
        }

        // Draw boundaries
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2.5;
        
        const xMin = this.toCanvasX(-this.fieldXMax);
        const xMax = this.toCanvasX(this.fieldXMax);
        const yMin = this.toCanvasY(-this.fieldYMax);
        const yMax = this.toCanvasY(this.fieldYMax);

        // Main outer boundary box
        ctx.strokeRect(xMin, yMax, xMax - xMin, yMin - yMax);

        // Center line & circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        const yMid = this.toCanvasY(0);
        ctx.beginPath();
        ctx.moveTo(xMin, yMid);
        ctx.lineTo(xMax, yMid);
        ctx.stroke();

        ctx.beginPath();
        const xMid = this.toCanvasX(0);
        ctx.arc(xMid, yMid, (xMax - xMin) * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Goals
        // Blue Goal (Y = -5120)
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.6)';
        ctx.shadowColor = 'rgba(0, 210, 255, 0.3)';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const goalWidthHalf = (xMax - xMin) * 0.14; // Approximate goal width
        ctx.moveTo(xMid - goalWidthHalf, yMin);
        ctx.lineTo(xMid - goalWidthHalf, yMin + 15);
        ctx.lineTo(xMid + goalWidthHalf, yMin + 15);
        ctx.lineTo(xMid + goalWidthHalf, yMin);
        ctx.stroke();

        // Orange Goal (Y = 5120)
        ctx.strokeStyle = 'rgba(255, 123, 0, 0.6)';
        ctx.shadowColor = 'rgba(255, 123, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(xMid - goalWidthHalf, yMax);
        ctx.lineTo(xMid - goalWidthHalf, yMax - 15);
        ctx.lineTo(xMid + goalWidthHalf, yMax - 15);
        ctx.lineTo(xMid + goalWidthHalf, yMax);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Boost Pads
        if (options.showBoost) {
            this.boostPads.forEach(pad => {
                const px = this.toCanvasX(pad.x);
                const py = this.toCanvasY(pad.y);
                
                ctx.fillStyle = pad.isLarge ? 'rgba(255, 196, 0, 0.25)' : 'rgba(255, 230, 100, 0.12)';
                ctx.strokeStyle = pad.isLarge ? 'rgba(255, 196, 0, 0.5)' : 'rgba(255, 230, 100, 0.2)';
                ctx.lineWidth = 1;
                
                ctx.beginPath();
                ctx.arc(px, py, pad.isLarge ? 6 : 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }
    }

    drawPaths(playerPaths, playerTeams, activePlayers) {
        const ctx = this.ctx;
        ctx.lineWidth = 1.5;
        
        Object.keys(playerPaths).forEach(name => {
            if (!activePlayers.includes(name)) return;
            
            const team = playerTeams[name];
            ctx.strokeStyle = team === 0 ? 'rgba(0, 210, 255, 0.35)' : 'rgba(255, 123, 0, 0.35)';
            
            const path = playerPaths[name];
            if (path.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(this.toCanvasX(path[0].x), this.toCanvasY(path[0].y));
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(this.toCanvasX(path[i].x), this.toCanvasY(path[i].y));
            }
            ctx.stroke();
        });
    }

    drawHeatmap(points, teamColorHex) {
        const ctx = this.ctx;
        if (!points || points.length === 0) return;

        // Simple radial gradient rendering for heatmap density
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Downsample points to avoid drawing 100,000 gradients (take every 10th point)
        const step = Math.max(1, Math.floor(points.length / 500));
        
        for (let i = 0; i < points.length; i += step) {
            const pt = points[i];
            const px = this.toCanvasX(pt.x);
            const py = this.toCanvasY(pt.y);
            const radius = 25;

            const grad = ctx.createRadialGradient(px, py, 1, px, py, radius);
            grad.addColorStop(0, teamColorHex + '1c'); // Low opacity color
            grad.addColorStop(0.5, teamColorHex + '06');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawBall(ball) {
        const ctx = this.ctx;
        const bx = this.toCanvasX(ball.x);
        const by = this.toCanvasY(ball.y);
        
        // Z height scales from ~92 (ground) to ~2000 (ceiling)
        const heightScale = Math.max(0, ball.z - 92) / 1900;
        
        // 1. Draw Ball Drop Shadow on Field
        const shadowRadius = Math.max(2, 8 * (1 - heightScale * 0.7));
        // Offset shadow slightly to represent a light source
        const shadowOffsetX = heightScale * 25;
        const shadowOffsetY = heightScale * 25;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.arc(bx + shadowOffsetX, by + shadowOffsetY, shadowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Draw Connecting Height Line (Line from shadow to actual ball)
        if (ball.z > 150) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(bx + shadowOffsetX, by + shadowOffsetY);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]); // reset
        }

        // 3. Draw Actual Ball (scaled by height slightly to give perspective)
        const ballRadius = 8 + heightScale * 4;
        const grad = ctx.createRadialGradient(bx - ballRadius*0.3, by - ballRadius*0.3, 1, bx, by, ballRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#d8dee9');
        grad.addColorStop(1, '#4c566a');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
        
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
        ctx.stroke();
    }

    drawPlayers(players, playerTeams, options = {}) {
        const ctx = this.ctx;

        Object.keys(players).forEach(name => {
            const p = players[name];
            const px = this.toCanvasX(p.x);
            const py = this.toCanvasY(p.y);
            const team = playerTeams[name];
            
            const color = team === 0 ? 'var(--color-blue)' : 'var(--color-orange)';
            const colorGlow = team === 0 ? 'var(--color-blue-glow)' : 'var(--color-orange-glow)';
            
            // 1. Draw Player Marker Dot
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // 2. Draw Orientation Vector Arrow (Yaw direction)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            // Rocket League yaw points along local X-axis, compute endpoints
            // Math.cos/sin(yaw) gives heading
            const headingX = Math.cos(p.yaw);
            const headingY = Math.sin(p.yaw);
            
            // Visualizer coordinates are Z-up Y-inverted. Scale arrow length to 15px
            ctx.lineTo(px + headingX * 14, py - headingY * 14);
            ctx.stroke();

            // 3. Draw Boost Ring overlay around dot
            if (options.showBoostRing) {
                ctx.strokeStyle = colorGlow;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(px, py, 11, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw filled boost percentage segment
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                // 100% boost is full circle. Start at top (-PI/2)
                const boostArc = (p.boost / 100) * (Math.PI * 2);
                ctx.arc(px, py, 11, -Math.PI / 2, -Math.PI / 2 + boostArc);
                ctx.stroke();
            }

            // 4. Draw Player Label Name
            if (options.showNames) {
                ctx.font = '500 11px Inter, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                
                // Add minor translucent background box for readability
                const textWidth = ctx.measureText(name).width;
                ctx.fillStyle = 'rgba(7, 9, 19, 0.7)';
                ctx.fillRect(px - textWidth / 2 - 4, py - 27, textWidth + 8, 15);
                
                ctx.fillStyle = color;
                ctx.fillText(name, px, py - 16);
            }
        });
    }
}

// Attach to window
window.ReplayArena = ReplayArena;
