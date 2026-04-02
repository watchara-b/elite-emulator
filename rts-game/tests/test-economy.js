// ===== Economy System Tests =====
const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function createEconContext() {
  const ctx = vm.createContext({
    Math, console, Array, Object, Infinity, parseInt, parseFloat, isFinite,
    setTimeout, clearTimeout
  });

  // Load net.js for rng
  const netCode = fs.readFileSync(path.join(__dirname, '..', 'net.js'), 'utf8');
  try { vm.runInContext(netCode, ctx); } catch(e) {}

  // Load factions
  const facCode = fs.readFileSync(path.join(__dirname, '..', 'factions.js'), 'utf8');
  vm.runInContext(facCode, ctx);

  // Setup game state
  vm.runInContext(`
    var TEAMS = { PLAYER: 0, ENEMY: 1 };
    var entities = [];
    var gold = 1000;
    var power = 10;
    var gameTime = 0;
    var MAP_W = 100, MAP_H = 80;
    var map = [];
    for (var y = 0; y < MAP_H; y++) { map[y] = []; for (var x = 0; x < MAP_W; x++) map[y][x] = 0; }
    var playerFaction = FACTIONS.switzerland;
    var enemyFaction = FACTIONS.japan;
    var particles = [];
    function showMsg() {}
    function invalidateMapCache() {}
    seedRNG(42);
  `, ctx);

  // Load economy
  const econCode = fs.readFileSync(path.join(__dirname, '..', 'economy.js'), 'utf8');
  vm.runInContext(econCode, ctx);

  return ctx;
}

describe('Power Grid', () => {
  it('should calculate power from buildings', () => {
    const ctx = createEconContext();
    vm.runInContext(`
      playerFaction = FACTIONS.switzerland;
      entities = [
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'hq', getDef: function() { return { powerGen: 5 }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'powerplant', getDef: function() { return { powerGen: 9 }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'barracks', getDef: function() { return { powerGen: 0 }; } }
      ];
      recalcPower();
    `, ctx);
    assert.strictEqual(ctx.power, 14); // 5 + 9 + 0
  });

  it('should detect low power', () => {
    const ctx = createEconContext();
    vm.runInContext(`
      playerFaction = FACTIONS.switzerland;
      entities = [
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'hq', getDef: function() { return { powerGen: 5 }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'factory', getDef: function() { return { powerGen: -3 }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'techlab', getDef: function() { return { powerGen: -4 }; } },
        { dead: false, team: TEAMS.PLAYER, cat: 'building', type: 'superweapon', getDef: function() { return { powerGen: -6 }; } }
      ];
      updatePowerGrid();
    `, ctx);
    assert.ok(ctx.powerLow, 'Should be low power (5-3-4-6 = -8)');
  });
});

describe('Swiss Compound Interest', () => {
  it('should add interest on gold', () => {
    const ctx = createEconContext();
    vm.runInContext(`
      playerFaction = FACTIONS.switzerland;
      gold = 2000;
      gameTime = 60;
      updateSwissEconomy(1);
    `, ctx);
    assert.ok(ctx.gold > 2000, 'Gold should increase with compound interest');
    assert.ok(ctx.gold <= 2050, 'Interest should be capped at 50');
  });

  it('should not apply to non-Swiss factions', () => {
    const ctx = createEconContext();
    vm.runInContext(`
      playerFaction = FACTIONS.japan;
      gold = 2000;
      gameTime = 60;
      updateSwissEconomy(1);
    `, ctx);
    assert.strictEqual(ctx.gold, 2000);
  });
});

describe('Thailand War Bounty', () => {
  it('should give bonus gold on kill', () => {
    const ctx = createEconContext();
    vm.runInContext(`
      playerFaction = FACTIONS.thailand;
    `, ctx);
    const bounty = vm.runInContext(`
      var attacker = { team: TEAMS.PLAYER };
      var target = { getDef: function() { return { cost: 300 }; } };
      getWarBounty(attacker, target);
    `, ctx);
    assert.strictEqual(bounty, 90); // 300 * 0.3
  });

  it('should return 0 for non-Thai factions', () => {
    const ctx = createEconContext();
    vm.runInContext(`playerFaction = FACTIONS.japan;`, ctx);
    const bounty = vm.runInContext(`
      var attacker = { team: TEAMS.PLAYER };
      var target = { getDef: function() { return { cost: 300 }; } };
      getWarBounty(attacker, target);
    `, ctx);
    assert.strictEqual(bounty, 0);
  });
});

describe('Day/Night Cycle', () => {
  it('getDayNightAlpha should return 0 during day', () => {
    const ctx = createEconContext();
    vm.runInContext(`dayNightCycle = Math.floor(DAY_NIGHT_TOTAL * 0.3);`, ctx);
    const alpha = vm.runInContext(`getDayNightAlpha()`, ctx);
    assert.strictEqual(alpha, 0);
  });

  it('getDayNightAlpha should return 1 during night', () => {
    const ctx = createEconContext();
    vm.runInContext(`dayNightCycle = Math.floor(DAY_NIGHT_TOTAL * 0.8);`, ctx);
    const alpha = vm.runInContext(`getDayNightAlpha()`, ctx);
    assert.strictEqual(alpha, 1);
  });

  it('getDayNightAlpha should transition during dawn', () => {
    const ctx = createEconContext();
    vm.runInContext(`dayNightCycle = Math.floor(DAY_NIGHT_TOTAL * 0.04);`, ctx);
    const alpha = vm.runInContext(`getDayNightAlpha()`, ctx);
    assert.ok(alpha > 0 && alpha < 1, `Dawn alpha should be between 0 and 1, got ${alpha}`);
  });
});

describe('Tech Derricks', () => {
  it('should initialize with neutral ownership', () => {
    const ctx = createEconContext();
    vm.runInContext(`initTechDerricks()`, ctx);
    assert.ok(ctx.techDerricks.length > 0);
    for (const d of ctx.techDerricks) {
      assert.strictEqual(d.owner, -1);
    }
  });
});

describe('Crypto Mines', () => {
  it('should initialize with neutral ownership', () => {
    const ctx = createEconContext();
    vm.runInContext(`initCryptoMines()`, ctx);
    assert.ok(ctx.cryptoMines.length > 0);
    for (const m of ctx.cryptoMines) {
      assert.strictEqual(m.owner, -1);
    }
  });
});
