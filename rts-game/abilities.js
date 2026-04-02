// ===== SPECIAL UNIT ABILITIES =====
// Implements faction-specific abilities not yet in the base game:
// - Cuckoo Credit Theft (Switzerland scout — stealth drone siphons gold)
// - Naga Burrow (Thailand special — burrows underground, emerges with AoE)
// - Holo-Mirage Decoys (Egypt saboteur — spawns holographic decoy units)
// - Mutagenic Bloom (Brazil support — creates toxic thorn wall)
// - Banzai Overdrive (Japan elite — 2x damage but self-destruct over time)

// ===== ENTITY EXTENSIONS =====
// Called from Entity constructor via hook
function initAbilityState(e) {
  e.burrowed = false;
  e.burrowTimer = 0;
  e.banzaiActive = false;
  e.banzaiTimer = 0;
  e.isDecoy = false;
  e.decoyLife = 0;
  e.creditTheftTimer = 0;
}

// ===== ABILITY: Cuckoo Credit Theft (Switzerland scout) =====
// Stealth drone passively siphons gold from nearby enemy refineries
function updateCuckooTheft(e, dt) {
  if (e.type !== 'scout') return;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'switzerland') return;
  if (!e.stealthed) return; // only while stealthed

  e.creditTheftTimer = (e.creditTheftTimer || 0) + dt;
  if (e.creditTheftTimer < 90) return; // every 1.5 seconds
  e.creditTheftTimer = 0;

  var enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
  for (var i = 0; i < entities.length; i++) {
    var ref = entities[i];
    if (ref.dead || ref.team !== enemyTeam || ref.type !== 'refinery') continue;
    if (Math.hypot(e.x - ref.x, e.y - ref.y) < 4) {
      var stolen = 8;
      if (e.team === TEAMS.PLAYER) {
        gold += stolen;
        if (typeof sfxCoin === 'function') sfxCoin();
        if (gameTime % 180 === 0) showMsg('💰 Cuckoo siphoned $' + stolen + '!');
      }
      // VFX: credit particles flowing to drone
      for (var p = 0; p < 3; p++) {
        particles.push({
          x: ref.x + ref.w / 2, y: ref.y + ref.h / 2,
          vx: (e.x - ref.x) * 0.1, vy: (e.y - ref.y) * 0.1,
          life: 15, maxLife: 15, size: 2, color: '#ffcc00', type: 'spark'
        });
      }
      return;
    }
  }
}

// ===== ABILITY: Naga Burrow (Thailand special) =====
function toggleBurrow(e) {
  if (e.type !== 'special' && e.type !== 'air') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'thailand') return false;

  if (e.burrowed) {
    e.burrowed = false;
    e.stealthed = false;
    var enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
    for (var i = 0; i < entities.length; i++) {
      var t = entities[i];
      if (t.dead || t.team !== enemyTeam) continue;
      var dd = Math.hypot(e.x - t.x, e.y - t.y);
      if (dd < 3) {
        t.hp -= 40 * (1 - dd / 3);
        t.slowed = 90;
        if (t.hp <= 0) { t.dead = true; spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 10); }
      }
    }
    spawnExplosion(e.x + 0.5, e.y + 0.5, 12);
    shake(4);
    showMsg('🐍 Naga EMERGES! Sonic blast!');
    return true;
  } else {
    e.burrowed = true;
    e.stealthed = true;
    e.target = null;
    showMsg('🐍 Naga burrowing underground...');
    return true;
  }
}

function updateBurrow(e, dt) {
  if (!e.burrowed) return;
  e.target = null;
  e.atkCooldown = 10;
}

