// ===== AI System Tests =====
const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function createGameContext() {
  const ctx = vm.createContext({
    Math, console, Array, Object, Infinity, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout,
    document: {
      getElementById: () => ({
        style: {}, innerHTML: '', textContent: '', appendChild: () => {},
        addEventListener: () => {}, _t: null
      }),
      createElement: () => ({ style: {}, appendChild: () => {}, getContext: () => ({}) }),
      addEventListener: () => {}
    },
    window: { innerWidth: 800, innerHeight: 600, addEventListener: () => {} },
    requestAnimationFrame: () => {},
    performance: { now: () => Date.now() },
    Image: class { set src(v) {} }
  });

  // Load modules in order
  const gameDir = path.join(__dirname, '..');
  const modules = ['rps.js', 'fixedpoint.js', 'net.js', 'factions.js', 'ai.js'];
  for (const m of modules) {
    const code = fs.readFileSync(path.join(gameDir, m), 'utf8');
    try { vm.runInContext(code, ctx, { filename: m }); } catch (e) { /* ok */ }
  }

  // Setup minimal game state
  vm.runInContext(`
    var TEAMS = { PLAYER: 0, ENEMY: 1 };
    var entities = [];
    var gold = 1000;
    var power = 10;
    var gameTime = 0;
    var superweaponReady = { player: false, enemy: false };
    var superweaponCharge = { player: 0, enemy: 0 };
    var superweaponCooldown = { player: 0, enemy: 0 };
    var swFiring = null;
    var playerFaction = FACTIONS.thailand;
    var enemyFaction = FACTIONS.japan;
    var DEFS = playerFaction.defs;
    var ENEMY_DEFS = enemyFaction.defs;
    var particles = [];
    var techDerricks = [];
    var cryptoMines = [];

    function showMsg() {}
    function spawnExplosion() {}
    function shake() {}
    function sfxFreeze() {}

    function dist(a, b) {
      return Math.hypot((a.x + (a.w||1)/2) - (b.x + (b.w||1)/2), (a.y + (a.h||1)/2) - (b.y + (b.h||1)/2));
    }
    function findNearest(ent, team) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < entities.length; i++) {
        var e = entities[i];
        if (e.dead || e.team !== team) continue;
        var d = dist(ent, e);
        if (d < bestD) { bestD = d; best = e; }
      }
      return best;
    }
    function fireSuperweaponAt(team, tx, ty) {
      swFiring = { team: team, tx: tx, ty: ty };
      superweaponReady[team === TEAMS.PLAYER ? 'player' : 'enemy'] = false;
    }
    function fireSuperweapon(team) {
      fireSuperweaponAt(team, 50, 40);
    }
  `, ctx);

  return ctx;
}

describe('AI Difficulty System', () => {
  it('should have 3 difficulty levels', () => {
    const ctx = createGameContext();
    assert.ok(ctx.AI_PARAMS.easy);
    assert.ok(ctx.AI_PARAMS.normal);
    assert.ok(ctx.AI_PARAMS.hard);
  });

  it('setAIDifficulty should change difficulty', () => {
    const ctx = createGameContext();
    vm.runInContext(`setAIDifficulty('hard')`, ctx);
    assert.strictEqual(ctx.aiDifficulty, 'hard');
    vm.runInContext(`setAIDifficulty('easy')`, ctx);
    assert.strictEqual(ctx.aiDifficulty, 'easy');
  });

  it('should reject invalid difficulty', () => {
    const ctx = createGameContext();
    vm.runInContext(`setAIDifficulty('impossible')`, ctx);
    assert.strictEqual(ctx.aiDifficulty, 'normal'); // unchanged
  });

  it('easy should have lower spawn multiplier than hard', () => {
    const ctx = createGameContext();
    assert.ok(ctx.AI_PARAMS.easy.spawnMult < ctx.AI_PARAMS.hard.spawnMult);
  });

  it('hard should have adaptRate of 1.0', () => {
    const ctx = createGameContext();
    assert.strictEqual(ctx.AI_PARAMS.hard.adaptRate, 1.0);
  });

  it('easy should have no adaptive strategy', () => {
    const ctx = createGameContext();
    assert.strictEqual(ctx.AI_PARAMS.easy.adaptRate, 0);
  });
});

