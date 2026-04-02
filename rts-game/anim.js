// === Per-Unit-Type Animation + Smooth Movement + Weather ===

// --- Animation State ---
function updateAnimations(ents, gt) {
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i];
    if (e.cat === 'building') continue;
    if (e._anim === undefined) {
      e._anim = 'idle'; e._at = 0; e._facing = 0;
      e._bobPhase = Math.random() * 6.28;
      e._atkFlash = 0; e._deathT = 0;
      e._legPhase = 0; e._recoil = 0;
      e._pdx = 0; e._pdy = 0;
      e._trackPhase = 0; e._rotorAngle = 0;
      e._hoverOff = 0; e._wakeTimer = 0;
    }
    var moving = false;
    if (e.lastDx !== undefined && e.lastDy !== undefined) {
      if (e.lastDx * e.lastDx + e.lastDy * e.lastDy > 0.0001 || e.moveTarget) moving = true;
      if (e.lastDx || e.lastDy) {
        var target = Math.atan2(e.lastDy, e.lastDx);
        // Smooth facing rotation
        var diff = target - e._facing;
        while (diff > Math.PI) diff -= 6.28;
        while (diff < -Math.PI) diff += 6.28;
        e._facing += diff * 0.15;
      }
      e._pdx = e.lastDx; e._pdy = e.lastDy;
    }
    var prev = e._anim;
    if (e.dead) e._anim = 'die';
    else if (e._atkFlash > 0) { e._anim = 'attack'; e._atkFlash--; }
    else if (moving) e._anim = 'walk';
    else e._anim = 'idle';
    if (prev !== e._anim && e._anim !== 'die') { e._at = 0; }
    e._at++;
    // Per-type phase updates
    if (e._anim === 'walk') {
      var d = e.getDef ? e.getDef() : null;
      var spd = d ? (d.speed || 1) : 1;
      e._legPhase += 0.2 * spd;
      e._trackPhase += 0.3 * spd;
    }
    e._rotorAngle += 0.4;
    e._hoverOff = Math.sin(gt * 0.06 + e._bobPhase) * 1.5;
    if (e._anim === 'die') e._deathT = Math.min(1, e._deathT + 0.035);
    e._recoil *= 0.75;
    e._wakeTimer++;
  }
}

function triggerAttackAnim(e) {
  if (e._anim !== undefined) { e._atkFlash = 14; e._recoil = 3.5; }
}

// --- Unit type categories ---
var _INF = {soldier:1,medic:1,engineer:1,sniper:1,commando:1,saboteur:1,hero:1};
var _VEH = {tank:1,artillery:1,flamer:1,transport:1,support:1,special:1,elite:1,harvester:1,mcv:1};
var _AIR = {air:1,bomber:1};
var _NAV = {gunboat:1,battleship:1};

