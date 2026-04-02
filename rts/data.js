// ---- GAME DATA ----
const TILE=32,MAP_W=60,MAP_H=40;
const BUILDINGS={
  hq:{name:'HQ',w:3,h:3,hp:1000,cost:0,power:10,pop:5,color:'#48f',builds:['barracks','powerplant','refinery','turret','wall']},
  barracks:{name:'Barracks',w:2,h:2,hp:400,cost:300,power:-2,pop:0,color:'#a64',trains:['soldier','rpg']},
  powerplant:{name:'Power Plant',w:2,h:2,hp:250,cost:200,power:15,pop:0,color:'#ff0'},
  refinery:{name:'Refinery',w:2,h:2,hp:350,cost:400,power:-3,pop:0,color:'#4a4',income:25},
  turret:{name:'Turret',w:1,h:1,hp:300,cost:250,power:-2,pop:0,color:'#f44',range:5,atk:15,atkSpd:40},
  wall:{name:'Wall',w:1,h:1,hp:500,cost:50,power:0,pop:0,color:'#888'}
};
const UNITS={
  soldier:{name:'Soldier',hp:80,atk:10,range:4,spd:1.5,cost:100,pop:1,atkSpd:30,color:'#4f4',sz:8},
  rpg:{name:'RPG',hp:60,atk:25,range:5,spd:1,cost:200,pop:1,atkSpd:50,color:'#fa4',sz:8}
};