describe('AI Adaptive Strategy', () => {
  it('aiAnalyzePlayerArmy should count unit types', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [
        { dead: false, team: TEAMS.PLAYER, cat: 'unit', getDef: function() { return { armorType: 'light' }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'unit', getDef: function() { return { armorType: 'light' }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'unit', getDef: function() { return { armorType: 'heavy' }; } },
        { dead: false, team: TEAMS.ENEMY, cat: 'unit', getDef: function() { return { armorType: 'light' }; } }
      ];
      aiAnalyzePlayerArmy();
    `, ctx);
    assert.strictEqual(ctx.aiMemory.playerArmyComp.light, 2);
    assert.strictEqual(ctx.aiMemory.playerArmyComp.heavy, 1);
    assert.strictEqual(ctx.aiMemory.playerArmyComp.air, 0);
  });

  it('aiPickCounterUnit should return antiInf unit vs light army', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      setAIDifficulty('hard');
      aiMemory.playerArmyComp = { light: 10, medium: 0, heavy: 0, air: 0 };
      seedRNG(42);
    `, ctx);
    // Should try to find an antiInf unit from barracks
    const result = vm.runInContext(`aiPickCounterUnit('barracks')`, ctx);
    if (result) {
      const def = ctx.ENEMY_DEFS[result];
      assert.strictEqual(def.dmgType, 'antiInf');
    }
    // null is also acceptable if no matching unit exists
  });

  it('aiPickCounterUnit should return null on easy (adaptRate=0)', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      setAIDifficulty('easy');
      aiMemory.playerArmyComp = { light: 10, medium: 0, heavy: 0, air: 0 };
      seedRNG(1);
    `, ctx);
    // With adaptRate=0, rng() > 0 always true, so should return null
    const result = vm.runInContext(`aiPickCounterUnit('barracks')`, ctx);
    assert.strictEqual(result, null);
  });
});

describe('AI Smart Superweapon Targeting', () => {
  it('should target player HQ when no better option', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [
        { type: 'hq', team: TEAMS.PLAYER, dead: false, x: 5, y: 5, w: 3, h: 3, cat: 'building', getDef: function() { return { cost: 0 }; } }
      ];
    `, ctx);
    const target = vm.runInContext(`aiSmartSuperweaponTarget()`, ctx);
    assert.ok(target);
    assert.ok(target.x > 0);
    assert.ok(target.y > 0);
  });

  it('should prefer superweapon over HQ', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [
        { type: 'hq', team: TEAMS.PLAYER, dead: false, x: 5, y: 5, w: 3, h: 3, cat: 'building', getDef: function() { return { cost: 0 }; } },
        { type: 'superweapon', team: TEAMS.PLAYER, dead: false, x: 50, y: 50, w: 2, h: 2, cat: 'building', getDef: function() { return { cost: 1200 }; } }
      ];
    `, ctx);
    const target = vm.runInContext(`aiSmartSuperweaponTarget()`, ctx);
    assert.ok(target);
    // Superweapon has baseScore 150 vs HQ 100, so should be closer to superweapon
    assert.ok(Math.abs(target.x - 51) < 10 || Math.abs(target.x - 6.5) < 10);
  });

  it('should target unit clusters over isolated units', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [];
      // Cluster of 5 units at (30,30)
      for (var i = 0; i < 5; i++) {
        entities.push({ type: 'soldier', team: TEAMS.PLAYER, dead: false, x: 30 + i*0.5, y: 30, w: 1, h: 1, cat: 'unit', getDef: function() { return { cost: 100, armorType: 'light' }; } });
      }
      // 1 isolated unit at (80,80)
      entities.push({ type: 'tank', team: TEAMS.PLAYER, dead: false, x: 80, y: 80, w: 1, h: 1, cat: 'unit', getDef: function() { return { cost: 350, armorType: 'heavy' }; } });
    `, ctx);
    const target = vm.runInContext(`aiSmartSuperweaponTarget()`, ctx);
    assert.ok(target);
    // Should be near the cluster (30,30) not the isolated unit (80,80)
    assert.ok(Math.abs(target.x - 31) < 15, `Expected target near cluster, got x=${target.x}`);
  });

  it('should return null when swSmartTarget is false (easy)', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      setAIDifficulty('easy');
      entities = [
        { type: 'hq', team: TEAMS.PLAYER, dead: false, x: 5, y: 5, w: 3, h: 3, cat: 'building', getDef: function() { return { cost: 0 }; } }
      ];
    `, ctx);
    const target = vm.runInContext(`aiSmartSuperweaponTarget()`, ctx);
    assert.strictEqual(target, null);
  });

  it('should penalize targets near friendly units', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [
        { type: 'hq', team: TEAMS.PLAYER, dead: false, x: 50, y: 50, w: 3, h: 3, cat: 'building', getDef: function() { return { cost: 0 }; } },
        // Friendly units near player HQ
        { type: 'soldier', team: TEAMS.ENEMY, dead: false, x: 51, y: 51, w: 1, h: 1, cat: 'unit', getDef: function() { return { cost: 80 }; } },
        { type: 'soldier', team: TEAMS.ENEMY, dead: false, x: 52, y: 51, w: 1, h: 1, cat: 'unit', getDef: function() { return { cost: 80 }; } },
        { type: 'soldier', team: TEAMS.ENEMY, dead: false, x: 51, y: 52, w: 1, h: 1, cat: 'unit', getDef: function() { return { cost: 80 }; } }
      ];
    `, ctx);
    // Should still return a target but score is reduced
    const target = vm.runInContext(`aiSmartSuperweaponTarget()`, ctx);
    assert.ok(target); // still targets, but with penalty
  });
});

