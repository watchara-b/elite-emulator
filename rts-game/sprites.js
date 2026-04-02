// ===== ISOMETRIC 3D-STYLE SPRITE RENDERER =====
const spriteCache = {};
const COLORS = { grass:['#2d5a1e','#2a5520','#305e1c'], ore:'#c8a832', water:'#1a4a7a', player:'#3366ff', enemy:'#ff3333' };
const RES = 4;

function cachedSprite(key, w, h, fn) {
  if (spriteCache[key]) return spriteCache[key];
  const c = document.createElement('canvas');
  c.width = w * RES; c.height = h * RES;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.scale(RES, RES);
  fn(x, w, h);
  spriteCache[key] = c;
  return c;
}
function cachedTile(key, fn) {
  if (spriteCache[key]) return spriteCache[key];
  const c = document.createElement('canvas');
  c.width = TILE * RES; c.height = TILE * RES;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  x.scale(RES, RES);
  fn(x);
  spriteCache[key] = c;
  return c;
}
function tileRand(x, y, i) {
  let h = x * 374761 + y * 668265 + i * 982451;
  return (((h ^ (h >> 13)) * 1274126177) & 0x7fffffff) / 0x7fffffff;
}

// ===== 3D HELPER: draw isometric box =====
function isoBox(x, cx, cy, w, h, d, topCol, leftCol, rightCol) {
  const hw = w/2, hh = h/2;
  // Top face
  x.fillStyle = topCol;
  x.beginPath();
  x.moveTo(cx, cy - d - hh);
  x.lineTo(cx + hw, cy - d);
  x.lineTo(cx, cy - d + hh);
  x.lineTo(cx - hw, cy - d);
  x.closePath(); x.fill();
  // Left face
  x.fillStyle = leftCol;
  x.beginPath();
  x.moveTo(cx - hw, cy - d);
  x.lineTo(cx, cy - d + hh);
  x.lineTo(cx, cy + hh);
  x.lineTo(cx - hw, cy);
  x.closePath(); x.fill();
  // Right face
  x.fillStyle = rightCol;
  x.beginPath();
  x.moveTo(cx + hw, cy - d);
  x.lineTo(cx, cy - d + hh);
  x.lineTo(cx, cy + hh);
  x.lineTo(cx + hw, cy);
  x.closePath(); x.fill();
}

// 3D cylinder
function isoCylinder(x, cx, cy, rx, ry, h, topCol, bodyCol) {
  // Body
  x.fillStyle = bodyCol;
  x.beginPath();
  x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
  x.lineTo(cx - rx, cy - h);
  x.ellipse(cx, cy - h, rx, ry, 0, Math.PI, 0, true);
  x.closePath(); x.fill();
  // Top
  x.fillStyle = topCol;
  x.beginPath();
  x.ellipse(cx, cy - h, rx, ry, 0, 0, Math.PI * 2);
  x.fill();
}

// Ambient light gradient overlay
function addLighting(x, w, h) {
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,255,255,0.08)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
}

// ===== 3D TILE RENDERING =====
function drawGrassTile(px, py, tx, ty) {
  const v = (tx * 7 + ty * 13) % 6;
  const tile = cachedTile('g3d' + v, x => {
    // Base with 3D depth gradient (light from top-left)
    const g = x.createLinearGradient(0, 0, TILE, TILE);
    const bases = ['#3a7028','#357024','#2f6620','#3d7830','#347222','#386e20'];
    g.addColorStop(0, bases[v]);
    g.addColorStop(0.5, bases[(v+2)%6]);
    g.addColorStop(1, '#2a5a18');
    x.fillStyle = g; x.fillRect(0, 0, TILE, TILE);
    // 3D edge bevels
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, 0, TILE, 1); x.fillRect(0, 0, 1, TILE);
    x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, TILE-1, TILE, 1); x.fillRect(TILE-1, 0, 1, TILE);
    // Grass tufts with shadow
    for (let i = 0; i < 3; i++) {
      const bx = tileRand(v,i,2)*TILE*0.8+TILE*0.1, by = tileRand(v,i,3)*TILE*0.8+TILE*0.1;
      x.fillStyle = 'rgba(0,0,0,0.08)';
      x.beginPath(); x.moveTo(bx+1, by+1); x.lineTo(bx-1, by-4-tileRand(v,i,4)*3);
      x.lineTo(bx+2, by-3-tileRand(v,i,5)*3); x.closePath(); x.fill();
      x.fillStyle = 'rgba(60,150,35,0.5)';
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx-1.5, by-5-tileRand(v,i,4)*3);
      x.lineTo(bx+1.5, by-4-tileRand(v,i,5)*3); x.closePath(); x.fill();
    }
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