// --- Main draw function ---
function drawAnimatedUnit(ctx, e, px, py, T, gt) {
  if (e.cat === 'building' || e._anim === undefined) return false;
  var st = e._anim, type = e.type;
  var fd = Math.cos(e._facing), fdy = Math.sin(e._facing);
  var sprite = getUnitSprite(type, e.team);
  if (!sprite) return false;

  // === DEATH (universal) ===
  if (st === 'die') {
    var t = e._deathT;
    if (t >= 1) return true;
    ctx.save();
    ctx.globalAlpha = (1 - t) * (1 - t);
    ctx.translate(px + T/2, py + T/2);
    ctx.rotate(t * 1.2 * (fd > 0 ? 1 : -1));
    ctx.scale(1 + t * 0.3, 1 - t * 0.4);
    ctx.translate(-(px + T/2), -(py + T/2));
    ctx.drawImage(sprite, px, py + t * 6, T, T);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (t > 0.02 && t < 0.12) {
      for (var j = 0; j < 2; j++) {
        var a = Math.random() * 6.28;
        particles.push({x:e.x+0.5,y:e.y+0.5,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5-0.8,life:15+Math.random()*10,maxLife:25,size:1.5+Math.random()*2,color:['#ff6600','#ffaa00','#ff3300','#333'][Math.random()*4|0],type:Math.random()>0.4?'fire':'debris',gravity:0.06});
      }
    }
    return true;
  }

  // === INFANTRY ===
  if (_INF[type]) {
    var bob = 0, lean = 0, stepDust = false;
    if (st === 'idle') {
      bob = Math.sin(gt * 0.07 + e._bobPhase) * 0.8;
    } else if (st === 'walk') {
      bob = Math.abs(Math.sin(e._legPhase)) * -2; // bounce up on step
      lean = fd * 0.08;
      stepDust = Math.sin(e._legPhase) > 0.95;
    } else if (st === 'attack') {
      bob = -1; // brace
    }
    // Recoil
    var rx = st === 'attack' ? -fd * e._recoil : 0;
    var ry = st === 'attack' ? -fdy * e._recoil : 0;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(px+T/2, py+T-2, 7, 2.5, 0, 0, Math.PI*2); ctx.fill();
    // Draw
    ctx.save();
    ctx.translate(px+T/2, py+T);
    ctx.rotate(lean);
    ctx.translate(-(px+T/2), -(py+T));
    ctx.drawImage(sprite, px+rx, py+bob+ry, T, T);
    ctx.restore();
    // Attack flash
    if (st === 'attack' && e._atkFlash > 10) {
      ctx.globalAlpha = (e._atkFlash - 10) / 4 * 0.3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(px+rx, py+bob+ry, T, T);
      ctx.globalAlpha = 1;
      // Muzzle glow at weapon tip
      if (type !== 'commando' && type !== 'medic') {
        var mx = px + T/2 + fd * T * 0.6, my = py + T/2 + fdy * T * 0.3;
        ctx.fillStyle = 'rgba(255,240,100,0.5)';
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI*2); ctx.fill();
      }
    }
    // Step dust
    if (stepDust) {
      particles.push({x:e.x+0.5-fd*0.2,y:e.y+0.85,vx:-fd*0.15+(Math.random()-0.5)*0.1,vy:-0.12,life:10,maxLife:10,size:1.2,color:'#b8a878',type:'smoke'});
    }
    return true;
  }

  // === VEHICLES ===
  if (_VEH[type]) {
    var tiltX = 0, tiltY = 0, trackDust = false;
    var isHover = type === 'elite';
    if (st === 'idle') {
      if (isHover) tiltY = Math.sin(gt * 0.05 + e._bobPhase) * 1;
    } else if (st === 'walk') {
      // Slight body rock from tracks
      tiltY = Math.sin(e._trackPhase * 0.5) * 0.6;
      tiltX = fd * 0.03; // lean into turn
      trackDust = (e._wakeTimer % 8 === 0);
    }
    var rx = st === 'attack' ? -fd * e._recoil * 1.5 : 0;
    var ry = st === 'attack' ? -fdy * e._recoil * 1.5 : 0;
    // Shadow (wider for vehicles)
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(px+T/2, py+T-1, 12, 3, 0, 0, Math.PI*2); ctx.fill();
    // Draw with tilt
    ctx.save();
    if (tiltX) {
      ctx.translate(px+T/2, py+T);
      ctx.rotate(tiltX);
      ctx.translate(-(px+T/2), -(py+T));
    }
    var hoverGap = isHover ? Math.sin(gt*0.05+e._bobPhase)*1.5-1 : 0;
    ctx.drawImage(sprite, px+rx, py+tiltY+ry+hoverGap, T, T);
    ctx.restore();
    // Attack: barrel flash
    if (st === 'attack' && e._atkFlash > 10) {
      var bx = px+T/2+fd*T*0.6, by = py+T*0.4+fdy*T*0.3;
      ctx.fillStyle = 'rgba(255,200,50,'+(e._atkFlash-10)/4*0.6+')';
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI*2); ctx.fill();
      // Smoke puff
      if (e._atkFlash === 13) {
        particles.push({x:e.x+0.5+fd*0.5,y:e.y+0.3,vx:fd*0.8+(Math.random()-0.5)*0.3,vy:-0.3-Math.random()*0.2,life:15,maxLife:15,size:2+Math.random(),color:'#888',type:'smoke'});
      }
    }
    // Track dust
    if (trackDust && !isHover) {
      particles.push({x:e.x+0.5-fd*0.4,y:e.y+0.9,vx:-fd*0.3+(Math.random()-0.5)*0.2,vy:-0.1,life:14,maxLife:14,size:1.5+Math.random(),color:'#a09070',type:'smoke'});
    }
    // Hover glow for elite
    if (isHover) {
      ctx.fillStyle = 'rgba(100,180,255,0.08)';
      ctx.beginPath(); ctx.ellipse(px+T/2, py+T-1, 10, 2.5, 0, 0, Math.PI*2); ctx.fill();
    }
    return true;
  }

  // === AIRCRAFT ===
  if (_AIR[type]) {
    var bankAngle = 0, hover = e._hoverOff;
    var floatH = -6; // base float height
    if (st === 'walk') {
      bankAngle = fd * 0.18; // stronger banking
      floatH = -7; // fly slightly higher when moving
    } else if (st === 'idle') {
      // Gentle figure-8 drift when hovering
      hover += Math.sin(gt * 0.03 + e._bobPhase * 2) * 0.5;
    }
    var rx = st === 'attack' ? -fd * e._recoil : 0;
    // Shadow on ground (moves with unit, smaller when higher)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(px+T/2+hover*0.3, py+T+6, 7, 1.8, 0, 0, Math.PI*2); ctx.fill();
    // Draw floating with bank + pitch
    ctx.save();
    var cy = py+T/2+hover+floatH;
    ctx.translate(px+T/2, cy);
    ctx.rotate(bankAngle);
    // Slight pitch when accelerating
    if (st === 'walk') ctx.scale(1, 0.95 + Math.abs(fdy) * 0.05);
    ctx.translate(-(px+T/2), -cy);
    ctx.drawImage(sprite, px+rx, py+hover+floatH, T, T);
    ctx.restore();
    // Engine trail (more particles, varied)
    if (st === 'walk') {
      if (e._wakeTimer % 2 === 0) {
        var ex2 = e.x+0.5-fd*0.4, ey2 = e.y+0.5-fdy*0.3;
        particles.push({x:ex2,y:ey2,vx:-fd*2+(Math.random()-0.5)*0.4,vy:-fdy*2+(Math.random()-0.5)*0.4,life:6+Math.random()*4,maxLife:10,size:1.2+Math.random()*0.8,color:'#ff8800',type:'fire'});
        if (e._wakeTimer % 4 === 0) particles.push({x:ex2,y:ey2,vx:-fd*0.8,vy:-fdy*0.8+0.2,life:12,maxLife:12,size:1.5,color:'#aaa',type:'smoke'});
      }
    } else {
      // Idle: subtle downwash
      if (e._wakeTimer % 8 === 0) particles.push({x:e.x+0.5+(Math.random()-0.5)*0.3,y:e.y+0.8,vx:(Math.random()-0.5)*0.2,vy:0.3,life:8,maxLife:8,size:1,color:'rgba(200,200,200,0.3)',type:'smoke'});
    }
    // Attack: missile/bomb
    if (st === 'attack' && e._atkFlash > 10) {
      var mx = px+T/2+fd*10, my = py+T/2+hover+floatH;
      ctx.fillStyle = 'rgba(255,150,0,'+(e._atkFlash-10)/4*0.5+')';
      ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI*2); ctx.fill();
    }
    return true;
  }

  // === NAVAL ===
  if (_NAV[type]) {
    var rock = Math.sin(gt * 0.04 + e._bobPhase) * 1.5; // wave rocking
    var rockAngle = Math.sin(gt * 0.03 + e._bobPhase) * 0.04;
    var rx = st === 'attack' ? -fd * e._recoil * 2 : 0;
    // Water shadow/reflection
    ctx.fillStyle = 'rgba(50,100,180,0.12)';
    ctx.beginPath(); ctx.ellipse(px+T/2, py+T-1, 13, 3, 0, 0, Math.PI*2); ctx.fill();
    // Draw with rocking
    ctx.save();
    ctx.translate(px+T/2, py+T);
    ctx.rotate(rockAngle);
    ctx.translate(-(px+T/2), -(py+T));
    ctx.drawImage(sprite, px+rx, py+rock, T, T);
    ctx.restore();
    // Wake trail
    if (st === 'walk' && e._wakeTimer % 6 === 0) {
      particles.push({x:e.x+0.5-fd*0.5,y:e.y+0.8,vx:-fd*0.4+(Math.random()-0.5)*0.2,vy:0.05,life:20,maxLife:20,size:1.5+Math.random(),color:'rgba(150,200,255,0.5)',type:'ring'});
    }
    // Attack: cannon blast
    if (st === 'attack' && e._atkFlash > 11) {
      var bx = px+T/2+fd*T*0.5, by = py+T*0.35+rock;
      ctx.fillStyle = 'rgba(255,220,80,0.6)';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI*2); ctx.fill();
      if (e._atkFlash === 13) {
        for (var k = 0; k < 3; k++) particles.push({x:e.x+0.5+fd*0.5,y:e.y+0.3,vx:fd+(Math.random()-0.5)*0.5,vy:-0.5-Math.random()*0.3,life:10,maxLife:10,size:2,color:'#ddd',type:'smoke'});
      }
    }
    return true;
  }

  // === SCOUT (motorcycle/buggy) ===
  if (type === 'scout') {
    var wheelSpin = st === 'walk' ? Math.sin(e._legPhase * 2) * 1 : 0;
    var lean = st === 'walk' ? fd * 0.15 : 0; // heavy lean into turns
    var rx = st === 'attack' ? -fd * e._recoil : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(px+T/2, py+T-2, 8, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.translate(px+T/2, py+T-4);
    ctx.rotate(lean);
    ctx.translate(-(px+T/2), -(py+T-4));
    ctx.drawImage(sprite, px+rx, py+wheelSpin*0.5, T, T);
    ctx.restore();
    // Speed lines when moving
    if (st === 'walk' && e._wakeTimer % 4 === 0) {
      particles.push({x:e.x+0.5-fd*0.4,y:e.y+0.7,vx:-fd*0.6,vy:(Math.random()-0.5)*0.1,life:6,maxLife:6,size:0.8,color:'#ccc',type:'smoke'});
    }
    if (st === 'attack' && e._atkFlash > 11) {
      ctx.fillStyle = 'rgba(255,200,50,0.4)';
      ctx.beginPath(); ctx.arc(px+T/2+fd*10, py+T/2, 2.5, 0, Math.PI*2); ctx.fill();
    }
    return true;
  }

  // Fallback
  ctx.drawImage(sprite, px, py, T, T);
  return true;
}

