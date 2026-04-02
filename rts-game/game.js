// ===== CONSTANTS & STATE =====
// Fallback RNG if net.js not loaded
if (typeof rng !== 'function') { var rng = Math.random; }
if (typeof assignEntityId !== 'function') { var assignEntityId = function(e) { return e; }; }
const TILE = 32, MAP_W = 100, MAP_H = 80;
const TEAMS = { PLAYER: 0, ENEMY: 1 };
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

let camX = 0, camY = 0, screenW, screenH;
let gold = 1000, power = 10, maxUnits = 20;
let entities = [], selectedEntities = [], placingType = null;
let selBox = null, gameTime = 0;
let mouseX = 0, mouseY = 0, mouseDown = false, dragStart = null;
const keys = {};

// Minimap Ping System
const pings = [];
function addPing(x, y, type) {
  // type: 'attack' (red), 'defend' (yellow), 'move' (green)
  var colors = { attack: '#ff3333', defend: '#ffcc00', move: '#33ff66' };
  pings.push({ x: x, y: y, color: colors[type] || '#fff', life: 120, maxLife: 120, type: type });
}

// Superweapon System
var superweaponCharge = {};  // { player: 0, enemy: 0 }
var SUPERWEAPON_CHARGE_TIME = 1800; // 30 seconds at 60fps
var superweaponReady = { player: false, enemy: false };
var superweaponCooldown = { player: 0, enemy: 0 };

// Superweapon firing buildup state
var swFiring = null; // { team, tx, ty, timer, maxTimer, faction }

// Superweapon targeting mode (player clicks to choose impact point)
var swTargeting = false; // true when player is choosing target location

// MCV & Build Radius
let mcvDeployed = false;
let enemyMCVDeployed = false;
const BUILD_RADIUS = 6; // tiles around each building

function isInBuildRadius(tx, ty, tw, th) {
  // Before MCV deployed, can't build anything
  if (!mcvDeployed) return false;
  // Check if any tile of the new building is within BUILD_RADIUS of any player building
  for (const e of entities) {
    if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'building') continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    for (let dy = 0; dy < th; dy++) {
      for (let dx = 0; dx < tw; dx++) {
        if (Math.hypot(tx + dx + 0.5 - cx, ty + dy + 0.5 - cy) <= BUILD_RADIUS) return true;
      }
    }
  }
  return false;
}

function deployMCV(mcv) {
  const tx = Math.floor(mcv.x), ty = Math.floor(mcv.y);
  const d = DEFS.hq;
  // Check space for HQ (3x3)
  if (tx < 0 || ty < 0 || tx + d.w > MAP_W || ty + d.h > MAP_H) return showMsg("Can't deploy here!");
  for (let dy2 = 0; dy2 < d.h; dy2++) for (let dx2 = 0; dx2 < d.w; dx2++) {
    const t = map[ty + dy2][tx + dx2];
    if (t === 2 || t === 6 || t === 4) return showMsg("Can't deploy on this terrain!");
  }
  // Remove MCV, place HQ
  mcv.dead = true;
  entities.push(new Entity('hq', tx, ty, TEAMS.PLAYER));
  mcvDeployed = true;
  showMsg('🏗️ HQ deployed! Build your base!');
  updateBuildPanel();
}

// Faction state
let playerFaction = null, enemyFaction = null;
let DEFS = {}; // active player defs
let ENEMY_DEFS = {}; // enemy defs
let gameStarted = false;

// Map
const map = [];
generateMap(map, MAP_W, MAP_H);
if (typeof generateMapObjects === 'function') generateMapObjects(map, MAP_W, MAP_H);

// ===== ENTITY =====
class Entity {
  constructor(type, x, y, team) {
    const defs = team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS;
    const d = defs[type];
    this.type = type; this.team = team;
    this.x = x; this.y = y;
    this.hp = d.hp; this.maxHp = d.hp;
    this.cat = d.cat;
    this.atkCooldown = 0; this.target = null;
    this.moveTarget = null; this.dead = false;
    this.stealthed = !!d.stealth;
    this.slowed = 0;
    this.burning = 0;
    this.confused = 0;   // Confused: attacks own team
    this.frozen = 0;     // Frozen: can't move or attack
    this.transformed = false; // Transform state (Kaiju-Carrier)
    // Smooth rendering
    this.renderX = x; this.renderY = y;
    // Harvester state
    this.cargo = 0;
    this.harvestState = d.harvester ? 'seek' : null; // seek, harvest, return
    this.harvestTimer = 0;
    this.homeRefinery = null;
    this.oreTarget = null;
    if (d.cat === 'building') { this.w = d.w; this.h = d.h; }
    else { this.w = 1; this.h = 1; }
    // Ability state
    if (typeof initAbilityState === 'function') initAbilityState(this);
    this.homeRefinery = null;
    this.oreTarget = null;
    if (d.cat === 'building') { this.w = d.w; this.h = d.h; }
    else { this.w = 1; this.h = 1; }
    // Assign unique ID for multiplayer serialization
    if (typeof assignEntityId === 'function') assignEntityId(this);
  }
  getDef() {
    if (this.isMCV) return { speed: 1.2, hp: 600, cat: 'unit', icon: '🚛', name: 'MCV', armorType: 'heavy' };
    return (this.team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS)[this.type];
  }
}

// ===== RESIZE =====
function resize() {
  screenW = window.innerWidth; screenH = window.innerHeight - 140;
  canvas.width = screenW; canvas.height = screenH;
  // Enable high-quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  miniCanvas.width = 140; miniCanvas.height = 130;
  miniCtx.imageSmoothingEnabled = true;
}
resize();
window.addEventListener('resize', resize);

// ===== MAP SELECTION =====
(function initMapSelect() {
  if (typeof MAP_PRESETS === 'undefined') return;
  var dd = document.getElementById('map-dropdown');
  if (!dd) return;

  var TC = {0:'#2d5a1e',1:'#c8a832',2:'#1a4a7a',3:'#1a4a1a',4:'#555',5:'#c8b070',6:'#0a2a5a',7:'#888',8:'#2d5a1e'};
  var pw = 100, ph = 80;

  // Pre-generate all maps
  var mapCache = [];
  MAP_PRESETS.forEach(function(m, i) {
    var tmp = [];
    for (var y = 0; y < ph; y++) { tmp[y] = []; for (var x2 = 0; x2 < pw; x2++) tmp[y][x2] = 0; }
    var saved = currentMapId;
    currentMapId = i;
    try { generateMap(tmp, pw, ph); } catch(e) {}
    currentMapId = saved;
    mapCache.push(tmp);
  });

  // Populate dropdown
  MAP_PRESETS.forEach(function(m, i) {
    var opt = document.createElement('option');
    opt.value = i; opt.textContent = m.name;
    dd.appendChild(opt);
  });

  function renderPreview(idx) {
    var cv = document.getElementById('map-preview-canvas');
    if (!cv) return;
    var cx = cv.getContext('2d');
    var tmp = mapCache[idx];
    var sx = cv.width / pw, sy = cv.height / ph;

    // Clear
    cx.fillStyle = '#0a0e14';
    cx.fillRect(0, 0, cv.width, cv.height);

    // Draw terrain
    for (var y = 0; y < ph; y++) {
      for (var x2 = 0; x2 < pw; x2++) {
        cx.fillStyle = TC[tmp[y][x2]] || '#2d5a1e';
        cx.fillRect(x2 * sx, y * sy, sx + 0.5, sy + 0.5);
      }
    }

    // Spawn markers (subtle, no glow)
    cx.strokeStyle = '#4cf'; cx.lineWidth = 1.5;
    cx.strokeRect(4 * sx, 3 * sy, 3 * sx, 3 * sy);
    cx.strokeStyle = '#f44';
    cx.strokeRect((pw - 6) * sx, (ph - 6) * sy, 3 * sx, 3 * sy);

    // Labels
    cx.fillStyle = 'rgba(255,255,255,0.6)'; cx.font = '9px sans-serif';
    cx.fillText('P1', 4 * sx + 1, 3 * sy - 2);
    cx.fillText('P2', (pw - 6) * sx + 1, (ph - 6) * sy - 2);

    // Grid overlay
    cx.strokeStyle = 'rgba(68,204,255,0.06)'; cx.lineWidth = 0.5;
    for (var gx = 0; gx < pw; gx += 10) { cx.beginPath(); cx.moveTo(gx * sx, 0); cx.lineTo(gx * sx, cv.height); cx.stroke(); }
    for (var gy = 0; gy < ph; gy += 10) { cx.beginPath(); cx.moveTo(0, gy * sy); cx.lineTo(cv.width, gy * sy); cx.stroke(); }

    // Description
    var desc = document.getElementById('map-preview-desc');
    if (desc) desc.textContent = MAP_PRESETS[idx].desc;
  }

  dd.onchange = function() {
    currentMapId = parseInt(dd.value);
    renderPreview(currentMapId);
  };

  // Initial render
  renderPreview(0);
})();

// ===== START GAME =====
function startGame(factionId, mapId, seed) {
  // Seed RNG for deterministic simulation
  if (typeof seedRNG === 'function') seedRNG(seed || Date.now());
  if (typeof resetEntityIds === 'function') resetEntityIds();

  // Set map preset if provided
  if (mapId !== undefined && typeof currentMapId !== 'undefined') currentMapId = mapId;

  // Regenerate map with selected preset
  map.length = 0;
  generateMap(map, MAP_W, MAP_H);
  if (typeof generateMapObjects === 'function') generateMapObjects(map, MAP_W, MAP_H);

  const factionKeys = Object.keys(FACTIONS);
  playerFaction = FACTIONS[factionId];
  const enemyChoices = factionKeys.filter(k => k !== factionId);
  const enemyId = enemyChoices[Math.floor(rng() * enemyChoices.length)];
  enemyFaction = FACTIONS[enemyId];

  DEFS = playerFaction.defs;
  ENEMY_DEFS = enemyFaction.defs;
  gold = playerFaction.startGold;
  power = playerFaction.startPower;
  maxUnits = playerFaction.maxUnits;

  // Start with MCV instead of pre-built base
  entities = [];
  const mcv = new Entity('harvester', 5, 4, TEAMS.PLAYER); // reuse harvester stats temporarily
  mcv.type = 'mcv'; mcv.isMCV = true; mcv.cat = 'unit';
  mcv.hp = 600; mcv.maxHp = 600; mcv.w = 1; mcv.h = 1;
  mcv.harvestState = null; mcv.cargo = 0;
  entities.push(mcv);

  // Enemy also starts with MCV
  const eMcv = new Entity('harvester', MAP_W - 5, MAP_H - 5, TEAMS.ENEMY);
  eMcv.type = 'mcv'; eMcv.isMCV = true; eMcv.cat = 'unit';
  eMcv.hp = 600; eMcv.maxHp = 600; eMcv.w = 1; eMcv.h = 1;
  eMcv.harvestState = null; eMcv.cargo = 0;
  entities.push(eMcv);
  enemyMCVDeployed = false;

  // Hide faction screen, show game UI
  document.getElementById('faction-screen').style.display = 'none';
  document.getElementById('ui').style.display = 'flex';
  document.getElementById('resources').style.display = 'flex';
  document.getElementById('chat-panel').style.display = 'flex';
  document.getElementById('audio-controls').style.display = 'flex';
  const fl = document.getElementById('faction-label');
  fl.style.display = 'block';
  fl.innerHTML = `${playerFaction.flag} <b>${playerFaction.name}</b> vs ${enemyFaction.flag} <b>${enemyFaction.name}</b>`;
  fl.style.borderColor = playerFaction.color;

  gameStarted = true;
  mcvDeployed = false;
  if (typeof initFog === 'function') initFog();
  if (typeof initAudio === 'function') initAudio();
  if (typeof initTechDerricks === 'function') initTechDerricks();
  if (typeof initCryptoMines === 'function') initCryptoMines();
  if (typeof initWeather === 'function') initWeather();
  Object.keys(spriteCache).forEach(k => delete spriteCache[k]);
  updateBuildPanel();
  showMsg('🚛 Right-click to move MCV, then select it and click DEPLOY to build your base!');
  gameLoop();
}

// ===== UI =====
function showMsg(text) {
  const el = document.getElementById('msg');
  el.textContent = text; el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display = 'none', 2500);
}

