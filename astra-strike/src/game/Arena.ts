import { Box3, Ray, Vector3 } from 'three';
import { SPAWN, WORLD_BOXES, boxFor, plantSite, zoneAt, type Vec3 } from '@/config/map';
import { ABILITIES, WEAPONS, type AbilityId, type WeaponId } from '@/config/weapons';
import { analyze, ordersFor } from '@/ai/AstraDirector';
import { clearSight } from '@/ai/BotPerception';
import { findPath, walkable } from '@/ai/Navigation';
import { sound } from '@/audio/SoundSystem';
import { freshStats, type Bot, type Effect, type GameSnapshot, type Phase, type RoundStats, type Wall } from './types';

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0]-b[0], a[2]-b[2]);
const copy = (v: Vec3): Vec3 => [...v];
export class Arena {
  phase: Phase = 'menu'; training=false; epoch=0; round=1; clock=0; time=8;
  score: [number,number]=[0,0]; health=100; armor=0; credits=800;
  weapon: WeaponId='pistol'; ownedRifle=false; ammo={rifle:25,pistol:12}; reserve={rifle:75,pistol:48};
  player: Vec3=copy(SPAWN); eye: Vec3=[0,1.65,21]; yaw=0; pitch=0; speed=0; grounded=true;
  keys=new Set<string>(); firing=false; ads=false; recoil=0; shotKick=0; nextShot=0; burst=0;
  reloading=0; reloadDuration=0; reloadWeapon: 'rifle'|'pistol'|null=null;
  kills=0; deaths=0; history: RoundStats[]=[]; stats=freshStats(); total=freshStats();
  bots: Bot[]=[]; effects: Effect[]=[]; walls: Wall[]=[]; flashes: {position:Vec3;velocity:Vec3;at:number}[]=[];
  core: GameSnapshot['core']={status:'carried',position:[0,0,0],site:null,timer:40,progress:0};
  abilities: Record<AbilityId,number>={wall:0,flash:0,dash:0,overdrive:0};
  charges={flash:1,wall:1}; overdriveUntil=0; dashUntil=0;
  analysis=analyze([]); roundWon=false; reason=''; killer=''; notification=''; notificationUntil=0;
  hitMarker=''; hitUntil=0; damageFlash=0; feed: GameSnapshot['feed']=[];
  lastSound: {position:Vec3;at:number}|null=null; aiAt=0; lastTick=0; serial=0; nextStep=0;
  previousZone='ATTACKER SPAWN'; routeChosen=false; adaptationCount=0; lastDefuser=-1;
  start(training=false) {
    this.training=training; this.score=[0,0];this.round=1;this.clock=0;this.kills=0;this.deaths=0;
    this.credits=800;this.history=[];this.total=freshStats();this.analysis=analyze([]);this.ownedRifle=training;
    this.armor=training?50:0;this.adaptationCount=0;this.newRound();
    sound.play('click');
  }
  newRound() {
    this.epoch++;this.phase=this.training?'training':'buy';this.time=this.training?0:8;
    this.health=100;this.player=copy(SPAWN);this.eye=[0,1.65,21];this.yaw=0;this.pitch=0;
    this.weapon=this.ownedRifle?'rifle':'pistol';this.ammo={rifle:25,pistol:12};this.reserve={rifle:75,pistol:48};
    this.stats=freshStats();this.effects=[];this.walls=[];this.flashes=[];this.feed=[];this.keys.clear();
    this.firing=false;this.ads=false;this.recoil=0;this.shotKick=0;this.burst=0;this.nextShot=0;this.reloading=0;this.reloadWeapon=null;
    this.core={status:'carried',position:[0,0,0],site:null,timer:40,progress:0};this.charges={flash:1,wall:1};
    this.abilities={wall:0,flash:0,dash:0,overdrive:0};this.overdriveUntil=0;this.dashUntil=0;
    this.hitUntil=0;this.damageFlash=0;this.killer='';this.lastSound=null;this.aiAt=0;this.lastTick=0;this.lastDefuser=-1;
    this.routeChosen=false;this.previousZone='ATTACKER SPAWN';
    const positions=this.training?[[-3,0,11],[3,0,7],[-2.8,0,-4],[2.8,0,-10]] as Vec3[]:ordersFor(this.analysis.strategy);
    this.bots=positions.map((p,i)=>({id:i,name:`SENTINEL-0${i+1}`,position:copy(p),anchor:copy(p),target:copy(p),health:100,state:i===3?'PATROL':'HOLD',yaw:Math.PI,path:[],repathAt:0,nextShot:0,seenAt:-1,lastSeen:null,knownUntil:0,reaction:.28+i*.075,blindUntil:0,hitAt:-10,defuse:0,abilityUsed:false,respawnAt:0}));
    this.notify(this.training?'TRAINING RANGE · AMMO REFILLS AUTOMATICALLY':'PREPARE TO BREACH · B TO BUY',4);
  }
  menu() { this.phase='menu';this.firing=false;this.keys.clear();this.effects=[];this.walls=[];this.flashes=[]; }
  notify(message:string,duration=2.5) {this.notification=message;this.notificationUntil=this.clock+duration;}
  selectWeapon(id:WeaponId) {
    if(this.health<=0) return;
    if(id==='rifle'&&!this.ownedRifle){this.notify('VX-7 NOT OWNED · PURCHASE DURING BUY PHASE');return;}
    if(id==='core'&&(this.core.status!=='carried'||this.training))return;
    this.weapon=id;this.reloading=0;this.reloadWeapon=null;this.ads=false;this.firing=false;
  }
  buy(item:string):boolean {
    if(this.phase!=='buy')return false;
    const cost:Record<string,number>={rifle:2900,pistol:500,light:400,heavy:1000,flash:200,wall:300};
    if(!(item in cost))return false;
    if((item==='rifle'&&this.ownedRifle)||(item==='pistol'&&this.ammo.pistol===12&&this.reserve.pistol===48)||(item==='heavy'&&this.armor===50)||(item==='light'&&this.armor>=25)||((item==='flash'||item==='wall')&&this.charges[item]>=2)){this.notify('ALREADY EQUIPPED');return false;}
    if(this.credits<cost[item]){this.notify('INSUFFICIENT CREDITS');return false;}
    this.credits-=cost[item];
    if(item==='rifle'){this.ownedRifle=true;this.weapon='rifle';this.ammo.rifle=25;this.reserve.rifle=75;}
    if(item==='pistol'){this.ammo.pistol=12;this.reserve.pistol=48;}
    if(item==='light')this.armor=25;
    if(item==='heavy')this.armor=50;
    if(item==='flash'||item==='wall')this.charges[item]++;
    sound.play('click');this.notify('EQUIPMENT ACQUIRED');return true;
  }
  reload() {
    if(this.weapon!=='rifle'&&this.weapon!=='pistol')return;
    const weapon=WEAPONS[this.weapon];
    if(this.reloading>0||this.ammo[this.weapon]>=weapon.magazine||this.reserve[this.weapon]<=0||this.health<=0)return;
    this.reloadDuration=weapon.reload*(this.overdriveUntil>this.clock?.66:1);this.reloading=this.reloadDuration;this.reloadWeapon=this.weapon;
    sound.play('reload');
  }
  effect(type:Effect['type'],from:Vec3,to:Vec3,life:number,enemy=false) {
    this.effects.push({id:++this.serial,type,from:copy(from),to:copy(to),life,total:life,enemy});
    if(this.effects.length>70)this.effects.shift();
  }
  shoot(direction:Vector3):boolean {
    if(!['combat','planted','training'].includes(this.phase)||this.health<=0||this.reloading>0||this.clock<this.nextShot||this.weapon==='core')return false;
    const id=this.weapon, weapon=WEAPONS[id];
    if(id!=='knife'&&this.ammo[id]<=0){this.reload();return false;}
    this.nextShot=this.clock+weapon.interval;
    if(id!=='knife')this.ammo[id]--;
    this.stats.shots++;this.stats.weapons[id]++;this.burst++;
    const spread=id==='knife'?0:(this.speed>3.5?.025:this.speed>.8?.009:.0015)+(this.grounded?0:.035)+Math.min(this.burst*.0014,.018);
    const dir=direction.clone();dir.x+=(Math.random()-.5)*spread;dir.y+=(Math.random()-.5)*spread;dir.z+=(Math.random()-.5)*spread;dir.normalize();
    const origin=new Vector3(...this.eye),ray=new Ray(origin,dir),point=new Vector3();let nearest=weapon.range;
    for(const box of [...WORLD_BOXES,...this.walls.map(w=>boxFor(w.position,w.size))])if(ray.intersectBox(box,point))nearest=Math.min(nearest,origin.distanceTo(point));
    let victim:Bot|null=null,part:'head'|'body'|'leg'='body';
    for(const bot of this.bots){
      if(bot.health<=0)continue;
      for(const [name,y,height,width] of [['head',1.62,.4,.44],['body',1.06,.76,.68],['leg',.38,.62,.53]] as const){
        const box=boxFor([bot.position[0],y,bot.position[2]],[width,height,.5]);
        if(ray.intersectBox(box,point)){const d=point.distanceTo(origin);if(d<nearest){nearest=d;victim=bot;part=name;}}
      }
    }
    const end=origin.clone().addScaledVector(dir,nearest).toArray() as Vec3;
    this.effect('tracer',this.eye,end,.09);this.effect('impact',end,end,.25);
    this.shotKick=1;this.recoil=Math.min(this.recoil+(id==='rifle'?.8:.6),5);
    const recoil=(id==='rifle'?.006:.012)*(1+Math.min(this.burst,12)*.07)*(this.overdriveUntil>this.clock?.72:1);
    this.pitch=Math.max(-1.45,this.pitch-recoil);this.yaw+=(Math.random()-.5)*recoil*.7;
    sound.play(id);this.lastSound={position:copy(this.player),at:this.clock};
    if(victim){
      const falloff=nearest>28&&id==='pistol'?.8:1;const damage=Math.round(weapon[part]*falloff);
      this.stats.hits++;this.stats.damage+=Math.min(damage,victim.health);if(part==='head')this.stats.headshots++;
      this.stats.distanceSum+=nearest;victim.health=Math.max(0,victim.health-damage);victim.hitAt=this.clock;
      victim.knownUntil=this.clock+3;victim.lastSeen=copy(this.player);victim.seenAt=this.clock;victim.state='ENGAGE';
      this.hitMarker=part==='head'?'HEADSHOT':'HIT';this.hitUntil=this.clock+.24;sound.play(part==='head'?'headshot':'hit');
      if(victim.health===0){
        this.kills++;this.stats.kills++;this.credits=Math.min(9000,this.credits+200);this.hitMarker=part==='head'?'HEADSHOT':'ELIMINATED';this.hitUntil=this.clock+1.1;
        this.feed.unshift({id:++this.serial,source:'NOVA',target:victim.name,weapon:weapon.name,headshot:part==='head',until:this.clock+6});
        victim.respawnAt=this.clock+2;
        if(!this.training&&this.bots.every(b=>b.health<=0))this.endRound(true,'ENEMY TEAM ELIMINATED');
      }
    }
    return true;
  }
  hurt(damage:number,bot:Bot) {
    if(this.health<=0||this.training||!['combat','planted'].includes(this.phase))return;
    const absorbed=Math.min(this.armor,Math.ceil(damage*.66));this.armor-=absorbed;this.health=Math.max(0,this.health-(damage-absorbed));this.damageFlash=.7;
    sound.play('hit');
    if(this.health===0){this.deaths++;this.killer=bot.name;this.firing=false;this.keys.clear();this.feed.unshift({id:++this.serial,source:bot.name,target:'NOVA',weapon:'AR-4',headshot:false,until:this.clock+8});
      if(this.core.status!=='planted')this.endRound(false,'PLAYER ELIMINATED');else this.notify('ELIMINATED · CORE STILL ARMED',6);
    }
  }
  useAbility(id:AbilityId) {
    if(!['combat','planted','training'].includes(this.phase)||this.health<=0||this.abilities[id]>this.clock)return;
    if((id==='flash'||id==='wall')&&this.charges[id]<=0){this.notify('ABILITY USED · RESTOCK NEXT ROUND');return;}
    this.abilities[id]=this.clock+(this.training?3:ABILITIES[id].cooldown);this.stats.abilities++;
    const direction:Vec3=[-Math.sin(this.yaw),0,-Math.cos(this.yaw)];
    if(id==='dash'){this.dashUntil=this.clock+.18;this.effect('pulse',this.player,this.player,.3);}
    if(id==='overdrive'){this.overdriveUntil=this.clock+10;this.notify('OVERDRIVE ACTIVE',2);}
    if(id==='wall'){
      if(!this.training)this.charges.wall--;
      let d=4;while(d>1&&!clearSight(this.eye,[this.eye[0]+direction[0]*d,this.eye[1],this.eye[2]+direction[2]*d],this.walls))d-=.5;
      const pos:Vec3=[this.player[0]+direction[0]*d,1.7,this.player[2]+direction[2]*d];
      this.walls.push({position:pos,size:Math.abs(direction[2])>Math.abs(direction[0])?[6,3.4,.22]:[.22,3.4,6],until:this.clock+8});
    }
    if(id==='flash'){
      if(!this.training)this.charges.flash--;
      this.flashes.push({position:copy(this.eye),velocity:[direction[0]*13,4-this.pitch*8,direction[2]*13],at:this.clock+1});
    }
    sound.play('ability');
  }
  tick(dt:number) {
    if(this.phase==='menu'||this.phase==='matchEnd')return;
    this.clock+=dt;this.damageFlash=Math.max(0,this.damageFlash-dt*1.4);this.recoil=Math.max(0,this.recoil-dt*3);this.shotKick=Math.max(0,this.shotKick-dt*9);
    if(this.clock>this.nextShot+.2)this.burst=Math.max(0,this.burst-dt*12);
    this.effects=this.effects.filter(e=>(e.life-=dt)>0);this.walls=this.walls.filter(w=>w.until>this.clock);this.feed=this.feed.filter(f=>f.until>this.clock);
    if(this.reloading>0){this.reloading=Math.max(0,this.reloading-dt);if(this.reloading===0&&this.reloadWeapon){const id=this.reloadWeapon,amount=Math.min(WEAPONS[id].magazine-this.ammo[id],this.reserve[id]);this.ammo[id]+=amount;this.reserve[id]-=amount;this.reloadWeapon=null;sound.play('reload');}}
    if(this.phase==='buy'){this.time=Math.max(0,this.time-dt);if(this.time<=0){this.phase='combat';this.time=100;this.notify('ROUND LIVE · ARM THE CORE',3);}return;}
    if(this.phase==='roundEnd'){this.time-=dt;if(this.time<=0){if(this.score.some(n=>n>=5)){this.phase='matchEnd';}else{this.phase='analysis';this.time=4;}}return;}
    if(this.phase==='analysis'){this.time-=dt;if(this.time<=0)this.nextRound();return;}
    if(this.phase==='combat'){this.time=Math.max(0,this.time-dt);if(this.time<=0){this.endRound(false,'TIME EXPIRED');return;}}
    if(this.phase==='planted'){
      this.core.timer=Math.max(0,this.core.timer-dt);
      const interval=this.core.timer<6?.23:this.core.timer<15?.48:.95;
      if(this.clock-this.lastTick>interval){this.lastTick=this.clock;sound.play('tick');this.effect('pulse',this.core.position,this.core.position,.45);}
      if(this.core.timer<=0){this.core.status='detonated';this.effect('flash',this.core.position,this.core.position,2);sound.play('explosion');this.endRound(true,'CORE DETONATED');return;}
    }
    if(this.health>0){
      this.stats.combatTime+=dt;const zone=zoneAt(this.player[0],this.player[2]);
      if(this.speed>.8)this.stats.movingTime+=dt;if(this.speed>3.5)this.stats.runTime+=dt;
      if(zone==='MID'||zone==='MID HALL')this.stats.midTime+=dt;
      if(!this.routeChosen&&this.player[2]<13){this.stats.route=this.player[0]<-12?'A MAIN':this.player[0]>12?'B MAIN':'MID';this.routeChosen=true;this.stats.rush=this.stats.combatTime<8;}
      if((zone==='VENT'||zone==='CONNECTOR')&&this.previousZone!==zone)this.stats.flanks++;
      this.previousZone=zone;
      if(this.speed>1&&this.grounded&&this.clock>this.nextStep){this.nextStep=this.clock+(this.speed>3.5?.38:.65);sound.play('step');if(this.speed>3.5)this.lastSound={position:copy(this.player),at:this.clock};}
      const site=plantSite(this.player[0],this.player[2]);
      if(this.phase==='combat'&&site&&this.weapon==='core'&&this.keys.has('KeyF')&&this.grounded&&this.speed<.8){
        this.core.progress+=dt;if(this.core.progress>=3){this.core={status:'planted',position:[this.player[0],.25,this.player[2]],site,timer:40,progress:0};this.stats.plant=site;this.phase='planted';this.weapon=this.ownedRifle?'rifle':'pistol';this.credits=Math.min(9000,this.credits+300);sound.play('plant');this.notify(`CORE ARMED · SITE ${site}`,3);}
      }else this.core.progress=0;
    }
    for(const flash of this.flashes){
      const next:Vec3=[flash.position[0]+flash.velocity[0]*dt,Math.max(.25,flash.position[1]+flash.velocity[1]*dt),flash.position[2]+flash.velocity[2]*dt];
      if(clearSight(flash.position,next,this.walls))flash.position=next;else{flash.velocity[0]*=-.3;flash.velocity[2]*=-.3;}
      flash.velocity[1]-=10*dt;
      if(flash.at<=this.clock){this.effect('flash',flash.position,flash.position,.55);sound.play('ability');for(const b of this.bots){const dx=flash.position[0]-b.position[0],dz=flash.position[2]-b.position[2],len=Math.hypot(dx,dz);if(len<17&&(-Math.sin(b.yaw)*dx-Math.cos(b.yaw)*dz)/Math.max(.1,len)>-.1&&clearSight([b.position[0],1.6,b.position[2]],flash.position,this.walls))b.blindUntil=this.clock+3.2;}}
    }
    this.flashes=this.flashes.filter(f=>f.at>this.clock);
    if(this.training){
      for(const b of this.bots){if(b.health<=0&&b.respawnAt<this.clock){b.health=100;b.state='IDLE';}if(b.id>=2&&b.health>0)b.position[0]=b.anchor[0]+Math.sin(this.clock*.85+b.id)*.9;}
      if(this.reserve.rifle<50)this.reserve.rifle=75;if(this.reserve.pistol<30)this.reserve.pistol=48;
      return;
    }
    if(this.clock>=this.aiAt){this.aiAt=this.clock+.1;this.thinkBots();}
    this.moveBots(dt);
  }
  thinkBots() {
    const live=this.bots.filter(b=>b.health>0), planted=this.core.status==='planted';
    const defuser=planted?[...live].sort((a,b)=>distance(a.position,this.core.position)-distance(b.position,this.core.position))[0]:null;
    for(const bot of live){
      const eye:Vec3=[bot.position[0],1.62,bot.position[2]], d=distance(bot.position,this.player);
      const los=clearSight(eye,this.eye,this.walls);
      const viewToBot=[bot.position[0]-this.player[0],bot.position[2]-this.player[2]];
      if(this.health>0&&los&&(-Math.sin(this.yaw)*viewToBot[0]-Math.cos(this.yaw)*viewToBot[1])/Math.max(1,d)>.25)bot.knownUntil=this.clock+1.4;
      const facing=(-Math.sin(bot.yaw)*(this.player[0]-bot.position[0])-Math.cos(bot.yaw)*(this.player[2]-bot.position[2]))/Math.max(1,d);
      const visible=this.health>0&&d<38&&los&&bot.blindUntil<this.clock&&(facing>-.25||bot.state==='ENGAGE'||d<5);
      if(visible){
        if(bot.seenAt<0)bot.seenAt=this.clock;bot.lastSeen=copy(this.player);bot.state='ENGAGE';bot.target=copy(bot.position);
        bot.yaw=Math.atan2(-(this.player[0]-bot.position[0]),-(this.player[2]-bot.position[2]));
        if(this.clock-bot.seenAt>bot.reaction&&this.clock>bot.nextShot){
          bot.nextShot=this.clock+.32+Math.random()*.25;
          const accuracy=Math.max(.16,.7-d*.012-(this.speed>3.5?.13:0));
          this.effect('tracer',eye,this.eye,.1,true);sound.play('rifle',(bot.position[0]-this.player[0])/25);
          if(Math.random()<accuracy)this.hurt(14+Math.floor(Math.random()*7),bot);
        }
        if(bot.health<36&&bot.id%2===0){bot.state='RETREAT';bot.target=copy(bot.anchor);}
        if(planted&&bot.id===defuser?.id&&d>15){bot.state='ROTATE';bot.target=copy(this.core.position);}
      }else{
        bot.seenAt=-1;
        if(planted){bot.state=bot.id===defuser?.id?'DEFUSE':'ROTATE';bot.target=bot.id===defuser?.id?copy(this.core.position):[this.core.position[0]+(bot.id%2?2:-2),0,this.core.position[2]+3];}
        else if(this.lastSound&&this.clock-this.lastSound.at<1.5&&distance(bot.position,this.lastSound.position)<(this.analysis.strategy==='AGGRESSIVE RETAKE'?38:27)){
          bot.lastSeen=copy(this.lastSound.position);bot.target=copy(this.lastSound.position);bot.state=bot.id===3?'FLANK':'INVESTIGATE';
          if(bot.id===3){bot.target=[bot.position[0]>0?17:-17,0,Math.max(-10,Math.min(12,this.lastSound.position[2]))];}
        }else if(bot.lastSeen&&distance(bot.position,bot.lastSeen)>1.5){bot.state='INVESTIGATE';bot.target=copy(bot.lastSeen);}
        else{bot.lastSeen=null;bot.state=bot.id===3?'PATROL':'HOLD';bot.target=bot.id===3?[bot.anchor[0],0,bot.anchor[2]+Math.sin(this.clock*.13)*4]:copy(bot.anchor);}
      }
      if(planted&&bot.id===defuser?.id&&distance(bot.position,this.core.position)<1.6&&(!visible||this.health<=0)){
        bot.state='DEFUSE';bot.target=copy(bot.position);
        if(!bot.abilityUsed){bot.abilityUsed=true;this.effect('smoke',bot.position,bot.position,3);const p:Vec3=[bot.position[0],1.4,bot.position[2]+2.5];this.walls.push({position:p,size:[4,2.8,.18],until:this.clock+3,enemy:true});}
      }
      if(bot.state!=='DEFUSE')bot.defuse=0;
      if(distance(bot.position,bot.target)>.65&&this.clock>bot.repathAt){bot.path=findPath(bot.position,bot.target);bot.repathAt=this.clock+1.1;}
      if(distance(bot.position,bot.target)<=.65)bot.path=[];
    }
  }
  moveBots(dt:number) {
    for(const bot of this.bots){
      if(bot.health<=0)continue;
      if(bot.blindUntil>this.clock)continue;
      if(bot.state==='DEFUSE'&&distance(bot.position,this.core.position)<1.6){
        bot.defuse+=dt;if(bot.defuse>=7){this.core.status='defused';this.endRound(false,'CORE DEFUSED');return;}continue;
      }
      bot.defuse=0;
      if(bot.state==='ENGAGE'||bot.state==='HOLD')continue;
      const target=bot.path[0];if(!target)continue;
      const dx=target[0]-bot.position[0],dz=target[2]-bot.position[2],d=Math.hypot(dx,dz);
      if(d<.15){bot.path.shift();continue;}
      const speed=bot.state==='RETREAT'?3.5:this.analysis.strategy==='AGGRESSIVE RETAKE'?3.6:2.6;
      const step=Math.min(d,speed*dt),x=bot.position[0]+dx/d*step,z=bot.position[2]+dz/d*step;
      if(walkable(x,z,.32)){bot.position[0]=x;bot.position[2]=z;}
      else{bot.path=[];bot.repathAt=0;}
      bot.yaw=Math.atan2(-dx,-dz);
    }
  }
  endRound(won:boolean,reason:string) {
    if(!['combat','planted','buy'].includes(this.phase))return;
    this.phase='roundEnd';this.time=3;this.roundWon=won;this.reason=reason;this.score[won?0:1]++;
    this.credits=Math.min(9000,this.credits+(won?3000:1900));this.firing=false;this.core.progress=0;
    const stats=structuredClone(this.stats);this.history.push(stats);
    for(const key of ['shots','hits','headshots','kills','damage','movingTime','runTime','midTime','combatTime','distanceSum','abilities','flanks'] as const)this.total[key]+=stats[key];
    for(const id of ['rifle','pistol','knife','core'] as const)this.total.weapons[id]+=stats.weapons[id];
    const previous=this.analysis.strategy;this.analysis=analyze(this.history);if(previous!==this.analysis.strategy)this.adaptationCount++;
    sound.play(won?'win':'lose');
  }
  nextRound(){if(this.phase!=='analysis')return;if(this.health<=0){this.ownedRifle=false;this.armor=0;}this.round++;this.newRound();}
  snapshot():GameSnapshot {
    const isGun=this.weapon==='rifle'||this.weapon==='pistol';
    return {phase:this.phase,training:this.training,round:this.round,time:this.time,score:[...this.score],health:this.health,armor:this.armor,credits:this.credits,weapon:this.weapon,
      ammo:isGun?this.ammo[this.weapon as 'rifle'|'pistol']:0,reserve:isGun?this.reserve[this.weapon as 'rifle'|'pistol']:0,reloading:this.reloading,reloadDuration:this.reloadDuration,kills:this.kills,deaths:this.deaths,total:{...this.total},
      enemies:this.bots.map(b=>({id:b.id,health:b.health,state:b.state,position:copy(b.position),known:b.knownUntil>this.clock,defuse:b.defuse,blind:b.blindUntil>this.clock})),
      core:{...this.core,position:copy(this.core.position)},player:copy(this.player),yaw:this.yaw,zone:zoneAt(this.player[0],this.player[2]),plantZone:plantSite(this.player[0],this.player[2]),speed:this.speed,grounded:this.grounded,recoil:this.recoil,
      hitMarker:this.hitMarker,hitUntil:this.hitUntil,damageFlash:this.damageFlash,feed:[...this.feed],abilities:{...this.abilities},charges:{...this.charges},overdrive:Math.max(0,this.overdriveUntil-this.clock),analysis:this.analysis,
      roundWon:this.roundWon,reason:this.reason,killer:this.killer,notification:this.notificationUntil>this.clock?this.notification:'',ownedRifle:this.ownedRifle,epoch:this.epoch,clock:this.clock,stats:{...this.stats}};
  }
}
export const arena=new Arena();