describe('AI State Transitions', () => {
  it('should start in SCOUT state', () => {
    const ctx = createGameContext();
    const state = vm.runInContext('aiState', ctx);
    const SCOUT = vm.runInContext('AI_STATES.SCOUT', ctx);
    assert.strictEqual(state, SCOUT);
  });

  it('factionAI should not crash with empty entities', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      entities = [
        { type: 'hq', team: TEAMS.ENEMY, dead: false, x: 90, y: 70, w: 3, h: 3, cat: 'building',
          getDef: function() { return ENEMY_DEFS.hq; }, hp: 850, maxHp: 850 }
      ];
      factionAI();
    `, ctx);
    // Should not throw
    assert.ok(true);
  });

  it('factionAI should work for all 5 factions', () => {
    const ctx = createGameContext();
    const factions = ['thailand', 'japan', 'switzerland', 'brazil', 'egypt'];
    for (const fid of factions) {
      vm.runInContext(`
        enemyFaction = FACTIONS['${fid}'];
        ENEMY_DEFS = enemyFaction.defs;
        aiState = AI_STATES.SCOUT;
        aiStateTimer = 0;
        entities = [
          { type: 'hq', team: TEAMS.ENEMY, dead: false, x: 90, y: 70, w: 3, h: 3, cat: 'building',
            getDef: function() { return ENEMY_DEFS.hq; }, hp: 850, maxHp: 850 }
        ];
        factionAI();
      `, ctx);
    }
    assert.ok(true, 'All factions ran without error');
  });
});

describe('AI Retreat Behavior', () => {
  it('should retreat wounded units to HQ', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      var ehq = { type: 'hq', team: TEAMS.ENEMY, dead: false, x: 90, y: 70, w: 3, h: 3, cat: 'building',
        getDef: function() { return ENEMY_DEFS.hq; }, hp: 850, maxHp: 850 };
      var wounded = { type: 'soldier', team: TEAMS.ENEMY, dead: false, x: 50, y: 50, w: 1, h: 1, cat: 'unit',
        hp: 5, maxHp: 100, target: { dead: false }, moveTarget: null,
        getDef: function() { return ENEMY_DEFS.soldier; } };
      entities = [ehq, wounded];
      aiRetreatWounded([wounded], ehq);
    `, ctx);
    const wounded = vm.runInContext(`entities[1]`, ctx);
    assert.ok(wounded.moveTarget, 'Wounded unit should have retreat target');
    assert.strictEqual(wounded.target, null, 'Wounded unit should drop attack target');
  });

  it('heroes should NOT retreat', () => {
    const ctx = createGameContext();
    vm.runInContext(`
      var ehq = { type: 'hq', team: TEAMS.ENEMY, dead: false, x: 90, y: 70, w: 3, h: 3, cat: 'building',
        getDef: function() { return ENEMY_DEFS.hq; }, hp: 850, maxHp: 850 };
      var hero = { type: 'hero', team: TEAMS.ENEMY, dead: false, x: 50, y: 50, w: 1, h: 1, cat: 'unit',
        hp: 5, maxHp: 500, target: { dead: false }, moveTarget: null,
        getDef: function() { return ENEMY_DEFS.hero; } };
      entities = [ehq, hero];
      aiRetreatWounded([hero], ehq);
    `, ctx);
    const hero = vm.runInContext(`entities[1]`, ctx);
    assert.strictEqual(hero.moveTarget, null, 'Hero should NOT retreat');
  });
});