// ===== ABILITY: Holo-Mirage Decoys (Egypt saboteur) =====
function deployDecoys(e) {
  if (e.type !== 'saboteur' && e.type !== 'special') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'egypt') return false;

  // Army-scale decoys: spawn 5 mixed-type holograms
  var decoyTypes = ['soldier', 'tank', 'soldier', 'artillery', 'soldier'];
  for (var i = 0; i < decoyTypes.length; i++) {
    var angle = (i / decoyTypes.length) * Math.PI * 2;
    var dx = e.x + Math.cos(angle) * (2 + rng());
    var dy = e.y + Math.sin(angle) * (2 + rng());
    var defs = e.team === TEAMS.PLAYER ? DEFS : ENEMY_DEFS;
    var dt = decoyTypes[i];
    if (!defs[dt]) dt = 'soldier';
    var decoy = new Entity(dt, dx, dy, e.team);
    decoy.isDecoy = true;
    decoy.decoyLife = 600;
    decoy.hp = 40; decoy.maxHp = 40;
    if (typeof assignEntityId === 'function') assignEntityId(decoy);
    entities.push(decoy);
    for (var p = 0; p < 3; p++) {
      particles.push({ x: dx + 0.5, y: dy + 0.5, vx: (rng() - 0.5) * 0.4, vy: -0.3 - rng() * 0.3, life: 15 + rng() * 10, maxLife: 25, size: 2 + rng() * 2, color: '#ffcc00', type: 'spark' });
    }
  }
  showMsg('👁 Holo-Mirage Army deployed! 5 decoys active.');
  return true;
}

function updateDecoy(e, dt) {
  if (!e.isDecoy) return;
  e.decoyLife -= dt;
  if (e.decoyLife <= 0) { e.dead = true; return; }
  e.atkCooldown = 999;
}

// ===== ABILITY: Mutagenic Bloom (Brazil support) =====
// Creates toxic thorn wall + converts nearby grass to forest
function deployBloom(e) {
  if (e.type !== 'support' && e.type !== 'special') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'brazil') return false;

  for (var i = -1; i <= 1; i++) {
    var bx = Math.floor(e.x + i);
    var by = Math.floor(e.y + 2);
    if (bx < 0 || by < 0 || bx >= MAP_W || by >= MAP_H) continue;
    var t = map[by][bx];
    if (t === 2 || t === 4 || t === 6) continue;
    var blocked = false;
    for (var j = 0; j < entities.length; j++) {
      if (!entities[j].dead && Math.floor(entities[j].x) === bx && Math.floor(entities[j].y) === by && entities[j].cat === 'building') { blocked = true; break; }
    }
    if (blocked) continue;
    var bloom = new Entity('wall', bx, by, e.team);
    bloom.isBloom = true;
    bloom.bloomLife = 900;
    bloom.hp = 80; bloom.maxHp = 80;
    if (typeof assignEntityId === 'function') assignEntityId(bloom);
    entities.push(bloom);
    // Gap #11: Also convert nearby grass tiles to forest (Rainforest Overgrowth)
    for (var fy = by - 1; fy <= by + 1; fy++)
      for (var fx = bx - 1; fx <= bx + 1; fx++)
        if (fy >= 0 && fy < MAP_H && fx >= 0 && fx < MAP_W && map[fy][fx] === 0) map[fy][fx] = 3;
    for (var p = 0; p < 4; p++) {
      particles.push({ x: bx + 0.5, y: by + 0.5, vx: (rng() - 0.5) * 0.3, vy: -0.5 - rng() * 0.3, life: 20 + rng() * 10, maxLife: 30, size: 3 + rng() * 2, color: '#33ff66', type: 'fire' });
    }
  }
  showMsg('🌿 Mutagenic Bloom! Toxic wall + forest growth!');
  return true;
}

function updateBloom(e, dt) {
  if (!e.isBloom) return;
  e.bloomLife -= dt;
  if (e.bloomLife <= 0) { e.dead = true; return; }
  if (gameTime % 30 !== 0) return;
  var enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
  for (var i = 0; i < entities.length; i++) {
    var t = entities[i];
    if (t.dead || t.team !== enemyTeam || t.cat !== 'unit') continue;
    if (Math.hypot(e.x + 0.5 - t.x, e.y + 0.5 - t.y) < 1.5) {
      t.hp -= 5; t.burning = Math.max(t.burning, 30);
      if (t.hp <= 0) { t.dead = true; spawnExplosion(t.x + t.w / 2, t.y + t.h / 2, 8); }
    }
  }
  if (gameTime % 20 === 0) {
    particles.push({ x: e.x + 0.5 + (rng() - 0.5) * 0.5, y: e.y + 0.5, vx: (rng() - 0.5) * 0.2, vy: -0.3 - rng() * 0.2, life: 15 + rng() * 10, maxLife: 25, size: 2 + rng() * 2, color: rng() > 0.5 ? '#33ff66' : '#66aa00', type: 'fire' });
  }
}

