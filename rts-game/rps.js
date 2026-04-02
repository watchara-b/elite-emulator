// ===== ROCK-PAPER-SCISSORS DAMAGE SYSTEM =====
// Armor Types: light, medium, heavy, air
// Damage Types: antiInf, explosive, armorPierce, antiAir

const DAMAGE_MATRIX = {
  //                    light  medium  heavy  air
  antiInf:      { light: 1.5, medium: 1.0, heavy: 0.25, air: 0.5 },
  explosive:    { light: 0.5, medium: 1.5, heavy: 1.25, air: 0.0 },
  armorPierce:  { light: 0.25, medium: 1.0, heavy: 1.5, air: 1.0 },
  antiAir:      { light: 0.1, medium: 0.1, heavy: 0.1, air: 2.0 },
};

function getRPSMultiplier(dmgType, armorType) {
  if (!dmgType || !armorType) return 1;
  const row = DAMAGE_MATRIX[dmgType];
  if (!row) return 1;
  var val = row[armorType];
  return val !== undefined ? val : 1;
}

// Directional Armor: rear attacks deal 150% damage, frontal attacks on heavy = 70%
function getDirectionalMult(attacker, target) {
  var td = target.getDef ? target.getDef() : null;
  var dx = attacker.x - target.x;
  var dy = attacker.y - target.y;
  var tdx = target.lastDx || 0, tdy = target.lastDy || 0;
  if (tdx === 0 && tdy === 0) return 1;
  var dot = dx * tdx + dy * tdy;
  if (dot > 0) return 1.5; // rear
  // Frontal reduction for heavy armor
  if (td && td.armorType === 'heavy' && dot < -0.3) return 0.7;
  return 1;
}