function drawOreTile(px, py) {
  const tile = cachedTile('ore3d', x => {
    x.fillStyle = '#4a4530'; x.fillRect(0, 0, TILE, TILE);
    // 3D ore crystals
    const crystals = [[8,14,6],[18,10,8],[12,22,5],[24,18,7],[6,8,4]];
    for (const [cx,cy,sz] of crystals) {
      // Shadow
      x.fillStyle = 'rgba(0,0,0,0.3)';
      x.beginPath(); x.ellipse(cx, cy+sz*0.6, sz*0.5, sz*0.2, 0, 0, Math.PI*2); x.fill();
      // Crystal body (3D prism)
      const g = x.createLinearGradient(cx-sz/2, cy-sz, cx+sz/2, cy);
      g.addColorStop(0, '#ffe060'); g.addColorStop(0.4, '#c8a020'); g.addColorStop(1, '#8a7010');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(cx, cy - sz); x.lineTo(cx + sz*0.4, cy - sz*0.3);
      x.lineTo(cx + sz*0.3, cy + sz*0.2); x.lineTo(cx - sz*0.3, cy + sz*0.2);
      x.lineTo(cx - sz*0.4, cy - sz*0.3); x.closePath(); x.fill();
      // Highlight
      x.fillStyle = 'rgba(255,255,200,0.5)';
      x.beginPath();
      x.moveTo(cx-1, cy-sz); x.lineTo(cx+sz*0.2, cy-sz*0.5);
      x.lineTo(cx, cy-sz*0.3); x.lineTo(cx-sz*0.2, cy-sz*0.5); x.closePath(); x.fill();
    }
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
  // Sparkle
  if ((gameTime + px*3 + py*7) % 70 < 8) {
    const sx = px + 10 + Math.sin(gameTime*0.2+px)*6, sy = py + 12 + Math.cos(gameTime*0.15+py)*5;
    ctx.globalAlpha = 0.6 + Math.sin(gameTime*0.3)*0.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI/2, r1 = 3, r2 = 1;
      ctx.lineTo(sx + Math.cos(a)*r1, sy + Math.sin(a)*r1);
      ctx.lineTo(sx + Math.cos(a+Math.PI/4)*r2, sy + Math.sin(a+Math.PI/4)*r2);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Cached water base tiles — gradient created once, only animate overlay
var _waterBaseCache = null;
var _deepWaterBaseCache = null;

function _ensureWaterCache() {
  if (_waterBaseCache) return;
  _waterBaseCache = document.createElement('canvas');
  _waterBaseCache.width = TILE; _waterBaseCache.height = TILE;
  var wc = _waterBaseCache.getContext('2d');
  var g = wc.createLinearGradient(0, 0, 0, TILE);
  g.addColorStop(0, 'rgb(25,65,130)'); g.addColorStop(1, 'rgb(18,50,110)');
  wc.fillStyle = g; wc.fillRect(0, 0, TILE, TILE);

  _deepWaterBaseCache = document.createElement('canvas');
  _deepWaterBaseCache.width = TILE; _deepWaterBaseCache.height = TILE;
  var dc = _deepWaterBaseCache.getContext('2d');
  var dg = dc.createRadialGradient(TILE/2, TILE/2, 0, TILE/2, TILE/2, TILE);
  dg.addColorStop(0, 'rgb(15,40,90)'); dg.addColorStop(1, 'rgb(8,28,70)');
  dc.fillStyle = dg; dc.fillRect(0, 0, TILE, TILE);
}

function drawWaterTile(px, py) {
  _ensureWaterCache();
  ctx.drawImage(_waterBaseCache, px, py);
  // Cheap animated overlay — single wave line
  var t = gameTime * 0.02;
  var w = Math.sin(t + px * 0.08 + py * 0.05);
  ctx.fillStyle = 'rgba(120,200,255,' + (0.06 + w * 0.03) + ')';
  var cx = px + 8 + Math.sin(t * 1.5 + py * 0.1) * 10;
  var cy = py + 16 + Math.cos(t * 1.2 + px * 0.1) * 4;
  ctx.beginPath(); ctx.ellipse(cx, cy, 6 + w * 2, 3 + w, t * 0.5, 0, Math.PI * 2); ctx.fill();
}

function drawDeepWaterTile(px, py) {
  _ensureWaterCache();
  ctx.drawImage(_deepWaterBaseCache, px, py);
  var t = gameTime * 0.015;
  var w = Math.sin(t + px * 0.06 + py * 0.04);
  ctx.strokeStyle = 'rgba(60,120,180,' + (0.08 + w * 0.04) + ')';
  ctx.lineWidth = 0.6;
  var wy = py + 16, phase = t * 1.5 + px * 0.08;
  ctx.beginPath();
  for (var dx = 0; dx <= TILE; dx += 6) ctx.lineTo(px + dx, wy + Math.sin(phase + dx * 0.12) * 3);
  ctx.stroke();
}

function drawForestTile(px, py, tx, ty) {
  drawGrassTile(px, py, tx, ty);
  const v = (tx*3+ty*5) % 4;
  const tile = cachedTile('f3d'+v, x => {
    // 3D tree with shadow
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(18, 28, 10, 4, 0.3, 0, Math.PI*2); x.fill();
    // Trunk (3D cylinder look)
    const tg = x.createLinearGradient(13, 0, 19, 0);
    tg.addColorStop(0, '#5a3a1a'); tg.addColorStop(0.5, '#7a5030'); tg.addColorStop(1, '#4a2a10');
    x.fillStyle = tg; x.fillRect(14, 18, 5, 12);
    // Canopy (layered 3D spheres)
    const layers = [[16,14,12,'#1a6b2a','#0f4a1a'],[13,11,8,'#228b3a','#166b28'],[19,12,9,'#2aab4a','#1a8b38'],[16,7,6,'#35c55a','#25a548']];
    for (const [cx,cy,r,light,dark] of layers) {
      const sg = x.createRadialGradient(cx-r*0.3, cy-r*0.3, 0, cx, cy, r);
      sg.addColorStop(0, light); sg.addColorStop(1, dark);
      x.fillStyle = sg;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
    }
    // Specular highlight
    x.fillStyle = 'rgba(180,255,140,0.2)';
    x.beginPath(); x.arc(13, 6, 3, 0, Math.PI*2); x.fill();
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

function drawCliffTile(px, py, tx, ty) {
  const v = (tx+ty*3)%3;
  const tile = cachedTile('c3d'+v, x => {
    // 3D rock face
    const g = x.createLinearGradient(0, 0, TILE, TILE);
    g.addColorStop(0, '#8a8a8a'); g.addColorStop(0.3, '#6a6a6a'); g.addColorStop(0.7, '#555'); g.addColorStop(1, '#444');
    x.fillStyle = g; x.fillRect(0, 0, TILE, TILE);
    // 3D rock layers
    for (let i = 0; i < 3; i++) {
      const ly = 4 + i*10;
      const lg = x.createLinearGradient(0, ly, 0, ly+8);
      lg.addColorStop(0, `rgba(255,255,255,${0.12-i*0.03})`);
      lg.addColorStop(1, `rgba(0,0,0,${0.08+i*0.02})`);
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(0, ly); x.lineTo(10+i*4, ly-2); x.lineTo(TILE, ly+1);
      x.lineTo(TILE, ly+6); x.lineTo(0, ly+8); x.closePath(); x.fill();
    }
    // Snow cap with 3D shading
    const sg = x.createLinearGradient(0, 0, 0, 5);
    sg.addColorStop(0, 'rgba(240,240,250,0.5)'); sg.addColorStop(1, 'rgba(200,200,220,0.1)');
    x.fillStyle = sg; x.fillRect(0, 0, TILE, 5);
    // Cracks
    x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(10,0); x.bezierCurveTo(12,10,8,20,14,TILE); x.stroke();
    x.beginPath(); x.moveTo(24,0); x.bezierCurveTo(22,8,26,18,20,TILE); x.stroke();
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

function drawSandTile(px, py, tx, ty) {
  const v = (tx*5+ty*7)%4;
  const tile = cachedTile('s3d'+v, x => {
    const g = x.createRadialGradient(TILE/2, TILE/2, 0, TILE/2, TILE/2, TILE);
    g.addColorStop(0, '#dcc070'); g.addColorStop(1, '#c4a44a');
    x.fillStyle = g; x.fillRect(0, 0, TILE, TILE);
    // 3D sand dune ripples
    for (let i = 0; i < 4; i++) {
      const ry = 4+i*8;
      x.strokeStyle = `rgba(160,130,60,${0.25-i*0.04})`;
      x.lineWidth = 0.8;
      x.beginPath();
      x.moveTo(0, ry);
      x.bezierCurveTo(TILE*0.3, ry+(v%2?3:-3), TILE*0.7, ry+(v%2?-2:2), TILE, ry);
      x.stroke();
      // Light side of ripple
      x.strokeStyle = `rgba(255,240,180,${0.15-i*0.03})`;
      x.beginPath();
      x.moveTo(0, ry-1);
      x.bezierCurveTo(TILE*0.3, ry-1+(v%2?3:-3), TILE*0.7, ry-1+(v%2?-2:2), TILE, ry-1);
      x.stroke();
    }
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

function drawRoadTile(px, py, tx, ty) {
  const tile = cachedTile('r3d', x => {
    // 3D road with depth
    const g = x.createLinearGradient(0, 0, 0, TILE);
    g.addColorStop(0, '#6a6050'); g.addColorStop(0.15, '#7a7060');
    g.addColorStop(0.85, '#7a7060'); g.addColorStop(1, '#5a5040');
    x.fillStyle = g; x.fillRect(0, 0, TILE, TILE);
    // Raised edges (3D curb)
    x.fillStyle = '#8a8070'; x.fillRect(0, 0, TILE, 3);
    x.fillStyle = '#5a5040'; x.fillRect(0, TILE-3, TILE, 3);
    // Center line
    x.fillStyle = 'rgba(220,200,150,0.25)';
    x.fillRect(4, TILE/2-0.5, 8, 1); x.fillRect(18, TILE/2-0.5, 8, 1);
    // Tire marks
    x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(8, 6, 16, TILE-12);
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

function drawFlowerTile(px, py, tx, ty) {
  drawGrassTile(px, py, tx, ty);
  const v = (tx*11+ty*17)%5;
  const tile = cachedTile('fl3d'+v, x => {
    const colors = ['#ff6b8a','#ffaa44','#ff55aa','#aa66ff','#ffdd44'];
    for (let i = 0; i < 5; i++) {
      const fx = tileRand(v,i,10)*(TILE-6)+3, fy = tileRand(v,i,11)*(TILE-6)+3;
      // Stem
      x.strokeStyle = 'rgba(40,100,20,0.5)'; x.lineWidth = 0.5;
      x.beginPath(); x.moveTo(fx, fy+1); x.lineTo(fx, fy+4); x.stroke();
      // 3D flower (radial gradient petals)
      const fc = colors[(v+i)%5];
      x.fillStyle = fc;
      for (let p = 0; p < 5; p++) {
        const a = p*Math.PI*2/5;
        x.beginPath(); x.arc(fx+Math.cos(a)*1.8, fy+Math.sin(a)*1.8, 1.2, 0, Math.PI*2); x.fill();
      }
      // Center with highlight
      x.fillStyle = '#ffee44'; x.beginPath(); x.arc(fx, fy, 1, 0, Math.PI*2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.arc(fx-0.3, fy-0.3, 0.5, 0, Math.PI*2); x.fill();
    }
  });
  ctx.drawImage(tile, px, py, TILE, TILE);
}

// ===== 3D BUILDING SPRITES =====
function teamColors(team) {
  const fac = team === 0 ? (typeof playerFaction !== 'undefined' ? playerFaction : null) : (typeof enemyFaction !== 'undefined' ? enemyFaction : null);
  if (fac) {
    const id = fac.id;
    if (id === 'thailand') return { main:'#c88818', dark:'#7a5518', light:'#e8a020', accent:'#f0c040', glow:'rgba(232,160,32,0.15)' };
    if (id === 'japan') return { main:'#cc1177', dark:'#880055', light:'#ff1493', accent:'#ff69b4', glow:'rgba(255,20,147,0.15)' };
    if (id === 'switzerland') return { main:'#8ab8e0', dark:'#4a7aa0', light:'#c0deff', accent:'#e0eeff', glow:'rgba(192,222,255,0.15)' };
    if (id === 'brazil') return { main:'#22aa44', dark:'#116622', light:'#33ff66', accent:'#88ff99', glow:'rgba(51,255,102,0.15)' };
    if (id === 'egypt') return { main:'#d4a800', dark:'#8a6e00', light:'#ffe040', accent:'#fff080', glow:'rgba(255,224,64,0.15)' };
  }
  if (team === 0) return { main:'#2860cc', dark:'#1a4090', light:'#5090ff', accent:'#80bbff', glow:'rgba(80,140,255,0.15)' };
  return { main:'#cc2828', dark:'#901a1a', light:'#ff5050', accent:'#ff8080', glow:'rgba(255,80,80,0.15)' };
}

function spriteHQ(team) {
  const c = teamColors(team);
  const fac = team === 0 ? (typeof playerFaction !== 'undefined' ? playerFaction : null) : (typeof enemyFaction !== 'undefined' ? enemyFaction : null);
  const fid = fac ? fac.id : '';
  return cachedSprite('hq3d_'+team+'_'+fid, 96, 96, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(48, 88, 40, 10, 0, 0, Math.PI*2); x.fill();
    isoBox(x, 48, 75, 70, 35, 40, c.light, c.dark, c.main);

    if (fid === 'thailand') {
      // Thai temple tiered roof
      x.fillStyle = c.accent;
      x.beginPath(); x.moveTo(48, 5); x.lineTo(80, 30); x.lineTo(48, 42); x.lineTo(16, 30); x.closePath(); x.fill();
      x.fillStyle = c.main;
      x.beginPath(); x.moveTo(48, 15); x.lineTo(72, 32); x.lineTo(48, 40); x.lineTo(24, 32); x.closePath(); x.fill();
      // Pink psychic glow
      x.fillStyle = 'rgba(255,105,180,0.2)';
      x.beginPath(); x.arc(48, 50, 30, 0, Math.PI*2); x.fill();
    } else if (fid === 'japan') {
      // Cyberpunk castle pagoda
      const rg = x.createLinearGradient(48, 5, 48, 35);
      rg.addColorStop(0, '#ff1493'); rg.addColorStop(1, c.dark);
      x.fillStyle = rg;
      x.beginPath(); x.moveTo(48, 5); x.lineTo(83, 35); x.lineTo(48, 48); x.lineTo(13, 35); x.closePath(); x.fill();
      // Neon lines
      x.strokeStyle = '#00ffff'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(20, 55); x.lineTo(76, 55); x.stroke();
      x.beginPath(); x.moveTo(25, 65); x.lineTo(71, 65); x.stroke();
    } else if (fid === 'switzerland') {
      // Fortress with cross
      x.fillStyle = c.accent; x.fillRect(10, 18, 76, 6);
      x.fillStyle = '#ff0000'; x.fillRect(40, 28, 16, 16);
      x.fillStyle = '#fff'; x.fillRect(44, 32, 8, 2); x.fillRect(47, 29, 2, 8);
      // Cryo glow
      x.fillStyle = 'rgba(136,204,255,0.2)';
      x.beginPath(); x.arc(48, 50, 28, 0, Math.PI*2); x.fill();
    } else if (fid === 'brazil') {
      // Bio-organic roof
      x.fillStyle = '#0a2a0a';
      x.beginPath(); x.moveTo(48, 8); x.lineTo(83, 35); x.lineTo(48, 50); x.lineTo(13, 35); x.closePath(); x.fill();
      // Vines
      x.strokeStyle = '#33ff66'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(20, 40); x.quadraticCurveTo(35, 25, 48, 35); x.stroke();
      x.beginPath(); x.moveTo(76, 40); x.quadraticCurveTo(60, 25, 48, 35); x.stroke();
      // Toxic glow
      x.fillStyle = 'rgba(51,255,102,0.15)';
      x.beginPath(); x.arc(48, 50, 28, 0, Math.PI*2); x.fill();
    } else if (fid === 'egypt') {
      // Pyramid top
      x.fillStyle = '#1a1a1a';
      x.beginPath(); x.moveTo(48, 2); x.lineTo(83, 38); x.lineTo(13, 38); x.closePath(); x.fill();
      x.strokeStyle = '#ffcc00'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(48, 2); x.lineTo(83, 38); x.lineTo(13, 38); x.closePath(); x.stroke();
      // Eye of Horus
      x.fillStyle = '#ffcc00'; x.beginPath(); x.arc(48, 22, 5, 0, Math.PI*2); x.fill();
      x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(48, 22, 2, 0, Math.PI*2); x.fill();
    } else {
      // Default roof
      const rg = x.createLinearGradient(48, 10, 48, 35);
      rg.addColorStop(0, c.accent); rg.addColorStop(1, c.main);
      x.fillStyle = rg;
      x.beginPath(); x.moveTo(48, 8); x.lineTo(83, 35); x.lineTo(48, 52); x.lineTo(13, 35); x.closePath(); x.fill();
    }

    // Windows
    x.fillStyle = '#ffe866';
    for (let i = 0; i < 3; i++) x.fillRect(25+i*16, 55, 8, 10);
    // Door
    x.fillStyle = '#1a1a1a';
    x.beginPath(); x.moveTo(40, 78); x.lineTo(40, 66); x.arc(48, 66, 8, Math.PI, 0); x.lineTo(56, 78); x.closePath(); x.fill();
    // Antenna
    x.fillStyle = '#bbb'; x.fillRect(72, 8, 2, 28);
    x.fillStyle = c.light; x.fillRect(74, 10, 12, 7);
    x.fillStyle = c.glow;
    x.beginPath(); x.arc(48, 55, 28, 0, Math.PI*2); x.fill();
    addLighting(x, w, h);
  });
}

function spriteBarracks(team) {
  const c = teamColors(team);
  return cachedSprite('bar3d_'+team, 64, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(32, 58, 26, 7, 0, 0, Math.PI*2); x.fill();
    isoBox(x, 32, 48, 50, 25, 30, c.light, c.dark, c.main);
    // Flat roof with edge
    x.fillStyle = c.accent; x.fillRect(7, 16, 50, 4);
    // Emblem (3D star)
    x.fillStyle = '#ffcc00';
    x.beginPath(); x.arc(32, 34, 7, 0, Math.PI*2); x.fill();
    const sg = x.createRadialGradient(30, 32, 0, 32, 34, 7);
    sg.addColorStop(0, 'rgba(255,255,200,0.5)'); sg.addColorStop(1, 'rgba(255,200,0,0)');
    x.fillStyle = sg; x.beginPath(); x.arc(32, 34, 7, 0, Math.PI*2); x.fill();
    // Door
    x.fillStyle = '#111'; x.fillRect(24, 46, 16, 14);
    x.fillStyle = 'rgba(255,200,0,0.15)'; x.fillRect(25, 47, 14, 12);
    addLighting(x, w, h);
  });
}

function spriteRefinery(team) {
  const c = teamColors(team);
  return cachedSprite('ref3d_'+team, 64, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(32, 58, 26, 7, 0, 0, Math.PI*2); x.fill();
    // Platform
    isoBox(x, 32, 56, 54, 27, 6, '#777', '#444', '#555');
    // Main building
    isoBox(x, 24, 44, 32, 16, 22, c.light, c.dark, c.main);
    // 3D Silo (cylinder)
    isoCylinder(x, 50, 50, 7, 3, 30, '#bbb', '#888');
    // Conveyor
    x.fillStyle = '#c8a832'; x.fillRect(10, 44, 24, 4);
    x.fillStyle = '#e0c040';
    for (let i = 0; i < 4; i++) x.fillRect(12+i*6, 44.5, 4, 3);
    // Chimney
    isoCylinder(x, 18, 20, 4, 2, 12, '#888', '#666');
    // Smoke
    x.fillStyle = 'rgba(180,180,180,0.25)';
    x.beginPath(); x.arc(18, 6, 5, 0, Math.PI*2); x.fill();
    x.beginPath(); x.arc(20, 2, 4, 0, Math.PI*2); x.fill();
    addLighting(x, w, h);
  });
}

function spriteTurret(team) {
  const c = teamColors(team);
  return cachedSprite('tur3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.3)';
    x.beginPath(); x.ellipse(16, 28, 10, 3, 0, 0, Math.PI*2); x.fill();
    // 3D base
    isoBox(x, 16, 26, 18, 9, 6, '#777', '#444', '#555');
    // Turret dome (3D sphere)
    const sg = x.createRadialGradient(14, 15, 1, 16, 17, 9);
    sg.addColorStop(0, c.accent); sg.addColorStop(0.6, c.main); sg.addColorStop(1, c.dark);
    x.fillStyle = sg;
    x.beginPath(); x.arc(16, 17, 9, 0, Math.PI*2); x.fill();
    // Barrel (3D cylinder)
    const bg = x.createLinearGradient(20, 13, 20, 20);
    bg.addColorStop(0, '#888'); bg.addColorStop(0.5, '#555'); bg.addColorStop(1, '#333');
    x.fillStyle = bg; x.fillRect(22, 14, 10, 4);
    x.fillStyle = '#222'; x.fillRect(30, 13, 2, 6);
    // Specular
    x.fillStyle = 'rgba(255,255,255,0.15)';
    x.beginPath(); x.arc(14, 14, 4, 0, Math.PI*2); x.fill();
  });
}

function spriteFactory(team) {
  const c = teamColors(team);
  return cachedSprite('fac3d_'+team, 96, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(48, 60, 42, 8, 0, 0, Math.PI*2); x.fill();
    // Main 3D block
    isoBox(x, 48, 52, 80, 40, 35, c.light, c.dark, c.main);
    // Saw-tooth roof (3D)
    for (let i = 0; i < 4; i++) {
      const rx = 12+i*20;
      const rg = x.createLinearGradient(rx, 0, rx+20, 16);
      rg.addColorStop(0, '#aaa'); rg.addColorStop(1, '#666');
      x.fillStyle = rg;
      x.beginPath(); x.moveTo(rx, 17); x.lineTo(rx+10, 2); x.lineTo(rx+20, 17); x.closePath(); x.fill();
      // Glass
      x.fillStyle = '#aaddff'; x.fillRect(rx+6, 5, 5, 8);
      x.fillStyle = 'rgba(200,240,255,0.4)'; x.fillRect(rx+6, 5, 2.5, 4);
    }
    // Garage door (3D recessed)
    x.fillStyle = '#0a0a0a'; x.fillRect(16, 34, 24, 22);
    x.fillStyle = 'rgba(255,200,100,0.06)'; x.fillRect(17, 35, 22, 20);
    x.fillStyle = '#333';
    for (let i = 0; i < 4; i++) x.fillRect(17, 36+i*5, 22, 1);
    // Chimneys (3D cylinders)
    isoCylinder(x, 76, 12, 5, 2, 14, '#888', '#666');
    isoCylinder(x, 64, 14, 4, 2, 12, '#888', '#666');
    addLighting(x, w, h);
  });
}

function spritePowerPlant(team) {
  const c = teamColors(team);
  return cachedSprite('pow3d_'+team, 64, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(32, 58, 26, 7, 0, 0, Math.PI*2); x.fill();
    isoBox(x, 32, 52, 48, 24, 28, c.light, c.dark, c.main);
    // 3D cooling tower
    isoCylinder(x, 22, 48, 9, 4, 36, '#bbb', '#888');
    // Lightning bolt (3D glow)
    x.fillStyle = '#ffdd00';
    x.beginPath();
    x.moveTo(44, 16); x.lineTo(38, 32); x.lineTo(44, 30);
    x.lineTo(40, 46); x.lineTo(52, 28); x.lineTo(46, 30);
    x.closePath(); x.fill();
    // Glow layers
    x.fillStyle = 'rgba(255,255,100,0.25)';
    x.beginPath(); x.arc(44, 32, 12, 0, Math.PI*2); x.fill();
    x.fillStyle = 'rgba(255,255,100,0.1)';
    x.beginPath(); x.arc(44, 32, 20, 0, Math.PI*2); x.fill();
    addLighting(x, w, h);
  });
}

function spriteGenericBuilding(team, label) {
  const c = teamColors(team);
  return cachedSprite('gen3d_'+label+'_'+team, 64, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(32, 58, 24, 6, 0, 0, Math.PI*2); x.fill();
    isoBox(x, 32, 50, 44, 22, 30, c.light, c.dark, c.main);
    // 3D dome
    const dg = x.createRadialGradient(28, 14, 0, 32, 18, 16);
    dg.addColorStop(0, c.accent); dg.addColorStop(1, c.dark);
    x.fillStyle = dg;
    x.beginPath(); x.arc(32, 20, 16, Math.PI, 0); x.fill();
    // Specular on dome
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.beginPath(); x.arc(28, 14, 6, 0, Math.PI*2); x.fill();
    // Glow ring
    x.strokeStyle = c.light; x.lineWidth = 1.5;
    x.beginPath(); x.arc(32, 38, 10, 0, Math.PI*2); x.stroke();
    x.fillStyle = c.glow;
    x.beginPath(); x.arc(32, 38, 8, 0, Math.PI*2); x.fill();
    // Label
    x.fillStyle = '#fff'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center';
    x.fillText(label, 32, 42);
    addLighting(x, w, h);
  });
}

// ===== 3D UNIT SPRITES =====
function spriteSoldier(team) {
  const c = teamColors(team);
  return cachedSprite('sol3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(16, 28, 7, 2.5, 0, 0, Math.PI*2); x.fill();
    // Legs (3D)
    x.fillStyle = '#3a3a3a'; x.fillRect(12, 22, 3.5, 7); x.fillRect(17, 22, 3.5, 7);
    // Body (3D shaded)
    const bg = x.createLinearGradient(10, 12, 22, 24);
    bg.addColorStop(0, c.light); bg.addColorStop(0.5, c.main); bg.addColorStop(1, c.dark);
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(10, 24); x.lineTo(10, 14); x.quadraticCurveTo(16, 11, 22, 14); x.lineTo(22, 24); x.closePath(); x.fill();
    // Head (3D sphere)
    const hg = x.createRadialGradient(14, 8, 0, 16, 10, 5);
    hg.addColorStop(0, '#ffe0a0'); hg.addColorStop(1, '#cc9050');
    x.fillStyle = hg; x.beginPath(); x.arc(16, 10, 5, 0, Math.PI*2); x.fill();
    // Helmet (3D)
    const hlg = x.createRadialGradient(14, 7, 0, 16, 9, 6);
    hlg.addColorStop(0, '#778'); hlg.addColorStop(1, '#445');
    x.fillStyle = hlg; x.beginPath(); x.arc(16, 9, 5.5, Math.PI, 0); x.fill();
    // Gun
    x.fillStyle = '#555'; x.fillRect(22, 14, 8, 2.5);
    x.fillStyle = '#777'; x.fillRect(28, 13, 2, 4);
    // Eyes
    x.fillStyle = '#fff'; x.fillRect(14, 9, 1.5, 1.5); x.fillRect(18, 9, 1.5, 1.5);
  });
}

function spriteTank(team) {
  const c = teamColors(team);
  return cachedSprite('tnk3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    // Tracks (3D)
    const tg = x.createLinearGradient(1, 19, 1, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(1, 19, 30, 10);
    x.fillStyle = '#555';
    for (let i = 0; i < 7; i++) x.fillRect(3+i*4, 20, 2.5, 8);
    // Hull (3D box)
    const hg = x.createLinearGradient(3, 12, 29, 22);
    hg.addColorStop(0, c.light); hg.addColorStop(0.5, c.main); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(3, 12, 26, 9);
    // Turret (3D sphere)
    const sg = x.createRadialGradient(14, 13, 0, 16, 15, 7);
    sg.addColorStop(0, c.accent); sg.addColorStop(0.7, c.main); sg.addColorStop(1, c.dark);
    x.fillStyle = sg; x.beginPath(); x.arc(16, 15, 6, 0, Math.PI*2); x.fill();
    // Barrel (3D cylinder)
    const bg = x.createLinearGradient(20, 12, 20, 18);
    bg.addColorStop(0, '#888'); bg.addColorStop(0.5, '#555'); bg.addColorStop(1, '#333');
    x.fillStyle = bg; x.fillRect(20, 12.5, 12, 4);
    x.fillStyle = '#222'; x.fillRect(30, 11.5, 2, 6);
    // Specular
    x.fillStyle = 'rgba(255,255,255,0.12)';
    x.beginPath(); x.arc(14, 13, 3, 0, Math.PI*2); x.fill();
  });
}

function spriteScout(team) {
  const c = teamColors(team);
  return cachedSprite('sct3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(16, 27, 8, 2.5, 0, 0, Math.PI*2); x.fill();
    // Wheels (3D)
    for (const wx of [8, 24]) {
      const wg = x.createRadialGradient(wx-1, 23, 0, wx, 24, 4);
      wg.addColorStop(0, '#666'); wg.addColorStop(1, '#222');
      x.fillStyle = wg; x.beginPath(); x.arc(wx, 24, 4, 0, Math.PI*2); x.fill();
      x.fillStyle = '#888'; x.beginPath(); x.arc(wx, 24, 1.5, 0, Math.PI*2); x.fill();
    }
    // Body (3D)
    const bg = x.createLinearGradient(4, 13, 28, 24);
    bg.addColorStop(0, c.light); bg.addColorStop(1, c.dark);
    x.fillStyle = bg; x.fillRect(4, 13, 24, 11);
    // Windshield (3D glass)
    const gg = x.createLinearGradient(20, 14, 26, 20);
    gg.addColorStop(0, '#cceeFF'); gg.addColorStop(1, '#88bbdd');
    x.fillStyle = gg; x.fillRect(20, 14, 6, 6);
    x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(21, 15, 2, 3);
    // Antenna
    x.fillStyle = '#aaa'; x.fillRect(6, 3, 1.5, 12);
    x.fillStyle = '#f00'; x.beginPath(); x.arc(7, 3, 2, 0, Math.PI*2); x.fill();
  });
}

function spriteHarvester(team) {
  const c = teamColors(team);
  return cachedSprite('hrv3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 29, 12, 3, 0, 0, Math.PI*2); x.fill();
    // Tracks
    const tg = x.createLinearGradient(1, 20, 1, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(1, 20, 30, 9);
    x.fillStyle = '#555';
    for (let i = 0; i < 7; i++) x.fillRect(3+i*4, 21, 2.5, 7);
    // Hull
    const hg = x.createLinearGradient(3, 12, 28, 22);
    hg.addColorStop(0, c.light); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(3, 12, 26, 10);
    // Cabin (3D)
    x.fillStyle = c.main; x.fillRect(18, 7, 10, 7);
    const gg = x.createLinearGradient(20, 8, 26, 13);
    gg.addColorStop(0, '#cceeFF'); gg.addColorStop(1, '#88bbdd');
    x.fillStyle = gg; x.fillRect(20, 8, 6, 5);
    // Scoop arm (3D)
    x.fillStyle = '#777'; x.fillRect(2, 9, 4, 9);
    x.fillStyle = '#999'; x.fillRect(0, 7, 6, 3);
    // Bucket with ore
    x.fillStyle = '#555';
    x.beginPath(); x.moveTo(0, 5); x.lineTo(6, 5); x.lineTo(7, 10); x.lineTo(-1, 10); x.closePath(); x.fill();
    x.fillStyle = '#c8a832'; x.fillRect(1, 6, 4, 3);
    // Exhaust
    isoCylinder(x, 27, 10, 2, 1, 5, '#777', '#555');
  });
}

function spriteAir(team) {
  const c = teamColors(team);
  return cachedSprite('air3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.12)';
    x.beginPath(); x.ellipse(16, 28, 10, 3, 0, 0, Math.PI*2); x.fill();
    // Wings (3D shaded)
    const wg = x.createLinearGradient(4, 14, 28, 18);
    wg.addColorStop(0, c.dark); wg.addColorStop(0.5, c.main); wg.addColorStop(1, c.dark);
    x.fillStyle = wg;
    x.beginPath(); x.moveTo(4, 16); x.lineTo(16, 11); x.lineTo(28, 16); x.lineTo(16, 14); x.closePath(); x.fill();
    // Fuselage (3D)
    const fg = x.createLinearGradient(12, 4, 20, 22);
    fg.addColorStop(0, c.light); fg.addColorStop(0.5, c.main); fg.addColorStop(1, c.dark);
    x.fillStyle = fg;
    x.beginPath(); x.moveTo(16, 3); x.lineTo(20, 22); x.lineTo(16, 20); x.lineTo(12, 22); x.closePath(); x.fill();
    // Cockpit (3D glass)
    const cg = x.createRadialGradient(15, 8, 0, 16, 10, 4);
    cg.addColorStop(0, '#ddeeff'); cg.addColorStop(1, '#88aacc');
    x.fillStyle = cg;
    x.beginPath(); x.ellipse(16, 10, 2.5, 4, 0, 0, Math.PI*2); x.fill();
    // Engine glow
    x.fillStyle = 'rgba(255,200,50,0.5)';
    x.beginPath(); x.arc(16, 23, 2.5, 0, Math.PI*2); x.fill();
    x.fillStyle = 'rgba(255,200,50,0.2)';
    x.beginPath(); x.arc(16, 23, 5, 0, Math.PI*2); x.fill();
  });
}

function spriteSpecial(team) {
  const c = teamColors(team);
  return cachedSprite('spc3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    // Heavy tracks
    const tg = x.createLinearGradient(0, 18, 0, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#1a1a1a');
    x.fillStyle = tg; x.fillRect(0, 18, 32, 11);
    x.fillStyle = '#555';
    for (let i = 0; i < 8; i++) x.fillRect(2+i*4, 19, 2.5, 9);
    // Hull (3D)
    const hg = x.createLinearGradient(2, 10, 30, 22);
    hg.addColorStop(0, c.accent); hg.addColorStop(0.5, c.main); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(2, 10, 28, 10);
    // Turret (3D sphere, larger)
    const sg = x.createRadialGradient(13, 11, 0, 16, 13, 8);
    sg.addColorStop(0, '#fff'); sg.addColorStop(0.2, c.accent); sg.addColorStop(1, c.dark);
    x.fillStyle = sg; x.beginPath(); x.arc(16, 13, 8, 0, Math.PI*2); x.fill();
    // Double barrel
    const bg = x.createLinearGradient(22, 9, 22, 17);
    bg.addColorStop(0, '#888'); bg.addColorStop(1, '#333');
    x.fillStyle = bg;
    x.fillRect(22, 10, 10, 2.5); x.fillRect(22, 14, 10, 2.5);
    x.fillStyle = '#222'; x.fillRect(30, 9, 2, 9);
    // Energy glow
    x.fillStyle = 'rgba(100,200,255,0.25)';
    x.beginPath(); x.arc(16, 13, 6, 0, Math.PI*2); x.fill();
    x.strokeStyle = 'rgba(100,200,255,0.3)'; x.lineWidth = 0.8;
    x.beginPath(); x.arc(16, 13, 10, 0, Math.PI*2); x.stroke();
  });
}

// ===== MEDIC SPRITE =====
function spriteMedic(team) {
  const c = teamColors(team);
  return cachedSprite('med3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(16, 28, 7, 2.5, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = '#3a3a3a'; x.fillRect(12, 22, 3.5, 7); x.fillRect(17, 22, 3.5, 7);
    const bg = x.createLinearGradient(10, 12, 22, 24);
    bg.addColorStop(0, '#eee'); bg.addColorStop(1, '#aaa');
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(10, 24); x.lineTo(10, 14); x.quadraticCurveTo(16, 11, 22, 14); x.lineTo(22, 24); x.closePath(); x.fill();
    // Red cross
    x.fillStyle = '#ff3333'; x.fillRect(14, 15, 4, 8); x.fillRect(12, 17, 8, 4);
    const hg = x.createRadialGradient(14, 8, 0, 16, 10, 5);
    hg.addColorStop(0, '#ffe0a0'); hg.addColorStop(1, '#cc9050');
    x.fillStyle = hg; x.beginPath(); x.arc(16, 10, 5, 0, Math.PI*2); x.fill();
    // Heal glow
    x.fillStyle = 'rgba(68,255,136,0.3)';
    x.beginPath(); x.arc(16, 18, 10, 0, Math.PI*2); x.fill();
  });
}

// ===== ENGINEER SPRITE =====
function spriteEngineer(team) {
  const c = teamColors(team);
  return cachedSprite('eng3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(16, 28, 7, 2.5, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = '#3a3a3a'; x.fillRect(12, 22, 3.5, 7); x.fillRect(17, 22, 3.5, 7);
    const bg = x.createLinearGradient(10, 12, 22, 24);
    bg.addColorStop(0, '#ffcc44'); bg.addColorStop(1, '#aa8822');
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(10, 24); x.lineTo(10, 14); x.quadraticCurveTo(16, 11, 22, 14); x.lineTo(22, 24); x.closePath(); x.fill();
    const hg = x.createRadialGradient(14, 8, 0, 16, 10, 5);
    hg.addColorStop(0, '#ffe0a0'); hg.addColorStop(1, '#cc9050');
    x.fillStyle = hg; x.beginPath(); x.arc(16, 10, 5, 0, Math.PI*2); x.fill();
    // Hard hat
    x.fillStyle = '#ffcc00'; x.beginPath(); x.arc(16, 9, 5.5, Math.PI, 0); x.fill();
    // Wrench
    x.fillStyle = '#888'; x.fillRect(22, 16, 7, 2);
    x.fillStyle = '#aaa'; x.beginPath(); x.arc(29, 17, 2.5, 0, Math.PI*2); x.fill();
  });
}

// ===== ARTILLERY SPRITE =====
function spriteArtillery(team) {
  const c = teamColors(team);
  return cachedSprite('art3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    const tg = x.createLinearGradient(2, 20, 2, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(2, 20, 28, 9);
    x.fillStyle = '#555';
    for (let i = 0; i < 6; i++) x.fillRect(4+i*4, 21, 2, 7);
    const hg = x.createLinearGradient(4, 14, 28, 22);
    hg.addColorStop(0, c.light); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(4, 14, 24, 8);
    // Long barrel angled up
    x.save(); x.translate(20, 14); x.rotate(-0.4);
    const bg = x.createLinearGradient(0, -1, 0, 3);
    bg.addColorStop(0, '#888'); bg.addColorStop(1, '#444');
    x.fillStyle = bg; x.fillRect(0, -1.5, 14, 3);
    x.fillStyle = '#ff8800'; x.beginPath(); x.arc(14, 0, 2, 0, Math.PI*2); x.fill();
    x.restore();
  });
}

// ===== ELITE SPRITE =====
function spriteElite(team) {
  const c = teamColors(team);
  return cachedSprite('eli3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    const tg = x.createLinearGradient(0, 17, 0, 29);
    tg.addColorStop(0, '#555'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(0, 17, 32, 12);
    x.fillStyle = '#666';
    for (let i = 0; i < 8; i++) x.fillRect(2+i*4, 18, 2.5, 10);
    const hg = x.createLinearGradient(1, 8, 31, 20);
    hg.addColorStop(0, c.accent); hg.addColorStop(0.5, c.light); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(1, 8, 30, 11);
    // Elite turret with star
    const sg = x.createRadialGradient(14, 9, 0, 16, 11, 9);
    sg.addColorStop(0, '#fff'); sg.addColorStop(0.3, c.accent); sg.addColorStop(1, c.dark);
    x.fillStyle = sg; x.beginPath(); x.arc(16, 11, 9, 0, Math.PI*2); x.fill();
    // Star emblem
    x.fillStyle = '#ffcc00';
    x.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI/2 + i * Math.PI*2/5;
      const r = i === 0 ? 4 : 4;
      x[i===0?'moveTo':'lineTo'](16+Math.cos(a)*r, 11+Math.sin(a)*r);
      const a2 = a + Math.PI/5;
      x.lineTo(16+Math.cos(a2)*1.8, 11+Math.sin(a2)*1.8);
    }
    x.closePath(); x.fill();
    // Triple barrel
    x.fillStyle = '#777';
    x.fillRect(23, 8, 9, 2); x.fillRect(23, 11, 9, 2); x.fillRect(23, 14, 9, 2);
    // Energy aura
    x.strokeStyle = c.light; x.lineWidth = 1; x.globalAlpha = 0.4;
    x.beginPath(); x.arc(16, 14, 14, 0, Math.PI*2); x.stroke();
    x.globalAlpha = 1;
  });
}

// ===== SUPERWEAPON BUILDING SPRITE =====
function spriteSuperweapon(team) {
  const c = teamColors(team);
  return cachedSprite('sw3d_'+team, 64, 64, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(32, 58, 26, 7, 0, 0, Math.PI*2); x.fill();
    isoBox(x, 32, 48, 50, 25, 30, c.light, c.dark, c.main);
    // Hazard stripes
    x.fillStyle = '#ffcc00';
    for (let i = 0; i < 5; i++) { x.fillRect(10+i*10, 22, 5, 3); }
    // Central energy core
    const cg = x.createRadialGradient(32, 35, 0, 32, 35, 12);
    cg.addColorStop(0, '#fff'); cg.addColorStop(0.3, c.accent); cg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = cg; x.beginPath(); x.arc(32, 35, 12, 0, Math.PI*2); x.fill();
    // Antenna/spire
    x.fillStyle = '#aaa'; x.fillRect(31, 4, 2, 20);
    x.fillStyle = c.light; x.beginPath(); x.arc(32, 4, 3, 0, Math.PI*2); x.fill();
    // Pulsing rings
    x.strokeStyle = c.light; x.lineWidth = 0.8; x.globalAlpha = 0.5;
    x.beginPath(); x.arc(32, 35, 16, 0, Math.PI*2); x.stroke();
    x.beginPath(); x.arc(32, 35, 22, 0, Math.PI*2); x.stroke();
    x.globalAlpha = 1;
    addLighting(x, w, h);
  });
}

// ===== MCV SPRITE =====

// ===== SNIPER SPRITE =====
function spriteSniper(team) {
  const c = teamColors(team);
  return cachedSprite('snp3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.2)';
    x.beginPath(); x.ellipse(16, 28, 7, 2.5, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = '#3a3a3a'; x.fillRect(12, 22, 3, 7); x.fillRect(17, 22, 3, 7);
    const bg = x.createLinearGradient(10, 12, 22, 24);
    bg.addColorStop(0, c.light); bg.addColorStop(1, c.dark);
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(10, 24); x.lineTo(11, 13); x.quadraticCurveTo(16, 10, 21, 13); x.lineTo(22, 24); x.closePath(); x.fill();
    const hg = x.createRadialGradient(14, 8, 0, 16, 10, 5);
    hg.addColorStop(0, '#ffe0a0'); hg.addColorStop(1, '#cc9050');
    x.fillStyle = hg; x.beginPath(); x.arc(16, 9, 4.5, 0, Math.PI*2); x.fill();
    // Long rifle
    x.fillStyle = '#444'; x.fillRect(20, 10, 12, 1.5);
    x.fillStyle = '#666'; x.fillRect(30, 9, 2, 3.5);
    // Scope
    x.fillStyle = c.light; x.beginPath(); x.arc(26, 9, 1.5, 0, Math.PI*2); x.fill();
    // Scope glint
    x.fillStyle = '#fff'; x.beginPath(); x.arc(26, 8.5, 0.5, 0, Math.PI*2); x.fill();
  });
}

// ===== FLAMER SPRITE =====
function spriteFlamer(team) {
  const c = teamColors(team);
  return cachedSprite('flm3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 10, 3, 0, 0, Math.PI*2); x.fill();
    const tg = x.createLinearGradient(3, 20, 3, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(3, 20, 26, 9);
    x.fillStyle = '#555';
    for (let i = 0; i < 6; i++) x.fillRect(5+i*4, 21, 2, 7);
    const hg = x.createLinearGradient(4, 12, 28, 22);
    hg.addColorStop(0, c.light); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(4, 12, 24, 10);
    // Flame nozzle
    x.fillStyle = '#888'; x.fillRect(26, 14, 6, 3);
    // Flame
    const fg = x.createRadialGradient(32, 15.5, 0, 32, 15.5, 5);
    fg.addColorStop(0, '#ff4'); fg.addColorStop(0.5, '#f80'); fg.addColorStop(1, 'rgba(255,0,0,0)');
    x.fillStyle = fg; x.beginPath(); x.arc(32, 15.5, 5, 0, Math.PI*2); x.fill();
  });
}

// ===== TRANSPORT SPRITE =====
function spriteTransport(team) {
  const c = teamColors(team);
  return cachedSprite('trn3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    const tg = x.createLinearGradient(1, 19, 1, 29);
    tg.addColorStop(0, '#444'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(1, 19, 30, 10);
    x.fillStyle = '#555';
    for (let i = 0; i < 7; i++) x.fillRect(3+i*4, 20, 2.5, 8);
    // Large hull
    const hg = x.createLinearGradient(2, 8, 30, 20);
    hg.addColorStop(0, c.accent); hg.addColorStop(0.5, c.main); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(2, 8, 28, 13);
    // Cargo bay door lines
    x.strokeStyle = c.dark; x.lineWidth = 0.5;
    x.beginPath(); x.moveTo(16, 8); x.lineTo(16, 21); x.stroke();
    // Faction emblem
    x.fillStyle = c.accent; x.beginPath(); x.arc(16, 14, 3, 0, Math.PI*2); x.fill();
    x.fillStyle = c.dark; x.fillRect(14.5, 12.5, 3, 3);
  });
}

// ===== COMMANDO SPRITE =====
function spriteCommando(team) {
  const c = teamColors(team);
  return cachedSprite('cmd3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.15)';
    x.beginPath(); x.ellipse(16, 28, 6, 2, 0, 0, Math.PI*2); x.fill();
    x.fillStyle = '#2a2a2a'; x.fillRect(12, 22, 3, 7); x.fillRect(17, 22, 3, 7);
    // Dark stealth suit
    const bg = x.createLinearGradient(10, 12, 22, 24);
    bg.addColorStop(0, '#333'); bg.addColorStop(1, '#111');
    x.fillStyle = bg;
    x.beginPath(); x.moveTo(10, 24); x.lineTo(10, 14); x.quadraticCurveTo(16, 11, 22, 14); x.lineTo(22, 24); x.closePath(); x.fill();
    // Faction accent stripe
    x.fillStyle = c.light; x.fillRect(10, 17, 12, 1.5);
    // Head with mask
    x.fillStyle = '#222'; x.beginPath(); x.arc(16, 10, 5, 0, Math.PI*2); x.fill();
    // Glowing eyes
    x.fillStyle = c.light; x.fillRect(13, 9, 2, 1.5); x.fillRect(17, 9, 2, 1.5);
    // Blade
    x.fillStyle = '#ccc'; x.save(); x.translate(22, 16); x.rotate(-0.5);
    x.fillRect(0, -0.5, 9, 1.5); x.restore();
    x.fillStyle = '#fff'; x.fillRect(29, 13, 1, 2);
  });
}

function spriteMCV(team) {
  const c = teamColors(team);
  return cachedSprite('mcv3d_'+team, 32, 32, (x,w,h) => {
    x.fillStyle = 'rgba(0,0,0,0.25)';
    x.beginPath(); x.ellipse(16, 28, 13, 3, 0, 0, Math.PI*2); x.fill();
    // Tracks
    const tg = x.createLinearGradient(2, 20, 2, 29);
    tg.addColorStop(0, '#555'); tg.addColorStop(1, '#222');
    x.fillStyle = tg; x.fillRect(2, 20, 28, 9);
    x.fillStyle = '#666';
    for (let i = 0; i < 7; i++) x.fillRect(3+i*4, 21, 2.5, 7);
    // Hull
    const hg = x.createLinearGradient(3, 8, 29, 22);
    hg.addColorStop(0, c.accent); hg.addColorStop(0.5, c.main); hg.addColorStop(1, c.dark);
    x.fillStyle = hg; x.fillRect(3, 8, 26, 14);
    // Crane/deploy arm
    x.fillStyle = '#aaa'; x.fillRect(20, 2, 2, 10);
    x.fillStyle = '#888'; x.fillRect(14, 2, 8, 3);
    // HQ symbol
    x.fillStyle = '#ffcc00'; x.font = '8px sans-serif'; x.fillText('HQ', 7, 18);
    // Glow
    x.fillStyle = c.glow;
    x.beginPath(); x.arc(16, 16, 10, 0, Math.PI*2); x.fill();
  });
}

// ===== EFFECTS (kept from previous version) =====
const particles = [];
let screenShakeX = 0, screenShakeY = 0, screenShakeLife = 0;
function shake(i) { screenShakeLife = Math.max(screenShakeLife, i); }
function updateScreenShake() {
  if (screenShakeLife > 0) {
    screenShakeX = (Math.random()-0.5)*screenShakeLife*2;
    screenShakeY = (Math.random()-0.5)*screenShakeLife*2;
    screenShakeLife *= 0.85;
    if (screenShakeLife < 0.3) { screenShakeLife=0; screenShakeX=0; screenShakeY=0; }
  }
}
function spawnExplosion(wx, wy, size) {
  shake(Math.min(size*0.4, 8));
  if (typeof sfxExplosion === 'function') sfxExplosion(wx, wy);
  particles.push({x:wx,y:wy,vx:0,vy:0,life:15,maxLife:15,size:2,color:'#fff',type:'shockwave'});
  particles.push({x:wx,y:wy,vx:0,vy:0,life:6,maxLife:6,size:size*0.8,color:'#fff',type:'flash'});
  for (let i=0;i<size;i++){const a=Math.random()*Math.PI*2,s=0.3+Math.random()*2.5;particles.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.5,life:12+Math.random()*20,maxLife:32,size:1.5+Math.random()*3.5,color:['#ff6600','#ffcc00','#ff3300','#ffaa00','#ffe060'][Math.random()*5|0],type:'fire'});}
  for (let i=0;i<size*0.8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;particles.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:8+Math.random()*12,maxLife:20,size:0.5+Math.random()*1.5,color:Math.random()>0.5?'#ffee88':'#fff',type:'spark'});}
  for (let i=0;i<size*0.3;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*3;particles.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,life:20+Math.random()*20,maxLife:40,size:2+Math.random()*3,color:['#555','#777','#443'][Math.random()*3|0],type:'debris',gravity:0.08});}
  for (let i=0;i<size*0.6;i++){particles.push({x:wx+(Math.random()-0.5)*0.5,y:wy+(Math.random()-0.5)*0.5,vx:(Math.random()-0.5)*0.8,vy:-0.3-Math.random()*1.2,life:35+Math.random()*25,maxLife:60,size:2+Math.random()*4,color:Math.random()>0.5?'#444':'#666',type:'smoke'});}
}
function spawnMuzzleFlash(wx,wy,tx,ty){const dx=tx-wx,dy=ty-wy,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len;for(let i=0;i<4;i++)particles.push({x:wx+nx*i*0.1,y:wy+ny*i*0.1,vx:nx*(4+i*1.5),vy:ny*(4+i*1.5),life:7-i,maxLife:7,size:2.5-i*0.4,color:i===0?'#fff':i===1?'#ffee66':'#ffaa00',type:'tracer'});particles.push({x:wx,y:wy,vx:0,vy:0,life:3,maxLife:3,size:6,color:'#ffff88',type:'flash'});for(let i=0;i<3;i++)particles.push({x:wx,y:wy,vx:nx*2+(Math.random()-0.5)*2,vy:ny*2+(Math.random()-0.5)*2,life:4+Math.random()*4,maxLife:8,size:0.8,color:'#ffcc44',type:'spark'});}
function spawnTeslaArc(wx,wy,tx,ty){const s=6,dx=(tx-wx)/s,dy=(ty-wy)/s;for(let i=0;i<=s;i++){const jx=(Math.random()-0.5)*0.4,jy=(Math.random()-0.5)*0.4;particles.push({x:wx+dx*i+jx,y:wy+dy*i+jy,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,life:8+Math.random()*6,maxLife:14,size:1.5+Math.random()*2,color:Math.random()>0.3?'#88ccff':'#ffffff',type:'tesla'});}particles.push({x:tx,y:ty,vx:0,vy:0,life:8,maxLife:8,size:8,color:'#aaddff',type:'flash'});shake(2);}
function spawnCryoEffect(wx,wy){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,s=0.5+Math.random()*1.5;particles.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.3,life:15+Math.random()*15,maxLife:30,size:1+Math.random()*2.5,color:['#88ddff','#aaeeff','#ccf4ff','#ffffff'][Math.random()*4|0],type:'cryo'});}particles.push({x:wx,y:wy,vx:0,vy:-0.3,life:20,maxLife:20,size:5,color:'#ccf4ff',type:'crystal'});}
function spawnSplashRing(wx,wy,r){for(let i=0;i<16;i++){const a=(i/16)*Math.PI*2;particles.push({x:wx+Math.cos(a)*r*0.3,y:wy+Math.sin(a)*r*0.3,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:12,maxLife:12,size:2,color:'#ff8844',type:'ring'});}shake(3);}
function spawnHealEffect(wx,wy){for(let i=0;i<8;i++)particles.push({x:wx+(Math.random()-0.5)*0.6,y:wy+0.3,vx:(Math.random()-0.5)*0.3,vy:-0.8-Math.random()*0.8,life:20+Math.random()*15,maxLife:35,size:1+Math.random()*2,color:['#44ff88','#88ffaa','#aaffcc','#ffffff'][Math.random()*4|0],type:'heal'});particles.push({x:wx,y:wy-0.3,vx:0,vy:-0.5,life:25,maxLife:25,size:4,color:'#44ff88',type:'plus'});}
function spawnDamageSmoke(wx,wy){particles.push({x:wx+(Math.random()-0.5)*0.5,y:wy,vx:(Math.random()-0.5)*0.3,vy:-0.4-Math.random()*0.6,life:30+Math.random()*20,maxLife:50,size:2+Math.random()*3,color:Math.random()>0.6?'#333':'#555',type:'smoke'});}
function spawnDigEffect(wx,wy){for(let i=0;i<4;i++)particles.push({x:wx,y:wy,vx:(Math.random()-0.5)*2,vy:-1-Math.random()*1.5,life:8+Math.random()*8,maxLife:16,size:1+Math.random()*1.5,color:['#c8a832','#e0c040','#aa8820'][Math.random()*3|0],type:'debris',gravity:0.1});}
function spawnMoveMarker(wx,wy){for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2;particles.push({x:wx+Math.cos(a)*0.4,y:wy+Math.sin(a)*0.4,vx:Math.cos(a)*0.5,vy:Math.sin(a)*0.5,life:15,maxLife:15,size:1.5,color:'#44ff44',type:'ring'});}}
function spawnAttackMarker(wx,wy){for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2;particles.push({x:wx+Math.cos(a)*0.4,y:wy+Math.sin(a)*0.4,vx:Math.cos(a)*0.5,vy:Math.sin(a)*0.5,life:15,maxLife:15,size:1.5,color:'#ff4444',type:'ring'});}}