// === Per-Unit Attack VFX ===
function spawnUnitAttackFX(atk, tgt, P) {
  var ax=atk.x+0.5, ay=atk.y+0.5, tx=tgt.x+tgt.w/2, ty=tgt.y+tgt.h/2;
  var dx=tx-ax, dy=ty-ay, d=Math.hypot(dx,dy)||1, nx=dx/d, ny=dy/d;
  var i, a, s;
  var type = atk.type;

  // --- SOLDIER: rifle burst (3 tracer rounds) ---
  if (type==='soldier') {
    for(i=0;i<3;i++){var sp=0.3*i;P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:nx*(6+i),vy:ny*(6+i),life:5+i,maxLife:7,size:1.5,color:i===0?'#fff':'#ffee44',type:'tracer'});}
    P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:0,vy:0,life:3,maxLife:3,size:4,color:'#ffff88',type:'flash'});
    return;
  }
  // --- MEDIC: healing pulse (green rings) ---
  if (type==='medic') {
    for(i=0;i<6;i++){a=i/6*6.28;P.push({x:tx,y:ty,vx:Math.cos(a)*0.8,vy:Math.sin(a)*0.8,life:20,maxLife:20,size:2,color:'#44ff88',type:'heal'});}
    P.push({x:tx,y:ty-0.3,vx:0,vy:-0.4,life:20,maxLife:20,size:4,color:'#44ff88',type:'plus'});
    return;
  }
  // --- ENGINEER: spark welding ---
  if (type==='engineer') {
    for(i=0;i<5;i++)P.push({x:tx+(Math.random()-0.5)*0.3,y:ty+(Math.random()-0.5)*0.3,vx:(Math.random()-0.5)*2,vy:-1-Math.random(),life:6+Math.random()*4,maxLife:10,size:1,color:Math.random()>0.5?'#ffcc44':'#fff',type:'spark'});
    return;
  }
  // --- SNIPER: single high-velocity tracer + scope flash ---
  if (type==='sniper') {
    s=8;for(i=0;i<=s;i++){var t=i/s;P.push({x:ax+dx*t,y:ay+dy*t,vx:0,vy:0,life:4+i,maxLife:10,size:1.2,color:i===0?'#fff':'#ff4444',type:'tracer'});}
    P.push({x:ax,y:ay,vx:0,vy:0,life:2,maxLife:2,size:6,color:'#fff',type:'flash'});
    return;
  }
  // --- COMMANDO: blade slash arc ---
  if (type==='commando') {
    for(i=0;i<8;i++){a=atk._facing-0.8+i*0.2;P.push({x:ax+Math.cos(a)*0.4,y:ay+Math.sin(a)*0.4,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:6,maxLife:6,size:1.5,color:'#ccddff',type:'spark'});}
    return;
  }
  // --- SABOTEUR: electric zap ---
  if (type==='saboteur') {
    s=4;for(i=0;i<=s;i++){var t=i/s;P.push({x:ax+dx*t+(Math.random()-0.5)*0.3,y:ay+dy*t+(Math.random()-0.5)*0.3,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,life:6,maxLife:6,size:1.5,color:Math.random()>0.3?'#88ccff':'#fff',type:'tesla'});}
    return;
  }
  // --- HERO: massive energy blast ---
  if (type==='hero') {
    for(i=0;i<12;i++){a=Math.random()*6.28;P.push({x:ax,y:ay,vx:nx*4+Math.cos(a)*1.5,vy:ny*4+Math.sin(a)*1.5,life:12+Math.random()*6,maxLife:18,size:2+Math.random()*2,color:['#ffd700','#ffaa00','#fff','#ffee66'][Math.random()*4|0],type:Math.random()>0.5?'spark':'fire'});}
    P.push({x:ax,y:ay,vx:0,vy:0,life:4,maxLife:4,size:10,color:'#fff',type:'flash'});
    P.push({x:tx,y:ty,vx:0,vy:0,life:6,maxLife:6,size:8,color:'#ffd700',type:'shockwave'});
    return;
  }
  // --- TANK: cannon shot + smoke ring ---
  if (type==='tank') {
    P.push({x:ax+nx*0.5,y:ay+ny*0.5,vx:nx*8,vy:ny*8,life:4,maxLife:4,size:3,color:'#ffcc00',type:'tracer'});
    P.push({x:ax+nx*0.5,y:ay+ny*0.5,vx:0,vy:0,life:3,maxLife:3,size:6,color:'#fff',type:'flash'});
    for(i=0;i<4;i++)P.push({x:ax+nx*0.4,y:ay+ny*0.4,vx:nx*0.5+(Math.random()-0.5)*1,vy:-0.5-Math.random()*0.5,life:15+Math.random()*10,maxLife:25,size:2+Math.random()*2,color:'#777',type:'smoke'});
    return;
  }
  // --- ARTILLERY: arcing shell + ground explosion ---
  if (type==='artillery') {
    for(i=0;i<6;i++){var t=i/5;var arc=-Math.sin(t*3.14)*2;P.push({x:ax+dx*t,y:ay+dy*t+arc,vx:0,vy:0,life:3+i*2,maxLife:14,size:2-t,color:'#ffaa00',type:'tracer'});}
    for(i=0;i<8;i++){a=Math.random()*6.28;P.push({x:tx,y:ty,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5-0.5,life:12+Math.random()*8,maxLife:20,size:2+Math.random()*2,color:['#ff6600','#ffaa00','#ff3300'][Math.random()*3|0],type:'fire'});}
    P.push({x:tx,y:ty,vx:0,vy:0,life:8,maxLife:8,size:6,color:'#ff8844',type:'shockwave'});
    return;
  }
  // --- FLAMER: continuous flame stream ---
  if (type==='flamer') {
    for(i=0;i<8;i++){var t=i/7;P.push({x:ax+dx*t*0.6,y:ay+dy*t*0.6,vx:nx*2+(Math.random()-0.5)*1,vy:ny*2+(Math.random()-0.5)*1-0.3,life:8+Math.random()*6,maxLife:14,size:2+Math.random()*3,color:['#ff2200','#ff6600','#ffaa00','#ffee00'][Math.random()*4|0],type:'fire'});}
    return;
  }
  // --- TRANSPORT: no attack ---
  if (type==='transport') return;
  // --- SUPPORT: energy wave pulse ---
  if (type==='support') {
    for(i=0;i<8;i++){a=i/8*6.28;P.push({x:ax,y:ay,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:15,maxLife:15,size:3+i*0.5,color:'rgba(100,200,255,0.6)',type:'ring'});}
    return;
  }
  // --- SPECIAL: heavy dual cannon ---
  if (type==='special') {
    for(var b=0;b<2;b++){var off=(b-0.5)*0.15;P.push({x:ax+nx*0.5+ny*off,y:ay+ny*0.5-nx*off,vx:nx*7,vy:ny*7,life:5,maxLife:5,size:2.5,color:'#ffdd44',type:'tracer'});}
    P.push({x:ax+nx*0.5,y:ay+ny*0.5,vx:0,vy:0,life:4,maxLife:4,size:8,color:'#fff',type:'flash'});
    for(i=0;i<6;i++)P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:(Math.random()-0.5)*1.5,vy:-0.8-Math.random()*0.5,life:18,maxLife:18,size:2.5,color:'#888',type:'smoke'});
    return;
  }
  // --- ELITE: energy beam ---
  if (type==='elite') {
    s=10;for(i=0;i<=s;i++){var t=i/s;P.push({x:ax+dx*t,y:ay+dy*t,vx:(Math.random()-0.5)*0.2,vy:(Math.random()-0.5)*0.2,life:6+i,maxLife:14,size:2.5-t*1.5,color:i%2===0?'#aaddff':'#fff',type:'tesla'});}
    P.push({x:tx,y:ty,vx:0,vy:0,life:5,maxLife:5,size:6,color:'#aaddff',type:'flash'});
    return;
  }
  // --- AIR: missile launch ---
  if (type==='air') {
    P.push({x:ax,y:ay,vx:nx*6,vy:ny*6,life:6,maxLife:6,size:2,color:'#fff',type:'tracer'});
    for(i=0;i<3;i++)P.push({x:ax-nx*0.2,y:ay-ny*0.2,vx:-nx*1.5+(Math.random()-0.5)*0.5,vy:-ny*1.5+(Math.random()-0.5)*0.5,life:8,maxLife:8,size:1.5,color:'#ff8800',type:'fire'});
    P.push({x:tx,y:ty,vx:0,vy:0,life:4,maxLife:4,size:5,color:'#ff4400',type:'flash'});
    return;
  }
  // --- BOMBER: bomb drop + big explosion ---
  if (type==='bomber') {
    P.push({x:ax,y:ay+0.3,vx:nx*2,vy:2,life:10,maxLife:10,size:3,color:'#333',type:'debris',gravity:0.15});
    for(i=0;i<10;i++){a=Math.random()*6.28;P.push({x:tx,y:ty,vx:Math.cos(a)*2,vy:Math.sin(a)*2-0.5,life:15+Math.random()*10,maxLife:25,size:2+Math.random()*3,color:['#ff4400','#ff8800','#ffcc00'][Math.random()*3|0],type:'fire',gravity:0.04});}
    P.push({x:tx,y:ty,vx:0,vy:0,life:10,maxLife:10,size:10,color:'#ff8844',type:'shockwave'});
    return;
  }
  // --- GUNBOAT: rapid cannon ---
  if (type==='gunboat') {
    for(i=0;i<2;i++){P.push({x:ax+nx*0.4,y:ay+ny*0.4,vx:nx*(5+i*2),vy:ny*(5+i*2),life:4,maxLife:4,size:1.5,color:'#ffee44',type:'tracer'});}
    P.push({x:ax+nx*0.4,y:ay+ny*0.4,vx:0,vy:0,life:2,maxLife:2,size:4,color:'#fff',type:'flash'});
    P.push({x:ax+nx*0.3,y:ay,vx:-nx*0.3,vy:-0.4,life:12,maxLife:12,size:2,color:'#aaa',type:'smoke'});
    return;
  }
  // --- BATTLESHIP: broadside salvo ---
  if (type==='battleship') {
    for(var b=0;b<3;b++){var off=(b-1)*0.2;P.push({x:ax+ny*off,y:ay-nx*off,vx:nx*7,vy:ny*7,life:5,maxLife:5,size:3,color:'#ffcc00',type:'tracer'});}
    P.push({x:ax,y:ay,vx:0,vy:0,life:4,maxLife:4,size:10,color:'#fff',type:'flash'});
    for(i=0;i<8;i++)P.push({x:ax+(Math.random()-0.5)*0.5,y:ay-0.2,vx:(Math.random()-0.5)*1,vy:-0.8-Math.random()*0.5,life:20+Math.random()*10,maxLife:30,size:3+Math.random()*2,color:'#999',type:'smoke'});
    for(i=0;i<6;i++){a=Math.random()*6.28;P.push({x:tx,y:ty,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5,life:10,maxLife:10,size:2,color:'#ff6600',type:'fire'});}
    return;
  }
  // --- SCOUT: quick burst ---
  if (type==='scout') {
    P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:nx*7,vy:ny*7,life:3,maxLife:3,size:1.5,color:'#ffee44',type:'tracer'});
    P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:0,vy:0,life:2,maxLife:2,size:3,color:'#fff',type:'flash'});
    return;
  }
  // --- HARVESTER/MCV: no attack ---
  if (type==='harvester'||type==='mcv') return;
  // --- DEFAULT: generic muzzle flash ---
  for(i=0;i<3;i++)P.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:nx*3+(Math.random()-0.5),vy:ny*3+(Math.random()-0.5),life:6,maxLife:6,size:2.5,color:'#ffaa00',type:'flash'});
}

