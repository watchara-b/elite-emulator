// ===== NAVMESH: A* PATHFINDING + FLOW FIELD + UNIT AVOIDANCE =====

// Terrain movement costs per tile type
// 0=grass, 1=ore, 2=water, 3=forest, 4=cliff, 5=sand, 6=deepwater, 7=road, 8=flowers
var TILE_COST = [1, 1.2, 999, 2.5, 999, 1.8, 999, 0.7, 1];
var TILE_PASSABLE = [true, true, false, true, false, true, false, true, true];

// Unit radius/mass for RVO
const UNIT_RADIUS = {
  soldier:0.35, medic:0.35, engineer:0.35, scout:0.25, tank:0.5,
  artillery:0.45, air:0.3, special:0.6, elite:0.55, harvester:0.45,
  sniper:0.35, commando:0.35, flamer:0.4, transport:0.5, bomber:0.35,
  gunboat:0.45, battleship:0.55, saboteur:0.3, support:0.4, hero:0.5
};
const UNIT_MASS = {
  soldier:1, medic:1, engineer:1, scout:0.5, tank:3,
  artillery:2, air:0.5, special:8, elite:4, harvester:2,
  sniper:1, commando:1, flamer:1.5, transport:3, bomber:0.5,
  gunboat:2, battleship:5, saboteur:0.8, support:1.5, hero:6
};

// --- A* Pathfinding (optimized: pooled arrays, building grid cache) ---
var _astarPool = null;
var _buildingGrid = null;
var _buildingGridAge = -1;

function _rebuildBuildingGrid() {
  if (!_buildingGrid) _buildingGrid = new Uint8Array(MAP_W * MAP_H);
  else _buildingGrid.fill(0);
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.cat !== 'building') continue;
    for (var dy = 0; dy < e.h; dy++)
      for (var dx = 0; dx < e.w; dx++) {
        var bx = Math.floor(e.x) + dx, by = Math.floor(e.y) + dy;
        if (bx >= 0 && by >= 0 && bx < MAP_W && by < MAP_H) _buildingGrid[by * MAP_W + bx] = 1;
      }
  }
  _buildingGridAge = typeof gameTime !== 'undefined' ? gameTime : 0;
}

