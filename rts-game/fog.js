// ===== FOG OF WAR (Optimized) =====
var fogState = [];
var FOG_SIGHT = { unit: 6, building: 8, radar: 14, scout: 10 };
var _lastVisibleTiles = []; // track tiles to demote efficiently

function initFog() {
  fogState = [];
  _lastVisibleTiles = [];
  for (var y = 0; y < MAP_H; y++) {
    fogState[y] = new Uint8Array(MAP_W); // 0=unexplored, 1=explored, 2=visible
  }
}

function updateFog() {
  // Demote only previously visible tiles (not full map scan)
  for (var i = 0; i < _lastVisibleTiles.length; i++) {
    var t = _lastVisibleTiles[i];
    if (fogState[t.y][t.x] === 2) fogState[t.y][t.x] = 1;
  }
  _lastVisibleTiles = [];

  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.team !== TEAMS.PLAYER) continue;
    var d = e.getDef ? e.getDef() : null;
    var sight = FOG_SIGHT.unit;
    if (e.cat === 'building') sight = FOG_SIGHT.building;
    if (d && d.reveal) sight = (typeof powerLow !== 'undefined' && powerLow) ? FOG_SIGHT.building : FOG_SIGHT.radar;
    if (e.type === 'scout') sight = FOG_SIGHT.scout;
    var cx = Math.floor(e.x + e.w / 2), cy = Math.floor(e.y + e.h / 2);
    var s2 = sight * sight;
    var yMin = Math.max(0, cy - sight), yMax = Math.min(MAP_H - 1, cy + sight);
    var xMin = Math.max(0, cx - sight), xMax = Math.min(MAP_W - 1, cx + sight);
    for (var fy = yMin; fy <= yMax; fy++) {
      var dy = fy - cy;
      for (var fx = xMin; fx <= xMax; fx++) {
        var dx = fx - cx;
        if (dx * dx + dy * dy <= s2) {
          if (fogState[fy][fx] !== 2) {
            fogState[fy][fx] = 2;
            _lastVisibleTiles.push({ x: fx, y: fy });
          }
        }
      }
    }
  }
}

function isFogVisible(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return fogState[ty][tx] === 2;
}
function isFogExplored(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
  return fogState[ty][tx] >= 1;
}

// Fog rendering — direct draw, batched by fill style
function drawFog(ctx, camX, camY, screenW, screenH, TILE) {
  var sx = Math.max(0, Math.floor(camX / TILE) - 1);
  var sy = Math.max(0, Math.floor(camY / TILE) - 1);
  var ex = Math.min(MAP_W, sx + Math.ceil(screenW / TILE) + 2);
  var ey = Math.min(MAP_H, sy + Math.ceil(screenH / TILE) + 2);
  ctx.fillStyle = '#000';
  for (var y = sy; y < ey; y++) {
    var row = fogState[y];
    for (var x = sx; x < ex; x++) {
      if (row[x] === 0) ctx.fillRect(x * TILE - camX, y * TILE - camY, TILE + 0.5, TILE + 0.5);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (var y = sy; y < ey; y++) {
    var row = fogState[y];
    for (var x = sx; x < ex; x++) {
      if (row[x] === 1) ctx.fillRect(x * TILE - camX, y * TILE - camY, TILE + 0.5, TILE + 0.5);
    }
  }
}

function drawMinimapFog(miniCtx, scaleX, scaleY) {
  miniCtx.fillStyle = '#000';
  for (var y = 0; y < MAP_H; y += 2) {
    var row = fogState[y];
    for (var x = 0; x < MAP_W; x += 2) {
      if (row[x] === 0) miniCtx.fillRect(x * scaleX, y * scaleY, scaleX * 2 + 0.5, scaleY * 2 + 0.5);
    }
  }
  miniCtx.fillStyle = 'rgba(0,0,0,0.5)';
  for (var y = 0; y < MAP_H; y += 2) {
    var row = fogState[y];
    for (var x = 0; x < MAP_W; x += 2) {
      if (row[x] === 1) miniCtx.fillRect(x * scaleX, y * scaleY, scaleX * 2 + 0.5, scaleY * 2 + 0.5);
    }
  }
}

function isEntityVisible(e) {
  if (e.team === TEAMS.PLAYER) return true;
  var ex = Math.floor(e.x), ey = Math.floor(e.y);
  for (var dy = 0; dy < e.h; dy++)
    for (var dx = 0; dx < e.w; dx++)
      if (isFogVisible(ex + dx, ey + dy)) return true;
  return false;
}