function updateBuildPanel() {
  const panel = document.getElementById('build-panel');
  panel.innerHTML = '';

  // MCV Deploy button
  if (!mcvDeployed) {
    const mcv = selectedEntities.find(e => e.isMCV && !e.dead);
    if (mcv) {
      const btn = document.createElement('div');
      btn.className = 'build-btn';
      btn.style.width = '120px';
      btn.style.background = '#2a4a2a';
      btn.style.borderColor = '#4f4';
      btn.innerHTML = '<span class="icon">🏗️</span><span>DEPLOY HQ</span><span class="cost">FREE</span>';
      btn.onclick = () => deployMCV(mcv);
      panel.appendChild(btn);
    } else {
      const hint = document.createElement('div');
      hint.style.cssText = 'color:#aaa;font-size:12px;padding:16px;';
      hint.textContent = '← Select your MCV and click DEPLOY to start building';
      panel.appendChild(hint);
    }
    return;
  }

  // Categorize build items
  var categories = { '🏗 Buildings': [], '🎖 Infantry': [], '🚗 Vehicles': [], '✈ Air/Naval': [] };
  for (const t of playerFaction.buildOrder) {
    const d = DEFS[t];
    if (!d) continue;
    const hasReq = !d.req || entities.some(e => e.type === d.req && e.team === TEAMS.PLAYER && !e.dead);
    const hasFrom = !d.from || entities.some(e => e.type === d.from && e.team === TEAMS.PLAYER && !e.dead);
    if (!hasReq || !hasFrom) continue;
    if (d.cat === 'building') categories['🏗 Buildings'].push(t);
    else if (d.from === 'barracks') categories['🎖 Infantry'].push(t);
    else if (d.flying || d.armorType === 'air' || ['air','bomber','gunboat','battleship'].includes(t)) categories['✈ Air/Naval'].push(t);
    else categories['🚗 Vehicles'].push(t);
  }
  for (var catName in categories) {
    var items = categories[catName];
    if (items.length === 0) continue;
    var header = document.createElement('div');
    header.style.cssText = 'color:#888;font-size:10px;width:100%;padding:2px 4px;border-bottom:1px solid #333;margin-top:4px;';
    header.textContent = catName;
    panel.appendChild(header);
    for (var ci = 0; ci < items.length; ci++) {
      (function(t) {
      var d = DEFS[t];
      if (!d) return;
      var canAfford = gold >= d.cost;
      var unitCount = entities.filter(function(e) { return e.cat === 'unit' && e.team === TEAMS.PLAYER && !e.dead; }).length;
      var atCap = d.cat === 'unit' && unitCount >= maxUnits;
      var ok = canAfford && !atCap;
      var btn = document.createElement('div');
      btn.className = 'build-btn' + (ok ? '' : ' disabled');

      var specialTag = '';
      if (d.teleport) specialTag = '<span class="special">TELEPORT</span>';
      else if (d.chain) specialTag = '<span class="special">CHAIN</span>';
      else if (d.splash) specialTag = '<span class="special">SPLASH</span>';
      else if (d.confused) specialTag = '<span class="special">CONFUSE</span>';
      else if (d.slow) specialTag = '<span class="special">SLOW</span>';
      else if (d.stealth) specialTag = '<span class="special">STEALTH</span>';
      else if (d.melee) specialTag = '<span class="special">MELEE</span>';
      else if (d.flying) specialTag = '<span class="special">FLY</span>';
      else if (d.armor) specialTag = '<span class="special">ARMOR ' + Math.round(d.armor*100) + '%</span>';
      else if (d.reveal) specialTag = '<span class="special">REVEAL</span>';
      else if (d.transform) specialTag = '<span class="special">TRANSFORM</span>';
      else if (d.harvester) specialTag = '<span class="special">HARVEST</span>';
      else if (d.burn) specialTag = '<span class="special">BURN</span>';
      else if (d.drain) specialTag = '<span class="special">DRAIN</span>';
      else if (d.heal) specialTag = '<span class="special">HEAL</span>';
      else if (d.repair) specialTag = '<span class="special">REPAIR</span>';
      else if (d.amphibious) specialTag = '<span class="special">AMPHIBIOUS</span>';

      btn.innerHTML = '<span class="icon">' + d.icon + '</span><span>' + d.name + '</span><span class="cost">$' + d.cost + '</span>' + specialTag;
      btn.onclick = function() {
        if (gold < d.cost) return;
        if (d.cat === 'building') placingType = t;
        else trainUnit(t);
      };
      panel.appendChild(btn);
      })(items[ci]);
    }
  }
}

// Build queue system
var buildQueue = []; // { type, timer, maxTimer, spawner }
var BUILD_TIME_MULT = 3; // frames per gold cost (e.g., 100 gold = 300 frames = 5 seconds)

function trainUnit(type) {
  const d = DEFS[type];
  const unitCount = entities.filter(e => e.cat === 'unit' && e.team === TEAMS.PLAYER && !e.dead).length;
  if (unitCount + buildQueue.length >= maxUnits) return showMsg('Unit cap reached!');
  if (gold < d.cost) return showMsg('Not enough gold!');
  if (buildQueue.length >= 5) return showMsg('Build queue full! (max 5)');
  const spawner = entities.find(e => e.type === d.from && e.team === TEAMS.PLAYER && !e.dead);
  if (!spawner) return;
  gold -= d.cost;
  buildQueue.push({ type: type, timer: 0, maxTimer: Math.max(60, d.cost * BUILD_TIME_MULT), spawner: spawner });
  showMsg(`${d.name} queued!`);
  if (typeof sfxClick === 'function') sfxClick();
}

function updateBuildQueue() {
  if (buildQueue.length === 0) return;
  var item = buildQueue[0];
  item.timer++;
  if (item.timer >= item.maxTimer) {
    buildQueue.shift();
    var d = DEFS[item.type];
    if (!d) return;
    var spawner = item.spawner;
    if (!spawner || spawner.dead) spawner = entities.find(e => e.type === d.from && e.team === TEAMS.PLAYER && !e.dead);
    if (!spawner) return;
    var sx = spawner.x + spawner.w, sy = spawner.y + Math.floor(spawner.h / 2);
    var offsets = [[1,0],[0,1],[1,1],[-1,0],[0,-1],[1,-1],[-1,1],[-1,-1]];
    for (var i = 0; i < offsets.length; i++) {
      var cx = spawner.x + (offsets[i][0] > 0 ? spawner.w : offsets[i][0] < 0 ? -1 : 0);
      var cy = spawner.y + (offsets[i][1] > 0 ? spawner.h : offsets[i][1] < 0 ? -1 : Math.floor(spawner.h/2));
      if (cx >= 0 && cy >= 0 && cx < MAP_W && cy < MAP_H) {
        var t = map[Math.floor(cy)][Math.floor(cx)];
        if (t !== 2 && t !== 6 && t !== 4) { sx = cx; sy = cy; break; }
      }
    }
    var u = new Entity(item.type, sx, sy, TEAMS.PLAYER);
    if (d.harvester) u.homeRefinery = spawner;
    entities.push(u);
    showMsg(d.name + ' ready!');
    if (typeof sfxTrain === 'function') sfxTrain();
    if (typeof playVoiceLine === 'function') playVoiceLine('ready');
  }
}

function updateInfoPanel() {
  const panel = document.getElementById('info-panel');
  if (selectedEntities.length === 0) {
    panel.innerHTML = '<div class="name">Select a unit or building</div>';
    return;
  }
  if (selectedEntities.length === 1) {
    const e = selectedEntities[0]; const d = e.getDef();
    const pct = Math.max(0, (e.hp / e.maxHp) * 100);
    const color = pct > 60 ? '#0f0' : pct > 30 ? '#fc0' : '#f00';
    let abilities = [];
    if (d.teleport) abilities.push('⚡ Teleport');
    if (d.chain) abilities.push('⚡ Chain Lightning');
    if (d.splash) abilities.push('💥 Splash DMG');
    if (d.confused) abilities.push('😵 Confuse');
    if (d.slow) abilities.push('❄ Slow Enemy');
    if (d.stealth) abilities.push('🥷 Stealth');
    if (d.armor) abilities.push(`🛡 Armor ${Math.round(d.armor*100)}%`);
    if (d.flying) abilities.push('🛩 Flying');
    if (d.melee) abilities.push('🐻 Melee');
    if (d.reveal) abilities.push('👁 Reveal');
    if (d.transform) abilities.push('🤖 Transform [T]');
    if (d.burn) abilities.push('🔥 Burn');
    if (d.drain) abilities.push('👁 Life Drain');
    if (d.heal) abilities.push('💊 Heal +' + d.heal);
    if (d.repair) abilities.push('🔧 Repair +' + d.repair);
    // Status effects
    var statuses = [];
    if (e.confused > 0) statuses.push('😵 Confused');
    if (e.frozen > 0) statuses.push('🧊 Frozen');
    if (e.transformed) statuses.push('🤖 Transformed');
    if (e.burning > 0) statuses.push('🔥 Burning');
    if (e.slowed > 0) statuses.push('❄ Slowed');
    panel.innerHTML = `<div class="name">${d.icon} ${d.name}</div>
      <div>HP: ${Math.ceil(e.hp)}/${e.maxHp}</div>
      <div class="hp-bar"><div class="hp-fill" style="width:${pct}%;background:${color}"></div></div>
      ${d.atk ? `<div>ATK: ${d.atk}${e.transformed ? ' (x1.5)' : ''} | Range: ${d.range}</div>` : ''}
      ${d.speed ? `<div>Speed: ${d.speed}</div>` : ''}
      ${d.dmgType ? `<div style="color:#f80">⚔ ${d.dmgType}</div>` : ''}
      ${d.armorType ? `<div style="color:#08f">🛡 ${d.armorType}</div>` : ''}
      ${d.harvester ? `<div style="color:#fc0">Cargo: ${Math.floor(e.cargo)}/${d.capacity} [${e.harvestState}]</div>` : ''}
      ${abilities.length ? `<div style="color:#f0a;margin-top:4px">${abilities.join(' ')}</div>` : ''}
      ${statuses.length ? `<div style="color:#f44;margin-top:2px">${statuses.join(' ')}</div>` : ''}`;
  } else {
    panel.innerHTML = `<div class="name">${selectedEntities.length} units selected</div>`;
  }
}

// ===== INPUT =====
canvas.addEventListener('mousedown', e => {
  if (!gameStarted) return;
  if (e.button === 0) {
    // Superweapon targeting: click to fire at location
    if (swTargeting) {
      var wx = worldX(e.clientX), wy = worldY(e.clientY);
      swTargeting = false;
      if (typeof dispatchCmd === 'function' && netMode === 'online') {
        dispatchCmd(makeCmd(CMD.SUPERWEAPON_TARGET, { x: wx, y: wy }));
      } else {
        fireSuperweaponAt(TEAMS.PLAYER, wx, wy);
      }
      return;
    }
    if (placingType) { placeBuilding(); return; }
    mouseDown = true;
    dragStart = { x: e.clientX, y: e.clientY };
    selBox = null;
  }
  if (e.button === 2) rightClick(e);
});
canvas.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (mouseDown && dragStart) {
    selBox = {
      x1: Math.min(dragStart.x, e.clientX), y1: Math.min(dragStart.y, e.clientY),
      x2: Math.max(dragStart.x, e.clientX), y2: Math.max(dragStart.y, e.clientY)
    };
  }
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0 && mouseDown) {
    mouseDown = false;
    if (selBox && (selBox.x2 - selBox.x1 > 5 || selBox.y2 - selBox.y1 > 5)) boxSelect();
    else clickSelect(e);
    selBox = null; dragStart = null;
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Minimap click: left = jump camera, right = ping
miniCanvas.addEventListener('mousedown', function(e) {
  if (!gameStarted) return;
  var rect = miniCanvas.getBoundingClientRect();
  var mx = (e.clientX - rect.left) / 130 * MAP_W;
  var my = (e.clientY - rect.top) / 124 * MAP_H;
  if (e.button === 0) {
    targetCamX = mx * TILE - screenW / 2;
    targetCamY = my * TILE - screenH / 2;
  } else if (e.button === 2) {
    addPing(mx, my, 'attack');
  }
});
miniCanvas.addEventListener('contextmenu', function(e) { e.preventDefault(); });

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Escape') { placingType = null; swTargeting = false; selectedEntities = []; }
  if (e.key === 'a' || e.key === 'A') {
    for (const u of selectedEntities) {
      if (u.cat !== 'unit') continue;
      const nearest = findNearest(u, TEAMS.ENEMY);
      if (nearest) u.target = nearest;
    }
  }
  // T = special ability (teleport / transform)
  if (e.key === 't' || e.key === 'T') {
    for (const u of selectedEntities) {
      const d = u.getDef();
      if (d.teleport && u.moveTarget) {
        spawnExplosion(u.x + 0.5, u.y + 0.5, 6);
        u.x = u.moveTarget.x; u.y = u.moveTarget.y;
        u.moveTarget = null;
        spawnExplosion(u.x + 0.5, u.y + 0.5, 8);
        spawnCryoEffect(u.x + 0.5, u.y + 0.5);
        shake(4);
        showMsg('⚡ Chrono Jump!');
      }
      // Transform ability (Kaiju-Carrier etc.)
      if (d.transform) {
        u.transformed = !u.transformed;
        if (u.transformed) {
          u.maxHp = Math.floor(d.hp * 1.5);
          u.hp = Math.min(u.hp + Math.floor(d.hp * 0.3), u.maxHp);
          showMsg('🤖 TRANSFORM! Enhanced combat mode!');
        } else {
          u.maxHp = d.hp;
          u.hp = Math.min(u.hp, u.maxHp);
          showMsg('🤖 Reverted to normal mode');
        }
        spawnExplosion(u.x + 0.5, u.y + 0.5, 10);
        shake(3);
      }
    }
  }
  // S = Fire Superweapon (enter targeting mode)
  if (e.key === 's' || e.key === 'S') {
    if (superweaponReady.player && !swFiring) {
      swTargeting = true;
      showMsg('🎯 Click to select SUPERWEAPON target! (Escape to cancel)');
    }
  }
  // B = Burrow (Thailand Naga) / Banzai Overdrive (Japan elite)
  if (e.key === 'b' || e.key === 'B') {
    for (const u of selectedEntities) {
      if (typeof toggleBurrow === 'function' && toggleBurrow(u)) break;
      if (typeof toggleBanzai === 'function' && toggleBanzai(u)) break;
    }
  }
  // D = Deploy Decoys (Egypt)
  if (e.key === 'd' || e.key === 'D') {
    for (const u of selectedEntities) {
      if (typeof deployDecoys === 'function' && deployDecoys(u)) break;
    }
  }
  // V = Mutagenic Bloom (Brazil)
  if (e.key === 'v' || e.key === 'V') {
    for (const u of selectedEntities) {
      if (typeof deployBloom === 'function' && deployBloom(u)) break;
    }
  }
  // C = Cryo-Lockdown (Switzerland)
  if (e.key === 'c' || e.key === 'C') {
    for (const u of selectedEntities) {
      if (typeof cryoLockdown === 'function' && cryoLockdown(u)) break;
    }
  }
  // F = Sand-Stealth Pulse (Egypt)
  if (e.key === 'f' || e.key === 'F') {
    for (const u of selectedEntities) {
      if (typeof sandStealthPulse === 'function' && sandStealthPulse(u)) break;
    }
  }
  // G = Minimap Ping
  if (e.key === 'g' || e.key === 'G') {
    var px = worldX(mouseX), py = worldY(mouseY);
    addPing(px, py, 'defend');
    showMsg('📍 Ping!');
  }
});
document.addEventListener('keyup', e => keys[e.key] = false);