// === Faction Attack VFX ===
function spawnAttackVFX(attacker, target, parts) {
  var ax = attacker.x+0.5, ay = attacker.y+0.5;
  var tx = target.x+target.w/2, ty = target.y+target.h/2;
  var dx = tx-ax, dy = ty-ay, d = Math.hypot(dx,dy)||1;
  var nx = dx/d, ny = dy/d;
  var fac = attacker.team === 0 ? playerFaction : enemyFaction;
  var fid = fac ? fac.id : '';
  var i, a;
  if (fid === 'thailand') {
    for (i=0;i<4;i++){a=Math.random()*6.28;parts.push({x:ax,y:ay,vx:nx*(1.5+i*0.5)+Math.cos(a)*0.3,vy:ny*(1.5+i*0.5)+Math.sin(a)*0.3,life:18+i*3,maxLife:22,size:5+i*3,color:i%2?'#ff69b4':'#ff99cc',type:'ring'});}
  } else if (fid === 'japan') {
    for (i=0;i<6;i++){a=(attacker._facing||0)+(Math.random()-0.5)*1.2;parts.push({x:tx+(Math.random()-0.5)*0.5,y:ty+(Math.random()-0.5)*0.5,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:10+Math.random()*8,maxLife:18,size:2+Math.random()*2,color:i<3?'#ff1040':'#00ffee',type:'spark'});}
  } else if (fid === 'switzerland') {
    for (i=0;i<5;i++){a=Math.random()*6.28;parts.push({x:tx,y:ty,vx:Math.cos(a)*1.2,vy:Math.sin(a)*1.2-0.5,life:20+Math.random()*10,maxLife:30,size:2+Math.random()*2,color:i<3?'#ccf4ff':'#88ddff',type:i<2?'crystal':'cryo'});}
  } else if (fid === 'brazil') {
    for (i=0;i<5;i++){a=Math.random()*6.28;parts.push({x:tx+(Math.random()-0.5)*0.4,y:ty+(Math.random()-0.5)*0.4,vx:Math.cos(a)*1.5,vy:Math.sin(a)*1.5-0.8,life:18+Math.random()*8,maxLife:26,size:2+Math.random()*2,color:i<3?'#44ff44':'#aa44ff',type:i<3?'spark':'smoke'});}
  } else if (fid === 'egypt') {
    var segs=5;for(i=0;i<segs;i++){var t2=i/segs;parts.push({x:ax+dx*t2,y:ay+dy*t2,vx:(Math.random()-0.5)*0.3,vy:(Math.random()-0.5)*0.3,life:8+i*2,maxLife:14,size:2.5-i*0.3,color:i===0?'#fff':'#ffd700',type:'tracer'});}
    for(i=0;i<3;i++)parts.push({x:tx,y:ty,vx:(Math.random()-0.5)*2,vy:-Math.random()*1.5,life:15,maxLife:15,size:2,color:'#ddb866',type:'debris',gravity:0.06});
  } else {
    for(i=0;i<3;i++)parts.push({x:ax+nx*0.3,y:ay+ny*0.3,vx:nx*3+(Math.random()-0.5),vy:ny*3+(Math.random()-0.5),life:8,maxLife:8,size:3,color:'#ffaa00',type:'flash'});
  }
}

