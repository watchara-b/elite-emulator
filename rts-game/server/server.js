// ===== FACTION WARS — Relay Server (Deterministic Lockstep) =====
// Lightweight relay: receives player commands, broadcasts to all clients each tick.
// No game simulation on server — all clients run identical deterministic sim.
// Features: anti-cheat validation, replay recording, spectator mode.

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ===== ANTI-CHEAT: Valid command types & limits =====
const VALID_CMD_TYPES = new Set(['mv', 'atk', 'am', 'bd', 'tr', 'dp', 'tp', 'tf', 'sw', 'swt', 'pg', 'sur']);
const VALID_FACTIONS = new Set(['thailand', 'japan', 'switzerland', 'brazil', 'egypt']);
const MAX_CMD_RATE = 30;       // max commands per second per player
const MAX_IDS_PER_CMD = 50;    // max unit IDs in a single command
const MAX_COORD = 512;         // max map coordinate value

function validateCommand(cmd, player) {
  if (!cmd || typeof cmd !== 'object') return false;
  if (!VALID_CMD_TYPES.has(cmd.c)) return false;
  const d = cmd.d;
  if (d !== undefined && typeof d !== 'object') return false;
  if (d) {
    if (d.x !== undefined && (typeof d.x !== 'number' || !isFinite(d.x) || d.x < 0 || d.x > MAX_COORD)) return false;
    if (d.y !== undefined && (typeof d.y !== 'number' || !isFinite(d.y) || d.y < 0 || d.y > MAX_COORD)) return false;
    if (d.ids && (!Array.isArray(d.ids) || d.ids.length > MAX_IDS_PER_CMD || d.ids.some(id => typeof id !== 'number'))) return false;
    if (d.btype && typeof d.btype !== 'string') return false;
    if (d.utype && typeof d.utype !== 'string') return false;
  }
  // Rate limiting
  const now = Date.now();
  if (now - player.cmdWindowStart > 1000) { player.cmdWindowStart = now; player.cmdCount = 0; }
  if (++player.cmdCount > MAX_CMD_RATE) return false;
  return true;
}

// ===== REPLAY SYSTEM =====
const REPLAY_DIR = path.join(__dirname, 'replays');
if (!fs.existsSync(REPLAY_DIR)) fs.mkdirSync(REPLAY_DIR);

function saveReplay(room) {
  if (!room.replayLog || room.replayLog.length === 0) return null;
  const replay = {
    roomId: room.id, seed: room.seed, mapId: room.mapId,
    players: room.players.map((p, i) => ({ id: p.id, name: p.name, faction: p.faction, slot: i })),
    totalTicks: room.tick,
    ticks: room.replayLog
  };
  const filename = `replay_${room.id}_${Date.now()}.json`;
  fs.writeFileSync(path.join(REPLAY_DIR, filename), JSON.stringify(replay));
  console.log(`[Replay] Saved ${filename}`);
  return filename;
}

// Database — auto-detect PostgreSQL (via DATABASE_URL) or fallback to SQLite
let db = null;
if (process.env.DATABASE_URL) {
  try { db = require('./db-pg'); console.log('[DB] PostgreSQL connected'); }
  catch(e) { console.log('[DB] PostgreSQL failed:', e.message); }
}
if (!db) {
  try { db = require('./db'); console.log('[DB] SQLite loaded'); }
  catch(e) { console.log('[DB] No database available, running without persistence'); }
}

// Session cache — auto-detect Redis (via REDIS_URL) or use in-memory
const SessionCache = require('./session-cache');
let cache;
if (process.env.REDIS_URL) {
  console.log('[Cache] REDIS_URL set — for production, install ioredis and replace session-cache');
}
cache = new SessionCache();
console.log('[Cache] In-memory session cache active');

// Serve game files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// ===== MATCHMAKING & ROOMS =====
let nextRoomId = 1;
let nextPlayerId = 1;
const rooms = new Map();     // roomId -> Room
const players = new Map();   // ws -> Player
const lobby = [];            // players waiting for match

class Room {
  constructor(id) {
    this.id = id;
    this.players = [];       // [Player, Player]
    this.spectators = [];    // read-only WebSocket watchers
    this.state = 'waiting';  // waiting | picking | running | ended
    this.tick = 0;
    this.commandBuffer = {}; // tick -> [commands]
    this.lockstepDelay = 3;  // commands execute N ticks in future
    this.tickInterval = null;
    this.mapId = 0;
    this.seed = Math.floor(Math.random() * 2147483647);
    this.replayLog = [];     // [{t, cmds}] for replay recording
  }

  broadcast(msg, exclude) {
    const data = JSON.stringify(msg);
    for (const p of this.players) {
      if (p.ws !== exclude && p.ws.readyState === 1) p.ws.send(data);
    }
  }

