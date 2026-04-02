// ===== FACTION ECONOMY SYSTEMS =====
if (typeof rng !== 'function') { var rng = Math.random; }

// --- Power Grid ---
var powerLow = false;

function recalcPower() {
  if (typeof playerFaction === 'undefined' || !playerFaction) return;
  var total = 0;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'building') continue;
    var d = e.getDef();
    if (d.powerGen) total += d.powerGen;
  }
  power = total;
}

function updatePowerGrid() {
  recalcPower();

  // Egypt solar cycle modifies power from power plants
  if (typeof playerFaction !== 'undefined' && playerFaction && playerFaction.id === 'egypt') {
    var plantCount = 0;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e.dead && e.team === TEAMS.PLAYER && e.type === 'powerplant') plantCount++;
    }
    var basePower = playerFaction.defs.powerplant.powerGen;
    // Daytime: 1.5x, Nighttime: 0.5x — adjust delta from base
    var mult = isDaytime ? 1.5 : 0.5;
    power += Math.floor(plantCount * basePower * (mult - 1));
  }

  powerLow = power < 0;
  if (powerLow) showMsg('⚠️ LOW POWER — Turrets offline, radar disabled!');
}

// --- Switzerland: Compound Interest ---
function updateSwissEconomy(dt) {
  if (typeof playerFaction === 'undefined' || !playerFaction || playerFaction.id !== 'switzerland') return;
  if (gameTime % 60 === 0) {
    gold += Math.min(gold * 0.005, 50);
  }
}

// --- Thailand: War Bounty ---
function getWarBounty(attacker, target) {
  if (typeof playerFaction === 'undefined') return 0;
  var faction = attacker.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'thailand') return 0;
  var td = target.getDef();
  return Math.floor((td.cost || 0) * 0.3);
}

// --- Brazil: Bio-Nodes ---
function updateBrazilEconomy(dt) {
  if (typeof playerFaction === 'undefined' || !playerFaction || playerFaction.id !== 'brazil') return;

  // Refinery income with growing bioAge
  if (gameTime % 90 === 0) {
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.dead || e.type !== 'refinery' || e.team !== TEAMS.PLAYER) continue;
      if (!e.bioAge) e.bioAge = 0;
      e.bioAge++;
      gold += 5 + e.bioAge * 2;
    }
  }

  // Bio-Node spread: small chance to convert adjacent grass to forest
  if (gameTime % 120 === 0) {
    for (var y = 1; y < MAP_H - 1; y++) {
      for (var x = 1; x < MAP_W - 1; x++) {
        if (map[y][x] !== 3) continue; // only spread from forest
        if (rng() < 0.02) {
          var nx = x + ((rng() * 3 | 0) - 1);
          var ny = y + ((rng() * 3 | 0) - 1);
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H && map[ny][nx] === 0) {
            map[ny][nx] = 3;
          }
        }
      }
    }
  }
}

// --- Egypt: Solar Cycle ---
var dayNightCycle = 0;
var isDaytime = true;
var DAY_NIGHT_TOTAL = 18000;  // 5 minutes at 60fps
var DAY_NIGHT_PHASES = {
  // fraction of total cycle for each phase
  dawn: 0.08,    // 0.00-0.08  sunrise transition
  day: 0.42,     // 0.08-0.50  full daylight
  dusk: 0.08,    // 0.50-0.58  sunset transition
  night: 0.42    // 0.58-1.00  nighttime
};
// Returns 0.0 (full day) to 1.0 (full night) with smooth transitions
function getDayNightAlpha() {
  var t = dayNightCycle / DAY_NIGHT_TOTAL; // 0..1
  if (t < 0.08) return 1.0 - t / 0.08;           // dawn: night→day
  if (t < 0.50) return 0.0;                        // day
  if (t < 0.58) return (t - 0.50) / 0.08;         // dusk: day→night
  return 1.0;                                       // night
}
// Sun angle: 0=horizon(dawn), PI/2=zenith(noon), PI=horizon(dusk), >PI=below
function getSunAngle() {
  var t = dayNightCycle / DAY_NIGHT_TOTAL;
  if (t < 0.08) return t / 0.08 * (Math.PI * 0.15);
  if (t < 0.50) return Math.PI * 0.15 + (t - 0.08) / 0.42 * Math.PI * 0.7;
  if (t < 0.58) return Math.PI * 0.85 + (t - 0.50) / 0.08 * Math.PI * 0.15;
  return 0;
}

function updateEgyptEconomy(dt) {
  dayNightCycle = (dayNightCycle + 1) % DAY_NIGHT_TOTAL;
  isDaytime = getDayNightAlpha() < 0.5;

  if (typeof playerFaction === 'undefined' || !playerFaction || playerFaction.id !== 'egypt') return;

  // Battery stores excess power during day, releases at night
  var batteryCount = 0;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.dead && e.team === TEAMS.PLAYER && e.type === 'battery') batteryCount++;
  }

  if (isDaytime && gameTime % 60 === 0) {
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (!e.dead && e.team === TEAMS.PLAYER && e.type === 'powerplant') gold += 8;
    }
    // Excess power → gold conversion (batteries amplify)
    if (power > 5) {
      var excess = Math.min(power - 5, batteryCount * 3);
      gold += excess;
    }
  }
  // Night: batteries provide emergency power
  if (!isDaytime && batteryCount > 0 && gameTime % 120 === 0) {
    power += batteryCount * 2;
  }
}

