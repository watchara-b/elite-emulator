// Unit & Building Sprite Overrides — loaded after sprites.js
function getUnitSprite(type, team) {
  var fid = team===0&&playerFaction?playerFaction.id:(team===1&&enemyFaction?enemyFaction.id:'');
  var key='u_'+type+'_'+team+'_'+fid;
  if(spriteCache[key]) return spriteCache[key];
  var c=teamColors(team);
  return spriteCache[key]=cachedSprite(key,32,32,function(x){
    // helpers
    function sh(rx,ry,yy){x.fillStyle='rgba(0,0,0,0.25)';x.beginPath();x.ellipse(16,yy||28,rx||8,ry||2.5,0,0,Math.PI*2);x.fill();}
    function legs(){x.fillStyle='#3a3a3a';x.fillRect(12,22,3,7);x.fillRect(17,22,3,7);}
    function head(y){var g=x.createRadialGradient(14,y-2,0,16,y,4.5);g.addColorStop(0,'#ffe0a0');g.addColorStop(1,'#cc9050');x.fillStyle=g;x.beginPath();x.arc(16,y,4.5,0,Math.PI*2);x.fill();}
    function body(c1,c2){var g=x.createLinearGradient(10,12,22,24);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.beginPath();x.moveTo(10,24);x.lineTo(10,14);x.quadraticCurveTo(16,11,22,14);x.lineTo(22,24);x.closePath();x.fill();}
    function dot(){x.fillStyle=team===0?'#44ff44':'#ff4444';x.beginPath();x.arc(4,4,2.5,0,Math.PI*2);x.fill();}

    switch(type){
    // === RED ALERT TOP-DOWN INFANTRY ===
    case 'soldier':
      sh(6,2);
      // Boots
      x.fillStyle='#333';x.fillRect(12,25,3,4);x.fillRect(18,25,3,4);
      // Body (top-down torso)
      var sg=x.createLinearGradient(10,14,22,24);sg.addColorStop(0,c.light);sg.addColorStop(1,c.dark);
      x.fillStyle=sg;x.fillRect(10,14,12,12);
      x.strokeStyle=c.dark;x.lineWidth=0.5;x.strokeRect(10,14,12,12);
      // Shoulder pads
      x.fillStyle=c.main;x.fillRect(8,14,4,4);x.fillRect(20,14,4,4);
      // Head (helmet)
      x.fillStyle=c.dark;x.beginPath();x.arc(16,11,5,0,Math.PI*2);x.fill();
      x.fillStyle='#deb887';x.beginPath();x.arc(16,11,3,0,Math.PI*2);x.fill();
      // Rifle (pointing right)
      x.fillStyle='#555';x.fillRect(22,16,9,2);
      x.fillStyle='#333';x.fillRect(29,15,2,4);
      break;
    case 'medic':
      sh(6,2);
      x.fillStyle='#333';x.fillRect(12,25,3,4);x.fillRect(18,25,3,4);
      x.fillStyle='#eee';x.fillRect(10,14,12,12);
      x.strokeStyle='#ccc';x.lineWidth=0.5;x.strokeRect(10,14,12,12);
      // Red cross
      x.fillStyle='#e00';x.fillRect(14,16,4,8);x.fillRect(12,18,8,4);
      x.fillStyle='#eee';x.beginPath();x.arc(16,11,4.5,0,Math.PI*2);x.fill();
      x.fillStyle='#deb887';x.beginPath();x.arc(16,11,3,0,Math.PI*2);x.fill();
      // Med kit
      x.fillStyle='#fff';x.fillRect(22,17,5,4);x.fillStyle='#e00';x.fillRect(23.5,18,2,2);
      break;
    case 'engineer':
      sh(6,2);
      x.fillStyle='#333';x.fillRect(12,25,3,4);x.fillRect(18,25,3,4);
      var eg=x.createLinearGradient(10,14,22,24);eg.addColorStop(0,c.main);eg.addColorStop(1,c.dark);
      x.fillStyle=eg;x.fillRect(10,14,12,12);
      // Hard hat
      x.fillStyle='#fd0';x.beginPath();x.arc(16,11,5,0,Math.PI*2);x.fill();
      x.fillStyle='#deb887';x.beginPath();x.arc(16,11,3,0,Math.PI*2);x.fill();
      // Wrench
      x.fillStyle='#999';x.fillRect(22,16,6,1.5);
      x.fillStyle='#aaa';x.fillRect(27,14,2,2);x.fillRect(27,17,2,2);
      break;
    case 'sniper':
      sh(8,2);
      // Prone position (flat, long)
      x.fillStyle='#5a5a2a';x.fillRect(6,21,18,5);
      x.strokeStyle='#4a4a1a';x.lineWidth=0.4;x.strokeRect(6,21,18,5);
      // Head
      x.fillStyle='#5a5a2a';x.beginPath();x.arc(8,21,3,0,Math.PI*2);x.fill();
      // Long rifle + scope
      x.fillStyle='#444';x.fillRect(12,22,18,1.5);
      x.fillStyle='#88f';x.beginPath();x.arc(28,22.5,1.5,0,Math.PI*2);x.fill();
      x.fillStyle='#fff';x.beginPath();x.arc(28,22,0.5,0,Math.PI*2);x.fill();
      break;
    case 'commando':
      sh(6,2);
      x.fillStyle='#1a1a1a';x.fillRect(12,25,3,4);x.fillRect(18,25,3,4);
      x.fillStyle='#222';x.fillRect(10,14,12,12);
      x.strokeStyle='#333';x.lineWidth=0.5;x.strokeRect(10,14,12,12);
      // Stealth suit accent
      x.fillStyle=c.light;x.fillRect(10,18,12,1);
      // Dark head + glowing eyes
      x.fillStyle='#111';x.beginPath();x.arc(16,11,4.5,0,Math.PI*2);x.fill();
      x.fillStyle=c.light;x.fillRect(13,10,2,1.5);x.fillRect(17,10,2,1.5);
      // Blade
      x.fillStyle='#ccc';x.save();x.translate(23,17);x.rotate(-0.4);x.fillRect(0,0,8,1.5);x.restore();
      break;
    case 'saboteur':
      sh(6,2);
      x.fillStyle=c.dark;x.fillRect(12,25,3,4);x.fillRect(18,25,3,4);
      x.fillStyle=c.main;x.fillRect(10,14,12,12);
      x.strokeStyle=c.dark;x.lineWidth=0.4;x.strokeRect(10,14,12,12);
      // Pointed hood
      x.fillStyle=c.main;x.beginPath();x.moveTo(12,14);x.lineTo(16,6);x.lineTo(20,14);x.fill();
      x.fillStyle='#deb887';x.fillRect(14,10,4,2);
      // Explosive pack
      x.fillStyle='#654';x.fillRect(22,18,5,4);
      x.fillStyle='#f00';x.beginPath();x.arc(24,18,1,0,Math.PI*2);x.fill();
      break;
    case 'hero':
      // Aura glow
      x.fillStyle=c.glow;x.beginPath();x.arc(16,18,14,0,Math.PI*2);x.fill();
      sh(8,2.5,30);
      x.fillStyle=c.dark;x.fillRect(12,25,3,5);x.fillRect(18,25,3,5);
      // Cape
      x.fillStyle=c.main;x.beginPath();x.moveTo(10,14);x.lineTo(7,28);x.lineTo(14,28);x.lineTo(12,14);x.fill();
      // Armored body
      var hg2=x.createLinearGradient(10,12,22,24);hg2.addColorStop(0,c.light);hg2.addColorStop(1,c.main);
      x.fillStyle=hg2;x.fillRect(10,12,12,14);
      x.fillStyle='#ffd700';x.fillRect(10,12,12,1.5);x.fillRect(10,24,12,1.5);
      // Crown
      x.fillStyle='#ffd700';x.beginPath();x.arc(16,8,5,0,Math.PI*2);x.fill();
      x.fillStyle='#deb887';x.beginPath();x.arc(16,8,3,0,Math.PI*2);x.fill();
      x.fillStyle='#ffd700';x.fillRect(12,3,2,3);x.fillRect(15,2,2,4);x.fillRect(18,3,2,3);
      // Staff
      x.fillStyle='#ffd700';x.fillRect(23,4,2,22);
      x.fillStyle=c.light;x.beginPath();x.arc(24,4,3,0,Math.PI*2);x.fill();
      break;
    // === RED ALERT TOP-DOWN VEHICLES ===
    case 'tank':
      sh(14,3);
      // Treads
      x.fillStyle='#222';x.fillRect(2,19,26,4);x.fillRect(2,28,26,4);
      x.fillStyle='#333';for(var i=0;i<7;i++){x.fillRect(3+i*3.8,19.5,2,3);x.fillRect(3+i*3.8,28.5,2,3);}
      // Hull
      var tg3=x.createLinearGradient(4,20,4,31);tg3.addColorStop(0,c.light);tg3.addColorStop(1,c.dark);
      x.fillStyle=tg3;x.fillRect(4,21,22,9);
      x.strokeStyle=c.dark;x.lineWidth=0.5;x.strokeRect(4,21,22,9);
      // Turret (circle)
      x.fillStyle=c.main;x.beginPath();x.arc(16,25.5,5,0,Math.PI*2);x.fill();
      x.fillStyle=c.accent;x.beginPath();x.arc(16,25.5,3,0,Math.PI*2);x.fill();
      // Barrel
      x.fillStyle='#555';x.fillRect(20,24.5,12,2);
      x.fillStyle='#333';x.fillRect(30,24,2,3);
      break;
    case 'artillery':
      sh(14,3);
      x.fillStyle='#222';x.fillRect(2,20,26,3.5);x.fillRect(2,28,26,3.5);
      x.fillStyle='#333';for(var i=0;i<7;i++){x.fillRect(3+i*3.8,20.5,2,2.5);x.fillRect(3+i*3.8,28.5,2,2.5);}
      var ag=x.createLinearGradient(4,21,4,30);ag.addColorStop(0,c.light);ag.addColorStop(1,c.dark);
      x.fillStyle=ag;x.fillRect(4,22,22,8);
      x.strokeStyle=c.dark;x.lineWidth=0.5;x.strokeRect(4,22,22,8);
      // Long angled barrel
      x.save();x.translate(20,25);x.rotate(-0.35);
      x.fillStyle='#666';x.fillRect(0,-1.5,14,3);
      x.fillStyle='#f80';x.beginPath();x.arc(14,0,2,0,Math.PI*2);x.fill();
      x.restore();
      // Stabilizer legs
      x.fillStyle='#555';x.fillRect(1,23,3,6);x.fillRect(28,23,3,6);
      break;
    case 'flamer':
      sh(12,3);
      x.fillStyle='#222';x.fillRect(4,20,22,3.5);x.fillRect(4,28,22,3.5);
      x.fillStyle='#333';for(var i=0;i<5;i++){x.fillRect(5+i*4.5,20.5,2.5,2.5);x.fillRect(5+i*4.5,28.5,2.5,2.5);}
      var fg3=x.createLinearGradient(6,21,6,30);fg3.addColorStop(0,c.light);fg3.addColorStop(1,c.dark);
      x.fillStyle=fg3;x.fillRect(6,22,18,8);
      // Fuel tanks (top-down circles)
      x.fillStyle='#888';x.beginPath();x.arc(10,25.5,3,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(16,25.5,3,0,Math.PI*2);x.fill();
      x.fillStyle=c.dark;x.beginPath();x.arc(10,25.5,1.5,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(16,25.5,1.5,0,Math.PI*2);x.fill();
      // Nozzle + flame
      x.fillStyle='#555';x.fillRect(22,24,6,3);
      var flg=x.createRadialGradient(30,25.5,0,30,25.5,4);flg.addColorStop(0,'#ff0');flg.addColorStop(0.5,'#f80');flg.addColorStop(1,'rgba(255,0,0,0)');
      x.fillStyle=flg;x.beginPath();x.arc(30,25.5,4,0,Math.PI*2);x.fill();
      break;
    case 'transport':
      sh(14,3);
      x.fillStyle='#444';for(var i=0;i<6;i++){x.beginPath();x.arc(4+i*5,20,2,0,Math.PI*2);x.fill();x.beginPath();x.arc(4+i*5,31,2,0,Math.PI*2);x.fill();}
      var trg=x.createLinearGradient(3,19,3,32);trg.addColorStop(0,c.light);trg.addColorStop(1,c.dark);
      x.fillStyle=trg;x.fillRect(3,20,26,11);
      x.strokeStyle=c.dark;x.lineWidth=0.5;x.strokeRect(3,20,26,11);
      // Faction emblem
      x.fillStyle=c.accent;x.beginPath();x.arc(16,25.5,3,0,Math.PI*2);x.fill();
      x.fillStyle=c.dark;x.beginPath();x.arc(16,25.5,1.5,0,Math.PI*2);x.fill();
      // Cargo bay lines
      x.strokeStyle='rgba(0,0,0,0.2)';x.lineWidth=0.4;
      x.beginPath();x.moveTo(8,20);x.lineTo(8,31);x.stroke();
      x.beginPath();x.moveTo(24,20);x.lineTo(24,31);x.stroke();
      break;
    case 'support':
      sh(12,3);
      x.fillStyle='#444';for(var i=0;i<4;i++){x.beginPath();x.arc(6+i*7,20,2,0,Math.PI*2);x.fill();x.beginPath();x.arc(6+i*7,31,2,0,Math.PI*2);x.fill();}
      x.fillStyle=c.main;x.fillRect(4,21,24,10);
      x.strokeStyle=c.dark;x.lineWidth=0.5;x.strokeRect(4,21,24,10);
      // Satellite dish (top-down)
      x.fillStyle='#ccc';x.beginPath();x.arc(14,25.5,5,0,Math.PI*2);x.fill();
      x.fillStyle='#999';x.beginPath();x.arc(14,25.5,2,0,Math.PI*2);x.fill();
      // Signal arcs
      x.strokeStyle=c.light;x.lineWidth=0.7;
      for(var r=3;r<=7;r+=2){x.beginPath();x.arc(14,25.5,r,-0.8,0.8);x.stroke();}
      break;
    case 'special':
      sh(15,3);
      // Heavy treads
      x.fillStyle='#222';x.fillRect(1,18,28,4);x.fillRect(1,29,28,4);
      x.fillStyle='#333';for(var i=0;i<7;i++){x.fillRect(2+i*4,18.5,2.5,3);x.fillRect(2+i*4,29.5,2.5,3);}
      // Armored hull
      var spg=x.createLinearGradient(3,19,3,31);spg.addColorStop(0,c.light);spg.addColorStop(1,c.dark);
      x.fillStyle=spg;x.fillRect(3,20,26,11);
      x.strokeStyle=c.dark;x.lineWidth=0.6;x.strokeRect(3,20,26,11);
      // Side armor plates
      x.fillStyle=c.dark;x.fillRect(3,20,3,11);x.fillRect(26,20,3,11);
      // Energy core (center glow)
      var gc2=x.createRadialGradient(16,25.5,0,16,25.5,4);gc2.addColorStop(0,'#fff');gc2.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle=gc2;x.beginPath();x.arc(16,25.5,4,0,Math.PI*2);x.fill();
      // Dual barrels
      x.fillStyle='#555';x.fillRect(22,23,10,2);x.fillRect(22,27,10,2);
      break;
    case 'elite':
      sh(14,3);
      // Hull (hovering — no treads, shadow only)
      var elg=x.createLinearGradient(4,20,4,31);elg.addColorStop(0,c.light);elg.addColorStop(1,c.dark);
      x.fillStyle=elg;x.fillRect(4,20,24,11);
      x.strokeStyle=c.accent;x.lineWidth=0.8;x.strokeRect(4,20,24,11);
      // Accent stripes
      x.fillStyle=c.accent;x.fillRect(4,22,24,1);x.fillRect(4,28,24,1);
      // Turret
      x.fillStyle=c.main;x.beginPath();x.arc(16,25.5,4,0,Math.PI*2);x.fill();
      x.fillStyle=c.accent;x.beginPath();x.arc(16,25.5,2,0,Math.PI*2);x.fill();
      // Dual barrels
      x.fillStyle='#666';x.fillRect(22,24,10,1.5);x.fillRect(22,27,10,1.5);
      // Hover glow
      x.fillStyle='rgba(100,200,255,0.1)';x.beginPath();x.ellipse(16,32,12,2,0,0,Math.PI*2);x.fill();
      break;
    case 'harvester':
      sh(14,3);
      // === RED ALERT STYLE: top-down isometric ore miner ===
      // Treads (wide, dark, industrial)
      x.fillStyle='#222';
      x.fillRect(2,20,22,4);  // left tread
      x.fillRect(2,27,22,4);  // right tread
      // Tread detail (links)
      x.fillStyle='#333';
      for(var i=0;i<6;i++){x.fillRect(3+i*3.8,20.5,2,3);x.fillRect(3+i*3.8,27.5,2,3);}
      // Tread highlight
      x.fillStyle='#3a3a3a';x.fillRect(2,20,22,1);x.fillRect(2,30,22,1);
      // Main hull (flat armored body)
      var hg=x.createLinearGradient(4,21,4,30);
      hg.addColorStop(0,c.light);hg.addColorStop(0.5,c.main);hg.addColorStop(1,c.dark);
      x.fillStyle=hg;
      x.fillRect(4,22,20,7);
      // Hull edge lines
      x.strokeStyle=c.dark;x.lineWidth=0.5;
      x.strokeRect(4,22,20,7);
      // Armor panel lines
      x.strokeStyle='rgba(0,0,0,0.2)';x.lineWidth=0.4;
      x.beginPath();x.moveTo(12,22);x.lineTo(12,29);x.stroke();
      x.beginPath();x.moveTo(18,22);x.lineTo(18,29);x.stroke();
      // Cargo bay (rear, darker inset)
      x.fillStyle=c.dark;
      x.fillRect(4,23,8,5);
      x.strokeStyle='rgba(0,0,0,0.3)';x.lineWidth=0.3;x.strokeRect(4,23,8,5);
      // Ore in cargo
      x.fillStyle='#b8901a';
      x.beginPath();x.moveTo(5,27);x.quadraticCurveTo(8,23.5,11,27);x.closePath();x.fill();
      x.fillStyle='#d4aa30';
      x.beginPath();x.moveTo(6,26.5);x.quadraticCurveTo(8,24.5,10,26.5);x.closePath();x.fill();
      // Cab (small raised block, mid-right)
      var cg=x.createLinearGradient(17,22,17,29);
      cg.addColorStop(0,c.accent);cg.addColorStop(1,c.main);
      x.fillStyle=cg;
      x.fillRect(17,23,5,5);
      x.strokeStyle=c.dark;x.lineWidth=0.4;x.strokeRect(17,23,5,5);
      // Windshield (dark glass slit)
      x.fillStyle='#224466';
      x.fillRect(18,24,3,1.5);
      x.fillStyle='rgba(150,200,255,0.3)';
      x.fillRect(18,24,3,0.5);
      // Exhaust stack
      x.fillStyle='#444';x.fillRect(15,22.5,1.5,1.5);
      x.fillStyle='#555';x.fillRect(15,22,1.5,0.8);
      // === FRONT DRILL (large, dominant) ===
      // Drill mount plate
      x.fillStyle='#555';
      x.fillRect(23,21.5,2,8);
      x.fillStyle='#666';
      x.fillRect(23.5,22,1,7);
      // Drill cone body (gradient metal)
      var dg=x.createLinearGradient(25,25.5,38,25.5);
      dg.addColorStop(0,'#aaa');dg.addColorStop(0.15,'#999');
      dg.addColorStop(0.4,'#808080');
      dg.addColorStop(0.7,'#707070');
      dg.addColorStop(0.9,'#888');
      dg.addColorStop(1,'#ccc');
      x.fillStyle=dg;
      x.beginPath();
      x.moveTo(25,19);   // top
      x.lineTo(39,25.5); // tip
      x.lineTo(25,32);   // bottom
      x.closePath();
      x.fill();
      // Top edge highlight
      x.strokeStyle='rgba(255,255,255,0.35)';x.lineWidth=0.6;
      x.beginPath();x.moveTo(25,19);x.lineTo(39,25.5);x.stroke();
      // Bottom edge shadow
      x.strokeStyle='rgba(0,0,0,0.35)';
      x.beginPath();x.moveTo(25,32);x.lineTo(39,25.5);x.stroke();
      // Spiral grooves (deep, industrial)
      x.strokeStyle='#555';x.lineWidth=0.9;
      for(var i=0;i<8;i++){
        var dx=25.5+i*1.7,t=i/8,sp=6*(1-t);
        x.beginPath();x.moveTo(dx,25.5-sp);x.quadraticCurveTo(dx+1,25.5,dx,25.5+sp);x.stroke();
      }
      // Groove highlights
      x.strokeStyle='rgba(190,190,190,0.25)';x.lineWidth=0.35;
      for(var i=0;i<7;i++){
        var dx=26+i*1.7,t=i/7,sp=5*(1-t);
        x.beginPath();x.moveTo(dx,25.5-sp+0.6);x.quadraticCurveTo(dx+0.8,25.5,dx,25.5+sp-0.6);x.stroke();
      }
      // Rotation rings (bold)
      x.strokeStyle='#666';x.lineWidth=1.2;
      x.beginPath();x.ellipse(26,25.5,1.3,6,0,0,Math.PI*2);x.stroke();
      x.strokeStyle='#777';x.lineWidth=0.8;
      x.beginPath();x.ellipse(30,25.5,1,4.2,0,0,Math.PI*2);x.stroke();
      x.beginPath();x.ellipse(34,25.5,0.7,2.5,0,0,Math.PI*2);x.stroke();
      // Drill tip (bright sharp point)
      x.fillStyle='#e8e8e8';
      x.beginPath();x.moveTo(37,24.5);x.lineTo(39,25.5);x.lineTo(37,26.5);x.closePath();x.fill();
      // Hydraulic arms (top & bottom)
      x.strokeStyle='#666';x.lineWidth=1.5;
      x.beginPath();x.moveTo(21,22);x.lineTo(25,20);x.stroke();
      x.beginPath();x.moveTo(21,29);x.lineTo(25,31);x.stroke();
      // Piston accents (faction color)
      x.strokeStyle=c.accent;x.lineWidth=0.7;
      x.beginPath();x.moveTo(22,22.5);x.lineTo(25.5,20.5);x.stroke();
      x.beginPath();x.moveTo(22,28.5);x.lineTo(25.5,30.5);x.stroke();
      // Headlight
      x.fillStyle='rgba(255,255,220,0.9)';x.beginPath();x.arc(22,23,0.8,0,Math.PI*2);x.fill();
      // Faction dot (team indicator)
      x.fillStyle=c.light;x.beginPath();x.arc(8,22,1.5,0,Math.PI*2);x.fill();
      // Drill sparks
      x.fillStyle='rgba(255,220,80,0.6)';
      x.beginPath();x.arc(38.5,24,0.8,0,Math.PI*2);x.fill();
      x.fillStyle='rgba(255,180,40,0.4)';
      x.beginPath();x.arc(38,27,0.6,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(39,25.5,0.4,0,Math.PI*2);x.fill();
      break;
    case 'mcv':
      sh(13,3);
      // Heavy tracked chassis
      x.fillStyle='#333';x.fillRect(2,23,28,6);
      var tg2=x.createLinearGradient(2,23,2,29);tg2.addColorStop(0,'#555');tg2.addColorStop(1,'#222');
      x.fillStyle=tg2;x.fillRect(2,23,28,6);
      for(var i=0;i<6;i++){x.fillStyle='#444';x.beginPath();x.arc(4+i*5,26,2,0,Math.PI*2);x.fill();x.fillStyle='#555';x.beginPath();x.arc(4+i*5,26,1.2,0,Math.PI*2);x.fill();}
      x.fillStyle='#3a3a3a';for(var i=0;i<7;i++)x.fillRect(3+i*4,23.5,2,5);
      // Large deployment hull
      isoBox(x,14,17,22,14,10,c.light,c.dark,c.main);
      // Cab
      isoBox(x,26,16,8,8,10,c.accent,c.dark,c.main);
      var wg2=x.createLinearGradient(25,10,29,15);wg2.addColorStop(0,'#aaddff');wg2.addColorStop(1,'#6699cc');
      x.fillStyle=wg2;x.fillRect(25,10,5,5);
      // Crane arm
      x.strokeStyle='#aaa';x.lineWidth=2;
      x.beginPath();x.moveTo(10,12);x.lineTo(8,4);x.lineTo(16,4);x.stroke();
      x.strokeStyle='#888';x.lineWidth=1;
      x.beginPath();x.moveTo(16,4);x.lineTo(16,8);x.stroke();
      // Hook
      x.strokeStyle='#ccc';x.lineWidth=1.5;x.beginPath();x.arc(16,9,2,0,Math.PI);x.stroke();
      // Deploy markers
      x.fillStyle='#ffd700';x.font='bold 6px sans-serif';x.fillText('HQ',6,20);
      // Warning stripes
      x.fillStyle='#ffcc00';for(var i=0;i<4;i++)x.fillRect(4+i*5,22,2.5,1.5);
      // Headlights
      x.fillStyle='rgba(255,255,200,0.6)';x.beginPath();x.arc(29,16,1.5,0,Math.PI*2);x.fill();
      break;
    // === RED ALERT TOP-DOWN AIR ===
    case 'air':
      // Ground shadow
      x.fillStyle='rgba(0,0,0,0.12)';x.beginPath();x.ellipse(16,30,8,2,0,0,Math.PI*2);x.fill();
      // Delta wings (top-down)
      x.fillStyle=c.main;
      x.beginPath();x.moveTo(16,4);x.lineTo(3,20);x.lineTo(10,18);x.lineTo(16,22);x.lineTo(22,18);x.lineTo(29,20);x.closePath();x.fill();
      // Fuselage
      var ag2=x.createLinearGradient(13,4,19,22);ag2.addColorStop(0,c.light);ag2.addColorStop(1,c.dark);
      x.fillStyle=ag2;
      x.beginPath();x.moveTo(16,2);x.lineTo(19,22);x.lineTo(16,20);x.lineTo(13,22);x.closePath();x.fill();
      // Cockpit glass
      x.fillStyle='#aaddff';x.beginPath();x.ellipse(16,8,2.5,4,0,0,Math.PI*2);x.fill();
      // Engine glow
      x.fillStyle='rgba(255,180,50,0.5)';x.beginPath();x.arc(16,22,2.5,0,Math.PI*2);x.fill();
      break;
    case 'bomber':
      x.fillStyle='rgba(0,0,0,0.12)';x.beginPath();x.ellipse(16,30,10,2,0,0,Math.PI*2);x.fill();
      // Wide wings
      x.fillStyle=c.main;
      x.beginPath();x.moveTo(16,4);x.lineTo(1,20);x.lineTo(8,18);x.lineTo(16,24);x.lineTo(24,18);x.lineTo(31,20);x.closePath();x.fill();
      // Wide fuselage
      var bg3=x.createLinearGradient(12,2,20,24);bg3.addColorStop(0,c.light);bg3.addColorStop(1,c.dark);
      x.fillStyle=bg3;
      x.beginPath();x.moveTo(16,2);x.lineTo(20,24);x.lineTo(12,24);x.closePath();x.fill();
      // Bomb bay
      x.fillStyle='#333';x.fillRect(13,14,6,4);
      // Cockpit
      x.fillStyle='#aaddff';x.fillRect(14,5,4,4);
      // Dual engine glow
      x.fillStyle='#f60';x.beginPath();x.arc(13,23,1.5,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(19,23,1.5,0,Math.PI*2);x.fill();
      break;
    // === RED ALERT TOP-DOWN NAVAL ===
    case 'gunboat':
      // Wake
      x.strokeStyle='rgba(100,180,255,0.3)';x.lineWidth=1;
      x.beginPath();x.moveTo(4,28);x.quadraticCurveTo(16,32,28,28);x.stroke();
      // Hull (pointed bow)
      x.fillStyle=c.dark;
      x.beginPath();x.moveTo(16,8);x.lineTo(6,28);x.lineTo(26,28);x.closePath();x.fill();
      // Deck
      var gng=x.createLinearGradient(8,12,24,26);gng.addColorStop(0,c.light);gng.addColorStop(1,c.main);
      x.fillStyle=gng;
      x.beginPath();x.moveTo(16,12);x.lineTo(8,26);x.lineTo(24,26);x.closePath();x.fill();
      // Cabin
      x.fillStyle=c.main;x.fillRect(12,18,8,5);
      // Turret + barrel
      x.fillStyle='#777';x.beginPath();x.arc(16,16,3,0,Math.PI*2);x.fill();
      x.fillStyle='#555';x.fillRect(16,10,2,6);
      break;
    case 'battleship':
      // Wake
      x.strokeStyle='rgba(100,180,255,0.3)';x.lineWidth=1.5;
      x.beginPath();x.moveTo(2,29);x.quadraticCurveTo(16,33,30,29);x.stroke();
      // Hull
      x.fillStyle=c.dark;
      x.beginPath();x.moveTo(16,4);x.lineTo(4,28);x.lineTo(28,28);x.closePath();x.fill();
      // Deck
      var bsg=x.createLinearGradient(6,8,26,26);bsg.addColorStop(0,c.light);bsg.addColorStop(1,c.main);
      x.fillStyle=bsg;
      x.beginPath();x.moveTo(16,8);x.lineTo(6,26);x.lineTo(26,26);x.closePath();x.fill();
      // Superstructure
      x.fillStyle=c.main;x.fillRect(12,14,8,8);
      x.fillStyle=c.dark;x.fillRect(14,12,4,4);
      // 3 turrets + barrels
      x.fillStyle='#777';
      for(var ti=0;ti<3;ti++){
        var ty2=10+ti*6;
        x.beginPath();x.arc(16,ty2,2.5,0,Math.PI*2);x.fill();
        x.fillStyle='#555';x.fillRect(16,ty2-3,2,3);x.fillStyle='#777';
      }
      // Mast
      x.fillStyle='#999';x.fillRect(15.5,6,1,6);
      break;
    // === RED ALERT TOP-DOWN SCOUT ===
    case 'scout':
      sh(7,2);
      // Wheels (top-down)
      x.fillStyle='#333';
      x.beginPath();x.arc(10,22,3,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(22,28,3,0,Math.PI*2);x.fill();
      x.fillStyle='#666';
      x.beginPath();x.arc(10,22,1.5,0,Math.PI*2);x.fill();
      x.beginPath();x.arc(22,28,1.5,0,Math.PI*2);x.fill();
      // Frame
      x.strokeStyle=c.main;x.lineWidth=2;
      x.beginPath();x.moveTo(10,22);x.lineTo(16,18);x.lineTo(22,28);x.stroke();
      // Rider body
      x.fillStyle=c.dark;x.fillRect(14,16,5,6);
      // Rider head
      x.fillStyle='#deb887';x.beginPath();x.arc(18,15,3,0,Math.PI*2);x.fill();
      // Handlebars
      x.strokeStyle='#888';x.lineWidth=1;
      x.beginPath();x.moveTo(13,18);x.lineTo(19,18);x.stroke();
      break;
    default:
      sh();isoBox(x,16,20,20,10,6,c.light,c.dark,c.main);
      break;
    }
    dot();
  });
}

// === BUILDING SPRITES ===
function getBuildingSprite(type, team) {
  var fid=team===0&&playerFaction?playerFaction.id:(team===1&&enemyFaction?enemyFaction.id:'');
  var key='b_'+type+'_'+team+'_'+fid;
  if(spriteCache[key]) return spriteCache[key];
  var c=teamColors(team);
  var defs=team===0?DEFS:ENEMY_DEFS;
  var d=defs?defs[type]:null;
  var W=d?d.w*32:64, H=d?d.h*32:64;

  return spriteCache[key]=cachedSprite(key,W,H,function(x){
    var bx=4,by=H*0.35,bw=W-8,bh=H*0.55;
    // Shadow
    x.fillStyle='rgba(0,0,0,0.2)';x.beginPath();x.ellipse(W/2,H-4,W*0.4,H*0.08,0,0,Math.PI*2);x.fill();
    // Main body
    isoBox(x,W/2,by+bh*0.5,bw,bh*0.5,bh*0.5,c.light,c.dark,c.main);

    // === FACTION ROOF ===
    if(fid==='thailand'){
      x.fillStyle=c.accent;x.beginPath();x.moveTo(W/2,by-H*0.22);
      x.quadraticCurveTo(W*0.1,by,bx-4,by+4);x.lineTo(bx+bw+4,by+4);
      x.quadraticCurveTo(W*0.9,by,W/2,by-H*0.22);x.fill();
      x.fillStyle=c.main;x.beginPath();x.moveTo(W/2,by-H*0.12);
      x.quadraticCurveTo(W*0.25,by+2,bx+4,by+3);x.lineTo(bx+bw-4,by+3);
      x.quadraticCurveTo(W*0.75,by+2,W/2,by-H*0.12);x.fill();
      x.fillStyle='#ffd700';x.fillRect(W/2-1,by-H*0.28,2,H*0.07);
    }else if(fid==='japan'){
      x.fillStyle=c.dark;x.beginPath();x.moveTo(bx-2,by+2);x.lineTo(W/2,by-H*0.18);x.lineTo(bx+bw+2,by+2);x.closePath();x.fill();
      x.strokeStyle='#ff1493';x.lineWidth=1.5;
      x.beginPath();x.moveTo(bx,by+2);x.lineTo(W/2,by-H*0.16);x.lineTo(bx+bw,by+2);x.stroke();
      x.fillStyle='#ff0040';x.beginPath();x.arc(W*0.75,by-H*0.1,2,0,Math.PI*2);x.fill();
    }else if(fid==='switzerland'){
      x.fillStyle=c.accent;x.beginPath();x.moveTo(W/2,by-H*0.25);x.lineTo(bx-3,by+3);x.lineTo(bx+bw+3,by+3);x.closePath();x.fill();
      x.fillStyle=c.light;x.beginPath();x.moveTo(W/2,by-H*0.22);x.lineTo(bx+2,by+2);x.lineTo(W/2,by+2);x.closePath();x.fill();
      x.fillStyle='#ff0000';x.fillRect(W/2-4,by-H*0.12,8,3);x.fillRect(W/2-1.5,by-H*0.17,3,12);
    }else if(fid==='brazil'){
      x.fillStyle='#1a4a1a';x.beginPath();x.moveTo(bx,by+2);
      for(var i=0;i<=8;i++){var rx=bx+(bw/8)*i,ry=by-H*0.08-Math.sin(i*0.8)*H*0.06;x.quadraticCurveTo(rx,ry-H*0.04,rx,ry);}
      x.lineTo(bx+bw,by+2);x.closePath();x.fill();
      x.strokeStyle='#33ff66';x.lineWidth=1;
      for(var i=0;i<3;i++){x.beginPath();x.moveTo(bx+bw*0.2+i*bw*0.3,by);x.quadraticCurveTo(bx+bw*0.2+i*bw*0.3+5,by+bh*0.4,bx+bw*0.2+i*bw*0.3-3,by+bh*0.7);x.stroke();}
    }else if(fid==='egypt'){
      x.fillStyle='#1a1a1a';x.beginPath();x.moveTo(bx+bw*0.15,by+2);x.lineTo(bx+bw*0.3,by-H*0.13);x.lineTo(bx+bw*0.7,by-H*0.13);x.lineTo(bx+bw*0.85,by+2);x.closePath();x.fill();
      x.strokeStyle='#ffcc00';x.lineWidth=1;x.stroke();
      x.fillStyle='#ffcc00';x.beginPath();x.arc(W/2,by-H*0.03,3,0,Math.PI*2);x.fill();
      x.fillStyle='#1a1a1a';x.beginPath();x.arc(W/2,by-H*0.03,1.2,0,Math.PI*2);x.fill();
    }else{
      x.fillStyle=c.accent;x.fillRect(bx-2,by-3,bw+4,5);
    }

    // === TYPE DETAILS ===
    if(type==='hq'){
      x.fillStyle='#111';x.beginPath();x.moveTo(W/2-W*0.1,by+bh);x.lineTo(W/2-W*0.1,by+bh*0.6);x.arc(W/2,by+bh*0.6,W*0.1,Math.PI,0);x.lineTo(W/2+W*0.1,by+bh);x.closePath();x.fill();
      x.fillStyle='#ffe866';for(var i=0;i<3;i++)x.fillRect(bx+bw*0.15+i*bw*0.28,by+bh*0.2,bw*0.1,bh*0.15);
      x.fillStyle=c.accent;x.fillRect(W*0.8,by-H*0.25,1.5,H*0.15);x.fillRect(W*0.8+1.5,by-H*0.25,8,5);
    }else if(type==='barracks'){
      x.fillStyle='#ffcc00';x.beginPath();x.arc(W/2,by+bh*0.35,W*0.08,0,Math.PI*2);x.fill();
      x.fillStyle='#111';x.fillRect(W/2-W*0.1,by+bh*0.6,W*0.2,bh*0.4);
    }else if(type==='refinery'){
      x.fillStyle='#555';x.fillRect(bx+bw*0.1,by+bh*0.7,bw*0.8,bh*0.08);
      x.fillStyle='#c8a832';x.beginPath();x.moveTo(bx+bw*0.6,by+bh);x.lineTo(bx+bw*0.7,by+bh*0.5);x.lineTo(bx+bw*0.9,by+bh);x.fill();
    }else if(type==='factory'){
      isoCylinder(x,bx+bw*0.2,by-H*0.02,bw*0.04,bw*0.02,H*0.12,'#888','#666');
      isoCylinder(x,bx+bw*0.8,by-H*0.02,bw*0.04,bw*0.02,H*0.12,'#888','#666');
      x.fillStyle='#333';x.fillRect(bx+bw*0.2,by+bh*0.5,bw*0.6,bh*0.5);
      x.strokeStyle='#555';x.lineWidth=0.5;for(var i=0;i<4;i++){x.beginPath();x.moveTo(bx+bw*0.2,by+bh*0.55+i*bh*0.12);x.lineTo(bx+bw*0.8,by+bh*0.55+i*bh*0.12);x.stroke();}
    }else if(type==='turret'){
      x.fillStyle='#777';x.save();x.translate(W/2,H*0.4);x.rotate(-0.3);x.fillRect(0,-2,W*0.4,4);x.restore();
      var tg=x.createRadialGradient(W/2-2,H*0.35,0,W/2,H*0.4,W*0.2);tg.addColorStop(0,c.accent);tg.addColorStop(1,c.dark);
      x.fillStyle=tg;x.beginPath();x.arc(W/2,H*0.4,W*0.2,0,Math.PI*2);x.fill();
    }else if(type==='powerplant'){
      isoCylinder(x,W*0.35,by+bh*0.3,W*0.12,W*0.06,bh*0.6,c.accent,c.main);
      x.fillStyle='rgba(100,200,255,0.15)';x.beginPath();x.arc(W/2,by+bh*0.4,W*0.12,0,Math.PI*2);x.fill();
    }else if(type==='superweapon'){
      x.fillStyle='#ffcc00';for(var i=0;i<Math.floor(bw/8);i++)x.fillRect(bx+i*8,by+bh-4,4,4);
      var eg=x.createRadialGradient(W/2,by+bh*0.4,0,W/2,by+bh*0.4,W*0.18);eg.addColorStop(0,'#fff');eg.addColorStop(0.3,c.accent);eg.addColorStop(1,'rgba(0,0,0,0)');
      x.fillStyle=eg;x.beginPath();x.arc(W/2,by+bh*0.4,W*0.18,0,Math.PI*2);x.fill();
      x.fillStyle='#aaa';x.fillRect(W/2-1,by-H*0.18,2,H*0.12);
      x.fillStyle=c.light;x.beginPath();x.arc(W/2,by-H*0.18,3,0,Math.PI*2);x.fill();
    }else if(type==='techlab'){
      x.fillStyle='#aaa';x.beginPath();x.ellipse(W/2,by+bh*0.3,W*0.18,H*0.08,-0.3,0,Math.PI*2);x.fill();
      x.fillStyle='#888';x.fillRect(W/2-1,by+bh*0.3,2,bh*0.4);
      x.fillStyle='rgba(0,255,200,0.2)';x.fillRect(bx+bw*0.15,by+bh*0.2,bw*0.3,bh*0.25);
    }else if(type==='radar'){
      x.fillStyle='#aaa';x.fillRect(W/2-1,by-H*0.08,2,H*0.15);
      x.fillStyle=c.light;x.beginPath();x.ellipse(W/2,by-H*0.08,W*0.22,H*0.06,0,0,Math.PI*2);x.fill();
    }else if(type==='helipad'){
      x.strokeStyle='rgba(255,255,255,0.25)';x.lineWidth=1;x.beginPath();x.arc(W/2,by+bh*0.5,W*0.18,0,Math.PI*2);x.stroke();
      x.fillStyle='rgba(255,255,255,0.3)';
      x.fillRect(W/2-W*0.12,by+bh*0.3,W*0.04,bh*0.4);
      x.fillRect(W/2+W*0.08,by+bh*0.3,W*0.04,bh*0.4);
      x.fillRect(W/2-W*0.12,by+bh*0.48,W*0.24,W*0.04);
    }else if(type==='wall'){
      isoBox(x,W/2,H*0.5,W-4,H*0.4,H*0.35,c.main,c.dark,c.dark);
    }

    // Faction glow + team dot + lighting
    x.fillStyle=c.glow;x.beginPath();x.arc(W/2,by+bh*0.5,W*0.25,0,Math.PI*2);x.fill();
    x.fillStyle=team===0?'#44ff44':'#ff4444';x.beginPath();x.arc(4,4,3,0,Math.PI*2);x.fill();
    addLighting(x,W,H);
  });
}