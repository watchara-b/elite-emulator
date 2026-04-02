// ===== AI FSM (Finite State Machine) per Faction =====
// Features: 3 difficulty levels, adaptive strategy, smart superweapon targeting

const AI_STATES = { SCOUT: 0, CONTROL: 1, SUPER: 2 };
let aiState = AI_STATES.SCOUT;
let aiStateTimer = 0;

// ===== DIFFICULTY SYSTEM =====
// 'easy' | 'normal' | 'hard'
var aiDifficulty = 'normal';
var AI_PARAMS = {
  easy:   { atkThreshold: 6, retreatHp: 0.15, buildChance: 0.6, abilityChance: 0.3, swSmartTarget: false, adaptRate: 0,   spawnMult: 0.5, groupSize: 3 },
  normal: { atkThreshold: 4, retreatHp: 0.2,  buildChance: 1.0, abilityChance: 0.7, swSmartTarget: true,  adaptRate: 0.5, spawnMult: 1.0, groupSize: 5 },
  hard:   { atkThreshold: 3, retreatHp: 0.25, buildChance: 1.5, abilityChance: 1.0, swSmartTarget: true,  adaptRate: 1.0, spawnMult: 1.5, groupSize: 4 }
};

function getAIParams() { return AI_PARAMS[aiDifficulty] || AI_PARAMS.normal; }

function setAIDifficulty(level) {
  if (AI_PARAMS[level]) aiDifficulty = level;
}

// ===== ADAPTIVE STRATEGY =====
var aiMemory = {
  playerArmyComp: { light: 0, medium: 0, heavy: 0, air: 0 },
  playerAttackDir: null,     // last direction player attacked from
  lostUnitsLastWave: 0,
  playerPushCount: 0,        // how many times player pushed into AI base
  lastAdaptTick: 0
};

function aiAnalyzePlayerArmy() {
  var comp = { light: 0, medium: 0, heavy: 0, air: 0 };
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'unit') continue;
    var d = e.getDef();
    if (d && d.armorType && comp[d.armorType] !== undefined) comp[d.armorType]++;
  }
  aiMemory.playerArmyComp = comp;
}

// Pick counter-unit type based on what player builds most
function aiPickCounterUnit(fromBuilding) {
  var p = getAIParams();
  if (p.adaptRate === 0 || rng() > p.adaptRate) return null;
  var comp = aiMemory.playerArmyComp;
  var dominant = 'light';
  var max = 0;
  for (var k in comp) { if (comp[k] > max) { max = comp[k]; dominant = k; } }
  // Counter matrix: light→antiInf, medium→explosive, heavy→armorPierce, air→antiAir
  var counterDmg = { light: 'antiInf', medium: 'explosive', heavy: 'armorPierce', air: 'antiAir' };
  var wanted = counterDmg[dominant];
  // Find a unit from ENEMY_DEFS that has this dmgType and can be built from fromBuilding
  for (var t in ENEMY_DEFS) {
    var d = ENEMY_DEFS[t];
    if (d.cat !== 'unit' || !d.dmgType) continue;
    if (d.from !== fromBuilding) continue;
    if (d.dmgType === wanted) return t;
  }
  return null;
}

// Detect player push direction
function aiDetectPlayerPush(ehq) {
  if (!ehq) return;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'unit') continue;
    if (Math.hypot(e.x - ehq.x, e.y - ehq.y) < 15) {
      aiMemory.playerAttackDir = { x: e.x - ehq.x, y: e.y - ehq.y };
      aiMemory.playerPushCount++;
      return;
    }
  }
}