  broadcastAll(msg) {
    const data = JSON.stringify(msg);
    for (const p of this.players) {
      if (p.ws.readyState === 1) p.ws.send(data);
    }
    for (const s of this.spectators) {
      if (s.readyState === 1) s.send(data);
    }
  }

  startGame() {
    this.state = 'running';
    this.tick = 0;
    this.broadcastAll({
      type: 'game_start',
      seed: this.seed,
      mapId: this.mapId,
      players: this.players.map((p, i) => ({
        id: p.id, name: p.name, faction: p.faction, slot: i
      }))
    });
    // Tick relay at 60fps (16.67ms)
    this.tickInterval = setInterval(() => this.serverTick(), 1000 / 60);
  }

  serverTick() {
    if (this.state !== 'running') return;
    const cmds = this.commandBuffer[this.tick] || [];
    // Record tick for replay
    if (cmds.length > 0) this.replayLog.push({ t: this.tick, cmds });
    this.broadcastAll({ type: 'tick', t: this.tick, cmds });
    delete this.commandBuffer[this.tick];
    this.tick++;
  }

  queueCommand(playerId, cmd) {
    const execTick = this.tick + this.lockstepDelay;
    cmd.pid = playerId;
    cmd.t = execTick;
    if (!this.commandBuffer[execTick]) this.commandBuffer[execTick] = [];
    this.commandBuffer[execTick].push(cmd);
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.state = 'ended';
    this.replayFile = saveReplay(this);
    // Notify spectators the game ended
    for (const s of this.spectators) {
      if (s.readyState === 1) s.send(JSON.stringify({ type: 'spectate_ended' }));
    }
    this.spectators = [];
  }

  removePlayer(player) {
    this.players = this.players.filter(p => p !== player);
    if (this.state === 'running') {
      var winner = this.players[0];
      this.broadcast({ type: 'player_left', pid: player.id });
      if (db && winner) {
        db.recordMatch(player.name, winner.name, player.faction, winner.faction, winner.name, 'disconnect', this.tick, this.mapId);
      }
      this.stop();
    }
  }

  removeSpectator(ws) {
    this.spectators = this.spectators.filter(s => s !== ws);
  }
}

class Player {
  constructor(ws, id) {
    this.ws = ws;
    this.id = id;
    this.name = 'Player ' + id;
    this.faction = null;
    this.room = null;
    this.elo = 1000;
    this.cmdCount = 0;
    this.cmdWindowStart = Date.now();
    this.isSpectator = false;
    // Store session in cache with 30-min TTL
    cache.set('session:' + id, { id, name: this.name, connectedAt: Date.now() }, 1800);
  }
}

// ===== MATCHMAKING =====
function tryMatch() {
  while (lobby.length >= 2) {
    // Simple ELO-based: sort by ELO, pair adjacent
    lobby.sort((a, b) => a.elo - b.elo);
    const p1 = lobby.shift();
    const p2 = lobby.shift();
    const room = new Room(nextRoomId++);
    room.players = [p1, p2];
    p1.room = room;
    p2.room = room;
    rooms.set(room.id, room);
    room.state = 'picking';
    // Notify both players
    const msg = {
      type: 'match_found',
      roomId: room.id,
      opponent: null,
      seed: room.seed
    };
    p1.ws.send(JSON.stringify({ ...msg, slot: 0, opponent: { name: p2.name, elo: p2.elo } }));
    p2.ws.send(JSON.stringify({ ...msg, slot: 1, opponent: { name: p1.name, elo: p1.elo } }));
    console.log(`[Match] Room ${room.id}: ${p1.name} vs ${p2.name}`);
  }
}

