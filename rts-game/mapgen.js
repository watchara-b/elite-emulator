// ===== MAP GENERATOR WITH 10 PRESETS =====
// Tiles: 0=grass, 1=ore, 2=water, 3=forest, 4=cliff, 5=sand, 6=deepwater, 7=road, 8=flowers
if (typeof rng !== 'function') { var rng = Math.random; }

// --- Shared helpers ---
function _mkNoise(seed) {
  function hash(x, y) {
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  }
  function smooth(x, y, s) {
    const ix = Math.floor(x / s), iy = Math.floor(y / s);
    const fx = x / s - ix, fy = y / s - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a*(1-u)*(1-v) + b*u*(1-v) + c*(1-u)*v + d*u*v;
  }
  function noise(x, y) { return smooth(x,y,12)*.5 + smooth(x,y,6)*.3 + smooth(x,y,3)*.2; }
  return { hash, smooth, noise };
}

function _clearStarts(map, W, H) {
  var sz = Math.max(10, Math.floor(Math.min(W, H) * 0.12));
  // Clear player spawn (top-left) — keep ore tiles intact
  for (let y = 0; y < sz; y++) for (let x = 0; x < sz+2; x++) {
    if (y<H&&x<W && map[y][x] !== 1) map[y][x] = 0;
  }
  // Clear enemy spawn (bottom-right) — keep ore tiles intact
  for (let y = H-sz; y < H; y++) for (let x = W-sz-2; x < W; x++) {
    if (y>=0&&x>=0 && map[y][x] !== 1) map[y][x] = 0;
  }
  // Clear blocking terrain on path to ore patches (cols sz+2 through 17)
  for (let y = 0; y < sz; y++) for (let x = sz+2; x <= 17; x++) {
    if (y<H&&x<W) { var t = map[y][x]; if (t===2||t===4||t===6) map[y][x] = 0; }
  }
  for (let y = H-sz; y < H; y++) for (let x = W-18; x < W-sz-2; x++) {
    if (y>=0&&x>=0&&x<W) { var t = map[y][x]; if (t===2||t===4||t===6) map[y][x] = 0; }
  }
}

function _placeOre(map, W, H) {
  // Ore near each start — close enough for harvesters to reach quickly
  var patches = [
    // Player near (within clear zone)
    [4,8],[4,9],[5,8],[5,9],[5,10],
    // Player expansion ore (slightly further)
    [6,14],[6,15],[7,14],[7,15],[7,16],
    // Enemy near (within clear zone)
    [H-5,W-10],[H-5,W-9],[H-6,W-10],[H-6,W-9],[H-6,W-11],
    // Enemy expansion ore
    [H-7,W-16],[H-7,W-15],[H-6,W-16],[H-6,W-15],[H-6,W-14],
    // Mid-map contested ore
    [Math.floor(H*0.4),Math.floor(W*0.45)],[Math.floor(H*0.4),Math.floor(W*0.45)+1],
    [Math.floor(H*0.4)+1,Math.floor(W*0.45)],[Math.floor(H*0.4)+1,Math.floor(W*0.45)+1],
    [Math.floor(H*0.6),Math.floor(W*0.55)],[Math.floor(H*0.6),Math.floor(W*0.55)+1],
    [Math.floor(H*0.6)+1,Math.floor(W*0.55)],[Math.floor(H*0.6)+1,Math.floor(W*0.55)+1],
    // Extra side patches
    [Math.floor(H*0.3),Math.floor(W*0.2)],[Math.floor(H*0.3)+1,Math.floor(W*0.2)],
    [Math.floor(H*0.7),Math.floor(W*0.8)],[Math.floor(H*0.7)+1,Math.floor(W*0.8)],
  ];
  for (var p of patches) { if(p[0]>=0&&p[0]<H&&p[1]>=0&&p[1]<W) map[p[0]][p[1]] = 1; }
}

function _initMap(map, W, H, tile) {
  for (let y = 0; y < H; y++) { map[y] = []; for (let x = 0; x < W; x++) map[y][x] = tile || 0; }
}

function _dist(x1, y1, x2, y2) { return Math.sqrt((x1-x2)**2 + (y1-y2)**2); }