// ===== ABILITY: Banzai Overdrive (Japan elite) =====
function toggleBanzai(e) {
  if (e.type !== 'elite' && e.type !== 'commando') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'japan') return false;
  e.banzaiActive = !e.banzaiActive;
  if (e.banzaiActive) { showMsg('⚡ BANZAI OVERDRIVE!'); spawnExplosion(e.x + 0.5, e.y + 0.5, 8); shake(2); }
  else showMsg('⚡ Banzai deactivated.');
  return true;
}

function updateBanzai(e, dt) {
  if (!e.banzaiActive) return;
  if (gameTime % 20 === 0) {
    e.hp -= 3;
    particles.push({ x: e.x + 0.5, y: e.y + 0.5, vx: (rng() - 0.5) * 0.5, vy: -0.8 - rng() * 0.3, life: 10 + rng() * 5, maxLife: 15, size: 2 + rng(), color: '#ff1493', type: 'fire' });
    if (e.hp <= 0) { e.dead = true; spawnExplosion(e.x + 0.5, e.y + 0.5, 15); shake(3); }
  }
}
function getBanzaiMult(e) { return e.banzaiActive ? 2.0 : 1.0; }
function getBanzaiSpeedMult(e) { return e.banzaiActive ? 1.5 : 1.0; }

// ===== ABILITY: Cryo-Lockdown (Switzerland — freeze enemy buildings) =====
// Gap #9: Targeted building freeze ability
function cryoLockdown(e) {
  if (e.type !== 'support' && e.type !== 'special') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'switzerland') return false;
  var enemyTeam = e.team === TEAMS.PLAYER ? TEAMS.ENEMY : TEAMS.PLAYER;
  var target = null, bestD = 8;
  for (var i = 0; i < entities.length; i++) {
    var b = entities[i];
    if (b.dead || b.team !== enemyTeam || b.cat !== 'building') continue;
    var dd = Math.hypot(e.x - b.x, e.y - b.y);
    if (dd < bestD) { bestD = dd; target = b; }
  }
  if (!target) return false;
  target.frozen = 300; // 5 seconds
  for (var p = 0; p < 8; p++) {
    particles.push({ x: target.x + target.w/2, y: target.y + target.h/2, vx: (rng()-0.5)*0.4, vy: (rng()-0.5)*0.4, life: 40+rng()*20, maxLife: 60, size: 4+rng()*3, color: '#aaeeff', type: 'cryo' });
  }
  if (typeof sfxFreeze === 'function') sfxFreeze();
  showMsg('🧊 Cryo-Lockdown! Enemy building frozen!');
  return true;
}

// ===== ABILITY: Sand-Stealth Generator (Egypt — area cloak) =====
// Gap #10: Cloaks nearby friendly units from enemy minimap
function sandStealthPulse(e) {
  if (e.type !== 'support') return false;
  var faction = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
  if (!faction || faction.id !== 'egypt') return false;
  var count = 0;
  for (var i = 0; i < entities.length; i++) {
    var u = entities[i];
    if (u.dead || u.team !== e.team || u.cat !== 'unit' || u === e) continue;
    if (Math.hypot(e.x - u.x, e.y - u.y) < 6) {
      u.stealthed = true;
      count++;
    }
  }
  if (count > 0) showMsg('🌪 Sandstorm cloak! ' + count + ' units hidden.');
  return count > 0;
}

// ===== MASTER UPDATE =====
function updateAbilities(e, dt) {
  if (e.burrowed === undefined) initAbilityState(e);
  updateCuckooTheft(e, dt);
  updateBurrow(e, dt);
  updateDecoy(e, dt);
  updateBloom(e, dt);
  updateBanzai(e, dt);
}