function worldX(sx) { return (sx + camX) / TILE; }
function worldY(sy) { return (sy + camY) / TILE; }

function clickSelect(e) {
  const wx = worldX(e.clientX), wy = worldY(e.clientY);
  selectedEntities = [];
  for (const ent of entities) {
    if (ent.dead || ent.team !== TEAMS.PLAYER) continue;
    if (wx >= ent.x && wx < ent.x + ent.w && wy >= ent.y && wy < ent.y + ent.h) {
      selectedEntities = [ent]; updateBuildPanel(); updateInfoPanel(); return;
    }
  }
  updateBuildPanel(); updateInfoPanel();
}
function boxSelect() {
  const x1 = worldX(selBox.x1), y1 = worldY(selBox.y1);
  const x2 = worldX(selBox.x2), y2 = worldY(selBox.y2);
  selectedEntities = entities.filter(e =>
    !e.dead && e.team === TEAMS.PLAYER && e.cat === 'unit' &&
    e.x + e.w > x1 && e.x < x2 && e.y + e.h > y1 && e.y < y2
  );
  updateBuildPanel(); updateInfoPanel();
}
function rightClick(e) {
  if (selectedEntities.length === 0) return;
  const wx = worldX(e.clientX), wy = worldY(e.clientY);
  const target = entities.find(ent =>
    !ent.dead && ent.team === TEAMS.ENEMY &&
    wx >= ent.x && wx < ent.x + ent.w && wy >= ent.y && wy < ent.y + ent.h
  );
  // Block move to impassable tiles
  if (!target) {
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H) {
      const t = map[ty][tx];
      if (t === 2 || t === 6 || t === 4) { showMsg("Can't move there!"); return; }
    }
  }
  for (const u of selectedEntities) {
    if (u.cat !== 'unit') continue;
    if (target) { u.target = target; u.moveTarget = null; u._path = null; }
    else { u.moveTarget = { x: wx, y: wy }; u.target = null; u._path = null; }
  }
  if (target) spawnAttackMarker(target.x + target.w/2, target.y + target.h/2);
  else spawnMoveMarker(wx, wy);
  if (typeof playVoiceLine === 'function') playVoiceLine(target ? 'attack' : 'move');
  if (typeof sfxClick === 'function') sfxClick();
  // Activate flow field for group movement (5+ units)
  if (!target && selectedEntities.length >= 5 && typeof buildFlowField === 'function') {
    _activeFlowField = buildFlowField(Math.floor(wx), Math.floor(wy));
    _flowFieldTarget = { x: Math.floor(wx), y: Math.floor(wy) };
  }
}
function placeBuilding() {
  const d = DEFS[placingType];
  const tx = Math.floor(worldX(mouseX)), ty = Math.floor(worldY(mouseY));
  if (tx < 0 || ty < 0 || tx + d.w > MAP_W || ty + d.h > MAP_H) return;
  // Must be within build radius of existing buildings
  if (!isInBuildRadius(tx, ty, d.w, d.h)) return showMsg("Too far from base! Build near your buildings.");
  for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) {
    if (map[ty + dy][tx + dx] === 2 || map[ty + dy][tx + dx] === 6) return showMsg("Can't build on water!");
    if (map[ty + dy][tx + dx] === 4) return showMsg("Can't build on cliffs!");
    if (entities.some(e => !e.dead && !(e.x + e.w <= tx + dx || e.x > tx + dx || e.y + e.h <= ty + dy || e.y > ty + dy)))
      return showMsg("Space occupied!");
  }
  if (gold < d.cost) return showMsg('Not enough gold!');
  gold -= d.cost;
  if (d.powerGen) power += d.powerGen;
  entities.push(new Entity(placingType, tx, ty, TEAMS.PLAYER));
  showMsg(`${d.name} built!`);
  if (typeof sfxBuild === 'function') sfxBuild();
  if (typeof playVoiceLine === 'function') playVoiceLine('build');
  placingType = null;
  if (typeof invalidateMapCache === 'function') invalidateMapCache();
}

// ===== GAME LOGIC =====
function dist(a, b) {
  return Math.hypot((a.x + a.w/2) - (b.x + b.w/2), (a.y + a.h/2) - (b.y + b.h/2));
}

// Wreck system for salvage
var wrecks = [];

function findNearest(ent, team) {
  let best = null, bestD = Infinity;
  for (const e of entities) {
    if (e.dead || e.team !== team) continue;
    if (e.stealthed && team === TEAMS.ENEMY) continue; // can't target stealthed
    const d = dist(ent, e);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

function applyDamage(attacker, target, baseDmg) {
  let dmg = baseDmg;
  // Transform bonus: +50% damage when transformed
  if (attacker.transformed) dmg *= 1.5;
  // Banzai Overdrive bonus
  if (typeof getBanzaiMult === 'function') dmg *= getBanzaiMult(attacker);
  // Faction attack bonus
  const faction = attacker.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (faction.bonus.atkMult) dmg *= faction.bonus.atkMult;
  // Weather attack modifier
  if (typeof getWeatherEffects === 'function') dmg *= getWeatherEffects().atkMult;
  // RPS Damage Multiplier
  const ad = attacker.getDef();
  const td = target.getDef();
  var rpsMult = 1;
  if (typeof getRPSMultiplier === 'function') {
    rpsMult = getRPSMultiplier(ad.dmgType, td.armorType);
    dmg *= rpsMult;
  }
  // RPS advantage indicator VFX
  if (rpsMult >= 1.5) {
    particles.push({ x: target.x+target.w/2, y: target.y-0.5, vx:0, vy:-0.5, life:20, maxLife:20, size:0, color:'#ff4444', type:'dmgnum', dmg:'STRONG' });
  } else if (rpsMult <= 0.25) {
    particles.push({ x: target.x+target.w/2, y: target.y-0.5, vx:0, vy:-0.5, life:20, maxLife:20, size:0, color:'#8888ff', type:'dmgnum', dmg:'WEAK' });
  }
  // Directional Armor (rear weakness)
  if (typeof getDirectionalMult === 'function') {
    dmg *= getDirectionalMult(attacker, target);
  }
  // Ronin Plasma Deflector — Japan melee units deflect ranged attacks
  if (td.melee && td.armorType === 'medium') {
    var tFaction = target.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
    if (tFaction && tFaction.id === 'japan' && ad.range > 2 && rng() < 0.2) {
      // 20% chance to deflect ranged attacks
      dmg = 0;
      particles.push({ x: target.x+target.w/2, y: target.y-0.3, vx:0, vy:-0.6, life:20, maxLife:20, size:0, color:'#00ffff', type:'dmgnum', dmg:'DEFLECT' });
      if (typeof sfxFreeze === 'function') sfxFreeze();
    }
  }
  // Armor reduction
  if (td.armor) dmg *= (1 - td.armor);
  target.hp -= dmg;

  // Floating damage number
  particles.push({ x: target.x + target.w/2, y: target.y - 0.3, vx: (rng()-0.5)*0.2, vy: -0.8, life: 30, maxLife: 30, size: 0, color: '#fff', type: 'dmgnum', dmg: Math.round(dmg) });

  // Attack SFX
  if (typeof sfxAttack === 'function') sfxAttack(ad.dmgType, attacker.x, attacker.y);

  // Slow effect (Cryo Turret)
  if (ad.slow) { target.slowed = 60; spawnCryoEffect(target.x + target.w/2, target.y + target.h/2); }

  // Burn effect (China Dragon)
  if (ad.burn) target.burning = 80;

  // Drain effect (Phantom) — heals attacker
  if (ad.drain) {
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * 0.3);
    spawnHealEffect(attacker.x + attacker.w/2, attacker.y + attacker.h/2);
    // Drain VFX: purple energy trail from target to attacker
    for (var di = 0; di < 4; di++) {
      particles.push({
        x: target.x + target.w/2, y: target.y + target.h/2,
        vx: (attacker.x - target.x) * 0.08 + (rng()-0.5)*0.3,
        vy: (attacker.y - target.y) * 0.08 + (rng()-0.5)*0.3,
        life: 15 + rng()*10, maxLife: 25,
        size: 2 + rng(), color: '#cc44ff', type: 'heal'
      });
    }
  }

  // Confused effect — Thailand's psycho-chem units
  if (ad.confused) {
    if (!target.confused || target.confused <= 0) {
      target.confused = 120; // 2 seconds
      target.target = null; // force retarget
    }
  }

  // Frozen effect — Switzerland cryo weapons (elite, special with slow)
  var atkFaction = attacker.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (atkFaction && atkFaction.id === 'switzerland' && ad.slow && rng() < 0.15) {
    target.frozen = 60; // 1 second freeze
    target.slowed = 0; // frozen overrides slow
    // Ice block VFX
    for (var fi = 0; fi < 6; fi++) {
      particles.push({
        x: target.x + target.w/2 + (rng()-0.5)*0.5,
        y: target.y + target.h/2 + (rng()-0.5)*0.5,
        vx: (rng()-0.5)*0.3, vy: -0.2 - rng()*0.3,
        life: 30 + rng()*20, maxLife: 50,
        size: 3 + rng()*2, color: '#aaeeff', type: 'cryo'
      });
    }
  }

  // Splash damage
  if (ad.splash) {
    spawnSplashRing(target.x + target.w/2, target.y + target.h/2, ad.splash);
    for (const e of entities) {
      if (e.dead || e.team === attacker.team || e === target) continue;
      if (dist(target, e) < ad.splash) e.hp -= dmg * 0.4;
    }
  }

  // Chain lightning (Tesla Coil)
  if (ad.chain) {
    spawnTeslaArc(attacker.x + attacker.w/2, attacker.y + attacker.h/2, target.x + target.w/2, target.y + target.h/2);
    let chainTarget = null, chainDist = Infinity;
    for (const e of entities) {
      if (e.dead || e.team === attacker.team || e === target) continue;
      const dd = dist(target, e);
      if (dd < 3 && dd < chainDist) { chainDist = dd; chainTarget = e; }
    }
    if (chainTarget) {
      chainTarget.hp -= dmg * 0.5;
      spawnTeslaArc(target.x + target.w/2, target.y + target.h/2, chainTarget.x + 0.5, chainTarget.y + 0.5);
    }
  }

  if (!ad.chain) {
    if (typeof spawnUnitAttackFX === 'function') spawnUnitAttackFX(attacker, target, particles);
    else spawnMuzzleFlash(attacker.x + attacker.w/2, attacker.y + attacker.h/2, target.x + target.w/2, target.y + target.h/2);
  }
  if (typeof triggerAttackAnim === 'function') triggerAttackAnim(attacker);

  if (target.hp <= 0) {
    target.dead = true;
    spawnExplosion(target.x + target.w/2, target.y + target.h/2, target.cat === 'building' ? 25 : 12);
    // Leave wreck for salvage (Thailand engineer)
    if (target.cat === 'unit') {
      if (typeof wrecks === 'undefined') window.wrecks = [];
      var td2 = target.getDef();
      wrecks.push({ x: target.x + target.w/2, y: target.y + target.h/2, value: Math.floor((td2.cost || 50) * 0.4), life: 600 });
    }
    let bounty = 25;
    if (typeof getWarBounty === 'function') bounty += getWarBounty(attacker, target);
    if (target.team === TEAMS.ENEMY) {
      gold += bounty;
      if (typeof playVoiceLine === 'function' && rng() < 0.3) playVoiceLine('kill');
    }
    // Voice line when player building destroyed
    if (target.team === TEAMS.PLAYER && target.cat === 'building') {
      if (typeof playVoiceLine === 'function') playVoiceLine('underAttack');
    }
  }
}

function updateEntity(e, dt) {
  if (e.dead) return;
  const d = e.getDef();
  if (e.atkCooldown > 0) e.atkCooldown -= dt;
  if (e.slowed > 0) e.slowed -= dt;

  // Frozen: can't do anything
  if (e.frozen > 0) {
    e.frozen -= dt;
    if (e.frozen <= 0) e.frozen = 0;
    return;
  }

  // Confused: tick down, attack own team handled in target acquisition
  if (e.confused > 0) e.confused -= dt;

  // Burn damage over time
  if (e.burning > 0) {
    e.burning -= dt;
    if (gameTime % 10 === 0) {
      e.hp -= 2;
      particles.push({ x: e.x+e.w/2+(rng()-0.5)*0.3, y: e.y, vx:(rng()-0.5)*0.5, vy:-1-rng(), life:10+rng()*8, maxLife:18, size:1.5+rng()*2, color:rng()>0.5?'#ff6600':'#ffaa00', type:'fire' });
      if (e.hp <= 0) { e.dead = true; spawnExplosion(e.x+e.w/2, e.y+e.h/2, 10); }
    }
  }

  // Phantom regen
  const eFaction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (eFaction.bonus.regenRate && e.hp < e.maxHp && gameTime % 30 === 0) {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * eFaction.bonus.regenRate);
  }

  // Special abilities update
  if (typeof updateAbilities === 'function') updateAbilities(e, dt);

  // Radar reveals stealth: if radar building exists, reveal enemy stealth within range 12
  if (e.stealthed && gameTime % 30 === 0) {
    var enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
    for (var ri = 0; ri < entities.length; ri++) {
      var rb = entities[ri];
      if (rb.dead || rb.team !== enemyTeam) continue;
      var rd = rb.getDef();
      if (rd.reveal && dist(e, rb) < 12) {
        e.stealthed = false;
        break;
      }
    }
  }

  // Stealth: break on attack
  if (e.stealthed && e.target && !e.target.dead) e.stealthed = false;

  // Superweapon charging
  if (e.type === 'superweapon' && e.cat === 'building') {
    var swKey = e.team === TEAMS.PLAYER ? 'player' : 'enemy';
    if (!superweaponCharge[swKey]) superweaponCharge[swKey] = 0;
    if (superweaponCooldown[swKey] > 0) { superweaponCooldown[swKey] -= dt; }
    else if (!superweaponReady[swKey]) {
      superweaponCharge[swKey] += dt;
      if (superweaponCharge[swKey] >= SUPERWEAPON_CHARGE_TIME) {
        superweaponReady[swKey] = true;
        if (e.team === TEAMS.PLAYER) {
          showMsg('⚠️ SUPERWEAPON READY! Press S to fire!');
          if (typeof playVoiceLine === 'function') playVoiceLine('superweapon');
        }
      }
    }
  }

  // Harvester AI
  if (d.harvester && e.harvestState && !e.moveTarget && !e.isMCV) {
    updateHarvester(e, dt);
    return;
  }
  // If harvester is manually moved, pause harvesting; resume when arrived
  if (d.harvester && e.moveTarget) {
    const dd = Math.hypot(e.x - e.moveTarget.x, e.y - e.moveTarget.y);
    if (dd < 0.3) { e.moveTarget = null; e.harvestState = 'seek'; e.oreTarget = null; }
    else { moveToward(e, e.moveTarget.x, e.moveTarget.y, d.speed, dt); }
    return;
  }

  if (e.cat === 'unit') {
    // Medic: auto-heal nearby friendly units
    if (d.heal && e.atkCooldown <= 0) {
      let wounded = null, worstPct = 1;
      for (const f of entities) {
        if (f.dead || f.team !== e.team || f === e || f.cat !== 'unit') continue;
        const pct = f.hp / f.maxHp;
        if (pct < worstPct && dist(e, f) < d.range) { worstPct = pct; wounded = f; }
      }
      if (wounded) {
        wounded.hp = Math.min(wounded.maxHp, wounded.hp + d.heal);
        e.atkCooldown = d.atkSpeed;
        if (gameTime % 15 === 0) spawnHealEffect(wounded.x + 0.5, wounded.y + 0.5);
        // Move toward wounded if far
        if (dist(e, wounded) > d.range * 0.5) {
          moveToward(e, wounded.x + 0.5, wounded.y + 0.5, d.speed, dt);
        }
        return;
      }
    }

    // Engineer: auto-repair nearby friendly buildings
    if (d.repair && e.atkCooldown <= 0) {
      let damaged = null, worstPct = 1;
      for (const f of entities) {
        if (f.dead || f.team !== e.team || f.cat !== 'building') continue;
        const pct = f.hp / f.maxHp;
        if (pct < worstPct && dist(e, f) < 3) { worstPct = pct; damaged = f; }
      }
      if (damaged) {
        damaged.hp = Math.min(damaged.maxHp, damaged.hp + d.repair);
        e.atkCooldown = d.atkSpeed;
        if (gameTime % 20 === 0) spawnHealEffect(damaged.x + damaged.w/2, damaged.y + damaged.h/2);
        moveToward(e, damaged.x + damaged.w/2, damaged.y + damaged.h/2, d.speed, dt);
        return;
      }
      // Thailand Engineer: salvage enemy wrecks (dead entities leave wreck markers)
      var engFaction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
      if (engFaction && engFaction.id === 'thailand' && typeof wrecks !== 'undefined') {
        for (var wi = wrecks.length - 1; wi >= 0; wi--) {
          var wr = wrecks[wi];
          if (Math.hypot(e.x - wr.x, e.y - wr.y) < 1.5) {
            if (e.team === TEAMS.PLAYER) gold += wr.value;
            spawnHealEffect(wr.x, wr.y);
            showMsg('🔩 Salvaged +$' + wr.value);
            wrecks.splice(wi, 1);
            e.atkCooldown = d.atkSpeed;
            return;
          }
        }
      }
    }

    // Combat units: acquire targets
    if (d.atk > 0) {
      if (!e.target || e.target.dead) {
        e.target = null;
        // Confused: target own team
        var targetTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
        if (e.confused > 0) targetTeam = e.team;
        const nearby = findNearest(e, targetTeam);
        if (nearby && dist(e, nearby) < 8) e.target = nearby;
      }
      if (e.target && !e.target.dead) {
        const dd = dist(e, e.target);
        if (dd <= d.range) {
          if (e.atkCooldown <= 0) {
            applyDamage(e, e.target, d.atk);
            e.atkCooldown = d.atkSpeed;
            if (e.target && e.target.dead) e.target = null;
          }
        } else {
          const spd = e.slowed > 0 ? d.speed * 0.5 : d.speed;
          moveToward(e, e.target.x + e.target.w/2, e.target.y + e.target.h/2, spd, dt);
        }
      } else if (e.moveTarget) {
        if (Math.hypot(e.x - e.moveTarget.x, e.y - e.moveTarget.y) < 0.3) e.moveTarget = null;
        else {
          const spd = e.slowed > 0 ? d.speed * 0.5 : d.speed;
          moveToward(e, e.moveTarget.x, e.moveTarget.y, spd, dt);
        }
      }
    } else if (e.moveTarget) {
      // Non-combat units (medic/engineer) follow move orders
      if (Math.hypot(e.x - e.moveTarget.x, e.y - e.moveTarget.y) < 0.3) e.moveTarget = null;
      else moveToward(e, e.moveTarget.x, e.moveTarget.y, d.speed, dt);
    }
  }

  // Turret attack (disabled when powerLow for player)
  if (e.type === 'turret' && d.atk) {
    if (typeof powerLow !== 'undefined' && powerLow && e.team === TEAMS.PLAYER) return;
    const enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
    if (!e.target || e.target.dead) e.target = findNearest(e, enemyTeam);
    if (e.target && !e.target.dead && dist(e, e.target) <= d.range) {
      if (e.atkCooldown <= 0) {
        applyDamage(e, e.target, d.atk);
        e.atkCooldown = d.atkSpeed;
        if (e.target && e.target.dead) e.target = null;
      }
    } else e.target = null;
  }
}