// === Weather System ===
var currentWeather = 'clear';
var weatherTimer = 0;
var weatherParticles = [];
var weatherDuration = 900;
var WEATHER_TYPES = ['clear','clear','clear','rain','snow','sandstorm','fog'];
var WEATHER_FX = {
  clear:{speedMult:1,visionMult:1,atkMult:1},
  rain:{speedMult:0.85,visionMult:1,atkMult:1},
  snow:{speedMult:0.7,visionMult:0.8,atkMult:0.9},
  sandstorm:{speedMult:0.8,visionMult:0.6,atkMult:0.85},
  fog:{speedMult:1,visionMult:0.5,atkMult:0.95}
};

// Call once at game start to pick weather for the match
function initWeather() {
  currentWeather = WEATHER_TYPES[(Math.random()*WEATHER_TYPES.length)|0];
  weatherParticles = [];
  weatherTimer = 0;
}

function updateWeather(gt) {
  // Only update particles, weather type stays fixed for the match
  var wp = weatherParticles, sw = screenW||800, sh = screenH||600;
  for (var i = wp.length-1; i >= 0; i--) {
    var p = wp[i]; p.x += p.vx; p.y += p.vy; p.life--;
    if (p.g) p.vy += p.g;
    if (p.life <= 0 || p.y > sh+10 || p.x > sw+10) wp.splice(i,1);
  }
  if (currentWeather === 'rain') { for (var j = wp.length; j < 150; j++) wp.push({x:Math.random()*sw+50,y:-Math.random()*20,vx:-2-Math.random(),vy:10+Math.random()*5,life:60,g:0.1}); }
  else if (currentWeather === 'snow') { if (wp.length < 100 && gt%2===0) wp.push({x:Math.random()*sw,y:-5,vx:Math.sin(gt*0.01+Math.random()*3)*0.5,vy:0.5+Math.random()*0.8,life:300,sz:1+Math.random()*2.5}); }
  else if (currentWeather === 'sandstorm') { for (var k = wp.length; k < 120; k++) wp.push({x:-10,y:Math.random()*sh,vx:4+Math.random()*4,vy:(Math.random()-0.5)*2,life:80+Math.random()*40,sz:1+Math.random()*3}); }
}

