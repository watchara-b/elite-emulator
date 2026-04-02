// Map Detail/Decoration System — v2 with collision + spatial grid + perf
function moRand(x,y,i){var h=x*374761+y*668265+i*12345;h=(h^(h>>13))*1274126177;return((h^(h>>16))&0x7fffffff)/0x7fffffff;}

var mapObjects=[];
var _moGrid={}; // spatial grid: key="tx,ty" -> array of objects on that tile
var _SOLID_TYPES={rock:1,boulder:1,tree_stump:1,bush:1,cactus:1,desert_rock:1,fallen_log:1};

var _moTypes={0:['rock','flower','mushroom','leaf','grass_clump'],3:['tree_stump','fallen_log','fern','bush','moss'],
5:['dune','cactus','bones','desert_rock','dry_bush'],7:['tire_mark','pothole'],8:['butterfly','flower'],
1:['crystal_shard','pickaxe'],4:['boulder']};

function generateMapObjects(map,W,H){
  mapObjects=[]; _moGrid={};
  var colors={flower:['#e33','#ee3','#c3f','#fff','#f90'],leaf:['#c70','#a50','#dc3'],crystal_shard:['#4ef','#f4e','#4fe']};

  // Base exclusion zones — no objects near spawn areas
  var BASE_RADIUS = 10;
  var bases = [
    {x:5, y:4},           // player spawn
    {x:W-5, y:H-5}        // enemy spawn
  ];
  function nearBase(tx,ty){
    for(var b=0;b<bases.length;b++){
      if(Math.abs(tx-bases[b].x)<BASE_RADIUS && Math.abs(ty-bases[b].y)<BASE_RADIUS) return true;
    }
    return false;
  }

  // Attack lanes — clear paths between bases (no solid objects)
  // 3 lanes: center diagonal, top horizontal-then-down, bottom up-then-horizontal
  var LANE_WIDTH = 3;
  function inLane(tx,ty){
    // Center diagonal lane
    var cx=W/2, cy=H/2;
    var t=((tx-5)/(W-10));  // 0 at player, 1 at enemy
    var laneY=4+(H-9)*t;    // diagonal from (5,4) to (W-5,H-5)
    if(Math.abs(ty-laneY)<LANE_WIDTH) return true;
    // Top lane: horizontal at y=H*0.3
    var topY=Math.floor(H*0.3);
    if(Math.abs(ty-topY)<LANE_WIDTH && tx>3 && tx<W-3) return true;
    // Bottom lane: horizontal at y=H*0.7
    var botY=Math.floor(H*0.7);
    if(Math.abs(ty-botY)<LANE_WIDTH && tx>3 && tx<W-3) return true;
    // Vertical connectors from bases to lanes
    if(tx>3 && tx<8 && ty>4 && ty<topY+LANE_WIDTH) return true;   // player to top
    if(tx>3 && tx<8 && ty>botY-LANE_WIDTH && ty<H-3) return true; // player to bot
    if(tx>W-8 && tx<W-3 && ty>topY-LANE_WIDTH && ty<H-5) return true; // enemy to top
    if(tx>W-8 && tx<W-3 && ty>4 && ty<botY+LANE_WIDTH) return true;   // enemy to bot
    return false;
  }

  for(var ty=0;ty<H;ty++)for(var tx=0;tx<W;tx++){
    var t=map[ty][tx],types=_moTypes[t];
    if(!types)continue;
    // Skip near bases
    if(nearBase(tx,ty)) continue;
    // In lanes: only non-solid decorations (flowers, leaves, moss — no rocks/stumps/boulders)
    var laneArea=inLane(tx,ty);
    var n=Math.floor(moRand(tx,ty,99)*2.5);
    var key=tx*10000+ty;
    for(var i=0;i<n;i++){
      var tp=types[Math.floor(moRand(tx,ty,i*7)*types.length)];
      // In lanes: skip solid objects
      if(laneArea && _SOLID_TYPES[tp]) continue;
      var c2=colors[tp]?colors[tp][Math.floor(moRand(tx,ty,i*3)*colors[tp].length)]:null;
      var obj={x:tx*32+moRand(tx,ty,i*2)*24+4,y:ty*32+moRand(tx,ty,i*5)*24+4,
        tx:tx,ty:ty,type:tp,size:3+moRand(tx,ty,i*4)*4,color:c2,rotation:moRand(tx,ty,i*6)*6.28,
        solid:!!_SOLID_TYPES[tp]};
      mapObjects.push(obj);
      if(!_moGrid[key])_moGrid[key]=[];
      _moGrid[key].push(obj);
    }
  }
}