function moveToward(e, tx, ty, speed, dt) {
  // Use A* pathfinding if available
  if (typeof pathMoveToward === 'function') {
    pathMoveToward(e, tx, ty, speed, dt);
    return;
  }
  const dx = tx - e.x, dy = ty - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return;
  const tileX = Math.floor(e.x), tileY = Math.floor(e.y);
  let terrainMult = 1;
  if (tileY >= 0 && tileY < MAP_H && tileX >= 0 && tileX < MAP_W) {
    const t = map[tileY][tileX];
    if (t === 7) terrainMult = 1.3;
    else if (t === 5) terrainMult = 0.7;
    else if (t === 3) terrainMult = 0.6;
  }
  const step = speed * terrainMult * (typeof getWeatherEffects === 'function' ? getWeatherEffects().speedMult : 1) * dt / 60;
  e.lastDx = dx / len;
  e.lastDy = dy / len;
  let nx = e.x + (dx / len) * step;
  let ny = e.y + (dy / len) * step;
  nx = Math.max(0.4, Math.min(MAP_W - 1.4, nx));
  ny = Math.max(0.4, Math.min(MAP_H - 1.4, ny));
  // Block impassable tiles
  const d2 = e.getDef();
  if (d2 && d2.flying) { e.x = nx; e.y = ny; return; }
  var _amphi = d2 && d2.amphibious;
  function tb(bx,by){var ix=Math.floor(bx),iy=Math.floor(by);if(ix<0||iy<0||ix>=MAP_W||iy>=MAP_H)return true;var t=map[iy][ix];if(t===4)return true;if((t===2||t===6)&&!_amphi)return true;return false;}
  function blk(bx,by){
    if(tb(bx,by))return true;
    var cx=Math.floor(e.x),cy=Math.floor(e.y),nx2=Math.floor(bx),ny2=Math.floor(by);
    if(nx2!==cx&&tb(nx2,cy))return true;
    if(ny2!==cy&&tb(cx,ny2))return true;
    return false;
  }
  if (!blk(nx, ny)) { e.x = nx; e.y = ny; }
  else if (!blk(nx, e.y)) { e.x = nx; }
  else if (!blk(e.x, ny)) { e.y = ny; }
}

// ===== ENEMY AI =====
function enemyAI() {
  // --- Phase 0: Deploy MCV ---
  if (!enemyMCVDeployed) {
    const eMcv = entities.find(e => e.isMCV && e.team === TEAMS.ENEMY && !e.dead);
    if (eMcv && gameTime > 60) { // wait a moment then deploy
      const tx = Math.floor(eMcv.x), ty = Math.floor(eMcv.y);
      const d = ENEMY_DEFS.hq;
      let canDeploy = tx >= 0 && ty >= 0 && tx + d.w <= MAP_W && ty + d.h <= MAP_H;
      if (canDeploy) {
        for (let dy2 = 0; dy2 < d.h && canDeploy; dy2++)
          for (let dx2 = 0; dx2 < d.w && canDeploy; dx2++) {
            const t = map[ty + dy2][tx + dx2];
            if (t === 2 || t === 6 || t === 4) canDeploy = false;
          }
      }
      if (canDeploy) {
        eMcv.dead = true;
        entities.push(new Entity('hq', tx, ty, TEAMS.ENEMY));
        enemyMCVDeployed = true;
      }
    }
    return; // don't do anything else until deployed
  }

  const eu = entities.filter(e => e.team === TEAMS.ENEMY && e.cat === 'unit' && !e.dead);
  const ehq = entities.find(e => e.type === 'hq' && e.team === TEAMS.ENEMY && !e.dead);
  if (!ehq) return;

  // --- Helper: find valid build spot near enemy buildings ---
  function findBuildSpot(w, h) {
    const eBuildings = entities.filter(e => e.team === TEAMS.ENEMY && e.cat === 'building' && !e.dead);
    for (let attempt = 0; attempt < 20; attempt++) {
      const base = eBuildings[rng() * eBuildings.length | 0];
      if (!base) return null;
      const ox = Math.floor(base.x + base.w/2 + (rng()-0.5) * BUILD_RADIUS * 1.5);
      const oy = Math.floor(base.y + base.h/2 + (rng()-0.5) * BUILD_RADIUS * 1.5);
      if (ox < 0 || oy < 0 || ox + w > MAP_W || oy + h > MAP_H) continue;
      // Check within radius
      let inRadius = false;
      for (const b of eBuildings) {
        if (Math.hypot(ox + w/2 - b.x - b.w/2, oy + h/2 - b.y - b.h/2) <= BUILD_RADIUS) { inRadius = true; break; }
      }
      if (!inRadius) continue;
      // Check terrain & overlap
      let ok = true;
      for (let dy2 = 0; dy2 < h && ok; dy2++)
        for (let dx2 = 0; dx2 < w && ok; dx2++) {
          const t = map[oy+dy2][ox+dx2];
          if (t === 2 || t === 6 || t === 4) ok = false;
          if (entities.some(e => !e.dead && e.x < ox+dx2+1 && e.x+e.w > ox+dx2 && e.y < oy+dy2+1 && e.y+e.h > oy+dy2)) ok = false;
        }
      if (ok) return {x: ox, y: oy};
    }
    return null;
  }

  // --- Phase 1: Build base progressively ---
  const barracks = entities.find(e => e.type === 'barracks' && e.team === TEAMS.ENEMY && !e.dead);
  const factory = entities.find(e => e.type === 'factory' && e.team === TEAMS.ENEMY && !e.dead);
  const eRef = entities.find(e => e.type === 'refinery' && e.team === TEAMS.ENEMY && !e.dead);
  const ePower = entities.find(e => e.type === 'powerplant' && e.team === TEAMS.ENEMY && !e.dead);
  const eHelipad = entities.find(e => e.type === 'helipad' && e.team === TEAMS.ENEMY && !e.dead);

  // Build order: powerplant → refinery → barracks → factory → helipad
  if (!ePower && rng() < 0.02) {
    const d = ENEMY_DEFS.powerplant; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('powerplant', s.x, s.y, TEAMS.ENEMY));
  }
  else if (!eRef && ePower && rng() < 0.02) {
    const d = ENEMY_DEFS.refinery; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('refinery', s.x, s.y, TEAMS.ENEMY));
  }
  else if (!barracks && eRef && rng() < 0.02) {
    const d = ENEMY_DEFS.barracks; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('barracks', s.x, s.y, TEAMS.ENEMY));
  }
  else if (!factory && barracks && rng() < 0.01) {
    const d = ENEMY_DEFS.factory; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('factory', s.x, s.y, TEAMS.ENEMY));
  }
  else if (!eHelipad && factory && rng() < 0.005) {
    const d = ENEMY_DEFS.helipad; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('helipad', s.x, s.y, TEAMS.ENEMY));
  }
  // Extra turrets
  const eTurrets = entities.filter(e => e.type === 'turret' && e.team === TEAMS.ENEMY && !e.dead);
  if (barracks && eTurrets.length < 3 && rng() < 0.003) {
    const d = ENEMY_DEFS.turret; const s = findBuildSpot(d.w, d.h);
    if (s) entities.push(new Entity('turret', s.x, s.y, TEAMS.ENEMY));
  }

  // --- Phase 2: Spawn units ---
  const eHarvesters = entities.filter(e => e.type === 'harvester' && e.team === TEAMS.ENEMY && !e.dead);
  if (eRef && eHarvesters.length < 2 && rng() < 0.01 && ENEMY_DEFS.harvester) {
    const h = new Entity('harvester', eRef.x + eRef.w, eRef.y, TEAMS.ENEMY);
    h.homeRefinery = eRef;
    entities.push(h);
  }

  const maxEnemyUnits = enemyFaction.maxUnits || 15;
  if (eu.length < maxEnemyUnits) {
    if (barracks && rng() < 0.03) {
      const pool = ['soldier','soldier','soldier','scout','medic','engineer','sniper','commando','saboteur'];
      const type = pool[rng() * pool.length | 0];
      if (ENEMY_DEFS[type]) entities.push(new Entity(type, barracks.x + barracks.w, barracks.y, TEAMS.ENEMY));
    }
    if (factory && rng() < 0.015) {
      const pool = ['tank','tank','artillery','air','flamer','transport','gunboat','bomber'];
      const type = pool[rng() * pool.length | 0];
      const spawner = (type === 'air' || type === 'gunboat' || type === 'bomber') && eHelipad ? eHelipad : factory;
      if (ENEMY_DEFS[type]) entities.push(new Entity(type, spawner.x + spawner.w, spawner.y, TEAMS.ENEMY));
    }
    if (eu.length > 8 && rng() < 0.005) {
      const type = ['special','elite','hero','battleship'][rng()*4|0];
      if (ENEMY_DEFS[type] && barracks) entities.push(new Entity(type, barracks.x + barracks.w, barracks.y, TEAMS.ENEMY));
    }
  }

  // --- Phase 3: Attack ---
  if (eu.length >= 4) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
    }
  }
}

