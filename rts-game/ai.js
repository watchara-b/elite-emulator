// ===== AI FSM (Finite State Machine) per Faction =====

const AI_STATES = { SCOUT: 0, CONTROL: 1, SUPER: 2 };
let aiState = AI_STATES.SCOUT;
let aiStateTimer = 0;

function getEnemyUnitCount() {
  return entities.filter(e => e.team === TEAMS.ENEMY && e.cat === 'unit' && !e.dead).length;
}
function getPlayerUnitCount() {
  return entities.filter(e => e.team === TEAMS.PLAYER && e.cat === 'unit' && !e.dead).length;
}

// ===== FACTION-SPECIFIC AI =====

function aiThailand(eu, ehq) {
  // State 1: SCOUT_AND_HARASS — hit-and-run with Tuk-Tuks
  if (aiState === AI_STATES.SCOUT) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        // Target enemy harvesters first
        const harvester = entities.find(e => e.team === TEAMS.PLAYER && !e.dead && e.getDef().harvester);
        if (harvester) u.target = harvester;
        else {
          const nearest = findNearest(u, TEAMS.PLAYER);
          if (nearest) u.target = nearest;
        }
      }
      // Hit-and-run: retreat if HP low
      if (u.hp < u.maxHp * 0.3 && ehq) {
        u.target = null;
        u.moveTarget = { x: ehq.x + 2, y: ehq.y + 2 };
      }
    }
    if (getPlayerUnitCount() > 5 && eu.length >= 4) aiState = AI_STATES.CONTROL;
  }
  // State 2: CROWD_CONTROL — group up and use abilities
  else if (aiState === AI_STATES.CONTROL) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
      // Gap #30: AI uses Naga burrow near enemies
      if (typeof toggleBurrow === 'function' && (u.type === 'special' || u.type === 'air') && !u.burrowed) {
        const near = findNearest(u, TEAMS.PLAYER);
        if (near && dist(u, near) < 4) toggleBurrow(u);
      }
      if (u.burrowed && typeof toggleBurrow === 'function') {
        const near = findNearest(u, TEAMS.PLAYER);
        if (near && dist(u, near) < 2) toggleBurrow(u); // emerge for AoE
      }
    }
    const hasSuperweapon = entities.some(e => e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead);
    if (hasSuperweapon && eu.length >= 6) aiState = AI_STATES.SUPER;
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
  // State 3: MASS_CONVERSION — all-in attack
  else {
    for (const u of eu) {
      const phq = entities.find(e => e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead);
      if (phq) u.target = phq;
      else {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiJapan(eu, ehq) {
  // State 1: RAPID_EXPANSION
  if (aiState === AI_STATES.SCOUT) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 12) u.target = nearest;
      }
    }
    if (eu.length >= 6) aiState = AI_STATES.CONTROL;
  }
  // State 2: RELENTLESS_ASSAULT
  else if (aiState === AI_STATES.CONTROL) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
    }
    const baseHP = ehq ? ehq.hp / ehq.maxHp : 0;
    if (baseHP < 0.3) aiState = AI_STATES.SUPER;
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
  // State 3: KAMIKAZE_OVERRIDE — all-in rush
  else {
    for (const u of eu) {
      const phq = entities.find(e => e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead);
      if (phq) u.target = phq;
      // Gap #31: AI activates Banzai Overdrive on elites
      if (typeof toggleBanzai === 'function' && !u.banzaiActive && (u.type === 'elite' || u.type === 'commando')) toggleBanzai(u);
      // Gap #32: AI transforms Kaiju-Carrier
      if (u.getDef().transform && !u.transformed) {
        u.transformed = true;
        u.maxHp = Math.floor(u.getDef().hp * 1.5);
        u.hp = Math.min(u.hp + Math.floor(u.getDef().hp * 0.3), u.maxHp);
      }
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiSwitzerland(eu, ehq) {
  // State 1: FORTIFICATION — turtle and steal money
  if (aiState === AI_STATES.SCOUT) {
    for (const u of eu) {
      // Gap #33: Direct Cuckoo scouts toward enemy refineries
      if (u.type === 'scout' && u.stealthed) {
        const eRef = entities.find(e => e.type === 'refinery' && e.team === TEAMS.PLAYER && !e.dead);
        if (eRef && dist(u, eRef) > 4) { u.moveTarget = { x: eRef.x + 1, y: eRef.y + 1 }; u.target = null; continue; }
      }
      if (!u.target || u.target.dead) {
        if (ehq && dist(u, ehq) > 10) {
          u.moveTarget = { x: ehq.x + 2, y: ehq.y + 2 };
          u.target = null;
        } else {
          const nearest = findNearest(u, TEAMS.PLAYER);
          if (nearest && dist(u, nearest) < 6) u.target = nearest;
        }
      }
    }
    if (eu.length >= 8) aiState = AI_STATES.CONTROL;
  }
  // State 2: ECONOMIC_LOCKDOWN
  else if (aiState === AI_STATES.CONTROL) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
      // Gap #34: AI uses Cryo-Lockdown on enemy buildings
      if (typeof cryoLockdown === 'function' && (u.type === 'support' || u.type === 'special') && aiStateTimer % 300 === 0) cryoLockdown(u);
    }
    const hasSuperweapon = entities.some(e => e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead);
    if (hasSuperweapon) aiState = AI_STATES.SUPER;
  }
  // State 3: ABSOLUTE_FREEZE — push with heavy armor
  else {
    for (const u of eu) {
      const phq = entities.find(e => e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead);
      if (phq) u.target = phq;
    }
    if (eu.length < 3) aiState = AI_STATES.SCOUT;
  }
}

