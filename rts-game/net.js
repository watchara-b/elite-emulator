// ===== FACTION WARS — Multiplayer Client (Deterministic Lockstep) =====
// Handles WebSocket connection, command queue, and lockstep synchronization.
// All game commands go through this module instead of directly mutating state.

// ===== SEEDED RNG (Deterministic) =====
// Replaces Math.random() for all gameplay logic. Both clients use same seed = same results.
var _rngState = 1;
function seedRNG(s) { _rngState = s | 0 || 1; }
function rng() {
  // Mulberry32
  var t = (_rngState += 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// Deterministic integer range [min, max)
function rngInt(min, max) { return min + Math.floor(rng() * (max - min)); }

// ===== ENTITY ID SYSTEM =====
var _nextEntityId = 1;
function resetEntityIds() { _nextEntityId = 1; }
function assignEntityId(entity) { entity.id = _nextEntityId++; return entity; }
function findEntityById(id) {
  for (var i = 0; i < entities.length; i++) {
    if (entities[i].id === id) return entities[i];
  }
  return null;
}

// ===== COMMAND ABSTRACTION =====
// All player actions become serializable command objects.
var CMD = {
  MOVE: 'mv',
  ATTACK: 'atk',
  ATTACK_MOVE: 'am',
  BUILD: 'bd',
  TRAIN: 'tr',
  DEPLOY: 'dp',
  TELEPORT: 'tp',
  TRANSFORM: 'tf',
  SUPERWEAPON: 'sw',
  SUPERWEAPON_TARGET: 'swt', // player-targeted superweapon
  PING: 'pg',
  SURRENDER: 'sur'
};

function makeCmd(type, data) {
  return { c: type, d: data };
}

// ===== NETWORK STATE =====
var netMode = 'offline';  // 'offline' | 'online'
var netSocket = null;
var netPlayerId = null;
var netSlot = -1;          // 0 = player1 (bottom-left), 1 = player2 (top-right)
var netRoom = null;
var netOpponent = null;
var netConnected = false;
var netTickBuffer = {};    // received ticks from server
var netLocalTick = 0;      // local simulation tick
var netQueueing = false;

// ===== CONNECTION =====
function netConnect(url, onReady) {
  if (netSocket) netSocket.close();
  netSocket = new WebSocket(url || ('ws://' + location.host));
  netSocket.onopen = function() {
    netConnected = true;
    console.log('[Net] Connected');
  };
  netSocket.onmessage = function(ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch(e) { return; }
    handleServerMsg(msg);
  };
  netSocket.onclose = function() {
    netConnected = false;
    netMode = 'offline';
    console.log('[Net] Disconnected');
    if (typeof showMsg === 'function') showMsg('⚠️ Disconnected from server');
    if (typeof onNetDisconnect === 'function') onNetDisconnect();
  };
}

function netSend(msg) {
  if (netSocket && netSocket.readyState === 1) netSocket.send(JSON.stringify(msg));
}

// ===== SERVER MESSAGE HANDLER =====
function handleServerMsg(msg) {
  switch (msg.type) {
    case 'welcome':
      netPlayerId = msg.id;
      if (typeof onNetConnected === 'function') onNetConnected(msg.id);
      break;

    case 'queue_joined':
      netQueueing = true;
      if (typeof onQueueJoined === 'function') onQueueJoined(msg.position);
      break;

    case 'queue_left':
      netQueueing = false;
      break;

    case 'match_found':
      netRoom = msg.roomId;
      netSlot = msg.slot;
      netOpponent = msg.opponent;
      netQueueing = false;
      if (typeof onMatchFound === 'function') onMatchFound(msg);
      break;

    case 'opponent_picked':
      if (typeof onOpponentPicked === 'function') onOpponentPicked(msg.faction);
      break;

    case 'game_start':
      netMode = 'online';
      netLocalTick = 0;
      netTickBuffer = {};
      seedRNG(msg.seed);
      if (typeof onGameStart === 'function') onGameStart(msg);
      break;

    case 'tick':
      netTickBuffer[msg.t] = msg.cmds || [];
      break;

    case 'chat':
      if (typeof onChatMsg === 'function') onChatMsg(msg.from, msg.text);
      break;

    case 'player_left':
      if (typeof showMsg === 'function') showMsg('🏆 Opponent disconnected — you win!');
      netMode = 'offline';
      break;

    case 'game_over':
      var won = msg.winner === netPlayerId;
      if (typeof showMsg === 'function') showMsg(won ? '🏆 VICTORY!' : '💀 DEFEAT! (' + msg.reason + ')');
      netMode = 'offline';
      break;
  }
}

// ===== COMMAND DISPATCH =====
// In online mode, commands are sent to server. In offline mode, executed immediately.
function dispatchCmd(cmd) {
  if (netMode === 'online') {
    netSend({ type: 'cmd', cmd: cmd });
  } else {
    executeCmd(cmd, TEAMS.PLAYER);
  }
}

// Execute a command on the local simulation (called for both local and remote commands)
function executeCmd(cmd, team) {
  switch (cmd.c) {
    case CMD.MOVE: {
      var ids = cmd.d.ids || [];
      for (var i = 0; i < ids.length; i++) {
        var u = findEntityById(ids[i]);
        if (u && u.cat === 'unit' && u.team === team) {
          u.moveTarget = { x: cmd.d.x, y: cmd.d.y };
          u.target = null;
          u._path = null;
        }
      }
      break;
    }
    case CMD.ATTACK: {
      var ids = cmd.d.ids || [];
      var tgt = findEntityById(cmd.d.tid);
      if (!tgt) break;
      for (var i = 0; i < ids.length; i++) {
        var u = findEntityById(ids[i]);
        if (u && u.cat === 'unit' && u.team === team) {
          u.target = tgt;
          u.moveTarget = null;
          u._path = null;
        }
      }
      break;
    }
    case CMD.ATTACK_MOVE: {
      var ids = cmd.d.ids || [];
      for (var i = 0; i < ids.length; i++) {
        var u = findEntityById(ids[i]);
        if (u && u.cat === 'unit' && u.team === team) {
          var enemyTeam = team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
          var nearest = findNearest(u, enemyTeam);
          if (nearest) u.target = nearest;
        }
      }
      break;
    }
    case CMD.BUILD: {
      // cmd.d = { btype, tx, ty }
      var defs = team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS;
      var d = defs[cmd.d.btype];
      if (!d) break;
      var tx = cmd.d.tx, ty = cmd.d.ty;
      if (team === TEAMS.PLAYER) {
        if (!isInBuildRadius(tx, ty, d.w, d.h)) break;
      }
      // Terrain/overlap checks
      var canBuild = true;
      for (var dy = 0; dy < d.h && canBuild; dy++) {
        for (var dx = 0; dx < d.w && canBuild; dx++) {
          var t = map[ty + dy] && map[ty + dy][tx + dx];
          if (t === 2 || t === 6 || t === 4 || t === undefined) canBuild = false;
          if (entities.some(function(e) { return !e.dead && !(e.x + e.w <= tx + dx || e.x > tx + dx || e.y + e.h <= ty + dy || e.y > ty + dy); })) canBuild = false;
        }
      }
      if (!canBuild) break;
      if (team === TEAMS.PLAYER) {
        if (gold < d.cost) break;
        gold -= d.cost;
      }
      if (d.powerGen) power += d.powerGen;
      var ent = new Entity(cmd.d.btype, tx, ty, team);
      assignEntityId(ent);
      entities.push(ent);
      if (team === TEAMS.PLAYER) showMsg(d.name + ' built!');
      break;
    }
    case CMD.TRAIN: {
      var defs = team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS;
      var d = defs[cmd.d.utype];
      if (!d) break;
      if (team === TEAMS.PLAYER && gold < d.cost) break;
      var unitCount = entities.filter(function(e) { return e.cat === 'unit' && e.team === team && !e.dead; }).length;
      var cap = team === TEAMS.PLAYER ? maxUnits : (enemyFaction.maxUnits || 15);
      if (unitCount >= cap) break;
      // Find spawner
      var spawner = entities.find(function(e) { return e.type === (d.from || 'barracks') && e.team === team && !e.dead; });
      if (!spawner) break;
      if (team === TEAMS.PLAYER) gold -= d.cost;
      var u = new Entity(cmd.d.utype, spawner.x + spawner.w, spawner.y, team);
      assignEntityId(u);
      entities.push(u);
      if (team === TEAMS.PLAYER) showMsg(d.name + ' trained!');
      break;
    }
    case CMD.DEPLOY: {
      var mcv = findEntityById(cmd.d.eid);
      if (!mcv || !mcv.isMCV || mcv.team !== team) break;
      if (typeof deployMCV === 'function') deployMCV(mcv);
      break;
    }
    case CMD.TELEPORT: {
      var ids = cmd.d.ids || [];
      for (var i = 0; i < ids.length; i++) {
        var u = findEntityById(ids[i]);
        if (!u || u.team !== team) continue;
        var d = u.getDef();
        if (d.teleport && cmd.d.x !== undefined) {
          spawnExplosion(u.x + 0.5, u.y + 0.5, 6);
          u.x = cmd.d.x; u.y = cmd.d.y;
          u.moveTarget = null;
          spawnExplosion(u.x + 0.5, u.y + 0.5, 8);
          shake(4);
        }
      }
      break;
    }
    case CMD.TRANSFORM: {
      var ids = cmd.d.ids || [];
      for (var i = 0; i < ids.length; i++) {
        var u = findEntityById(ids[i]);
        if (!u || u.team !== team) continue;
        var d = u.getDef();
        if (d.transform) {
          u.transformed = !u.transformed;
          if (u.transformed) {
            u.maxHp = Math.floor(d.hp * 1.5);
            u.hp = Math.min(u.hp + Math.floor(d.hp * 0.3), u.maxHp);
          } else {
            u.maxHp = d.hp;
            u.hp = Math.min(u.hp, u.maxHp);
          }
          spawnExplosion(u.x + 0.5, u.y + 0.5, 10);
          shake(3);
        }
      }
      break;
    }
    case CMD.SUPERWEAPON_TARGET: {
      // Player-targeted superweapon with custom coordinates
      var swKey = team === TEAMS.PLAYER ? 'player' : 'enemy';
      if (!superweaponReady[swKey] || swFiring) break;
      var faction = team === TEAMS.PLAYER ? playerFaction : enemyFaction;
      swFiring = { team: team, tx: cmd.d.x, ty: cmd.d.y, timer: 0, maxTimer: 180, faction: faction };
      if (team === TEAMS.PLAYER) showMsg('⚠️ ' + faction.name + ' SUPERWEAPON TARGETING...');
      else showMsg('🚨 ENEMY SUPERWEAPON INCOMING! 3 seconds to evacuate!');
      superweaponReady[swKey] = false;
      superweaponCharge[swKey] = 0;
      superweaponCooldown[swKey] = 600;
      break;
    }
    case CMD.SUPERWEAPON: {
      fireSuperweapon(team);
      break;
    }
    case CMD.PING: {
      if (typeof addPing === 'function') addPing(cmd.d.x, cmd.d.y, cmd.d.ptype || 'attack');
      break;
    }
  }
}

// ===== LOCKSTEP TICK PROCESSING =====
// Called from game loop in online mode. Waits for server tick before advancing simulation.
function netProcessTick() {
  if (netMode !== 'online') return true; // offline: always proceed
  var tickData = netTickBuffer[netLocalTick];
  if (tickData === undefined) return false; // waiting for server
  // Execute all commands for this tick
  for (var i = 0; i < tickData.length; i++) {
    var cmd = tickData[i];
    // Determine team from player slot
    var room_players = null; // we don't have full room info client-side
    // Use pid to determine team: slot 0 = PLAYER for slot 0, ENEMY for slot 1
    var cmdTeam = (cmd.pid === netPlayerId) ? TEAMS.PLAYER : TEAMS.ENEMY;
    // If we're slot 1, our perspective is flipped
    if (netSlot === 1) {
      cmdTeam = (cmd.pid === netPlayerId) ? TEAMS.PLAYER : TEAMS.ENEMY;
    }
    executeCmd(cmd, cmdTeam);
  }
  delete netTickBuffer[netLocalTick];
  netLocalTick++;
  return true;
}

// ===== HELPER: Get selected entity IDs =====
function getSelectedIds() {
  var ids = [];
  for (var i = 0; i < selectedEntities.length; i++) {
    if (selectedEntities[i].id) ids.push(selectedEntities[i].id);
  }
  return ids;
}

// ===== DESYNC DETECTION =====
// Gap #29: Hash game state periodically and compare between clients
function hashGameState() {
  var h = 0;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead) continue;
    h = (h * 31 + Math.round(e.x * 100)) | 0;
    h = (h * 31 + Math.round(e.y * 100)) | 0;
    h = (h * 31 + Math.round(e.hp)) | 0;
  }
  h = (h * 31 + Math.round(gold)) | 0;
  return h;
}

// ===== LOBBY UI CALLBACKS (set by index.html) =====
var onNetConnected = null;
var onNetDisconnect = null;
var onQueueJoined = null;
var onMatchFound = null;
var onOpponentPicked = null;
var onGameStart = null;
var onChatMsg = null;
