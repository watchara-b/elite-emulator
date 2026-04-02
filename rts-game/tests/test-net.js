// ===== Networking / Deterministic RNG Tests =====
const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');

const code = fs.readFileSync(require('path').join(__dirname, '..', 'net.js'), 'utf8');

function createNetContext() {
  const ctx = vm.createContext({
    Math, console, Array, Object, JSON, WebSocket: undefined,
    location: { host: 'localhost:4000' },
    entities: [], selectedEntities: [],
    TEAMS: { PLAYER: 0, ENEMY: 1 },
    superweaponReady: { player: false, enemy: false },
    superweaponCharge: {}, superweaponCooldown: {},
    swFiring: null, gold: 1000,
    showMsg: () => {}, spawnExplosion: () => {}, shake: () => {},
    addPing: () => {}, deployMCV: () => {},
    isInBuildRadius: () => true, map: [],
    DEFS: {}, ENEMY_DEFS: {}, maxUnits: 20,
    playerFaction: null, enemyFaction: null,
    findNearest: () => null, fireSuperweapon: () => {},
    fireSuperweaponAt: () => {}
  });
  vm.runInContext(code, ctx);
  return ctx;
}

describe('Seeded RNG', () => {
  it('should produce deterministic results with same seed', () => {
    const ctx = createNetContext();
    vm.runInContext(`seedRNG(12345)`, ctx);
    const seq1 = [];
    for (let i = 0; i < 10; i++) seq1.push(vm.runInContext(`rng()`, ctx));

    vm.runInContext(`seedRNG(12345)`, ctx);
    const seq2 = [];
    for (let i = 0; i < 10; i++) seq2.push(vm.runInContext(`rng()`, ctx));

    assert.deepStrictEqual(seq1, seq2, 'Same seed should produce same sequence');
  });

  it('should produce different results with different seeds', () => {
    const ctx = createNetContext();
    vm.runInContext(`seedRNG(111)`, ctx);
    const a = vm.runInContext(`rng()`, ctx);
    vm.runInContext(`seedRNG(222)`, ctx);
    const b = vm.runInContext(`rng()`, ctx);
    assert.notStrictEqual(a, b);
  });

  it('should produce values between 0 and 1', () => {
    const ctx = createNetContext();
    vm.runInContext(`seedRNG(42)`, ctx);
    for (let i = 0; i < 100; i++) {
      const v = vm.runInContext(`rng()`, ctx);
      assert.ok(v >= 0 && v < 1, `rng() returned ${v}`);
    }
  });

  it('rngInt should produce values in range', () => {
    const ctx = createNetContext();
    vm.runInContext(`seedRNG(99)`, ctx);
    for (let i = 0; i < 50; i++) {
      const v = vm.runInContext(`rngInt(5, 10)`, ctx);
      assert.ok(v >= 5 && v < 10, `rngInt(5,10) returned ${v}`);
    }
  });
});

describe('Entity ID System', () => {
  it('should assign sequential IDs', () => {
    const ctx = createNetContext();
    vm.runInContext(`resetEntityIds()`, ctx);
    const id1 = vm.runInContext(`assignEntityId({}).id`, ctx);
    const id2 = vm.runInContext(`assignEntityId({}).id`, ctx);
    assert.strictEqual(id1, 1);
    assert.strictEqual(id2, 2);
  });

  it('resetEntityIds should restart from 1', () => {
    const ctx = createNetContext();
    vm.runInContext(`assignEntityId({}); assignEntityId({}); resetEntityIds()`, ctx);
    const id = vm.runInContext(`assignEntityId({}).id`, ctx);
    assert.strictEqual(id, 1);
  });
});

describe('Command System', () => {
  it('makeCmd should create valid command', () => {
    const ctx = createNetContext();
    const cmd = vm.runInContext(`JSON.parse(JSON.stringify(makeCmd(CMD.MOVE, { ids: [1,2], x: 50, y: 30 })))`, ctx);
    assert.strictEqual(cmd.c, 'mv');
    assert.deepStrictEqual(cmd.d.ids, [1, 2]);
  });

  it('should have all command types defined', () => {
    const ctx = createNetContext();
    const cmds = ['MOVE', 'ATTACK', 'ATTACK_MOVE', 'BUILD', 'TRAIN', 'DEPLOY',
                   'TELEPORT', 'TRANSFORM', 'SUPERWEAPON', 'SUPERWEAPON_TARGET', 'PING', 'SURRENDER'];
    for (const c of cmds) {
      const val = vm.runInContext(`CMD.${c}`, ctx);
      assert.ok(val, `CMD.${c} should be defined`);
    }
  });
});

describe('Game State Hash', () => {
  it('should produce same hash for same state', () => {
    const ctx = createNetContext();
    vm.runInContext(`
      entities = [
        { dead: false, x: 10.5, y: 20.3, hp: 100 },
        { dead: false, x: 30.1, y: 40.7, hp: 200 }
      ];
      gold = 1500;
    `, ctx);
    const h1 = vm.runInContext(`hashGameState()`, ctx);
    const h2 = vm.runInContext(`hashGameState()`, ctx);
    assert.strictEqual(h1, h2);
  });

  it('should produce different hash for different state', () => {
    const ctx = createNetContext();
    vm.runInContext(`
      entities = [{ dead: false, x: 10, y: 20, hp: 100 }];
      gold = 1000;
    `, ctx);
    const h1 = vm.runInContext(`hashGameState()`, ctx);
    vm.runInContext(`gold = 1001`, ctx);
    const h2 = vm.runInContext(`hashGameState()`, ctx);
    assert.notStrictEqual(h1, h2);
  });
});