function updateParticles(){
  // Cap particles to prevent lag during heavy combat
  if(particles.length>500){particles.splice(0,particles.length-400);}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx/TILE;p.y+=p.vy/TILE;if(p.type==='smoke'){p.vx*=0.94;p.vy*=0.97;}if(p.type==='fire'){p.vy-=0.04;p.vx*=0.97;}if(p.type==='spark'){p.vx*=0.92;p.vy*=0.92;}if(p.type==='cryo'){p.vy-=0.01;p.vx*=0.96;}if(p.type==='heal')p.vx*=0.95;if(p.gravity)p.vy+=p.gravity;p.life--;if(p.life<=0)particles.splice(i,1);}updateScreenShake();
}

function drawParticles(){for(const p of particles){const sx=p.x*TILE-camX+screenShakeX,sy=p.y*TILE-camY+screenShakeY;
if(sx<-50||sy<-50||sx>screenW+50||sy>screenH+50)continue;
const alpha=Math.max(0,p.life/p.maxLife);
if(p.type==='shockwave'){const e=(1-alpha)*TILE*3;ctx.globalAlpha=alpha*0.5;ctx.strokeStyle='#fff';ctx.lineWidth=2*alpha;ctx.beginPath();ctx.arc(sx,sy,e,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=alpha*0.3;ctx.strokeStyle='#ffaa44';ctx.beginPath();ctx.arc(sx,sy,e*0.7,0,Math.PI*2);ctx.stroke();continue;}
if(p.type==='flash'){const sz=p.size*(1+(1-alpha)*2);ctx.globalAlpha=alpha*0.15;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,sz*4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha*0.4;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,sz*2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();continue;}
if(p.type==='tesla'){ctx.globalAlpha=alpha*0.8;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,p.size*alpha,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha*0.3;ctx.fillStyle='#88ccff';ctx.beginPath();ctx.arc(sx,sy,p.size*3,0,Math.PI*2);ctx.fill();continue;}
if(p.type==='crystal'){ctx.globalAlpha=alpha*0.7;ctx.fillStyle=p.color;const sz=p.size*alpha;ctx.beginPath();ctx.moveTo(sx,sy-sz);ctx.lineTo(sx+sz*0.6,sy);ctx.lineTo(sx,sy+sz);ctx.lineTo(sx-sz*0.6,sy);ctx.closePath();ctx.fill();ctx.globalAlpha=alpha*0.2;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx,sy,sz*2,0,Math.PI*2);ctx.fill();continue;}
if(p.type==='plus'){ctx.globalAlpha=alpha*0.8;ctx.fillStyle=p.color;const sz=p.size*alpha;ctx.fillRect(sx-sz*0.15,sy-sz*0.5,sz*0.3,sz);ctx.fillRect(sx-sz*0.5,sy-sz*0.15,sz,sz*0.3);continue;}
if(p.type==='ring'){ctx.globalAlpha=alpha*0.7;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,p.size*alpha,0,Math.PI*2);ctx.fill();continue;}
if(p.type==='dmgnum'){ctx.globalAlpha=alpha;ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('-'+p.dmg,sx,sy);ctx.textAlign='start';continue;}
let sz=p.size;if(p.type==='smoke')sz*=(1+(1-alpha)*2.5);else if(p.type==='spark')sz*=alpha;else if(p.type==='fire')sz*=(0.3+alpha*0.7);else sz*=alpha;
ctx.globalAlpha=p.type==='smoke'?alpha*0.35:alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,Math.max(0.5,sz),0,Math.PI*2);ctx.fill();
if(p.type==='fire'||p.type==='spark'||p.type==='cryo'||p.type==='heal'){ctx.globalAlpha=alpha*0.15;ctx.beginPath();ctx.arc(sx,sy,sz*2.5,0,Math.PI*2);ctx.fill();}}ctx.globalAlpha=1;}