// ===== HARVESTING =====
function findNearestOre(e) {
  let best = null, bestD = Infinity;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (map[y][x] !== 1) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bestD) { bestD = d; best = { x, y }; }
    }
  }
  return best;
}

function findRefinery(e) {
  // Prefer home refinery if alive
  if (e.homeRefinery && !e.homeRefinery.dead) return e.homeRefinery;
  const defs = e.team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS;
  let best = null, bestD = Infinity;
  for (const ent of entities) {
    if (ent.dead || ent.team !== e.team || ent.type !== 'refinery') continue;
    const d = dist(e, ent);
    if (d < bestD) { bestD = d; best = ent; }
  }
  return best;
}

function updateHarvester(e, dt) {
  const d = e.getDef();
  const spd = e.slowed > 0 ? d.speed * 0.5 : d.speed;
  const faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  const mult = faction.bonus.harvestMult || 1;

  if (e.harvestState === 'seek') {
    // Find nearest ore
    if (!e.oreTarget) e.oreTarget = findNearestOre(e);
    if (!e.oreTarget) return; // no ore left
    const dd = Math.hypot(e.x - e.oreTarget.x, e.y - e.oreTarget.y);
    if (dd < 1) {
      e.harvestState = 'harvest';
      e.harvestTimer = 0;
    } else {
      moveToward(e, e.oreTarget.x + 0.5, e.oreTarget.y + 0.5, spd, dt);
    }
  }
  else if (e.harvestState === 'harvest') {
    e.harvestTimer += dt;
    // Dig sparks
    if (e.harvestTimer % 8 === 0) spawnDigEffect(e.x + 0.5, e.y + 0.5);
    // Harvest every 15 frames
    if (e.harvestTimer >= 15) {
      e.harvestTimer = 0;
      e.cargo += d.harvestRate * mult;
      // Deplete ore occasionally
      if (rng() < 0.02 && e.oreTarget) {
        const ox = e.oreTarget.x, oy = e.oreTarget.y;
        if (ox >= 0 && oy >= 0 && ox < MAP_W && oy < MAP_H) { map[oy][ox] = 0; if (typeof invalidateMapCache === 'function') invalidateMapCache(); }
        e.oreTarget = null;
      }
      if (e.cargo >= d.capacity) {
        e.harvestState = 'return';
      }
    }
  }
  else if (e.harvestState === 'return') {
    const ref = findRefinery(e);
    if (!ref) { e.harvestState = 'seek'; return; }
    const dd = dist(e, ref);
    if (dd < 2) {
      // Unload
      if (e.team === TEAMS.PLAYER) gold += e.cargo;
      e.cargo = 0;
      e.harvestState = 'seek';
      e.oreTarget = null;
    } else {
      moveToward(e, ref.x + ref.w / 2, ref.y + ref.h / 2, spd, dt);
    }
  }
}

// Legacy passive harvest removed — harvesters do all the work now

// ===== RENDERING =====
function drawMap() {
  var sx = Math.max(0, Math.floor(camX / TILE));
  var sy = Math.max(0, Math.floor(camY / TILE));
  var ex = Math.min(MAP_W, sx + Math.ceil(screenW / TILE) + 1);
  var ey = Math.min(MAP_H, sy + Math.ceil(screenH / TILE) + 1);
  for (var y = sy; y < ey; y++) {
    for (var x = sx; x < ex; x++) {
      var px = x * TILE - camX, py = y * TILE - camY;
      var t = map[y][x];
      switch(t) {
        case 0: drawGrassTile(px, py, x, y); break;
        case 1: drawOreTile(px, py); break;
        case 2: drawWaterTile(px, py); break;
        case 3: drawForestTile(px, py, x, y); break;
        case 4: drawCliffTile(px, py, x, y); break;
        case 5: drawSandTile(px, py, x, y); break;
        case 6: drawDeepWaterTile(px, py); break;
        case 7: drawRoadTile(px, py, x, y); break;
        case 8: drawFlowerTile(px, py, x, y); break;
        default: drawGrassTile(px, py, x, y);
      }
      if (typeof drawEnhancedTile === 'function') drawEnhancedTile(ctx, px, py, x, y, t, TILE, gameTime);
    }
  }
}