// Check if tile has solid map objects
function hasSolidObject(tx,ty){
  var objs=_moGrid[tx*10000+ty];
  if(!objs)return false;
  for(var i=0;i<objs.length;i++)if(objs[i].solid)return true;
  return false;
}

// Drawing functions
var _moDraw={
  rock:function(c,x,y,s){c.fillStyle='#777';c.beginPath();for(var i=0;i<5;i++){var a=i/5*6.28;c.lineTo(x+Math.cos(a)*s*(0.7+0.3*Math.sin(i*2)),y+Math.sin(a)*s*(0.6+0.3*Math.cos(i*3)));}c.fill();c.fillStyle='rgba(255,255,255,0.25)';c.fillRect(x-s*0.3,y-s*0.4,s*0.4,s*0.3);},
  flower:function(c,x,y,s,col){c.fillStyle='#3a3';c.fillRect(x-0.5,y,1,s);for(var i=0;i<5;i++){var a=i/5*6.28;c.fillStyle=col||'#f44';c.beginPath();c.arc(x+Math.cos(a)*s*0.35,y-s*0.1+Math.sin(a)*s*0.35,s*0.22,0,6.28);c.fill();}c.fillStyle='#ff0';c.beginPath();c.arc(x,y-s*0.1,s*0.15,0,6.28);c.fill();},
  mushroom:function(c,x,y,s){c.fillStyle='#dca';c.fillRect(x-1,y-s*0.3,2,s*0.5);c.fillStyle='#b33';c.beginPath();c.ellipse(x,y-s*0.3,s*0.5,s*0.35,0,Math.PI,0);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x-s*0.15,y-s*0.45,0.8,0,6.28);c.fill();},
  leaf:function(c,x,y,s,col,r){c.save();c.translate(x,y);c.rotate(r);c.fillStyle=col||'#c70';c.beginPath();c.ellipse(0,0,s*0.5,s*0.2,0,0,6.28);c.fill();c.restore();},
  grass_clump:function(c,x,y,s){c.fillStyle='#2a5';for(var i=0;i<3;i++){c.beginPath();c.moveTo(x+i*2-2,y);c.lineTo(x+i*2-1,y-s);c.lineTo(x+i*2,y);c.fill();}},
  tree_stump:function(c,x,y,s){c.fillStyle='#543';c.beginPath();c.arc(x,y,s,0,6.28);c.fill();c.fillStyle='#a87';c.beginPath();c.arc(x,y,s*0.65,0,6.28);c.fill();},
  fallen_log:function(c,x,y,s,_,r){c.save();c.translate(x,y);c.rotate(r);c.fillStyle='#654';c.fillRect(-s*1.2,-s*0.3,s*2.4,s*0.6);c.restore();},
  fern:function(c,x,y,s){c.strokeStyle='#3a5';c.lineWidth=1;for(var i=0;i<5;i++){var a=-1+i*0.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(a)*s*1.2,y-Math.cos(a)*s*1.2);c.stroke();}},
  bush:function(c,x,y,s){for(var i=0;i<3;i++){c.fillStyle=i?'#3a3':'#2a2';c.beginPath();c.arc(x+i*s*0.4-s*0.3,y-i*s*0.15,s*0.5,0,6.28);c.fill();}},
  moss:function(c,x,y,s){c.fillStyle='rgba(50,140,50,0.3)';c.beginPath();c.ellipse(x,y,s,s*0.5,0,0,6.28);c.fill();},
  dune:function(c,x,y,s){c.fillStyle='#dca';c.beginPath();c.ellipse(x,y,s,s*0.4,0,Math.PI,0);c.fill();},
  cactus:function(c,x,y,s){c.fillStyle='#3a3';c.fillRect(x-s*0.2,y-s*1.2,s*0.4,s*1.2);c.fillRect(x-s*0.7,y-s,s*0.5,s*0.25);c.fillRect(x+s*0.2,y-s*0.6,s*0.5,s*0.25);},
  bones:function(c,x,y,s){c.strokeStyle='#eee';c.lineWidth=1.5;c.beginPath();c.moveTo(x-s,y-s);c.lineTo(x+s,y+s);c.moveTo(x+s,y-s);c.lineTo(x-s,y+s);c.stroke();c.lineWidth=1;},
  desert_rock:function(c,x,y,s){c.fillStyle='#b97';c.beginPath();for(var i=0;i<5;i++){var a=i/5*6.28;c.lineTo(x+Math.cos(a)*s*0.6,y+Math.sin(a)*s*0.5);}c.fill();},
  dry_bush:function(c,x,y,s){c.strokeStyle='#864';c.lineWidth=1;for(var i=0;i<4;i++){var a=-0.8+i*0.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(a)*s,y-Math.cos(a)*s);c.stroke();}},
  tire_mark:function(c,x,y,s,_,r){c.strokeStyle='rgba(0,0,0,0.15)';c.lineWidth=2;c.beginPath();c.arc(x,y,s*2,r,r+1.2);c.stroke();c.lineWidth=1;},
  pothole:function(c,x,y,s){c.fillStyle='rgba(0,0,0,0.2)';c.beginPath();c.arc(x,y,s,0,6.28);c.fill();},
  crystal_shard:function(c,x,y,s,col){c.fillStyle=col||'#4ef';c.beginPath();c.moveTo(x,y-s);c.lineTo(x-s*0.35,y);c.lineTo(x+s*0.35,y);c.fill();},
  pickaxe:function(c,x,y,s){c.strokeStyle='#864';c.lineWidth=1.5;c.beginPath();c.moveTo(x-s,y+s);c.lineTo(x+s,y-s);c.stroke();c.lineWidth=1;},
  boulder:function(c,x,y,s){c.fillStyle='#888';c.beginPath();c.arc(x,y,s,0,6.28);c.fill();c.fillStyle='rgba(255,255,255,0.15)';c.beginPath();c.arc(x-s*0.2,y-s*0.2,s*0.4,0,6.28);c.fill();},
  butterfly:function(c,x,y,s,col,_,t){var f=Math.sin((t||0)*0.12+x)*0.6;c.fillStyle=col||'#f4e';c.beginPath();c.moveTo(x,y);c.lineTo(x-s,y-s*f);c.lineTo(x-s*0.5,y+s*0.4);c.fill();c.beginPath();c.moveTo(x,y);c.lineTo(x+s,y-s*f);c.lineTo(x+s*0.5,y+s*0.4);c.fill();}
};