// ===== SPRITE GETTERS =====
function getBuildingSprite(type, team) {
  const fid = team === 0 && playerFaction ? playerFaction.id : (team === 1 && enemyFaction ? enemyFaction.id : '');
  const key = 'b3d_'+type+'_'+team+'_'+fid;
  if (spriteCache[key]) return spriteCache[key];
  let s;
  switch(type) {
    case 'hq': s=spriteHQ(team); break;
    case 'barracks': s=spriteBarracks(team); break;
    case 'refinery': s=spriteRefinery(team); break;
    case 'turret': s=spriteTurret(team); break;
    case 'factory': s=spriteFactory(team); break;
    case 'powerplant': s=spritePowerPlant(team); break;
    case 'superweapon': s=spriteSuperweapon(team); break;
    case 'techlab': s=spriteGenericBuilding(team,'LAB'); break;
    case 'wall': s=spriteGenericBuilding(team,'▓'); break;
    case 'radar': s=spriteGenericBuilding(team,'📡'); break;
    case 'helipad': s=spriteGenericBuilding(team,'✈'); break;
    default: s=spriteGenericBuilding(team,type.slice(0,3).toUpperCase()); break;
  }
  spriteCache[key]=s; return s;
}
function getUnitSprite(type, team) {
  const fid = team === 0 && playerFaction ? playerFaction.id : (team === 1 && enemyFaction ? enemyFaction.id : '');
  const defs = team === 0 ? (typeof DEFS !== 'undefined' ? DEFS : null) : (typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS : null);
  const def = defs ? defs[type] : null;
  const icon = def ? def.icon : (type === 'mcv' ? '🚛' : '');
  const key = 'ufancy2_'+type+'_'+team+'_'+fid;
  if (spriteCache[key]) return spriteCache[key];
  const c = teamColors(team);
  const isInf = ['soldier','medic','engineer','sniper','commando','saboteur','hero'].includes(type);
  const isVeh = ['tank','artillery','flamer','transport','support','special','elite','harvester','mcv'].includes(type);
  const isAir = ['air','bomber'].includes(type) || (def && def.flying);
  const isNav = ['gunboat','battleship'].includes(type);
  const isScout = type === 'scout';
  const s = cachedSprite(key, 32, 32, (x) => {
    x.fillStyle = 'rgba(0,0,0,0.18)';
    x.beginPath(); x.ellipse(16, isAir?30:28, isVeh||isNav?12:8, 2.5, 0, 0, Math.PI*2); x.fill();
    if (isInf) {
      x.fillStyle='#333'; x.fillRect(11,22,3,7); x.fillRect(18,22,3,7);
      var bg=x.createLinearGradient(9,12,23,24); bg.addColorStop(0,c.light); bg.addColorStop(0.6,c.main); bg.addColorStop(1,c.dark);
      x.fillStyle=bg; x.beginPath(); x.moveTo(9,24); x.lineTo(10,13); x.quadraticCurveTo(16,9,22,13); x.lineTo(23,24); x.closePath(); x.fill();
      x.fillStyle=c.accent; x.fillRect(10,18,12,2);
      var hg=x.createRadialGradient(14,8,0,16,10,5); hg.addColorStop(0,'#ffe0a0'); hg.addColorStop(1,'#cc9050');
      x.fillStyle=hg; x.beginPath(); x.arc(16,9,5,0,Math.PI*2); x.fill();
      x.fillStyle=c.main; x.beginPath(); x.arc(16,8,5.5,Math.PI,0); x.fill();
      x.fillStyle='#fff'; x.fillRect(13.5,8.5,2,1.5); x.fillRect(17,8.5,2,1.5);
      x.fillStyle='#111'; x.fillRect(14.5,9,1,1); x.fillRect(18,9,1,1);
      if(type==='sniper'){x.fillStyle='#555';x.fillRect(22,9,10,1.5);x.fillStyle=c.light;x.beginPath();x.arc(28,8.5,1.5,0,Math.PI*2);x.fill();}
      else if(type==='commando'){x.fillStyle='#ccc';x.save();x.translate(23,15);x.rotate(-0.5);x.fillRect(0,-0.5,8,1.5);x.restore();}
      else if(type==='medic'){x.fillStyle='#f33';x.fillRect(13,15,6,2);x.fillRect(15,13,2,6);}
      else if(type==='engineer'){x.fillStyle='#888';x.fillRect(22,15,6,2);x.fillStyle='#aaa';x.beginPath();x.arc(28,16,2,0,Math.PI*2);x.fill();}
      else if(type==='hero'){x.fillStyle='#ffd700';x.beginPath();for(var i=0;i<5;i++){var a=-Math.PI/2+i*Math.PI*2/5;x[i===0?'moveTo':'lineTo'](26+Math.cos(a)*3,8+Math.sin(a)*3);x.lineTo(26+Math.cos(a+Math.PI/5)*1.3,8+Math.sin(a+Math.PI/5)*1.3);}x.closePath();x.fill();}
      else{x.fillStyle='#555';x.fillRect(22,13,8,2);x.fillStyle='#777';x.fillRect(28,12,2,4);}
    } else if(isVeh) {
      var tg=x.createLinearGradient(2,20,2,29);tg.addColorStop(0,'#555');tg.addColorStop(1,'#222');
      x.fillStyle=tg;x.fillRect(2,20,28,9);x.fillStyle='#666';for(var i=0;i<7;i++)x.fillRect(3+i*4,21,2.5,7);
      var hg=x.createLinearGradient(3,9,29,22);hg.addColorStop(0,c.accent);hg.addColorStop(0.5,c.main);hg.addColorStop(1,c.dark);
      x.fillStyle=hg;
      if(type==='transport'||type==='harvester'||type==='mcv'){x.fillRect(2,8,28,14);x.strokeStyle=c.dark;x.lineWidth=0.5;x.beginPath();x.moveTo(16,8);x.lineTo(16,22);x.stroke();}
      else x.fillRect(3,10,26,12);
      if(type!=='transport'&&type!=='harvester'&&type!=='mcv'&&type!=='support'){
        var sg=x.createRadialGradient(14,12,0,16,14,7);sg.addColorStop(0,c.accent);sg.addColorStop(1,c.dark);
        x.fillStyle=sg;x.beginPath();x.arc(16,14,6,0,Math.PI*2);x.fill();
        x.fillStyle='#777';
        if(type==='artillery'){x.save();x.translate(20,12);x.rotate(-0.3);x.fillRect(0,-1,12,2.5);x.restore();}
        else if(type==='flamer'){x.fillRect(22,12,8,3);var fg=x.createRadialGradient(30,13.5,0,30,13.5,4);fg.addColorStop(0,'#ff4');fg.addColorStop(0.5,'#f80');fg.addColorStop(1,'rgba(255,0,0,0)');x.fillStyle=fg;x.beginPath();x.arc(30,13.5,4,0,Math.PI*2);x.fill();}
        else x.fillRect(20,12,10,2.5);
      }
      if(type==='elite'||type==='hero'||type==='special'){x.fillStyle='#ffd700';x.beginPath();x.arc(16,14,3,0,Math.PI*2);x.fill();}
    } else if(isAir) {
      var py=-3;
      x.fillStyle=c.main;x.beginPath();x.moveTo(16,6+py);x.lineTo(2,18+py);x.lineTo(8,20+py);x.lineTo(16,14+py);x.lineTo(24,20+py);x.lineTo(30,18+py);x.closePath();x.fill();
      var bg=x.createLinearGradient(12,4+py,20,24+py);bg.addColorStop(0,c.light);bg.addColorStop(1,c.dark);
      x.fillStyle=bg;x.beginPath();x.moveTo(16,2+py);x.lineTo(20,10+py);x.lineTo(19,22+py);x.lineTo(13,22+py);x.lineTo(12,10+py);x.closePath();x.fill();
      x.fillStyle='#aaddff';x.beginPath();x.ellipse(16,8+py,2.5,3,0,0,Math.PI*2);x.fill();
      x.fillStyle='#ff8800';x.beginPath();x.ellipse(14,23+py,1.5,3,0,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(18,23+py,1.5,3,0,0,Math.PI*2);x.fill();
    } else if(isNav) {
      x.fillStyle=c.dark;x.beginPath();x.moveTo(4,18);x.lineTo(16,8);x.lineTo(28,18);x.lineTo(26,24);x.lineTo(6,24);x.closePath();x.fill();
      x.fillStyle=c.main;x.fillRect(8,16,16,6);x.fillStyle=c.light;x.fillRect(12,12,8,6);
      x.fillStyle='#777';x.fillRect(18,10,8,2);
      x.strokeStyle='rgba(100,180,255,0.4)';x.lineWidth=1;x.beginPath();x.moveTo(2,24);x.quadraticCurveTo(16,28,30,24);x.stroke();
    } else if(isScout) {
      x.fillStyle='#333';x.beginPath();x.arc(8,26,4,0,Math.PI*2);x.fill();x.beginPath();x.arc(24,26,4,0,Math.PI*2);x.fill();
      x.fillStyle='#555';x.beginPath();x.arc(8,26,2.5,0,Math.PI*2);x.fill();x.beginPath();x.arc(24,26,2.5,0,Math.PI*2);x.fill();
      var bg=x.createLinearGradient(4,12,28,24);bg.addColorStop(0,c.light);bg.addColorStop(1,c.dark);
      x.fillStyle=bg;x.beginPath();x.moveTo(6,24);x.lineTo(4,16);x.lineTo(10,12);x.lineTo(22,12);x.lineTo(28,16);x.lineTo(26,24);x.closePath();x.fill();
      x.fillStyle='#aaddff';x.fillRect(12,13,8,4);x.fillStyle=c.accent;x.fillRect(6,20,20,2);
    }
    if(icon){x.font='10px serif';x.textAlign='center';x.textBaseline='middle';x.fillText(icon,26,6);}
    x.fillStyle=team===0?'#44ff44':'#ff4444';x.beginPath();x.arc(4,4,2.5,0,Math.PI*2);x.fill();
  });
  spriteCache[key]=s; return s;
}