function astarFind(sx, sy, gx, gy, unitType, factionId, isAmphibious) {
  sx = Math.floor(sx); sy = Math.floor(sy);
  gx = Math.floor(gx); gy = Math.floor(gy);
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return null;
  if (unitType === 'air') return [{x:gx+0.5, y:gy+0.5}];

  var W = MAP_W, H = MAP_H, size = W * H;
  // Pool typed arrays to avoid GC
  if (!_astarPool || _astarPool.size !== size) {
    _astarPool = { gCost: new Float32Array(size), from: new Int32Array(size), closed: new Uint8Array(size), size: size };
  }
  var gCost = _astarPool.gCost; gCost.fill(Infinity);
  var from = _astarPool.from; from.fill(-1);
  var inClosed = _astarPool.closed; inClosed.fill(0);

  // Rebuild building grid every 30 frames
  if (!_buildingGrid || (typeof gameTime !== 'undefined' && gameTime - _buildingGridAge > 30)) _rebuildBuildingGrid();

  var heap = [], heapSize = 0;
  function heapPush(f, idx) {
    heap[heapSize] = {f:f, i:idx};
    var k = heapSize++;
    while (k > 0) { var p = (k - 1) >> 1; if (heap[p].f <= heap[k].f) break; var t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; }
  }
  function heapPop() {
    if (!heapSize) return -1;
    var top = heap[0].i;
    heap[0] = heap[--heapSize];
    var k = 0;
    while (true) { var l = 2*k+1, r = 2*k+2, s = k; if (l < heapSize && heap[l].f < heap[s].f) s = l; if (r < heapSize && heap[r].f < heap[s].f) s = r; if (s === k) break; var t = heap[s]; heap[s] = heap[k]; heap[k] = t; k = s; }
    return top;
  }

  function tc(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    var t = map[y][x];
    if (!TILE_PASSABLE[t]) {
      if (isAmphibious && (t === 2 || t === 6)) return 1.5;
      return -1;
    }
    if (t === 3 && factionId === 'brazil') return 1;
    if (t === 3 && unitType !== 'air') return 8;
    if (typeof hasSolidObject === 'function' && hasSolidObject(x, y)) return 8;
    // Use cached building grid instead of iterating all entities
    if (!(x === sx && y === sy) && !(x === gx && y === gy)) {
      if (_buildingGrid[y * W + x]) return -1;
    }
    return TILE_COST[t] || 1;
  }

  var si = sy * W + sx, gi = gy * W + gx;
  gCost[si] = 0;
  heapPush(Math.hypot(sx - gx, sy - gy), si);

  var dirs = [-1,0, 1,0, 0,-1, 0,1, -1,-1, 1,-1, -1,1, 1,1];

  while (heapSize > 0) {
    var ci = heapPop();
    if (ci === gi) {
      var path = [], k = ci;
      while (k !== si) { path.unshift({x: (k % W) + 0.5, y: Math.floor(k / W) + 0.5}); k = from[k]; }
      return path;
    }
    if (inClosed[ci]) continue;
    inClosed[ci] = 1;
    var cx = ci % W, cy = (ci / W) | 0, cg = gCost[ci];

    for (var d = 0; d < 16; d += 2) {
      var nx = cx + dirs[d], ny = cy + dirs[d+1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      var ni = ny * W + nx;
      if (inClosed[ni]) continue;
      var cost = tc(nx, ny);
      if (cost < 0) continue;
      var diag = (dirs[d] !== 0 && dirs[d+1] !== 0) ? 1.414 : 1;
      var ng = cg + cost * diag;
      if (ng < gCost[ni]) {
        gCost[ni] = ng;
        from[ni] = ci;
        heapPush(ng + Math.hypot(nx - gx, ny - gy), ni);
      }
    }
  }
  return null;
}

// --- Flow Field (for group movement) ---
var flowFieldCache = null;
var flowFieldTarget = null;

function buildFlowField(gx, gy) {
  gx = Math.floor(gx); gy = Math.floor(gy);
  const fk = gx + ',' + gy;
  if (flowFieldTarget === fk && flowFieldCache) return flowFieldCache;

  const cost = new Float32Array(MAP_W * MAP_H).fill(Infinity);
  const field = new Int8Array(MAP_W * MAP_H * 2); // dx,dy pairs
  const queue = [];

  cost[gy * MAP_W + gx] = 0;
  queue.push(gx, gy);

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++], cy = queue[head++];
    const cc = cost[cy * MAP_W + cx];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dx,dy] of dirs) {
      const nx = cx+dx, ny = cy+dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const t = map[ny][nx];
      if (!TILE_PASSABLE[t]) continue;
      const nc = cc + (TILE_COST[t] || 1);
      const ni = ny * MAP_W + nx;
      if (nc < cost[ni]) {
        cost[ni] = nc;
        queue.push(nx, ny);
      }
    }
  }

  // Build direction vectors
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = (y * MAP_W + x) * 2;
      let bestDx = 0, bestDy = 0, bestC = cost[y * MAP_W + x];
      const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
      for (const [dx,dy] of dirs) {
        const nx = x+dx, ny = y+dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const c = cost[ny * MAP_W + nx];
        if (c < bestC) { bestC = c; bestDx = dx; bestDy = dy; }
      }
      field[i] = bestDx;
      field[i+1] = bestDy;
    }
  }

  flowFieldCache = field;
  flowFieldTarget = fk;
  return field;
}

function getFlowDir(field, x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return {x:0, y:0};
  const i = (iy * MAP_W + ix) * 2;
  return {x: field[i], y: field[i+1]};
}

// --- RVO Local Avoidance ---
// Spatial hash for O(n) avoidance instead of O(n²)
var _avoidGrid = {};
var _AVOID_CELL = 2; // grid cell size in tiles