function aiBrazil(eu, ehq) {
  // State 1: ECO_CAMOUFLAGE — stealth and ambush
  if (aiState === AI_STATES.SCOUT) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 6) u.target = nearest;
      }
      // Gap #36: AI deploys Mutagenic Bloom near base entrances
      if (typeof deployBloom === 'function' && (u.type === 'support' || u.type === 'special') && aiStateTimer % 600 === 0) deployBloom(u);
    }
    if (eu.length >= 5) aiState = AI_STATES.CONTROL;
  }
  // State 2: TOXIC_SIEGE — artillery bombardment
  else if (aiState === AI_STATES.CONTROL) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        // Prioritize buildings
        const building = entities.find(e => e.team === TEAMS.PLAYER && e.cat === 'building' && !e.dead);
        if (building && u.getDef().range >= 6) u.target = building;
        else {
          const nearest = findNearest(u, TEAMS.PLAYER);
          if (nearest) u.target = nearest;
        }
      }
    }
    const hasSuperweapon = entities.some(e => e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead);
    if (hasSuperweapon && eu.length >= 6) aiState = AI_STATES.SUPER;
  }
  // State 3: APEX_SWARM
  else {
    for (const u of eu) {
      const phq = entities.find(e => e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead);
      if (phq) u.target = phq;
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

function aiEgypt(eu, ehq) {
  // State 1: ENERGY_HOARDING
  if (aiState === AI_STATES.SCOUT) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest && dist(u, nearest) < 8) u.target = nearest;
      }
      // Gap #37: AI uses Sand-Stealth Generator to cloak units
      if (typeof sandStealthPulse === 'function' && u.type === 'support' && aiStateTimer % 300 === 0) sandStealthPulse(u);
    }
    if (eu.length >= 5) aiState = AI_STATES.CONTROL;
  }
  // State 2: MIRAGE_WARFARE — use decoys and long-range
  else if (aiState === AI_STATES.CONTROL) {
    for (const u of eu) {
      if (!u.target || u.target.dead) {
        const nearest = findNearest(u, TEAMS.PLAYER);
        if (nearest) u.target = nearest;
      }
      // Gap #38: AI deploys Holo-Mirage decoys
      if (typeof deployDecoys === 'function' && (u.type === 'saboteur' || u.type === 'special') && aiStateTimer % 400 === 0) deployDecoys(u);
    }
    const hasSuperweapon = entities.some(e => e.type === 'superweapon' && e.team === TEAMS.ENEMY && !e.dead);
    if (hasSuperweapon) aiState = AI_STATES.SUPER;
  }
  // State 3: ORBITAL_JUDGMENT
  else {
    for (const u of eu) {
      // Gap #39: Target high-value: superweapon FIRST > hq > anything
      const sw = entities.find(e => e.type === 'superweapon' && e.team === TEAMS.PLAYER && !e.dead);
      const phq = entities.find(e => e.type === 'hq' && e.team === TEAMS.PLAYER && !e.dead);
      u.target = sw || phq || findNearest(u, TEAMS.PLAYER);
    }
    if (eu.length < 2) aiState = AI_STATES.SCOUT;
  }
}

// Dispatch AI based on enemy faction
function factionAI() {
  const eu = entities.filter(e => e.team === TEAMS.ENEMY && e.cat === 'unit' && !e.dead);
  const ehq = entities.find(e => e.type === 'hq' && e.team === TEAMS.ENEMY && !e.dead);
  if (!ehq) return;

  aiStateTimer++;

  // Universal: AI engineers capture neutral Tech Derricks and Crypto-Mines
  if (aiStateTimer % 60 === 0) aiEngineerCapture(eu);
  // Universal: retreat wounded units (all factions)
  aiRetreatWounded(eu, ehq);

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
  var engineers = eu.filter(function(e) { return e.type === 'engineer' && !e.target; });
  if (engineers.length === 0) return;
  // Find uncaptured derricks/mines
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
  for (var i = 0; i < eu.length; i++) {
    var u = eu[i];
    if (u.hp < u.maxHp * 0.2 && u.type !== 'hero') {
      u.target = null;
      u.moveTarget = { x: ehq.x + 2 + rng() * 3, y: ehq.y + 2 + rng() * 3 };
    }
  }
}
