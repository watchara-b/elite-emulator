// ===== FIXED-POINT MATH =====
// All gameplay simulation uses fixed-point (1/1024 precision) to prevent multiplayer desync.
// FP = Fixed Point. 1 tile = 1024 FP units. Positions stored as integers internally.
// Conversion: toFP(float) = Math.round(float * 1024), fromFP(fp) = fp / 1024

var FP_SCALE = 1024;
var FP_HALF = 512;

function toFP(f) { return Math.round(f * FP_SCALE); }
function fromFP(fp) { return fp / FP_SCALE; }

// Fixed-point multiply: (a * b) >> 10  (since 1024 = 2^10)
function fpMul(a, b) { return (a * b + FP_HALF) >> 10; }

// Fixed-point divide: (a << 10) / b
function fpDiv(a, b) { return b === 0 ? 0 : Math.round((a * FP_SCALE) / b); }

// Fixed-point sqrt (integer Newton's method)
function fpSqrt(x) {
  if (x <= 0) return 0;
  var r = x;
  var q;
  for (var i = 0; i < 12; i++) {
    q = fpDiv(x, r);
    r = (r + q) >> 1;
  }
  return r;
}

// Fixed-point distance (returns FP value)
function fpDist(x1, y1, x2, y2) {
  var dx = x1 - x2, dy = y1 - y2;
  return fpSqrt(dx * dx + dy * dy);
}

// Fixed-point terrain speed multipliers (pre-scaled to FP)
var FP_TERRAIN_MULT = {
  0: FP_SCALE,       // grass: 1.0
  1: FP_SCALE,       // ore: 1.0
  2: 0,              // water: impassable
  3: toFP(0.6),      // forest: 0.6
  4: 0,              // cliff: impassable
  5: toFP(0.7),      // sand: 0.7
  6: 0,              // deep water: impassable
  7: toFP(1.3),      // road: 1.3
  8: FP_SCALE        // flowers: 1.0
};

// Fixed-point weather multipliers
var FP_WEATHER_MULT = {
  clear: FP_SCALE,
  rain: toFP(0.85),
  snow: toFP(0.7),
  sandstorm: toFP(0.8),
  fog: FP_SCALE
};

// Convert entity position to FP for simulation, back to float for rendering
// This wraps the simulation step to use integer math internally
function fpMoveStep(speed, terrainTile, weatherType, isSlowed, isBrazilForest) {
  var fpSpeed = toFP(speed);
  if (isSlowed) fpSpeed = fpSpeed >> 1; // * 0.5

  var tMult = FP_TERRAIN_MULT[terrainTile] || FP_SCALE;
  if (terrainTile === 3 && isBrazilForest) tMult = FP_SCALE; // Brazil forest bonus

  var wMult = FP_WEATHER_MULT[weatherType] || FP_SCALE;

  // step = speed * terrain * weather / 60
  var step = fpMul(fpSpeed, tMult);
  step = fpMul(step, wMult);
  step = fpDiv(step, toFP(60));
  return step; // returns FP value
}

// Normalize direction vector in fixed-point
function fpNormalize(dx, dy) {
  var len = fpSqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: fpDiv(dx, len), y: fpDiv(dy, len) };
}