function applyAvoidance(entities) {
  _avoidGrid = {};
  var units = [];
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.cat === 'building') continue;
    units.push(e);
    var gx = Math.floor(e.x / _AVOID_CELL), gy = Math.floor(e.y / _AVOID_CELL);
    var key = gx + ',' + gy;
    if (!_avoidGrid[key]) _avoidGrid[key] = [];
    _avoidGrid[key].push(e);
  }

  for (var i = 0; i < units.length; i++) {
    var a = units[i];
    var ra = UNIT_RADIUS[a.type] || 0.35;
    var ma = UNIT_MASS[a.type] || 1;
    var gx = Math.floor(a.x / _AVOID_CELL), gy = Math.floor(a.y / _AVOID_CELL);
    // Check only neighboring cells
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        var cell = _avoidGrid[(gx+dx) + ',' + (gy+dy)];
        if (!cell) continue;
        for (var j = 0; j < cell.length; j++) {
          var b = cell[j];
          if (b === a) continue;
          var rb = UNIT_RADIUS[b.type] || 0.35;
          var mb = UNIT_MASS[b.type] || 1;
          var ddx = b.x - a.x, ddy = b.y - a.y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          var minDist = ra + rb;
          if (d < minDist && d > 0.01) {
            var overlap = (minDist - d) * 0.25; // halved since both units process
            var nx = ddx / d, ny = ddy / d;
            var totalMass = ma + mb;
            a.x -= nx * overlap * (mb / totalMass);
            a.y -= ny * overlap * (ma / totalMass);
            a.x = Math.max(0, Math.min(MAP_W-1, a.x));
            a.y = Math.max(0, Math.min(MAP_H-1, a.y));
          }
        }
      }
    }
  }
}

// --- Enhanced moveToward with A* ---
// Active flow field for group movement
var _activeFlowField = null;
var _flowFieldTarget = null;

function pathMoveToward(e, tx, ty, speed, dt) {
  // Use flow field for group movement (5+ units moving to same target)
  var ftx = Math.floor(tx), fty = Math.floor(ty);
  if (_activeFlowField && _flowFieldTarget && _flowFieldTarget.x === ftx && _flowFieldTarget.y === fty) {
    var dir = getFlowDir(_activeFlowField, Math.floor(e.x), Math.floor(e.y));
    if (dir && (dir.x !== 0 || dir.y !== 0)) {
      _directMove(e, e.x + dir.x, e.y + dir.y, speed, dt);
      return;
    }
  }

  if (!e._path || e._pathAge > 60 ||
      (e._pathGoalX !== ftx || e._pathGoalY !== fty)) {
    const fac = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
    const fid = fac ? fac.id : '';
    const amphi = e.getDef ? !!e.getDef().amphibious : false;
    e._path = astarFind(e.x, e.y, tx, ty, e.type, fid, amphi);
    e._pathIdx = 0;
    e._pathAge = 0;
    e._pathGoalX = ftx;
    e._pathGoalY = fty;
    e._moveDx = undefined;
  }
  e._pathAge++;

  if (!e._path || e._path.length === 0) {
    _directMove(e, tx, ty, speed, dt);
    return;
  }

  // Follow path waypoints — look ahead to smooth corners
  var wp = e._path[e._pathIdx];
  if (!wp) { e._path = null; return; }

  // Advance waypoint when close enough (larger threshold = smoother turns)
  while (e._pathIdx < e._path.length) {
    wp = e._path[e._pathIdx];
    if (Math.hypot(wp.x - e.x, wp.y - e.y) < 0.6) {
      e._pathIdx++;
    } else break;
  }
  if (e._pathIdx >= e._path.length) { e._path = null; return; }

  // Look 1-2 waypoints ahead for smoother steering
  var lookIdx = Math.min(e._pathIdx + 1, e._path.length - 1);
  var cur = e._path[e._pathIdx];
  var ahead = e._path[lookIdx];
  // Blend between current and next waypoint
  var targetX = (cur.x + ahead.x) * 0.5;
  var targetY = (cur.y + ahead.y) * 0.5;
  // But if very close to current, aim more at next
  var distCur = Math.hypot(cur.x - e.x, cur.y - e.y);
  if (distCur < 1.0 && lookIdx > e._pathIdx) {
    targetX = ahead.x;
    targetY = ahead.y;
  }

  _directMove(e, targetX, targetY, speed, dt);
}