// ===== SMART SUPERWEAPON TARGETING =====
function aiSmartSuperweaponTarget() {
  var p = getAIParams();
  if (!p.swSmartTarget) return null;

  var bestTarget = null;
  var bestScore = -1;

  // Score each potential target area
  // Strategy: find cluster of player units/buildings with highest value
  var candidates = [];

  // Candidate 1: Player HQ
  var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
  if (phq) candidates.push({ x: phq.x + phq.w / 2, y: phq.y + phq.h / 2, baseScore: 100 });

  // Candidate 2: Player superweapon
  var psw = entities.find(function(e) { return e.type === 'superweapon' && e.team === TEAMS.PLAYER && !e.dead; });
  if (psw) candidates.push({ x: psw.x + psw.w / 2, y: psw.y + psw.h / 2, baseScore: 150 });

  // Candidate 3: Largest cluster of player units
  var playerUnits = [];
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.dead && e.team === TEAMS.PLAYER && e.cat === 'unit') playerUnits.push(e);
  }
  if (playerUnits.length >= 3) {
    // Find centroid of densest cluster using simple grid scan
    var bestCluster = null, bestCount = 0;
    for (var ci = 0; ci < playerUnits.length; ci++) {
      var cx = playerUnits[ci].x, cy = playerUnits[ci].y;
      var count = 0, totalCost = 0;
      for (var cj = 0; cj < playerUnits.length; cj++) {
        if (Math.hypot(playerUnits[cj].x - cx, playerUnits[cj].y - cy) < 6) {
          count++;
          var ud = playerUnits[cj].getDef();
          totalCost += ud ? (ud.cost || 50) : 50;
        }
      }
      if (count > bestCount || (count === bestCount && totalCost > (bestCluster ? bestCluster.cost : 0))) {
        bestCount = count;
        bestCluster = { x: cx, y: cy, count: count, cost: totalCost };
      }
    }
    if (bestCluster && bestCluster.count >= 3) {
      candidates.push({ x: bestCluster.x, y: bestCluster.y, baseScore: bestCluster.count * 20 + bestCluster.cost * 0.1 });
    }
  }

  // Candidate 4: Player refinery cluster (economic damage)
  var refineries = [];
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.dead && e.team === TEAMS.PLAYER && e.type === 'refinery') refineries.push(e);
  }
  if (refineries.length > 0) {
    var rx = 0, ry = 0;
    for (var i = 0; i < refineries.length; i++) { rx += refineries[i].x; ry += refineries[i].y; }
    rx /= refineries.length; ry /= refineries.length;
    candidates.push({ x: rx, y: ry, baseScore: 80 + refineries.length * 30 });
  }

  // Score each candidate by counting nearby player entities
  var swRadius = { thailand: 6, japan: 5, switzerland: 7, brazil: 6, egypt: 4 };
  var radius = (enemyFaction ? swRadius[enemyFaction.id] : 5) || 5;

  for (var ci = 0; ci < candidates.length; ci++) {
    var c = candidates[ci];
    var score = c.baseScore;
    // Count player entities in blast radius
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.dead || e.team !== TEAMS.PLAYER) continue;
      var dd = Math.hypot(e.x - c.x, e.y - c.y);
      if (dd < radius) {
        var ed = e.getDef();
        var value = ed ? (ed.cost || 50) : 50;
        if (e.cat === 'building') value *= 2;
        score += value * (1 - dd / radius);
      }
    }
    // Penalize if too many friendly units nearby
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.dead || e.team !== TEAMS.ENEMY) continue;
      if (Math.hypot(e.x - c.x, e.y - c.y) < radius) score -= 50;
    }
    if (score > bestScore) { bestScore = score; bestTarget = { x: c.x, y: c.y }; }
  }

  return bestTarget;
}

// ===== HELPER FUNCTIONS =====
function getEnemyUnitCount() {
  var c = 0;
  for (var i = 0; i < entities.length; i++) if (!entities[i].dead && entities[i].team === TEAMS.ENEMY && entities[i].cat === 'unit') c++;
  return c;
}
function getPlayerUnitCount() {
  var c = 0;
  for (var i = 0; i < entities.length; i++) if (!entities[i].dead && entities[i].team === TEAMS.PLAYER && entities[i].cat === 'unit') c++;
  return c;
}

// ===== FACTION-SPECIFIC AI =====

