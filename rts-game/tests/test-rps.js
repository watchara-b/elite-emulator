// ===== RPS Combat System Tests =====
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('RPS Damage Matrix', () => {
  // Load RPS module directly (no DOM deps)
  const vm = require('vm');
  const fs = require('fs');
  const code = fs.readFileSync(require('path').join(__dirname, '..', 'rps.js'), 'utf8');
  const ctx = vm.createContext({ Math, console });
  vm.runInContext(code, ctx);

  it('should have all 4 damage types', () => {
    const dm = vm.runInContext('DAMAGE_MATRIX', ctx);
    assert.ok(dm.antiInf);
    assert.ok(dm.explosive);
    assert.ok(dm.armorPierce);
    assert.ok(dm.antiAir);
  });

  it('antiInf should be strong vs light (1.5x)', () => {
    assert.strictEqual(ctx.getRPSMultiplier('antiInf', 'light'), 1.5);
  });

  it('antiInf should be weak vs heavy (0.25x)', () => {
    assert.strictEqual(ctx.getRPSMultiplier('antiInf', 'heavy'), 0.25);
  });

  it('explosive should be strong vs medium (1.5x)', () => {
    assert.strictEqual(ctx.getRPSMultiplier('explosive', 'medium'), 1.5);
  });

  it('explosive should do 0 to air', () => {
    assert.strictEqual(ctx.getRPSMultiplier('explosive', 'air'), 0.0);
  });

  it('armorPierce should be strong vs heavy (1.5x)', () => {
    assert.strictEqual(ctx.getRPSMultiplier('armorPierce', 'heavy'), 1.5);
  });

  it('antiAir should be 2x vs air', () => {
    assert.strictEqual(ctx.getRPSMultiplier('antiAir', 'air'), 2.0);
  });

  it('antiAir should be 0.1x vs ground types', () => {
    assert.strictEqual(ctx.getRPSMultiplier('antiAir', 'light'), 0.1);
    assert.strictEqual(ctx.getRPSMultiplier('antiAir', 'medium'), 0.1);
    assert.strictEqual(ctx.getRPSMultiplier('antiAir', 'heavy'), 0.1);
  });

  it('should return 1 for unknown types', () => {
    assert.strictEqual(ctx.getRPSMultiplier(null, 'light'), 1);
    assert.strictEqual(ctx.getRPSMultiplier('antiInf', null), 1);
    assert.strictEqual(ctx.getRPSMultiplier('unknown', 'light'), 1);
  });

  it('directional mult should return 1.5 for rear attacks', () => {
    // Attacker behind target (target moving away from attacker)
    var attacker = { x: 5, y: 5 };
    var target = { x: 10, y: 5, lastDx: 1, lastDy: 0, getDef: () => ({ armorType: 'medium' }) };
    // attacker.x - target.x = -5, target.lastDx = 1 → dot = -5*1 = -5 (frontal, not rear)
    // For rear: attacker behind = dot > 0
    var target2 = { x: 10, y: 5, lastDx: -1, lastDy: 0, getDef: () => ({ armorType: 'medium' }) };
    // dot = (-5)*(-1) = 5 > 0 → rear
    assert.strictEqual(ctx.getDirectionalMult(attacker, target2), 1.5);
  });

  it('directional mult should return 0.7 for frontal heavy', () => {
    var attacker = { x: 5, y: 5 };
    var target = { x: 10, y: 5, lastDx: 1, lastDy: 0, getDef: () => ({ armorType: 'heavy' }) };
    // dot = -5*1 = -5 < -0.3 → frontal heavy
    assert.strictEqual(ctx.getDirectionalMult(attacker, target), 0.7);
  });

  it('directional mult should return 1 when target has no direction', () => {
    var attacker = { x: 5, y: 5 };
    var target = { x: 10, y: 5, lastDx: 0, lastDy: 0, getDef: () => ({}) };
    assert.strictEqual(ctx.getDirectionalMult(attacker, target), 1);
  });
});