function drawEntities() {
  // Only re-sort every 4 frames (entities don't move much per frame)
  if (!drawEntities._sortFrame) drawEntities._sortFrame = 0;
  if (gameTime - drawEntities._sortFrame >= 4) {
    drawEntities._sortFrame = gameTime;
    entities.sort(function(a, b) {
      if (a.dead !== b.dead) return a.dead ? 1 : -1;
      if (a.cat === 'building' && b.cat !== 'building') return -1;
      if (a.cat !== 'building' && b.cat === 'building') return 1;
      return a.y - b.y;
    });
  }
  for (var _ei = 0; _ei < entities.length; _ei++) {
    var e = entities[_ei];
    if (e.dead) continue;
    const px = e.renderX * TILE - camX, py = e.renderY * TILE - camY;
    const pw = e.w * TILE, ph = e.h * TILE;
    if (px + pw < -32 || py + ph < -32 || px > screenW + 32 || py > screenH + 32) continue;

    // Stealth effect
    if (e.stealthed && e.team === TEAMS.ENEMY) continue; // invisible
    if (e.stealthed) ctx.globalAlpha = 0.5;
    // Fog of War: hide enemies in fog
    if (typeof isEntityVisible === 'function' && e.team === TEAMS.ENEMY && !isEntityVisible(e)) {
      // Show ghost buildings on explored tiles
      if (e.cat === 'building' && typeof isFogExplored === 'function' && isFogExplored(Math.floor(e.x), Math.floor(e.y))) {
        ctx.globalAlpha = 0.3;
      } else {
        continue;
      }
    }
    // Decoy shimmer effect
    if (e.isDecoy) ctx.globalAlpha = 0.5 + Math.sin(gameTime * 0.15) * 0.2;

    if (e.cat === 'building') {
      const sprite = getBuildingSprite(e.type, e.team);
      if (sprite) ctx.drawImage(sprite, px, py, pw, ph);
    } else {
      // Use smooth animation system if available
      const drawn = (typeof drawAnimatedUnit === 'function') ? drawAnimatedUnit(ctx, e, px, py, TILE, gameTime) : false;
      if (!drawn) {
        const sprite = getUnitSprite(e.type, e.team);
        if (sprite) ctx.drawImage(sprite, px, py, TILE, TILE);
      }
    }
    ctx.globalAlpha = 1;

    // Slow indicator
    if (e.slowed > 0) {
      ctx.fillStyle = 'rgba(100,200,255,0.3)';
      ctx.beginPath();
      ctx.arc(px + pw/2, py + ph/2, pw * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Burn indicator
    if (e.burning > 0) {
      ctx.fillStyle = 'rgba(255,100,0,0.2)';
      ctx.beginPath();
      ctx.arc(px + pw/2, py + ph/2, pw * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Confused indicator — spinning question mark + pink tint
    if (e.confused > 0) {
      ctx.fillStyle = 'rgba(255,105,180,0.2)';
      ctx.beginPath();
      ctx.arc(px + pw/2, py + ph/2, pw * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(px + pw/2, py - 12);
      ctx.rotate(Math.sin(gameTime * 0.1) * 0.5);
      ctx.fillStyle = '#ff69b4';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❓', 0, 0);
      ctx.restore();
    }

    // Frozen indicator — ice block encasement
    if (e.frozen > 0) {
      ctx.fillStyle = 'rgba(170,238,255,0.4)';
      ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
      ctx.strokeStyle = '#aaeeff';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      // Ice crystal sparkles
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6 + Math.sin(gameTime * 0.2) * 0.3;
      ctx.fillRect(px + pw*0.2, py + ph*0.2, 3, 3);
      ctx.fillRect(px + pw*0.7, py + ph*0.3, 2, 2);
      ctx.fillRect(px + pw*0.4, py + ph*0.7, 3, 3);
      ctx.globalAlpha = 1;
    }

    // Transform indicator — energy glow
    if (e.transformed) {
      ctx.strokeStyle = (e.team === TEAMS.PLAYER ? playerFaction : enemyFaction).color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(gameTime * 0.15) * 0.3;
      ctx.beginPath();
      ctx.arc(px + pw/2, py + ph/2, pw * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Flying indicator
    const d = e.getDef();
    if (d.flying) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.ellipse(px + TILE/2, py + TILE + 4, TILE * 0.4, TILE * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // HP bar (improved)
    if (e.hp < e.maxHp) {
      const bw = pw - 4, bh = 5;
      const pct = e.hp / e.maxHp;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(px + 1, py - 9, bw + 2, bh + 2, 2);
      ctx.fill();
      // Fill with glow
      const hpColor = pct > 0.5 ? '#00ff44' : pct > 0.25 ? '#ffcc00' : '#ff2200';
      ctx.fillStyle = hpColor;
      ctx.beginPath();
      ctx.roundRect(px + 2, py - 8, bw * pct, bh, 1.5);
      ctx.fill();
      // Glow
      ctx.shadowColor = hpColor; ctx.shadowBlur = 4;
      ctx.fillStyle = hpColor;
      ctx.fillRect(px + 2, py - 8, bw * pct, 1);
      ctx.shadowBlur = 0;
    }

    // Harvester cargo bar
    const ed = e.getDef();
    if (ed.harvester && e.cargo > 0) {
      const bw = pw - 4, bh = 3;
      const pct = e.cargo / ed.capacity;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(px + 1, py - 14, bw + 2, bh + 2);
      ctx.fillStyle = '#ffc800';
      ctx.fillRect(px + 2, py - 13, bw * pct, bh);
    }

    // Selection (improved glow)
    if (selectedEntities.includes(e)) {
      ctx.strokeStyle = '#00ff44'; ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff44'; ctx.shadowBlur = 6;
      ctx.setLineDash([4, 3]);
      if (e.cat === 'building') {
        ctx.beginPath();
        ctx.roundRect(px - 2, py - 2, pw + 4, ph + 4, 3);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(px + TILE/2, py + TILE - 4, TILE * 0.45, TILE * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
    }
  }
}

function drawPlacement() {
  if (!placingType) return;
  const d = DEFS[placingType];
  const tx = Math.floor(worldX(mouseX)), ty = Math.floor(worldY(mouseY));
  const px = tx * TILE - camX, py = ty * TILE - camY;
  const inRadius = isInBuildRadius(tx, ty, d.w, d.h);
  const color = inRadius ? '#0f0' : '#f44';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, d.w * TILE, d.h * TILE);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(px, py, d.w * TILE, d.h * TILE);
}

function drawSelectionBox() {
  if (!selBox) return;
  ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(selBox.x1, selBox.y1, selBox.x2 - selBox.x1, selBox.y2 - selBox.y1);
  ctx.setLineDash([]);
}

function drawMinimap() {
  const scaleX = 140 / MAP_W, scaleY = 130 / MAP_H;
  // Cache terrain to offscreen canvas (only redraw when ore changes)
  if (!drawMinimap._terrainCanvas) {
    drawMinimap._terrainCanvas = document.createElement('canvas');
    drawMinimap._terrainCanvas.width = 140;
    drawMinimap._terrainCanvas.height = 130;
    drawMinimap._lastOreCount = -1;
  }
  // Count ore tiles to detect changes
  var oreCount = 0;
  for (var ty = 0; ty < MAP_H; ty += 4) for (var tx = 0; tx < MAP_W; tx += 4) if (map[ty][tx] === 1) oreCount++;
  if (oreCount !== drawMinimap._lastOreCount) {
    drawMinimap._lastOreCount = oreCount;
    var tc = drawMinimap._terrainCanvas.getContext('2d');
    var mg = tc.createLinearGradient(0, 0, 0, 130);
    mg.addColorStop(0, '#0a0e18'); mg.addColorStop(1, '#060810');
    tc.fillStyle = mg;
    tc.fillRect(0, 0, 140, 130);
    var TC = {0:'#1e3a12',1:'#8a7020',2:'#0a2a5a',3:'#0e2a0e',4:'#333',5:'#8a7a50',6:'#061a3a',7:'#555',8:'#1e3a12'};
    for (var ty = 0; ty < MAP_H; ty += 2) {
      for (var tx = 0; tx < MAP_W; tx += 2) {
        var t = map[ty][tx];
        if (t !== 0) { tc.fillStyle = TC[t] || '#1e3a12'; tc.fillRect(tx * scaleX, ty * scaleY, scaleX * 2 + 0.5, scaleY * 2 + 0.5); }
      }
    }
  }
  miniCtx.drawImage(drawMinimap._terrainCanvas, 0, 0);
  // Tech Derricks
  if (typeof techDerricks !== 'undefined') {
    for (const d of techDerricks) {
      miniCtx.fillStyle = d.owner === TEAMS.PLAYER ? '#0f0' : d.owner === TEAMS.ENEMY ? '#f00' : '#888';
      miniCtx.fillRect(d.x * scaleX - 2, d.y * scaleY - 2, 4, 4);
    }
  }
  // Crypto-Mines
  if (typeof cryptoMines !== 'undefined') {
    for (const m of cryptoMines) {
      miniCtx.fillStyle = m.owner === TEAMS.PLAYER ? '#0cf' : m.owner === TEAMS.ENEMY ? '#f60' : '#aaf';
      miniCtx.fillRect(m.x * scaleX - 2, m.y * scaleY - 2, 4, 4);
      miniCtx.strokeStyle = miniCtx.fillStyle;
      miniCtx.lineWidth = 1;
      miniCtx.strokeRect(m.x * scaleX - 3, m.y * scaleY - 3, 6, 6);
    }
  }
  for (const e of entities) {
    if (e.dead) continue;
    if (e.stealthed && e.team === TEAMS.ENEMY) continue;
    // Fog of War: hide enemies in fog on minimap
    if (typeof isEntityVisible === 'function' && e.team === TEAMS.ENEMY && !isEntityVisible(e)) continue;
    const f = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
    miniCtx.fillStyle = e.isDecoy ? '#ffcc0088' : f.color;
    miniCtx.fillRect(e.x * scaleX, e.y * scaleY, Math.max(2, e.w * scaleX), Math.max(2, e.h * scaleY));
  }
  // Minimap fog overlay
  if (typeof drawMinimapFog === 'function') drawMinimapFog(miniCtx, scaleX, scaleY);
  miniCtx.strokeStyle = 'rgba(255,255,255,0.7)'; miniCtx.lineWidth = 1;
  miniCtx.strokeRect(camX / TILE * scaleX, camY / TILE * scaleY,
    screenW / TILE * scaleX, screenH / TILE * scaleY);
  // Draw pings on minimap
  for (var pi = 0; pi < pings.length; pi++) {
    var p = pings[pi];
    var ppx = p.x * scaleX, ppy = p.y * scaleY;
    var alpha = p.life / p.maxLife;
    var pulseR = (1 - alpha) * 8 + 3;
    miniCtx.globalAlpha = alpha;
    miniCtx.strokeStyle = p.color;
    miniCtx.lineWidth = 2;
    miniCtx.beginPath();
    miniCtx.arc(ppx, ppy, pulseR, 0, Math.PI * 2);
    miniCtx.stroke();
    miniCtx.fillStyle = p.color;
    miniCtx.beginPath();
    miniCtx.arc(ppx, ppy, 2, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.globalAlpha = 1;
  }
  // Border glow
  miniCtx.strokeStyle = 'rgba(40,80,140,0.3)';
  miniCtx.lineWidth = 1;
  miniCtx.strokeRect(0, 0, 140, 130);
}

// ===== CAMERA =====
let targetCamX = 0, targetCamY = 0;
function updateCamera() {
  const spd = 12;
  if (keys['ArrowLeft']) targetCamX -= spd;
  if (keys['ArrowRight']) targetCamX += spd;
  if (keys['ArrowUp']) targetCamY -= spd;
  if (keys['ArrowDown']) targetCamY += spd;
  if (mouseX < 20) targetCamX -= spd;
  if (mouseX > screenW - 20) targetCamX += spd;
  if (mouseY < 20) targetCamY -= spd;
  if (mouseY > screenH - 20) targetCamY += spd;
  targetCamX = Math.max(0, Math.min(MAP_W * TILE - screenW, targetCamX));
  targetCamY = Math.max(0, Math.min(MAP_H * TILE - screenH, targetCamY));
  // Smooth camera lerp
  camX += (targetCamX - camX) * 0.15;
  camY += (targetCamY - camY) * 0.15;
}

// ===== SUPERWEAPON ACTIVATION =====
function fireSuperweaponAt(team, tx, ty) {
  var faction = team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  var swKey = team === TEAMS.PLAYER ? 'player' : 'enemy';
  if (!superweaponReady[swKey]) return;
  if (swFiring) return;
  swFiring = { team: team, tx: tx, ty: ty, timer: 0, maxTimer: 180, faction: faction };
  if (team === TEAMS.PLAYER) showMsg('⚠️ ' + faction.name + ' SUPERWEAPON TARGETING...');
  else showMsg('🚨 ENEMY SUPERWEAPON INCOMING! 3 seconds to evacuate!');
  if (typeof sfxSuperweaponCharge === 'function') sfxSuperweaponCharge();
  superweaponReady[swKey] = false;
  superweaponCharge[swKey] = 0;
  superweaponCooldown[swKey] = 600;
}

function fireSuperweapon(team) {
  var faction = team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  var targetTeam = team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
  var swKey = team === TEAMS.PLAYER ? 'player' : 'enemy';
  if (!superweaponReady[swKey]) return;
  if (swFiring) return;

  // Auto-target: prioritize enemy HQ
  var tx, ty;
  var ehq = entities.find(function(e) { return e.type === 'hq' && e.team === targetTeam && !e.dead; });
  if (ehq) { tx = ehq.x + ehq.w/2; ty = ehq.y + ehq.h/2; }
  else {
    var nearest = entities.find(function(e) { return e.team === targetTeam && !e.dead; });
    if (!nearest) return;
    tx = nearest.x + nearest.w/2; ty = nearest.y + nearest.h/2;
  }
  fireSuperweaponAt(team, tx, ty);
}

function detonateSuperweapon(sw) {
  var targetTeam = sw.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
  var tx = sw.tx, ty = sw.ty;
  var radius = 5, dmg = 200;

  switch (sw.faction.id) {
    case 'thailand':
      // Golden Resonator: mass mind control — confuse all units in radius
      radius = 6;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== targetTeam || e.cat !== 'unit') continue;
        if (Math.hypot(e.x - tx, e.y - ty) < radius) {
          e.confused = 300; e.target = null;
          // Psychic wave rings
          for (var p = 0; p < 8; p++) {
            var ang = p / 8 * Math.PI * 2;
            particles.push({ x:e.x+0.5, y:e.y+0.5, vx:Math.cos(ang)*0.4, vy:Math.sin(ang)*0.4-0.3, life:25+rng()*15, maxLife:40, size:3+rng()*3, color:'#ff69b4', type:'ring' });
          }
        }
      }
      // Ground pulse rings expanding from center
      for (var r = 0; r < 3; r++) {
        for (var p = 0; p < 12; p++) {
          var ang = p / 12 * Math.PI * 2;
          var spd = 0.3 + r * 0.2;
          particles.push({ x:tx, y:ty, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:30+r*10, maxLife:40+r*10, size:4, color:r%2?'#ff69b4':'#ffaadd', type:'ring' });
        }
      }
      break;
    case 'japan':
      // Quantum Void Generator: black hole implosion — high damage falloff
      radius = 5; dmg = 350;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== targetTeam) continue;
        var dd = Math.hypot(e.x - tx, e.y - ty);
        if (dd < radius) {
          e.hp -= dmg * (1 - dd/radius);
          // Pull toward center (implosion)
          if (e.cat === 'unit') {
            var pull = 0.5 * (1 - dd/radius);
            e.x += (tx - e.x) * pull;
            e.y += (ty - e.y) * pull;
          }
          if (e.hp <= 0) { e.dead = true; spawnExplosion(e.x+e.w/2, e.y+e.h/2, 15); }
        }
      }
      // Void collapse particles — spiral inward
      for (var p = 0; p < 30; p++) {
        var ang = rng() * Math.PI * 2;
        var dist2 = 2 + rng() * 4;
        particles.push({ x:tx+Math.cos(ang)*dist2, y:ty+Math.sin(ang)*dist2, vx:-Math.cos(ang)*0.3, vy:-Math.sin(ang)*0.3, life:20+rng()*20, maxLife:40, size:2+rng()*3, color:rng()>0.5?'#ff1493':'#00ffff', type:'fire' });
      }
      break;
    case 'switzerland':
      // Absolute Zero Collider: freeze everything in massive radius
      radius = 7;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== targetTeam) continue;
        if (Math.hypot(e.x - tx, e.y - ty) < radius) {
          e.frozen = 300;
          // Ice crystal burst
          for (var p = 0; p < 6; p++) {
            var ang = p / 6 * Math.PI * 2;
            particles.push({ x:e.x+0.5, y:e.y+0.5, vx:Math.cos(ang)*0.3, vy:Math.sin(ang)*0.3-0.2, life:50+rng()*20, maxLife:70, size:4+rng()*3, color:'#aaeeff', type:'cryo' });
          }
        }
      }
      // Expanding frost wave
      for (var r = 0; r < 20; r++) {
        var ang = rng() * Math.PI * 2;
        var spd = 0.2 + rng() * 0.4;
        particles.push({ x:tx, y:ty, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:40+rng()*30, maxLife:70, size:3+rng()*4, color:rng()>0.3?'#aaeeff':'#ffffff', type:'cryo' });
      }
      break;
    case 'brazil':
      // Hive-Bomb: cyber-locust swarm — damage + burn over wide area
      radius = 6; dmg = 100;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== targetTeam) continue;
        if (Math.hypot(e.x - tx, e.y - ty) < radius) {
          e.hp -= dmg; e.burning = 200;
          // Swarming insect particles
          for (var p = 0; p < 4; p++) {
            particles.push({ x:e.x+0.5, y:e.y+0.5, vx:(rng()-0.5)*0.6, vy:(rng()-0.5)*0.6, life:30+rng()*20, maxLife:50, size:1+rng()*2, color:rng()>0.5?'#33ff66':'#aaff00', type:'fire' });
          }
          if (e.hp <= 0) { e.dead = true; spawnExplosion(e.x+e.w/2, e.y+e.h/2, 12); }
        }
      }
      // Toxic cloud expanding
      for (var p = 0; p < 25; p++) {
        var ang = rng() * Math.PI * 2;
        var spd = 0.1 + rng() * 0.3;
        particles.push({ x:tx, y:ty, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-0.1, life:40+rng()*30, maxLife:70, size:5+rng()*5, color:rng()>0.5?'#33ff66':'#66aa00', type:'fire' });
      }
      break;
    case 'egypt':
      // Solaris Orbital Array: concentrated solar beam — highest single-target damage
      radius = 4; dmg = 400;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== targetTeam) continue;
        if (Math.hypot(e.x - tx, e.y - ty) < radius) {
          e.hp -= dmg;
          if (e.hp <= 0) { e.dead = true; spawnExplosion(e.x+e.w/2, e.y+e.h/2, 20); }
        }
      }
      // Solar flare burst
      for (var p = 0; p < 20; p++) {
        var ang = rng() * Math.PI * 2;
        var spd = 0.2 + rng() * 0.5;
        particles.push({ x:tx, y:ty, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, life:15+rng()*20, maxLife:35, size:3+rng()*4, color:rng()>0.3?'#ffcc00':'#ff6600', type:'fire' });
      }
      break;
  }
  spawnExplosion(tx, ty, 30);
  shake(12);
  showMsg('💥 ' + sw.faction.name + ' SUPERWEAPON DETONATED!');
  if (typeof sfxSuperweaponFire === 'function') sfxSuperweaponFire();
}