function aiThailand(eu, ehq) {
  var p = getAIParams();
  if (aiState === AI_STATES.SCOUT) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) {
        var harvester = entities.find(function(e) { return e.team === TEAMS.PLAYER && !e.dead && e.getDef().harvester; });
        if (harvester) u.target = harvester;
        else { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
      }
      if (u.hp < u.maxHp * p.retreatHp && ehq) { u.target = null; u.moveTarget = { x: ehq.x + 2, y: ehq.y + 2 }; }
    }
    if (getPlayerUnitCount() > 5 && eu.length >= p.atkThreshold) aiState = AI_STATES.CONTROL;
  }
  else if (aiState === AI_STATES.CONTROL) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
      if (typeof toggleBurrow === 'function' && (u.type === 'special' || u.type === 'air') && !u.burrowed && rng() < p.abilityChance) {
        var near = findNearest(u, TEAMS.PLAYER);
        if (near && dist(u, near) < 4) toggleBurrow(u);
      }
      if (u.burrowed && typeof toggleBurrow === 'function') {
        var near = findNearest(u, TEAMS.PLAYER);
        if (near && dist(u, near) < 2) toggleBurrow(u);
      }
    }
    var hasSW = entities.some(function(e) { return e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead; });
    if (hasSW && eu.length >= p.groupSize + 1) aiState = AI_STATES.SUPER;
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
  else {
    for (var i = 0; i < eu.length; i++) {
      var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
      eu[i].target = phq || findNearest(eu[i], TEAMS.PLAYER);
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiJapan(eu, ehq) {
  var p = getAIParams();
  if (aiState === AI_STATES.SCOUT) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) {
        var nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 12) u.target = nearest;
      }
    }
    if (eu.length >= p.groupSize + 1) aiState = AI_STATES.CONTROL;
  }
  else if (aiState === AI_STATES.CONTROL) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
    }
    var baseHP = ehq ? ehq.hp / ehq.maxHp : 0;
    if (baseHP < 0.3) aiState = AI_STATES.SUPER;
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
  else {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
      u.target = phq || findNearest(u, TEAMS.PLAYER);
      if (typeof toggleBanzai === 'function' && !u.banzaiActive && (u.type === 'elite' || u.type === 'commando') && rng() < p.abilityChance) toggleBanzai(u);
      if (u.getDef().transform && !u.transformed && rng() < p.abilityChance) {
        u.transformed = true;
        u.maxHp = Math.floor(u.getDef().hp * 1.5);
        u.hp = Math.min(u.hp + Math.floor(u.getDef().hp * 0.3), u.maxHp);
      }
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiSwitzerland(eu, ehq) {
  var p = getAIParams();
  if (aiState === AI_STATES.SCOUT) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (u.type === 'scout' && u.stealthed) {
        var eRef = entities.find(function(e) { return e.type === 'refinery' && e.team === TEAMS.PLAYER && !e.dead; });
        if (eRef && dist(u, eRef) > 4) { u.moveTarget = { x: eRef.x + 1, y: eRef.y + 1 }; u.target = null; continue; }
      }
      if (!u.target || u.target.dead) {
        if (ehq && dist(u, ehq) > 10) { u.moveTarget = { x: ehq.x + 2, y: ehq.y + 2 }; u.target = null; }
        else { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest && dist(u, nearest) < 6) u.target = nearest; }
      }
    }
    if (eu.length >= p.groupSize + 3) aiState = AI_STATES.CONTROL;
  }
  else if (aiState === AI_STATES.CONTROL) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
      if (typeof cryoLockdown === 'function' && (u.type === 'support' || u.type === 'special') && aiStateTimer % 300 === 0 && rng() < p.abilityChance) cryoLockdown(u);
    }
    var hasSW = entities.some(function(e) { return e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead; });
    if (hasSW) aiState = AI_STATES.SUPER;
  }
  else {
    for (var i = 0; i < eu.length; i++) {
      var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
      eu[i].target = phq || findNearest(eu[i], TEAMS.PLAYER);
    }
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
}