function drawWeather(ctx, sw, sh) {
  var wp = weatherParticles;
  if (currentWeather === 'rain') {
    ctx.save(); ctx.globalAlpha=0.06; ctx.fillStyle='#001'; ctx.fillRect(0,0,sw,sh);
    ctx.globalAlpha=0.5; ctx.strokeStyle='#8899cc'; ctx.lineWidth=1;
    for (var i=0;i<wp.length;i++){var p=wp[i];ctx.globalAlpha=Math.min(1,p.life/20)*0.4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.vx*2,p.y+p.vy*1.5);ctx.stroke();}
    ctx.globalAlpha=0.15;ctx.fillStyle='#aabbdd';for(var i=0;i<wp.length;i++){if(wp[i].life<5){ctx.beginPath();ctx.ellipse(wp[i].x,wp[i].y,3,1,0,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  } else if (currentWeather === 'snow') {
    ctx.save();ctx.globalAlpha=0.03;ctx.fillStyle='#eef';ctx.fillRect(0,0,sw,sh);
    for(var i=0;i<wp.length;i++){var p=wp[i];ctx.globalAlpha=Math.min(1,p.life/60)*0.7;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,p.sz||2,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  } else if (currentWeather === 'sandstorm') {
    ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle='#c8a050';ctx.fillRect(0,0,sw,sh);
    for(var i=0;i<wp.length;i++){var p=wp[i];ctx.globalAlpha=Math.min(1,p.life/30)*0.5;ctx.fillStyle='#d4a860';ctx.fillRect(p.x,p.y,p.sz||2,(p.sz||2)*0.6);}
    ctx.restore();
  } else if (currentWeather === 'fog') {
    ctx.save();var g=ctx.createRadialGradient(sw/2,sh/2,sw*0.15,sw/2,sh/2,sw*0.55);
    g.addColorStop(0,'rgba(220,225,235,0)');g.addColorStop(0.7,'rgba(200,210,220,0.15)');g.addColorStop(1,'rgba(180,190,200,0.35)');
    ctx.fillStyle=g;ctx.fillRect(0,0,sw,sh);ctx.restore();
  }
}

function getWeatherEffects() { return WEATHER_FX[currentWeather] || WEATHER_FX.clear; }