function _directMove(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return;
  const tileX = Math.floor(e.x), tileY = Math.floor(e.y);
  let terrainMult = 1;
  if (tileY >= 0 && tileY < MAP_H && tileX >= 0 && tileX < MAP_W) {
    const t = map[tileY][tileX];
    if (t === 7) terrainMult = 1.3;
    else if (t === 5) terrainMult = 0.7;
    else if (t === 3) {
      const fac = e.team === TEAMS.PLAYER ? playerFaction : enemyFaction;
      terrainMult = (fac && fac.id === 'brazil') ? 1.0 : 0.6;
    }
  }
  const step = speed * terrainMult * dt / 60;

  // Smooth steering — fast for short distances, slower for long
  if (e._moveDx === undefined) { e._moveDx = dx/len; e._moveDy = dy/len; }
  var steer = len < 2 ? 0.5 : 0.3; // turn faster when close to waypoint
  e._moveDx += (dx/len - e._moveDx) * steer;
  e._moveDy += (dy/len - e._moveDy) * steer;
  var ml = Math.hypot(e._moveDx, e._moveDy);
  if (ml < 0.01) { e._moveDx = dx/len; e._moveDy = dy/len; ml = 1; }
  e._moveDx /= ml; e._moveDy /= ml;

  e.lastDx = e._moveDx;
  e.lastDy = e._moveDy;
  var nx = e.x + e._moveDx * step;
  var ny = e.y + e._moveDy * step;
  nx = Math.max(0.1, Math.min(MAP_W - 1.1, nx));
  ny = Math.max(0.1, Math.min(MAP_H - 1.1, ny));

  // Flying units skip collision
  var d2 = e.getDef ? e.getDef() : null;
  if (d2 && d2.flying) { e.x = nx; e.y = ny; return; }
  var isAmphi = d2 && d2.amphibious;

  // Check if target tile center is passable
  function tileOk(bx, by) {
    var ix = Math.floor(bx), iy = Math.floor(by);
    if (ix < 0 || iy < 0 || ix >= MAP_W || iy >= MAP_H) return false;
    var t = map[iy][ix];
    if (t === 4) return false; // cliff always blocked
    if ((t === 2 || t === 6) && !isAmphi) return false; // water blocked unless amphibious
    return true;
  }
  function blocked(bx, by) {
    if (!tileOk(bx, by)) return true;
    // Also check the tile we're stepping into (if crossing boundary)
    var cx = Math.floor(e.x), cy = Math.floor(e.y);
    var nx2 = Math.floor(bx), ny2 = Math.floor(by);
    if (nx2 !== cx && !tileOk(nx2, cy)) return true;
    if (ny2 !== cy && !tileOk(cx, ny2)) return true;
    // Building collision
    for (var i = 0; i < entities.length; i++) {
      var b = entities[i];
      if (b.dead || b.cat !== 'building' || b === e) continue;
      if (e.x >= b.x && e.x < b.x + b.w && e.y >= b.y && e.y < b.y + b.h) continue;
      if (bx >= b.x && bx < b.x + b.w && by >= b.y && by < b.y + b.h) return true;
    }
    return false;
  }

  if (!blocked(nx, ny)) {
    e.x = nx; e.y = ny;
  } else if (!blocked(nx, e.y)) {
    e.x = nx;
    e.lastDy *= 0.3;
  } else if (!blocked(e.x, ny)) {
    e.y = ny;
    e.lastDx *= 0.3;
  }
}