function aiBrazil(eu, ehq) {
  var p = getAIParams();
  if (aiState === AI_STATES.SCOUT) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) {
        var nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 6) u.target = nearest;
      }
      if (typeof deployBloom === 'function' && (u.type === 'support' || u.type === 'special') && aiStateTimer % 600 === 0 && rng() < p.abilityChance) deployBloom(u);
    }
    if (eu.length >= p.atkThreshold + 1) aiState = AI_STATES.CONTROL;
  }
  else if (aiState === AI_STATES.CONTROL) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) {
        var building = entities.find(function(e) { return e.team === TEAMS.PLAYER && e.cat === 'building' && !e.dead; });
        if (building && u.getDef().range >= 6) u.target = building;
        else { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
      }
    }
    var hasSW = entities.some(function(e) { return e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead; });
    if (hasSW && eu.length >= p.groupSize + 1) aiState = AI_STATES.SUPER;
  }
  else {
    for (var i = 0; i < eu.length; i++) {
      var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
      eu[i].target = phq || findNearest(eu[i], TEAMS.PLAYER);
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiEgypt(eu, ehq) {
  var p = getAIParams();
  if (aiState === AI_STATES.SCOUT) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) {
        var nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 8) u.target = nearest;
      }
      if (typeof sandStealthPulse === 'function' && u.type === 'support' && aiStateTimer % 300 === 0 && rng() < p.abilityChance) sandStealthPulse(u);
    }
    if (eu.length >= p.atkThreshold + 1) aiState = AI_STATES.CONTROL;
  }
  else if (aiState === AI_STATES.CONTROL) {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      if (!u.target || u.target.dead) { var nearest = findNearest(u, TEAMS.PLAYER); if (nearest) u.target = nearest; }
      if (typeof deployDecoys === 'function' && (u.type === 'saboteur' || u.type === 'special') && aiStateTimer % 400 === 0 && rng() < p.abilityChance) deployDecoys(u);
    }
    var hasSW = entities.some(function(e) { return e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead; });
    if (hasSW) aiState = AI_STATES.SUPER;
  }
  else {
    for (var i = 0; i < eu.length; i++) {
      var u = eu[i];
      var sw = entities.find(function(e) { return e.type === 'superweapon' && e.team === TEAMS.PLAYER && !e.dead; });
      var phq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead; });
      u.target = sw || phq || findNearest(u, TEAMS.PLAYER);
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

// ===== ENHANCED ENEMY AI (overrides enemyAI in game.js) =====
// Difficulty-aware build rates and adaptive unit composition
function aiEnhancedBuild() {
  var p = getAIParams();
  var ehq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.ENEMY && !e.dead; });
  if (!ehq) return;

  var barracks = entities.find(function(e) { return e.type === 'barracks' && e.team === TEAMS.ENEMY && !e.dead; });
  var factory = entities.find(function(e) { return e.type === 'factory' && e.team === TEAMS.ENEMY && !e.dead; });
  var eu = [];
  for (var i = 0; i < entities.length; i++) {
    if (!entities[i].dead && entities[i].team === TEAMS.ENEMY && entities[i].cat === 'unit') eu.push(entities[i]);
  }
  var maxEU = (enemyFaction.maxUnits || 15) * p.spawnMult;

  if (eu.length < maxEU && barracks) {
    // Try adaptive counter-unit first
    var counter = aiPickCounterUnit('barracks');
    if (counter && ENEMY_DEFS[counter] && rng() < 0.03 * p.buildChance) {
      entities.push(new Entity(counter, barracks.x + barracks.w, barracks.y, TEAMS.ENEMY));
      return;
    }
    // Fallback to normal spawn
    if (rng() < 0.03 * p.buildChance) {
      var pool = ['soldier', 'soldier', 'soldier', 'scout', 'medic', 'engineer', 'sniper', 'commando', 'saboteur'];
      var type = pool[rng() * pool.length | 0];
      if (ENEMY_DEFS[type]) entities.push(new Entity(type, barracks.x + barracks.w, barracks.y, TEAMS.ENEMY));
    }
  }
  if (eu.length < maxEU && factory) {
    var counter = aiPickCounterUnit('factory');
    if (counter && ENEMY_DEFS[counter] && rng() < 0.015 * p.buildChance) {
      entities.push(new Entity(counter, factory.x + factory.w, factory.y, TEAMS.ENEMY));
      return;
    }
  }
}

