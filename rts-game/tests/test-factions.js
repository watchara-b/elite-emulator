// ===== Faction Definition Tests =====
const { describe, it } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');

const code = fs.readFileSync(require('path').join(__dirname, '..', 'factions.js'), 'utf8');
const ctx = vm.createContext({ Math, console, Object });
vm.runInContext(code, ctx);
const FACTIONS = vm.runInContext('FACTIONS', ctx);

const FACTION_IDS = ['thailand', 'japan', 'switzerland', 'brazil', 'egypt'];
const REQUIRED_BUILDINGS = ['hq', 'powerplant', 'barracks', 'refinery', 'wall', 'turret', 'radar', 'factory', 'helipad', 'techlab', 'superweapon'];
const REQUIRED_UNITS = ['harvester', 'soldier', 'medic', 'engineer', 'scout', 'sniper', 'commando', 'tank', 'flamer', 'artillery', 'transport', 'air', 'gunboat', 'bomber', 'special', 'support', 'saboteur', 'battleship', 'elite', 'hero'];
const VALID_DMG_TYPES = ['antiInf', 'explosive', 'armorPierce', 'antiAir'];
const VALID_ARMOR_TYPES = ['light', 'medium', 'heavy', 'air'];

describe('Faction Definitions', () => {
  it('should have exactly 5 factions', () => {
    assert.strictEqual(Object.keys(FACTIONS).length, 5);
  });

  for (const fid of FACTION_IDS) {
    describe(`Faction: ${fid}`, () => {
      const f = FACTIONS[fid];

      it('should have required metadata', () => {
        assert.ok(f.id, 'missing id');
        assert.ok(f.name, 'missing name');
        assert.ok(f.color, 'missing color');
        assert.ok(f.flag, 'missing flag');
        assert.ok(f.bonus, 'missing bonus');
        assert.ok(f.buildOrder, 'missing buildOrder');
        assert.ok(typeof f.startGold === 'number', 'startGold must be number');
        assert.ok(typeof f.startPower === 'number', 'startPower must be number');
        assert.ok(typeof f.maxUnits === 'number', 'maxUnits must be number');
      });

      it('should have all 11 required buildings', () => {
        for (const b of REQUIRED_BUILDINGS) {
          assert.ok(f.defs[b], `missing building: ${b}`);
          assert.strictEqual(f.defs[b].cat, 'building', `${b} should be building`);
        }
      });

      it('should have all 20 required units', () => {
        for (const u of REQUIRED_UNITS) {
          assert.ok(f.defs[u], `missing unit: ${u}`);
          assert.strictEqual(f.defs[u].cat, 'unit', `${u} should be unit`);
        }
      });

      it('all units should have valid armorType', () => {
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'unit') continue;
          if (d.armorType) {
            assert.ok(VALID_ARMOR_TYPES.includes(d.armorType), `${key} has invalid armorType: ${d.armorType}`);
          }
        }
      });

      it('combat units should have valid dmgType', () => {
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'unit' || !d.atk) continue;
          if (d.dmgType) {
            assert.ok(VALID_DMG_TYPES.includes(d.dmgType), `${key} has invalid dmgType: ${d.dmgType}`);
          }
        }
      });

      it('buildings should have w and h', () => {
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'building') continue;
          assert.ok(d.w > 0, `${key} missing width`);
          assert.ok(d.h > 0, `${key} missing height`);
        }
      });

      it('units with atk should have atkSpeed and range', () => {
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'unit' || !d.atk) continue;
          assert.ok(d.atkSpeed > 0, `${key} has atk but no atkSpeed`);
          assert.ok(d.range >= 0, `${key} has atk but no range`);
        }
      });

      it('harvesters should have capacity and harvestRate', () => {
        const h = f.defs.harvester;
        assert.ok(h.harvester, 'harvester flag missing');
        assert.ok(h.capacity > 0, 'harvester missing capacity');
        assert.ok(h.harvestRate > 0, 'harvester missing harvestRate');
      });

      it('buildOrder should reference valid defs', () => {
        for (const t of f.buildOrder) {
          assert.ok(f.defs[t], `buildOrder references unknown type: ${t}`);
        }
      });

      it('all unit icons should be unique within faction', () => {
        const icons = new Set();
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'unit') continue;
          assert.ok(!icons.has(d.icon), `duplicate unit icon ${d.icon} in ${key}`);
          icons.add(d.icon);
        }
      });

      it('all units should have positive hp and cost', () => {
        for (const key in f.defs) {
          const d = f.defs[key];
          if (d.cat !== 'unit') continue;
          assert.ok(d.hp > 0, `${key} has non-positive hp`);
          assert.ok(d.cost >= 0, `${key} has negative cost`);
        }
      });
    });
  }
});