// --- 10 Map Presets ---
const MAP_PRESETS = [
  // 0: Twin Rivers
  { id:'twin_rivers', name:'Twin Rivers', desc:'Two parallel rivers split the map into 3 lanes with bridges',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y), m = smooth(x+100, y+100, 10);
        if (m > .6 && n > .4 && n < .65) map[y][x] = 3;
        else if (n > .72) map[y][x] = 4;
        else if (m > .55 && n > .38 && n < .42) map[y][x] = 8;
      }
      // Two rivers at 1/3 and 2/3
      const r1 = Math.floor(W/3), r2 = Math.floor(2*W/3);
      for (let y = 0; y < H; y++) {
        for (const rx of [r1, r2]) {
          const drift = Math.round(Math.sin(y*.15+s)*2);
          const cx = rx + drift;
          for (let dx = -1; dx <= 1; dx++) { const xx = cx+dx; if (xx>=0&&xx<W) map[y][xx] = Math.abs(dx)<1?6:2; }
          for (const bx of [cx-2, cx+2]) if (bx>=0&&bx<W&&map[y][bx]===0) map[y][bx] = 5;
        }
      }
      // Bridges at 1/4, 1/2, 3/4 height
      for (const by of [Math.floor(H*.25), Math.floor(H*.5), Math.floor(H*.75)]) {
        for (const rx of [r1, r2]) {
          const drift = Math.round(Math.sin(by*.15+s)*2);
          for (let dx = -2; dx <= 2; dx++) { const xx = rx+drift+dx; if (xx>=0&&xx<W) map[by][xx] = 7; }
        }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 1: Desert Oasis
  { id:'desert_oasis', name:'Desert Oasis', desc:'Vast desert with a contested oasis in the center',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H, 5);
      const cx = W/2, cy = H/2;
      // Oasis in center
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = _dist(x, y, cx, cy);
        if (d < 4) map[y][x] = 6;
        else if (d < 6) map[y][x] = 2;
        else if (d < 9) map[y][x] = 0;
        else if (d < 11 && hash(x,y) > .5) map[y][x] = 3;
        else {
          const n = noise(x, y);
          if (n > .75) map[y][x] = 4;
          else if (n > .65 && hash(x,y) > .6) map[y][x] = 1;
        }
      }
      // Ore ring around oasis
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = _dist(x, y, cx, cy);
        if (d > 6 && d < 8 && hash(x+5,y+5) > .7) map[y][x] = 1;
      }
      // Roads from corners toward center
      for (let i = 0; i < Math.min(W,H)/2; i++) {
        const t = i / (Math.min(W,H)/2);
        for (const [sx,sy] of [[0,0],[W-1,H-1]]) {
          const rx = Math.round(sx + (cx-sx)*t), ry = Math.round(sy + (cy-sy)*t);
          if (rx>=0&&rx<W&&ry>=0&&ry<H&&map[ry][rx]!==2&&map[ry][rx]!==6) map[ry][rx] = 7;
        }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 2: Frozen Peaks
  { id:'frozen_peaks', name:'Frozen Peaks', desc:'Snowy mountains with narrow passes between cliffs',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y), m = smooth(x+50,y+50,8);
        if (n > .55) map[y][x] = 4;
        else if (n > .45 && m > .5) map[y][x] = 2; // frozen pools
        else if (n > .40) map[y][x] = 5; // snow (sand tile)
        else if (hash(x,y) > .92) map[y][x] = 1;
      }
      // Carve winding pass through middle
      let py = 0;
      for (let x = 0; x < W; x++) {
        py = Math.max(2, Math.min(H-3, Math.floor(H/2 + Math.sin(x*.2+s)*6)));
        for (let dy = -1; dy <= 1; dy++) if (py+dy>=0&&py+dy<H) map[py+dy][x] = 0;
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 3: Jungle Maze
  { id:'jungle_maze', name:'Jungle Maze', desc:'Dense jungle with winding paths, perfect for ambushes',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H, 3); // all forest
      // Carve maze-like paths
      const visited = [];
      for (let y = 0; y < H; y++) { visited[y] = []; for (let x = 0; x < W; x++) visited[y][x] = false; }
      // Carve several random walks
      for (let p = 0; p < 8; p++) {
        let cx = (hash(p,0)*W)|0, cy = (hash(0,p)*H)|0;
        for (let step = 0; step < 120; step++) {
          for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
            const nx=cx+dx, ny=cy+dy;
            if (nx>=0&&nx<W&&ny>=0&&ny<H) map[ny][nx] = hash(nx+step,ny)>.92 ? 8 : 0;
          }
          const dir = (hash(cx+step, cy+step)*4)|0;
          cx += [1,-1,0,0][dir]; cy += [0,0,1,-1][dir];
          cx = Math.max(0, Math.min(W-1, cx)); cy = Math.max(0, Math.min(H-1, cy));
        }
      }
      // Scatter ore in jungle
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (map[y][x]===3 && hash(x+7,y+7)>.93) map[y][x] = 1;
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 4: Island Chains
  { id:'island_chains', name:'Island Chains', desc:'Small islands connected by narrow bridges',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H, 6); // all deep water
      // Place islands
      const islands = [];
      for (let i = 0; i < 9; i++) {
        const ix = Math.floor((i%3+.5)*W/3), iy = Math.floor(((i/3|0)+.5)*H/3);
        const r = 4 + (hash(i,i)*3|0);
        islands.push({x:ix, y:iy, r});
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const d = _dist(x, y, ix, iy);
          if (d < r-1) { if (map[y][x]===6) map[y][x] = hash(x,y)>.8?3:0; }
          else if (d < r) map[y][x] = 5;
          else if (d < r+1 && map[y][x]===6) map[y][x] = 2;
        }
      }
      // Connect adjacent islands with bridges
      for (let i = 0; i < islands.length; i++) for (let j = i+1; j < islands.length; j++) {
        if (_dist(islands[i].x,islands[i].y,islands[j].x,islands[j].y) > W/2) continue;
        const steps = 60;
        for (let t = 0; t <= steps; t++) {
          const x = Math.round(islands[i].x + (islands[j].x-islands[i].x)*t/steps);
          const y = Math.round(islands[i].y + (islands[j].y-islands[i].y)*t/steps);
          if (x>=0&&x<W&&y>=0&&y<H&&(map[y][x]===6||map[y][x]===2)) map[y][x] = 7;
        }
      }
      // Ore on islands
      for (const isl of islands) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x=isl.x+dx, y=isl.y+dy;
          if (x>=0&&x<W&&y>=0&&y<H&&hash(x+3,y+3)>.6) map[y][x] = 1;
        }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 5: Volcanic Rift
  { id:'volcanic_rift', name:'Volcanic Rift', desc:'Lava rift through the center, rich in ore but dangerous',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y);
        if (n > .7) map[y][x] = 4;
        else if (n > .55 && hash(x,y)>.5) map[y][x] = 1;
        else if (hash(x+3,y+3)>.88) map[y][x] = 3;
      }
      // Lava rift (diagonal from top-center to bottom-center)
      for (let y = 0; y < H; y++) {
        const cx = Math.floor(W/2 + Math.sin(y*.2+s)*4);
        for (let dx = -2; dx <= 2; dx++) {
          const xx = cx+dx;
          if (xx>=0&&xx<W) map[y][xx] = Math.abs(dx)<2 ? 6 : 2; // deep=lava, shallow=edge
        }
        // Ore veins along rift
        for (const ox of [cx-4, cx-3, cx+3, cx+4])
          if (ox>=0&&ox<W&&hash(ox,y)>.6) map[y][ox] = 1;
      }
      // Two crossing bridges
      for (const by of [Math.floor(H*.33), Math.floor(H*.67)]) {
        const cx = Math.floor(W/2 + Math.sin(by*.2+s)*4);
        for (let dx = -3; dx <= 3; dx++) { const xx=cx+dx; if (xx>=0&&xx<W) map[by][xx] = 7; }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 6: Plains War
  { id:'plains_war', name:'Plains War', desc:'Wide open plains with minimal cover, favors fast aggression',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y);
        if (n > .42 && n < .48) map[y][x] = 8;
        else if (hash(x,y) > .96) map[y][x] = 3;
      }
      // Scattered small ore deposits
      for (let i = 0; i < 12; i++) {
        const ox = (hash(i,0)*W)|0, oy = (hash(0,i)*H)|0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++)
          if (oy+dy<H&&ox+dx<W) map[oy+dy][ox+dx] = 1;
      }
      // A single road across
      for (let x = 0; x < W; x++) {
        const yy = Math.floor(H/2 + Math.sin(x*.08+s)*2);
        if (yy>=0&&yy<H) map[yy][x] = 7;
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 7: Canyon Pass
  { id:'canyon_pass', name:'Canyon Pass', desc:'Narrow canyon forces combat through tight chokepoints',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H, 4); // all cliff
      // Carve canyon from top-left to bottom-right
      for (let t = 0; t <= 200; t++) {
        const frac = t/200;
        const cx = Math.floor(frac*W);
        const cy = Math.floor(frac*H + Math.sin(frac*8+s)*4);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) {
          const x=cx+dx, y=cy+dy;
          if (x>=0&&x<W&&y>=0&&y<H) {
            if (Math.abs(dy)===3) { if (map[y][x]===4) map[y][x] = 4; }
            else map[y][x] = hash(x,y)>.9 ? 1 : 0;
          }
        }
      }
      // Side chambers
      for (let i = 0; i < 5; i++) {
        const frac = (i+1)/6;
        const cx = Math.floor(frac*W), cy = Math.floor(frac*H + Math.sin(frac*8+s)*4);
        const dir = i%2===0 ? -1 : 1;
        for (let d = 0; d < 5; d++) {
          const y = cy + dir*d;
          if (y>=0&&y<H&&cx>=0&&cx<W) map[y][cx] = hash(cx,y)>.7 ? 1 : 0;
        }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 8: Swamplands
  { id:'swamplands', name:'Swamplands', desc:'Marshes slow movement but ore is plentiful',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y), m = smooth(x+50,y+50,8);
        if (n < .35) map[y][x] = 2;
        else if (n < .42) map[y][x] = 5;
        else if (m > .55) map[y][x] = 3;
        else if (hash(x,y) > .88) map[y][x] = 1;
        else if (n > .45 && n < .48) map[y][x] = 8;
      }
      // Extra ore patches
      for (let i = 0; i < 15; i++) {
        const ox = (hash(i,1)*W)|0, oy = (hash(1,i)*H)|0;
        if (oy<H&&ox<W) map[oy][ox] = 1;
        if (oy+1<H&&ox<W) map[oy+1][ox] = 1;
      }
      // Winding raised paths
      for (let p = 0; p < 3; p++) {
        let cx = (hash(p,9)*W)|0, cy = (hash(9,p)*H)|0;
        for (let step = 0; step < 80; step++) {
          if (cx>=0&&cx<W&&cy>=0&&cy<H) map[cy][cx] = 7;
          const dir = (hash(cx+step,cy+step)*4)|0;
          cx += [1,-1,0,0][dir]; cy += [0,0,1,-1][dir];
          cx = Math.max(0, Math.min(W-1, cx)); cy = Math.max(0, Math.min(H-1, cy));
        }
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  },
  // 9: Classic
  { id:'classic', name:'Classic', desc:'The original map with river, road, and mixed terrain',
    generate(map, W, H) {
      const s = rng()*9999|0, {hash, smooth, noise} = _mkNoise(s);
      _initMap(map, W, H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const n = noise(x, y), m = smooth(x+100,y+100,10);
        if (n < .22) map[y][x] = 6;
        else if (n < .30) map[y][x] = 2;
        else if (n < .34) map[y][x] = 5;
        else if (n > .78) map[y][x] = 4;
        else if (n > .70 && m > .5) map[y][x] = 1;
        else if (m > .65 && n > .40 && n < .65) map[y][x] = 3;
        else if (m > .55 && n > .38 && n < .42) map[y][x] = 8;
      }
      // River
      let rx = Math.floor(W*.4 + hash(1,1)*W*.2);
      for (let y = 0; y < H; y++) {
        const drift = Math.sin(y*.15+s)*3, cx = Math.round(rx+drift);
        for (let dx = -1; dx <= 1; dx++) { const xx=cx+dx; if (xx>=0&&xx<W) map[y][xx] = Math.abs(dx)<1?6:2; }
        for (const bx of [cx-2,cx+2]) if (bx>=0&&bx<W&&map[y][bx]===0) map[y][bx] = 5;
      }
      // Road
      for (let x = 0; x < W; x++) {
        const yy = Math.floor(H*.5) + Math.round(Math.sin(x*.1+s*.5)*2);
        if (yy>=0&&yy<H&&map[yy][x]!==2&&map[yy][x]!==6) map[yy][x] = 7;
      }
      _clearStarts(map, W, H); _placeOre(map, W, H);
    }
  }
];

let currentMapId = 0;

function generateMap(map, MAP_W, MAP_H) {
  MAP_PRESETS[currentMapId].generate(map, MAP_W, MAP_H);
}