// --- Japan: Power Drain Penalty ---
function updateJapanEconomy(dt) {
  if (typeof playerFaction === 'undefined' || !playerFaction || playerFaction.id !== 'japan') return;
  if (gameTime % 120 === 0 && power < 0) {
    gold -= 20;
    if (gold < 0) gold = 0;
    showMsg('⚡ Power drain! -20 gold');
  }
}

// --- Neutral Tech Derricks ---
var techDerricks = [];

function initTechDerricks() {
  techDerricks = [
    { x: Math.floor(MAP_W * 0.5), y: Math.floor(MAP_H * 0.5), owner: -1 },
    { x: Math.floor(MAP_W * 0.3), y: Math.floor(MAP_H * 0.3), owner: -1 },
    { x: Math.floor(MAP_W * 0.7), y: Math.floor(MAP_H * 0.7), owner: -1 },
    { x: Math.floor(MAP_W * 0.25), y: Math.floor(MAP_H * 0.65), owner: -1 },
    { x: Math.floor(MAP_W * 0.75), y: Math.floor(MAP_H * 0.35), owner: -1 }
  ];
}

function updateTechDerricks() {
  if (gameTime % 60 !== 0) return;
  for (var i = 0; i < techDerricks.length; i++) {
    var d = techDerricks[i];
    // Capture check
    for (var j = 0; j < entities.length; j++) {
      var e = entities[j];
      if (e.dead || e.type !== 'engineer') continue;
      if (Math.hypot(e.x - d.x, e.y - d.y) < 2) d.owner = e.team;
    }
    // Income
    if (d.owner === TEAMS.PLAYER) gold += 15;
  }
}

function drawTechDerricks(ctx) {
  for (var i = 0; i < techDerricks.length; i++) {
    var d = techDerricks[i];
    var px = d.x * 32 - camX, py = d.y * 32 - camY; // TILE=32
    ctx.fillStyle = d.owner === TEAMS.PLAYER ? 'rgba(0,255,0,0.3)' : d.owner === TEAMS.ENEMY ? 'rgba(255,0,0,0.3)' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(px - 8, py - 8, 16, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⛽', px, py + 4);
  }
  // Draw Crypto-Mines
  for (var i = 0; i < cryptoMines.length; i++) {
    var m = cryptoMines[i];
    var mx = m.x * 32 - camX, my = m.y * 32 - camY;
    ctx.fillStyle = m.owner === TEAMS.PLAYER ? 'rgba(0,200,255,0.3)' : m.owner === TEAMS.ENEMY ? 'rgba(255,100,0,0.3)' : 'rgba(200,180,255,0.2)';
    ctx.fillRect(mx - 10, my - 10, 20, 20);
    ctx.strokeStyle = m.owner === TEAMS.PLAYER ? '#0cf' : m.owner === TEAMS.ENEMY ? '#f60' : '#aaf';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 10, my - 10, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('₿', mx, my + 4);
    // Animated data stream particles
    if (m.owner >= 0 && gameTime % 8 === 0) {
      var pColor = m.owner === TEAMS.PLAYER ? '#0cf' : '#f60';
      particles.push({ x: m.x + (rng()-0.5)*0.5, y: m.y - 0.3, vx: (rng()-0.5)*0.2, vy: -0.5 - rng()*0.3, life: 8 + rng()*6, maxLife: 14, size: 1 + rng(), color: pColor, type: 'spark' });
    }
  }
}

// --- Neutral Crypto-Mines ---
var cryptoMines = [];

function initCryptoMines() {
  cryptoMines = [
    { x: Math.floor(MAP_W * 0.15), y: Math.floor(MAP_H * 0.5), owner: -1 },
    { x: Math.floor(MAP_W * 0.85), y: Math.floor(MAP_H * 0.5), owner: -1 },
    { x: Math.floor(MAP_W * 0.5), y: Math.floor(MAP_H * 0.15), owner: -1 }
  ];
}

function updateCryptoMines() {
  if (gameTime % 60 !== 0) return;
  for (var i = 0; i < cryptoMines.length; i++) {
    var m = cryptoMines[i];
    // Capture check — engineers capture
    for (var j = 0; j < entities.length; j++) {
      var e = entities[j];
      if (e.dead || e.type !== 'engineer') continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < 2) m.owner = e.team;
    }
    // Crypto income: volatile — random 10-30 gold
    if (m.owner === TEAMS.PLAYER) {
      var income = 10 + Math.floor(rng() * 21);
      gold += income;
    }
  }
}