// Hoisted constants (avoid allocation in hot loops)
var _moAdj = [[0,-1],[0,1],[-1,0],[1,0]];
var _moAdj2 = [[0,1],[1,0]];

function drawMapObjects(ctx,camX,camY,screenW,screenH,TILE){
  var sx=Math.max(0,Math.floor(camX/TILE)-1), sy=Math.max(0,Math.floor(camY/TILE)-1);
  var ex=Math.min(MAP_W,Math.ceil((camX+screenW)/TILE)+1), ey=Math.min(MAP_H,Math.ceil((camY+screenH)/TILE)+1);
  for(var ty=sy;ty<ey;ty++)for(var tx=sx;tx<ex;tx++){
    var objs=_moGrid[tx*10000+ty]; // numeric key instead of string concat
    if(!objs)continue;
    for(var i=0;i<objs.length;i++){
      var o=objs[i],fn=_moDraw[o.type];
      if(fn)fn(ctx,o.x-camX,o.y-camY,o.size,o.color,o.rotation,gameTime);
    }
  }
}

function drawEnhancedTile(ctx,px,py,tx,ty,tileType,TILE,gameTime){
  if(tileType===2||tileType===6){
    for(var i=0;i<4;i++){var nx=tx+_moAdj[i][0],ny=ty+_moAdj[i][1];
      if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H&&map[ny][nx]!==2&&map[ny][nx]!==6){
        ctx.fillStyle='rgba(255,255,255,'+(0.15+Math.sin(gameTime*0.05+tx+ty*2)*0.08)+')';
        if(i<2)ctx.fillRect(px,py+(i?TILE-2:0),TILE,2);
        else ctx.fillRect(px+(i===2?0:TILE-2),py,2,TILE);
      }
    }
  }else if(tileType===4){
    for(var i=0;i<2;i++){var nx=tx+_moAdj2[i][0],ny=ty+_moAdj2[i][1];
      if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H&&map[ny][nx]!==4){
        ctx.fillStyle='rgba(0,0,0,0.15)';
        if(i===0)ctx.fillRect(px,py+TILE-3,TILE,3);
        else ctx.fillRect(px+TILE-3,py,3,TILE);
      }
    }
  }else if(tileType===7){
    ctx.strokeStyle='rgba(255,255,200,0.25)';ctx.setLineDash([5,7]);
    ctx.beginPath();ctx.moveTo(px+TILE/2,py);ctx.lineTo(px+TILE/2,py+TILE);ctx.stroke();ctx.setLineDash([]);
  }
}