// ===== WEBSOCKET HANDLER =====
wss.on('connection', (ws) => {
  const player = new Player(ws, nextPlayerId++);
  players.set(ws, player);
  ws.send(JSON.stringify({ type: 'welcome', id: player.id }));
  console.log(`[Connect] Player ${player.id}`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'set_name':
        player.name = (msg.name || '').slice(0, 20) || player.name;
        if (db) {
          db.ensurePlayer(player.name);
          player.elo = db.getPlayerElo(player.name);
        }
        ws.send(JSON.stringify({ type: 'profile', name: player.name, elo: player.elo }));
        break;

      case 'find_match':
        if (player.room) break;
        if (!lobby.includes(player)) lobby.push(player);
        ws.send(JSON.stringify({ type: 'queue_joined', position: lobby.length }));
        tryMatch();
        break;

      case 'cancel_match':
        const idx = lobby.indexOf(player);
        if (idx >= 0) lobby.splice(idx, 1);
        ws.send(JSON.stringify({ type: 'queue_left' }));
        break;

      case 'pick_faction':
        if (!player.room || player.room.state !== 'picking') break;
        if (!VALID_FACTIONS.has(msg.faction)) break;
        player.faction = msg.faction;
        player.room.broadcast({ type: 'opponent_picked', faction: msg.faction }, ws);
        // Check if both picked
        if (player.room.players.every(p => p.faction)) {
          player.room.mapId = msg.mapId || 0;
          player.room.startGame();
        }
        break;

      case 'cmd':
        // Anti-cheat: validate command before relaying
        if (!player.room || player.room.state !== 'running') break;
        if (player.isSpectator) break;
        if (!validateCommand(msg.cmd, player)) {
          player.violations = (player.violations || 0) + 1;
          if (player.violations >= 10) {
            ws.send(JSON.stringify({ type: 'kicked', reason: 'anti-cheat' }));
            ws.close();
          }
          break;
        }
        player.room.queueCommand(player.id, msg.cmd);
        break;

      case 'chat':
        if (!player.room) break;
        player.room.broadcast({ type: 'chat', from: player.name, text: (msg.text || '').slice(0, 200) }, ws);
        break;

      case 'surrender':
        if (!player.room || player.room.state !== 'running') break;
        if (player.isSpectator) break;
        var winner = player.room.players.find(p => p !== player);
        player.room.broadcastAll({ type: 'game_over', winner: winner?.id, reason: 'surrender' });
        // Record match in database
        if (db && winner) {
          var p1 = player.room.players[0], p2 = player.room.players[1];
          var result = db.recordMatch(p1.name, p2.name, p1.faction, p2.faction, winner.name, 'surrender', player.room.tick, player.room.mapId);
          winner.elo = result.winnerElo;
          player.elo = result.loserElo;
        }
        player.room.stop();
        break;

      case 'spectate':
        // Join a running room as read-only spectator
        if (player.room) break;
        const targetRoom = rooms.get(msg.roomId);
        if (!targetRoom || targetRoom.state !== 'running') {
          ws.send(JSON.stringify({ type: 'spectate_error', reason: 'room_not_found' }));
          break;
        }
        player.isSpectator = true;
        player.room = targetRoom;
        targetRoom.spectators.push(ws);
        ws.send(JSON.stringify({
          type: 'spectate_start',
          roomId: targetRoom.id, seed: targetRoom.seed, mapId: targetRoom.mapId,
          tick: targetRoom.tick,
          players: targetRoom.players.map((p, i) => ({ id: p.id, name: p.name, faction: p.faction, slot: i }))
        }));
        console.log(`[Spectate] Player ${player.id} watching Room ${targetRoom.id}`);
        break;
    }
  });

  ws.on('close', () => {
    // Remove from lobby
    const idx = lobby.indexOf(player);
    if (idx >= 0) lobby.splice(idx, 1);
    // Remove from room (player or spectator)
    if (player.room) {
      if (player.isSpectator) {
        player.room.removeSpectator(ws);
      } else {
        player.room.removePlayer(player);
        if (player.room.players.length === 0 && player.room.spectators.length === 0) rooms.delete(player.room.id);
      }
    }
    players.delete(ws);
    console.log(`[Disconnect] Player ${player.id}${player.isSpectator ? ' (spectator)' : ''}`);
  });
});

// ===== REST API (Leaderboard / Stats) =====
app.get('/api/leaderboard', (req, res) => {
  if (db) {
    res.json(db.getLeaderboard(50));
  } else {
    res.json([]);
  }
});

app.get('/api/rooms', (req, res) => {
  const active = [];
  rooms.forEach(r => {
    if (r.state === 'running') {
      active.push({ id: r.id, players: r.players.map(p => ({ name: p.name, faction: p.faction })), tick: r.tick, spectators: r.spectators.length });
    }
  });
  res.json(active);
});

app.get('/api/replays', (req, res) => {
  try {
    const files = fs.readdirSync(REPLAY_DIR).filter(f => f.endsWith('.json')).sort().reverse().slice(0, 50);
    res.json(files);
  } catch { res.json([]); }
});

app.get('/api/replays/:filename', (req, res) => {
  const file = path.basename(req.params.filename);
  const filePath = path.join(REPLAY_DIR, file);
  if (!file.endsWith('.json') || !fs.existsSync(filePath)) return res.status(404).json({ error: 'not found' });
  res.sendFile(filePath);
});

app.get('/api/player/:name', (req, res) => {
  if (db) {
    var stats = db.getPlayerStats(req.params.name);
    var history = db.getMatchHistory(req.params.name, 20);
    res.json({ stats: stats || null, history });
  } else {
    res.json({ stats: null, history: [] });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({
    sessions: cache.dbsize(),
    onlinePlayers: players.size,
    activeRooms: [...rooms.values()].filter(r => r.state === 'running').length,
    lobbySize: lobby.length
  });
});

// ===== START =====
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`[Server] Faction Wars relay on port ${PORT}`));