// ===== GAME LOOP =====
function update() {
  gameTime++;
  updateCamera();
  for (const e of entities) updateEntity(e, 1);
  updateParticles();

  // Ambient: damaged buildings emit smoke
  if (gameTime % 20 === 0) {
    for (const e of entities) {
      if (e.dead || e.cat !== 'building') continue;
      if (e.hp < e.maxHp * 0.5) {
        spawnDamageSmoke(e.x + e.w/2, e.y + 0.2);
        if (e.hp < e.maxHp * 0.25 && rng() < 0.5) {
          // Critical: small fires
          particles.push({
            x: e.x + rng()*e.w, y: e.y + rng()*0.5,
            vx: (rng()-0.5)*0.3, vy: -0.5 - rng()*0.5,
            life: 10 + rng()*10, maxLife: 20,
            size: 1 + rng()*2,
            color: rng() > 0.5 ? '#ff6600' : '#ffaa00',
            type: 'fire'
          });
        }
      }
    }
  }
  // In-place dead entity removal (no array allocation)
  for (var _di = entities.length - 1; _di >= 0; _di--) {
    if (entities[_di].dead) entities.splice(_di, 1);
  }
  for (var _si = selectedEntities.length - 1; _si >= 0; _si--) {
    if (selectedEntities[_si].dead) selectedEntities.splice(_si, 1);
  }

  // Wreck decay
  for (var wi = wrecks.length - 1; wi >= 0; wi--) {
    wrecks[wi].life -= 1;
    if (wrecks[wi].life <= 0) wrecks.splice(wi, 1);
  }

  // Ping decay
  for (var pi = pings.length - 1; pi >= 0; pi--) {
    pings[pi].life -= 1;
    if (pings[pi].life <= 0) pings.splice(pi, 1);
  }

  // Enemy AI fires superweapon
  if (superweaponReady.enemy && gameTime % 60 === 0) {
    fireSuperweapon(TEAMS.ENEMY);
  }

  // Superweapon buildup tick
  if (swFiring) {
    swFiring.timer++;
    // Escalating screen shake during buildup
    if (swFiring.timer > swFiring.maxTimer * 0.7) shake(1 + (swFiring.timer / swFiring.maxTimer) * 3);
    // Detonate when timer expires
    if (swFiring.timer >= swFiring.maxTimer) {
      detonateSuperweapon(swFiring);
      swFiring = null;
    }
  }
  // Unit collision avoidance (RVO)
  if (typeof applyAvoidance === 'function') applyAvoidance(entities);
  if (typeof updateAnimations === 'function') updateAnimations(entities, gameTime);
  if (typeof updateWeather === 'function') updateWeather(gameTime);
  if (gameTime % 30 === 0) enemyAI();
  // Faction-specific AI
  if (gameTime % 30 === 0 && typeof factionAI === 'function') factionAI();
  // Faction economies
  if (typeof updateSwissEconomy === 'function') updateSwissEconomy(1);
  if (typeof updateBrazilEconomy === 'function') updateBrazilEconomy(1);
  if (typeof updateEgyptEconomy === 'function') updateEgyptEconomy(1);
  if (typeof updateJapanEconomy === 'function') updateJapanEconomy(1);
  if (typeof updatePowerGrid === 'function') updatePowerGrid();
  if (typeof updateTechDerricks === 'function') updateTechDerricks();
  if (typeof updateCryptoMines === 'function') updateCryptoMines();

  // Fog of War update
  if (typeof updateFog === 'function') updateFog();
  // Audio updates
  if (typeof updateMusic === 'function') updateMusic();
  if (typeof updateAmbient === 'function' && gameTime === 60) updateAmbient();
  if (typeof checkThreats === 'function' && gameTime % 60 === 0) checkThreats();

  // Track cash flow
  if (typeof _lastGold === 'undefined') { _lastGold = gold; _cashFlow = 0; _elGold = document.getElementById('gold'); _elPower = document.getElementById('power'); _elUnits = document.getElementById('units-count'); _gameOver = false; }
  // Throttle HUD updates to every 10 frames
  if (gameTime % 10 === 0 && !_gameOver) {
    if (gameTime % 60 === 0) { _cashFlow = Math.floor(gold) - _lastGold; _lastGold = Math.floor(gold); }
    var flowStr = _cashFlow >= 0 ? ' ▲+' + _cashFlow : ' ▼' + _cashFlow;
    var flowColor = _cashFlow >= 0 ? '#4f4' : '#f44';
    _elGold.innerHTML = Math.floor(gold) + '<span style="color:' + flowColor + ';font-size:10px">' + flowStr + '/s</span>';
    var pwLow = typeof powerLow !== 'undefined' && powerLow;
    _elPower.textContent = power;
    _elPower.style.color = pwLow ? '#ff4444' : (power > 20 ? '#4cf' : '#fff');
    _elPower.style.opacity = (pwLow && gameTime % 30 < 15) ? '0.4' : '1';
    // Unit count — manual count instead of .filter()
    var _uc = 0;
    for (var _ui = 0; _ui < entities.length; _ui++) { if (entities[_ui].cat === 'unit' && entities[_ui].team === TEAMS.PLAYER && !entities[_ui].dead) _uc++; }
    _elUnits.textContent = _uc + '/' + maxUnits;
  }
  if (gameTime % 30 === 0) { updateBuildPanel(); updateInfoPanel(); }
  if (typeof updateBuildQueue === 'function') updateBuildQueue();

  if (!_gameOver) {
    var _hasPlayerBase = false, _hasEnemyBase = false;
    for (var _wi = 0; _wi < entities.length; _wi++) {
      var _we = entities[_wi];
      if (_we.dead) continue;
      if (_we.team === TEAMS.PLAYER && (_we.type === 'hq' || _we.isMCV)) _hasPlayerBase = true;
      if (_we.team === TEAMS.ENEMY && (_we.type === 'hq' || _we.isMCV)) _hasEnemyBase = true;
    }
    if (!_hasPlayerBase) { showMsg('💀 DEFEAT! Your HQ was destroyed!'); _gameOver = true; }
    if (!_hasEnemyBase) { showMsg('🏆 VICTORY! ' + enemyFaction.name + ' HQ destroyed!'); _gameOver = true; }
  }
}

