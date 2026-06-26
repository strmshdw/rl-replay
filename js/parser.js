/**
 * RL-Replay Parser Module
 * Handles loading and parsing of Rocket League replay JSON structures.
 */

class ReplayParser {
    static parseReplay(jsonData, onProgress) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof onProgress === 'function') onProgress('Extracting metadata...', 10);
                
                const meta = {
                    title: jsonData.Properties.MapName || "Standard Arena",
                    playlist: jsonData.Properties.MatchTypeClass || "Soccar",
                    teamSize: jsonData.Properties.TeamSize || 2,
                    totalSeconds: jsonData.Properties.TotalSecondsPlayed || 300,
                    goals: jsonData.Properties.Goals || [],
                    playerStats: jsonData.Properties.PlayerStats || [],
                    team0Score: jsonData.Properties.Team0Score || 0,
                    team1Score: jsonData.Properties.Team1Score || 0
                };

                if (typeof onProgress === 'function') onProgress('Indexing replay frame streams...', 25);

                const priToName = {};      // PRI_ActorId -> PlayerName
                const carToPri = {};       // Car_ActorId -> PRI_ActorId
                const boostToCar = {};     // Boost_ActorId -> Car_ActorId

                const currentPositions = {}; // PlayerName -> { x, y, z, yaw }
                const currentBoost = {};     // PlayerName -> number (0 to 100)
                const currentSpeed = {};     // PlayerName -> number (speed in km/h)
                const lastUpdatePos = {};    // PlayerName -> { x, y, z, time }
                let currentBall = { x: 0, y: 0, z: 0 };
                let ballActorId = null;

                const frames = [];
                const totalFrames = jsonData.Frames.length;

                // We split the parsing into chunks to avoid blocking the main UI thread
                let index = 0;
                const chunkSize = 1000;

                function parseChunk() {
                    const end = Math.min(index + chunkSize, totalFrames);
                    
                    for (let i = index; i < end; i++) {
                        const frame = jsonData.Frames[i];
                        const time = frame.Time;

                        // Handle deletions
                        if (frame.DeletedActorIds) {
                            frame.DeletedActorIds.forEach(id => {
                                if (id === ballActorId) ballActorId = null;
                                delete carToPri[id];
                                delete boostToCar[id];
                            });
                        }

                        // Process updates
                        if (frame.ActorUpdates) {
                            frame.ActorUpdates.forEach(update => {
                                const id = update.Id;

                                // Ball detection
                                if (update.ClassName === 'TAGame.Ball_TA') {
                                    ballActorId = id;
                                }

                                // PRI -> Name mapping
                                if (update['Engine.PlayerReplicationInfo:PlayerName']) {
                                    priToName[id] = update['Engine.PlayerReplicationInfo:PlayerName'];
                                }

                                // Car -> PRI mapping
                                if (update['Engine.Pawn:PlayerReplicationInfo']) {
                                    carToPri[id] = update['Engine.Pawn:PlayerReplicationInfo'].ActorId;
                                }

                                // Boost component -> Car mapping
                                if (update['TAGame.CarComponent_TA:Vehicle']) {
                                    boostToCar[id] = update['TAGame.CarComponent_TA:Vehicle'].ActorId;
                                }

                                // Car RBState Update (Position & Rotation)
                                if (update['TAGame.RBActor_TA:ReplicatedRBState']) {
                                    const rbState = update['TAGame.RBActor_TA:ReplicatedRBState'];
                                    if (rbState.Position) {
                                        const pos = rbState.Position;
                                        const priId = carToPri[id];
                                        const name = priToName[priId];
                                        if (name) {
                                            let yaw = 0;
                                            if (rbState.Rotation) {
                                                const q = rbState.Rotation;
                                                // Convert quaternion to yaw angle (radians)
                                                yaw = Math.atan2(2 * (q.W * q.Z + q.X * q.Y), 1 - 2 * (q.Y * q.Y + q.Z * q.Z));
                                            }
                                            currentPositions[name] = {
                                                x: pos.X,
                                                y: pos.Y,
                                                z: pos.Z,
                                                yaw: yaw
                                            };

                                            // Calculate speed
                                            let speedKmh = 0;
                                            let speedCalculated = false;

                                            // 1. Try linear velocity vector from physics
                                            if (rbState.LinearVelocity) {
                                                const lv = rbState.LinearVelocity;
                                                const mag = Math.sqrt(lv.X*lv.X + lv.Y*lv.Y + lv.Z*lv.Z) / 100;
                                                speedKmh = Math.min(141, Math.round(mag * 0.036));
                                                speedCalculated = true;
                                            }

                                            // 2. Fall back to differential calculations between update steps
                                            if (!speedCalculated && lastUpdatePos[name]) {
                                                const prev = lastUpdatePos[name];
                                                const dt = time - prev.time;
                                                if (dt > 0) {
                                                    const dist = Math.sqrt(
                                                        Math.pow(pos.X - prev.x, 2) +
                                                        Math.pow(pos.Y - prev.y, 2) +
                                                        Math.pow(pos.Z - prev.z, 2)
                                                    );
                                                    speedKmh = Math.min(141, Math.round((dist / dt) * 0.036));
                                                    speedCalculated = true;
                                                }
                                            }

                                            if (speedCalculated) {
                                                currentSpeed[name] = speedKmh;
                                            }

                                            lastUpdatePos[name] = {
                                                x: pos.X,
                                                y: pos.Y,
                                                z: pos.Z,
                                                time: time
                                            };
                                        }
                                    }
                                }

                                // Ball RBState Update (Position)
                                if (id === ballActorId && update['TAGame.RBActor_TA:ReplicatedRBState']) {
                                    const rbState = update['TAGame.RBActor_TA:ReplicatedRBState'];
                                    if (rbState.Position) {
                                        currentBall = {
                                            x: rbState.Position.X,
                                            y: rbState.Position.Y,
                                            z: rbState.Position.Z
                                        };
                                    }
                                }

                                // Boost Replicated Update
                                if (update['TAGame.CarComponent_Boost_TA:ReplicatedBoost']) {
                                    const boostData = update['TAGame.CarComponent_Boost_TA:ReplicatedBoost'];
                                    const carId = boostToCar[id];
                                    const priId = carToPri[carId];
                                    const name = priToName[priId];
                                    if (name) {
                                        // Standard BoostAmount is 0-255. Map to 0-100.
                                        currentBoost[name] = Math.min(100, Math.round((boostData.BoostAmount / 255) * 100));
                                    }
                                }
                            });
                        }

                        // Take frame state snapshot
                        const frameSnapshot = {
                            time: time,
                            ball: { ...currentBall },
                            players: {}
                        };

                        Object.keys(currentPositions).forEach(name => {
                            frameSnapshot.players[name] = {
                                ...currentPositions[name],
                                boost: currentBoost[name] !== undefined ? currentBoost[name] : 33,
                                speed: currentSpeed[name] !== undefined ? currentSpeed[name] : 0
                            };
                        });

                        frames.push(frameSnapshot);
                    }

                    index = end;

                    if (index < totalFrames) {
                        const pct = Math.floor(25 + (index / totalFrames) * 75);
                        if (typeof onProgress === 'function') onProgress(`Indexing frames: ${index}/${totalFrames}`, pct);
                        setTimeout(parseChunk, 0); // Release execution to browser thread
                    } else {
                        if (typeof onProgress === 'function') onProgress('Telemetry compilation complete!', 100);
                        resolve({ meta, frames });
                    }
                }

                // Start chunk parsing loop
                parseChunk();

            } catch (err) {
                reject(err);
            }
        });
    }
}

// Attach to window
window.ReplayParser = ReplayParser;