// ===== DISPATCH =====
function factionAI() {
  var eu = [];
  for (var i = 0; i < entities.length; i++) {
    if (!entities[i].dead && entities[i].team === TEAMS.ENEMY && entities[i].cat === 'unit') eu.push(entities[i]);
  }
  var ehq = entities.find(function(e) { return e.type === 'hq' && e.team === TEAMS.ENEMY && !e.dead; });
  if (!ehq) return;

  aiStateTimer++;
  var p = getAIParams();

  // Periodic analysis (every 5 seconds)
  if (aiStateTimer % 300 === 0) {
    aiAnalyzePlayerArmy();
    aiDetectPlayerPush(ehq);
  }

  // Universal behaviors
  if (aiStateTimer % 60 === 0) aiEngineerCapture(eu);
  aiRetreatWounded(eu, ehq);

  // Enhanced build with adaptive composition
  if (aiStateTimer % 30 === 0) aiEnhancedBuild();

  // Smart superweapon firing
  if (superweaponReady.enemy && !swFiring) {
    var target = aiSmartSuperweaponTarget();
    if (target) {
      fireSuperweaponAt(TEAMS.ENEMY, target.x, target.y);
    } else {
      fireSuperweapon(TEAMS.ENEMY);
    }
  }

  // Hard mode: AI repositions units to counter player push direction
  if (p.adaptRate >= 1.0 && aiMemory.playerAttackDir && aiStateTimer % 120 === 0) {
    var dir = aiMemory.playerAttackDir;
    var len = Math.hypot(dir.x, dir.y);
    if (len > 1) {
      // Move idle defenders toward the threat direction
      var defX = ehq.x + (dir.x / len) * 5;
      var defY = ehq.y + (dir.y / len) * 5;
      var idleCount = 0;
      for (var i = 0; i < eu.length; i++) {
        var u = eu[i];
        if (!u.target && !u.moveTarget && dist(u, ehq) < 12 && idleCount < 4) {
          u.moveTarget = { x: defX + (rng() - 0.5) * 3, y: defY + (rng() - 0.5) * 3 };
          idleCount++;
        }
      }
    }
  }

  switch (enemyFaction.id) {
    case 'thailand': aiThailand(eu, ehq); break;
    case 'japan': aiJapan(eu, ehq); break;
    case 'switzerland': aiSwitzerland(eu, ehq); break;
    case 'brazil': aiBrazil(eu, ehq); break;
    case 'egypt': aiEgypt(eu, ehq); break;
  }
}

// AI engineers seek and capture neutral objectives
function aiEngineerCapture(eu) {
  var engineers = [];
  for (var i = 0; i < eu.length; i++) { if (eu[i].type === 'engineer' && !eu[i].target) engineers.push(eu[i]); }
  if (engineers.length === 0) return;
  var targets = [];
  if (typeof techDerricks !== 'undefined') {
    for (var i = 0; i < techDerricks.length; i++) {
      if (techDerricks[i].owner !== TEAMS.ENEMY) targets.push({ x: techDerricks[i].x, y: techDerricks[i].y });
    }
  }
  if (typeof cryptoMines !== 'undefined') {
    for (var i = 0; i < cryptoMines.length; i++) {
      if (cryptoMines[i].owner !== TEAMS.ENEMY) targets.push({ x: cryptoMines[i].x, y: cryptoMines[i].y });
    }
  }
  for (var i = 0; i < Math.min(engineers.length, targets.length); i++) {
    engineers[i].moveTarget = { x: targets[i].x + 0.5, y: targets[i].y + 0.5 };
    engineers[i].target = null;
  }
}

// Universal retreat: all factions pull back wounded units
function aiRetreatWounded(eu, ehq) {
  if (!ehq) return;
  var p = getAIParams();
  for (var i = 0; i < eu.length; i++) {
    var u = eu[i];
    if (u.hp < u.maxHp * p.retreatHp && u.type !== 'hero') {
      u.target = null;
      u.moveTarget = { x: ehq.x + 2 + rng() * 3, y: ehq.y + 2 + rng() * 3 };
    }
  }
}