function render() {
  ctx.clearRect(0, 0, screenW, screenH);
  ctx.save();
  ctx.translate(screenShakeX, screenShakeY);
  drawMap();
  if (typeof drawMapObjects === 'function') drawMapObjects(ctx, camX, camY, screenW, screenH, TILE);
  if (typeof drawTechDerricks === 'function') drawTechDerricks(ctx);
  // Draw wrecks
  for (var wi = 0; wi < wrecks.length; wi++) {
    var wr = wrecks[wi];
    var wpx = wr.x * TILE - camX, wpy = wr.y * TILE - camY;
    ctx.globalAlpha = Math.min(1, wr.life / 100);
    ctx.fillStyle = '#555';
    ctx.fillRect(wpx - 6, wpy - 3, 12, 6);
    ctx.fillStyle = '#888';
    ctx.fillRect(wpx - 4, wpy - 4, 3, 3);
    ctx.fillRect(wpx + 2, wpy - 2, 4, 2);
    ctx.globalAlpha = 1;
  }
  drawEntities();
  drawParticles();
  // Fog of War overlay
  if (typeof drawFog === 'function') drawFog(ctx, camX, camY, screenW, screenH, TILE);
  drawPlacement();
  // Draw build radius when placing
  if (placingType && mcvDeployed) {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = playerFaction ? playerFaction.color : '#0f0';
    for (const e of entities) {
      if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'building') continue;
      const cx = (e.x + e.w / 2) * TILE - camX;
      const cy = (e.y + e.h / 2) * TILE - camY;
      ctx.beginPath();
      ctx.arc(cx, cy, BUILD_RADIUS * TILE, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = playerFaction ? playerFaction.color : '#0f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const e of entities) {
      if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'building') continue;
      const cx = (e.x + e.w / 2) * TILE - camX;
      const cy = (e.y + e.h / 2) * TILE - camY;
      ctx.beginPath();
      ctx.arc(cx, cy, BUILD_RADIUS * TILE, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  // Superweapon buildup VFX — sky darkens + targeting beam + faction-specific effects
  if (swFiring) {
    var pct = swFiring.timer / swFiring.maxTimer;
    var fid = swFiring.faction.id;
    // Sky darkens progressively — faction-tinted
    var skyColors = { thailand:'rgba(80,0,40,', japan:'rgba(20,0,40,', switzerland:'rgba(0,20,50,', brazil:'rgba(0,30,0,', egypt:'rgba(40,30,0,' };
    ctx.fillStyle = (skyColors[fid] || 'rgba(0,0,0,') + (pct * 0.45) + ')';
    ctx.fillRect(-20, -20, screenW + 40, screenH + 40);
    var tpx = swFiring.tx * TILE - camX, tpy = swFiring.ty * TILE - camY;
    // Evacuation zone — danger radius indicator
    var dangerR = { thailand:6, japan:5, switzerland:7, brazil:6, egypt:4 };
    var zoneR = (dangerR[fid] || 5) * TILE * pct;
    ctx.globalAlpha = 0.1 + pct * 0.15;
    ctx.fillStyle = 'rgba(255,0,0,0.15)';
    ctx.beginPath(); ctx.arc(tpx, tpy, zoneR, 0, Math.PI * 2); ctx.fill();
    // Pulsing target circle
    var pulseR = (6 + Math.sin(gameTime * 0.2) * 2) * TILE * pct;
    ctx.strokeStyle = swFiring.faction.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3 + pct * 0.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(tpx, tpy, pulseR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Inner targeting reticle
    ctx.globalAlpha = 0.5 + pct * 0.3;
    ctx.beginPath(); ctx.arc(tpx, tpy, 8 + Math.sin(gameTime * 0.15) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tpx - 15, tpy); ctx.lineTo(tpx + 15, tpy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tpx, tpy - 15); ctx.lineTo(tpx, tpy + 15); ctx.stroke();
    // Faction-specific buildup VFX
    if (fid === 'thailand' && pct > 0.4) {
      // Psychic waves radiating from center
      ctx.globalAlpha = (pct - 0.4) * 0.5;
      for (var ri = 0; ri < 3; ri++) {
        var waveR = ((gameTime * 0.03 + ri * 0.33) % 1) * pulseR;
        ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 2 - ri * 0.5;
        ctx.beginPath(); ctx.arc(tpx, tpy, waveR, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (fid === 'japan' && pct > 0.3) {
      // Void distortion — rotating dark spiral
      ctx.globalAlpha = (pct - 0.3) * 0.4;
      ctx.strokeStyle = '#ff1493'; ctx.lineWidth = 2;
      for (var si = 0; si < 4; si++) {
        var sAng = gameTime * 0.05 + si * Math.PI / 2;
        var sR = pulseR * 0.8;
        ctx.beginPath();
        ctx.moveTo(tpx, tpy);
        ctx.quadraticCurveTo(tpx + Math.cos(sAng) * sR * 0.5, tpy + Math.sin(sAng) * sR * 0.5, tpx + Math.cos(sAng + 0.5) * sR, tpy + Math.sin(sAng + 0.5) * sR);
        ctx.stroke();
      }
    } else if (fid === 'switzerland' && pct > 0.3) {
      // Frost crystals forming
      ctx.globalAlpha = (pct - 0.3) * 0.3;
      ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 1;
      for (var ci = 0; ci < 6; ci++) {
        var cAng = ci / 6 * Math.PI * 2 + gameTime * 0.01;
        var cLen = pulseR * 0.6;
        ctx.beginPath();
        ctx.moveTo(tpx, tpy);
        ctx.lineTo(tpx + Math.cos(cAng) * cLen, tpy + Math.sin(cAng) * cLen);
        ctx.stroke();
      }
    } else if (fid === 'brazil' && pct > 0.4) {
      // Toxic spore cloud expanding
      ctx.globalAlpha = (pct - 0.4) * 0.25;
      for (var bi = 0; bi < 8; bi++) {
        var bAng = bi / 8 * Math.PI * 2 + Math.sin(gameTime * 0.03 + bi) * 0.3;
        var bDist = pulseR * (0.3 + Math.sin(gameTime * 0.05 + bi * 2) * 0.15);
        var bx = tpx + Math.cos(bAng) * bDist, by = tpy + Math.sin(bAng) * bDist;
        var bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 15);
        bGrad.addColorStop(0, 'rgba(51,255,102,0.4)'); bGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bGrad; ctx.fillRect(bx - 15, by - 15, 30, 30);
      }
    } else if (fid === 'egypt' && pct > 0.2) {
      // Solar beam intensifying from sky
      ctx.globalAlpha = (pct - 0.2) * 0.3;
      var sunGrad = ctx.createRadialGradient(tpx, tpy, 0, tpx, tpy, pulseR * 0.5);
      sunGrad.addColorStop(0, '#ffcc00'); sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad; ctx.fillRect(tpx - pulseR, tpy - pulseR, pulseR * 2, pulseR * 2);
    }
    // Beam from top of screen
    if (pct > 0.3) {
      var beamAlpha = (pct - 0.3) * 0.7;
      var beamW = 4 + pct * 12;
      var grad = ctx.createLinearGradient(tpx, -20, tpx, tpy);
      grad.addColorStop(0, 'rgba(255,255,255,' + beamAlpha * 0.3 + ')');
      grad.addColorStop(0.7, swFiring.faction.color);
      grad.addColorStop(1, '#ffffff');
      ctx.globalAlpha = beamAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(tpx - beamW/2, -20, beamW, tpy + 20);
      ctx.globalAlpha = beamAlpha * 0.3;
      ctx.fillStyle = swFiring.faction.color;
      ctx.fillRect(tpx - beamW * 1.5, -20, beamW * 3, tpy + 20);
    }
    // Countdown text
    var secsLeft = Math.ceil((swFiring.maxTimer - swFiring.timer) / 60);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ IMPACT IN ' + secsLeft + 's', screenW / 2, 85);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = swFiring.faction.color;
    ctx.fillText(swFiring.faction.name + ' SUPERWEAPON', screenW / 2, 108);
    // Evacuation warning
    if (swFiring.team !== TEAMS.PLAYER && pct > 0.3) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ff4444';
      ctx.globalAlpha = 0.5 + Math.sin(gameTime * 0.3) * 0.3;
      ctx.fillText('⚠ EVACUATE THE AREA! ⚠', screenW / 2, 130);
    }
    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
  }
  // Superweapon targeting cursor overlay
  if (swTargeting) {
    var twx = worldX(mouseX), twy = worldY(mouseY);
    var tcx = twx * TILE - camX, tcy = twy * TILE - camY;
    var swRad = { thailand:6, japan:5, switzerland:7, brazil:6, egypt:4 };
    var r = (swRad[playerFaction.id] || 5) * TILE;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.beginPath(); ctx.arc(tcx, tcy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath(); ctx.arc(tcx, tcy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Crosshair
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tcx - 20, tcy); ctx.lineTo(tcx + 20, tcy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tcx, tcy - 20); ctx.lineTo(tcx, tcy + 20); ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🎯 Click to fire superweapon', screenW / 2, 50);
    ctx.textAlign = 'start';
    ctx.globalAlpha = 1;
  }
  // Day/Night atmospheric overlay
  if (typeof dayNightCycle !== 'undefined' && typeof getDayNightAlpha === 'function') {
    var dnAlpha = getDayNightAlpha();
    if (dnAlpha > 0.01) {
      ctx.save();
      var sunAng = typeof getSunAngle === 'function' ? getSunAngle() : Math.PI * 0.5;
      var t = dayNightCycle / DAY_NIGHT_TOTAL;
      var isDawn = t < 0.08;
      var isDusk = t >= 0.50 && t < 0.58;
      var isGoldenHour = isDawn || isDusk;

      // Base night tint — deep blue gradient from top
      var nightGrad = ctx.createLinearGradient(0, -20, 0, screenH + 20);
      nightGrad.addColorStop(0, 'rgba(5,5,30,' + (dnAlpha * 0.45) + ')');
      nightGrad.addColorStop(0.6, 'rgba(10,10,40,' + (dnAlpha * 0.35) + ')');
      nightGrad.addColorStop(1, 'rgba(15,15,50,' + (dnAlpha * 0.25) + ')');
      ctx.fillStyle = nightGrad;
      ctx.fillRect(-20, -20, screenW + 40, screenH + 40);

      // Golden hour warm glow (dawn/dusk)
      if (isGoldenHour) {
        var ghAlpha = isDawn ? (1.0 - t / 0.08) : ((t - 0.50) / 0.08);
        var warmth = ghAlpha * 0.2;
        // Horizon glow — warm gradient from the sun side
        var sunX = isDawn ? 0 : screenW;
        var horizonGrad = ctx.createRadialGradient(sunX, screenH * 0.7, 0, sunX, screenH * 0.7, screenW * 0.8);
        horizonGrad.addColorStop(0, 'rgba(255,140,40,' + warmth + ')');
        horizonGrad.addColorStop(0.4, 'rgba(255,80,20,' + (warmth * 0.5) + ')');
        horizonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(-20, -20, screenW + 40, screenH + 40);
      }

      // Moonlight — subtle cool directional light at night
      if (dnAlpha > 0.7) {
        var moonAlpha = (dnAlpha - 0.7) / 0.3 * 0.08;
        var moonX = screenW * 0.75 + Math.sin(t * Math.PI * 2) * screenW * 0.15;
        var moonGrad = ctx.createRadialGradient(moonX, 30, 0, moonX, 30, screenH * 0.6);
        moonGrad.addColorStop(0, 'rgba(180,200,255,' + moonAlpha + ')');
        moonGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = moonGrad;
        ctx.fillRect(-20, -20, screenW + 40, screenH + 40);
      }

      // Stars at deep night
      if (dnAlpha > 0.8) {
        var starAlpha = (dnAlpha - 0.8) / 0.2 * 0.6;
        ctx.fillStyle = 'rgba(255,255,255,' + starAlpha + ')';
        // Deterministic star positions using simple hash
        for (var si = 0; si < 40; si++) {
          var sx = ((si * 7919 + 104729) % screenW);
          var sy = ((si * 6271 + 32749) % (screenH * 0.5));
          var twinkle = 0.5 + Math.sin(gameTime * 0.03 + si * 2.1) * 0.5;
          ctx.globalAlpha = starAlpha * twinkle;
          ctx.fillRect(sx, sy, si % 3 === 0 ? 2 : 1, si % 3 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
      }

      // Vignette — darker edges at night
      if (dnAlpha > 0.3) {
        var vigAlpha = (dnAlpha - 0.3) * 0.25;
        var vig = ctx.createRadialGradient(screenW / 2, screenH / 2, screenH * 0.3, screenW / 2, screenH / 2, screenH * 0.9);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,15,' + vigAlpha + ')');
        ctx.fillStyle = vig;
        ctx.fillRect(-20, -20, screenW + 40, screenH + 40);
      }
      ctx.restore();
    }
  }
  ctx.restore();
  // Weather overlay
  if (typeof drawWeather === 'function') drawWeather(ctx, screenW, screenH);
  drawSelectionBox();
  drawMinimap();

  // Superweapon charge bar
  var sw = entities.find(function(e) { return e.type === 'superweapon' && e.team === TEAMS.PLAYER && !e.dead; });
  if (sw) {
    var charge = superweaponCharge.player || 0;
    var pct = Math.min(1, charge / SUPERWEAPON_CHARGE_TIME);
    var bx = screenW/2 - 80, by = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 2, by - 2, 164, 18);
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, 160, 14);
    var barColor = superweaponReady.player ? '#ff3333' : playerFaction.color;
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, 160 * pct, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(superweaponReady.player ? '⚠ SUPERWEAPON READY [S]' : '⚡ Charging ' + Math.floor(pct*100) + '%', bx + 80, by + 11);
    ctx.textAlign = 'start';
  }

  // Build queue progress bar
  if (typeof buildQueue !== 'undefined' && buildQueue.length > 0) {
    var qi = buildQueue[0];
    var qd = DEFS[qi.type];
    var qpct = qi.timer / qi.maxTimer;
    var qx = screenW/2 - 80, qy = 60;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(qx - 2, qy - 2, 164, 18);
    ctx.fillStyle = '#222';
    ctx.fillRect(qx, qy, 160, 14);
    ctx.fillStyle = '#4cf';
    ctx.fillRect(qx, qy, 160 * qpct, 14);
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🔨 ' + (qd ? qd.name : qi.type) + ' ' + Math.floor(qpct*100) + '% [' + buildQueue.length + ' queued]', qx + 80, qy + 11);
    ctx.textAlign = 'start';
  }

  // Faction-specific UI frame accent
  if (playerFaction) {
    // Bottom UI border glow
    ctx.save();
    var uiY = screenH;
    var gt = gameTime;
    ctx.strokeStyle = playerFaction.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4 + Math.sin(gt * 0.03) * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, uiY);
    ctx.lineTo(screenW, uiY);
    ctx.stroke();
    // Faction-specific corner decorations with animation
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = playerFaction.color;
    switch (playerFaction.id) {
      case 'thailand': // curved ornate corners + floating saffron particles
        ctx.beginPath(); ctx.arc(0, uiY, 40, -Math.PI/2, 0); ctx.lineTo(0, uiY); ctx.fill();
        ctx.beginPath(); ctx.arc(screenW, uiY, 40, -Math.PI, -Math.PI/2); ctx.lineTo(screenW, uiY); ctx.fill();
        // Animated gold sparkles along border
        ctx.globalAlpha = 0.3;
        for (var si = 0; si < 8; si++) {
          var sx = (si * screenW / 8 + gt * 0.5) % screenW;
          var sy = uiY - 4 + Math.sin(gt * 0.05 + si) * 3;
          ctx.fillStyle = '#f0c040';
          ctx.beginPath(); ctx.arc(sx, sy, 1.5 + Math.sin(gt * 0.1 + si) * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'japan': // angular neon slashes + flickering neon
        ctx.fillRect(0, uiY - 30, 60, 30);
        ctx.fillRect(screenW - 60, uiY - 30, 60, 30);
        // Neon flicker lines
        ctx.globalAlpha = 0.2 + Math.sin(gt * 0.15) * 0.15;
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 1;
        for (var ni = 0; ni < 5; ni++) {
          var nx = 60 + ni * (screenW - 120) / 5;
          ctx.beginPath();
          ctx.moveTo(nx, uiY);
          ctx.lineTo(nx + 15, uiY - 8 - Math.sin(gt * 0.1 + ni) * 4);
          ctx.lineTo(nx + 30, uiY);
          ctx.stroke();
        }
        // Cyan accent pulse
        ctx.globalAlpha = 0.1 + Math.sin(gt * 0.08) * 0.08;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(0, uiY - 2, screenW, 2);
        break;
      case 'switzerland': // thick geometric blocks + polished metal shimmer
        ctx.fillRect(0, uiY - 20, 80, 20);
        ctx.fillRect(screenW - 80, uiY - 20, 80, 20);
        // Metal shimmer sweep
        var shimmerX = (gt * 2) % (screenW + 200) - 100;
        ctx.globalAlpha = 0.12;
        var shimGrad = ctx.createLinearGradient(shimmerX - 40, 0, shimmerX + 40, 0);
        shimGrad.addColorStop(0, 'transparent');
        shimGrad.addColorStop(0.5, '#ffffff');
        shimGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = shimGrad;
        ctx.fillRect(0, uiY - 20, screenW, 20);
        // Red cross emblem pulse
        ctx.globalAlpha = 0.15 + Math.sin(gt * 0.04) * 0.05;
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(screenW/2 - 6, uiY - 16, 12, 3);
        ctx.fillRect(screenW/2 - 1.5, uiY - 20, 3, 12);
        break;
      case 'brazil': // organic vine-like curves + animated growing vines
        ctx.beginPath();
        ctx.moveTo(0, uiY); ctx.quadraticCurveTo(30, uiY - 25, 60, uiY);
        ctx.quadraticCurveTo(90, uiY - 15, 120, uiY);
        ctx.lineTo(0, uiY); ctx.fill();
        // Animated vines creeping along border
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#33ff66';
        ctx.lineWidth = 2;
        for (var vi = 0; vi < 6; vi++) {
          var vx = vi * screenW / 6;
          var vineLen = 30 + Math.sin(gt * 0.02 + vi * 1.5) * 15;
          ctx.beginPath();
          ctx.moveTo(vx, uiY);
          ctx.quadraticCurveTo(vx + vineLen * 0.3, uiY - vineLen * 0.6 - Math.sin(gt * 0.04 + vi) * 5,
                               vx + vineLen * 0.6, uiY - vineLen * 0.3);
          ctx.stroke();
          // Leaf at vine tip
          ctx.globalAlpha = 0.15 + Math.sin(gt * 0.06 + vi) * 0.05;
          ctx.fillStyle = '#33ff66';
          var lx = vx + vineLen * 0.6, ly = uiY - vineLen * 0.3;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 3, 1.5, Math.sin(gt * 0.03 + vi) * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Pulsing spore particles
        ctx.globalAlpha = 0.12;
        for (var spi = 0; spi < 4; spi++) {
          var spx = (spi * screenW / 4 + gt * 0.3) % screenW;
          var spy = uiY - 10 - Math.sin(gt * 0.07 + spi * 2) * 8;
          ctx.fillStyle = '#66ff99';
          ctx.beginPath(); ctx.arc(spx, spy, 1 + Math.sin(gt * 0.1 + spi) * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'egypt': // pyramid/obelisk shapes + glowing hieroglyphs
        ctx.beginPath(); ctx.moveTo(0, uiY); ctx.lineTo(30, uiY - 35); ctx.lineTo(60, uiY); ctx.fill();
        ctx.beginPath(); ctx.moveTo(screenW, uiY); ctx.lineTo(screenW - 30, uiY - 35); ctx.lineTo(screenW - 60, uiY); ctx.fill();
        // Animated glowing hieroglyphs along border
        ctx.globalAlpha = 0.2 + Math.sin(gt * 0.05) * 0.1;
        ctx.fillStyle = '#ffcc00';
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        var hieroglyphs = ['𓂀', '𓁹', '𓃭', '𓆣', '𓇳', '𓊝'];
        for (var hi = 0; hi < hieroglyphs.length; hi++) {
          var hx = 80 + hi * (screenW - 160) / hieroglyphs.length;
          var hy = uiY - 6 + Math.sin(gt * 0.04 + hi * 1.2) * 3;
          ctx.globalAlpha = 0.15 + Math.sin(gt * 0.06 + hi) * 0.1;
          ctx.fillText(hieroglyphs[hi], hx, hy);
        }
        ctx.textAlign = 'start';
        // Golden light sweep
        var eyeX = (gt * 1.5) % (screenW + 200) - 100;
        ctx.globalAlpha = 0.08;
        var eyeGrad = ctx.createRadialGradient(eyeX, uiY - 10, 0, eyeX, uiY - 10, 50);
        eyeGrad.addColorStop(0, '#ffcc00');
        eyeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = eyeGrad;
        ctx.fillRect(eyeX - 50, uiY - 30, 100, 30);
        break;
    }
    ctx.restore();
  }

  // Draw pings on main view
  for (var pi = 0; pi < pings.length; pi++) {
    var p = pings[pi];
    var ppx = p.x * TILE - camX, ppy = p.y * TILE - camY;
    var alpha = p.life / p.maxLife;
    var pulseR = (1 - alpha) * 30 + 8;
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ppx, ppy, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Weather indicator
  if (typeof currentWeather !== 'undefined' && currentWeather !== 'clear') {
    const wLabels = {rain:'🌧️ Rain', snow:'❄️ Snow', sandstorm:'🌪️ Sandstorm', fog:'🌫️ Fog'};
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(screenW/2-50, 8, 100, 22);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(wLabels[currentWeather] || currentWeather, screenW/2, 23);
    ctx.textAlign = 'start';
  }
}

function gameLoop(timestamp) {
  if (!timestamp) timestamp = performance.now();
  if (!gameLoop._lastTime) gameLoop._lastTime = timestamp;
  var elapsed = timestamp - gameLoop._lastTime;
  gameLoop._lastTime = timestamp;

  // Fixed timestep: accumulate time, run update at 60fps intervals
  if (!gameLoop._accum) gameLoop._accum = 0;
  gameLoop._accum += Math.min(elapsed, 50); // cap to prevent spiral of death
  var SIM_STEP = 16.667; // 60fps

  // In online mode, wait for server tick
  if (typeof netMode !== 'undefined' && netMode === 'online') {
    if (typeof netProcessTick === 'function' && netProcessTick()) {
      update();
      gameLoop._accum = 0;
    }
  } else {
    // Run simulation at fixed rate, render at display rate
    while (gameLoop._accum >= SIM_STEP) {
      update();
      gameLoop._accum -= SIM_STEP;
    }
  }

  // Interpolation alpha for smooth rendering between sim ticks
  var alpha = gameLoop._accum / SIM_STEP;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead) continue;
    e.renderX += (e.x - e.renderX) * (0.2 + alpha * 0.3);
    e.renderY += (e.y - e.renderY) * (0.2 + alpha * 0.3);
  }

  render();
  requestAnimationFrame(gameLoop);
}
