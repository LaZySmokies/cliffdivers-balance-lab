/* CliffDivers demonstrator engine v1.6. Deterministic; time in seconds, energy in points. */
const CliffEngine = (() => {
  const EPS = 1e-8;
  const clone = x => JSON.parse(JSON.stringify(x));
  const slotType = slot => ({T:'Top',S:'Side',D:'Down'})[String(slot||'').charAt(0)] || null;
  const slotTypes = new Proxy({}, {get:(_,slot)=>slotType(slot)});
  const presets = {
    mixed:[{name:'Aller · falaise',activity:'explore',duration:60,environment:'sun',movement:'sprint',wind:true},{name:'Affrontement · grotte',activity:'combat',duration:45,environment:'cave',movement:'idle',wind:false,combatHitsPerSecond:1,incomingDamagePerSecond:2},{name:'Retour · falaise',activity:'explore',duration:60,environment:'sun',movement:'run',wind:true}],
    night:[{name:'Aller · nuit',activity:'explore',duration:60,environment:'night',movement:'sprint',wind:true},{name:'Combat · nuit',activity:'combat',duration:60,environment:'night',movement:'idle',wind:false,combatHitsPerSecond:1,incomingDamagePerSecond:2},{name:'Retour · nuit',activity:'explore',duration:60,environment:'night',movement:'run',wind:true}],
    rain:[{name:'Aller · pluie',activity:'explore',duration:60,environment:'rain',movement:'sprint',wind:true},{name:'Attente · abri',activity:'rest',duration:60,environment:'shade',movement:'idle',wind:false},{name:'Retour · pluie',activity:'explore',duration:60,environment:'rain',movement:'run',wind:true}]
  };
  function defaults(){return {bag:{id:'explorer',name:'Explorateur',counts:{Top:2,Side:2,Down:2}},slots:{T1:'solar',T2:'lamp',S1:'dynamo',S2:'standby',D1:'battery',D2:null},on:{lamp:true,burner:true},policy:'auto',death:'famine',drainBasis:'base',initialPercent:100,health:25,fuel:2,rateScale:1,baseMaxEnergy:100,basePassiveDrainPercent:.3,starvationDamage:1,safeZoneRegenRate:20,agonyDuration:300,fuelSecondsPerUnit:30,scenarioName:'Falaise et grotte',scenario:clone(presets.mixed),probabilistic:{iterations:500,seed:42},actions:[]};}
  function validate(c,defs){
    const errors=[],byId=Object.fromEntries(defs.map(m=>[m.id,m]));
    for(const [slot,id] of Object.entries(c.slots||{})){
      if(!id)continue;
      if(!slotType(slot)){errors.push('Emplacement inconnu : '+slot);continue;}
      if(!byId[id]){errors.push('Module inconnu : '+id);continue;}
      if(!byId[id].slots.includes(slotType(slot)))errors.push('Emplacement incompatible : '+id+' / '+slot);
    }
    if(!Array.isArray(c.scenario)||!c.scenario.length)errors.push('Parcours vide.');
    let total=0;
    for(const s of c.scenario||[]){if(!Number.isFinite(s.duration)||s.duration<=0||s.duration>1200)errors.push('Durée de segment invalide.');total+=s.duration;
      if(!['sun','night','rain','cave','shade','safe'].includes(s.environment))errors.push('Environnement invalide.');
      if(!['idle','run','sprint','slide','climb'].includes(s.movement))errors.push('Mouvement invalide.');
      if(s.drainMultiplier!==undefined&&(!Number.isFinite(s.drainMultiplier)||s.drainMultiplier<0||s.drainMultiplier>10))errors.push('Multiplicateur de perte invalide.');
      for(const key of ['energyDelta','healthDelta','resourceReward'])if(s[key]!==undefined&&!Number.isFinite(s[key]))errors.push('Événement de segment invalide : '+key);
      if(s.probabilistic){
        const p=s.probabilistic;
        for(const key of ['occurrenceChance','durationVariance','detourChance','weatherChance','nightChance','caveChance','injuryChance','resourceVariance','safeChance'])if(p[key]!==undefined&&(!Number.isFinite(p[key])||p[key]<0||p[key]>1))errors.push('Probabilité de segment invalide : '+key);
        if(p.injuryDamage!==undefined&&(!Number.isFinite(p.injuryDamage)||p.injuryDamage<0||p.injuryDamage>1000))errors.push('Dégâts de blessure invalides.');
      }}
    if(total>3600)errors.push('Démonstration limitée à 60 minutes.');
    for(const [k,min,max] of [['initialPercent',0,100],['health',1,1000],['fuel',0,1000],['rateScale',0,10],['baseMaxEnergy',1,10000],['basePassiveDrainPercent',0,10000],['starvationDamage',0,1000],['safeZoneRegenRate',0,10000],['agonyDuration',0,3600],['fuelSecondsPerUnit',.1,3600]])if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)errors.push('Paramètre invalide : '+k);
    if(!['base','max'].includes(c.drainBasis)||!['famine','instant'].includes(c.death)||!['auto','manual'].includes(c.policy))errors.push('Profil inconnu.');
    for(const a of c.actions||[])if(!Number.isFinite(a.time)||a.time<0||a.time>total)errors.push('Instant d’action hors parcours.');
    return errors;
  }
  function simulate(input,defs){
    const c=clone(input),errors=validate(c,defs);if(errors.length)return {errors};
    const byId=Object.fromEntries(defs.map(m=>[m.id,m]));
    const equippedInstances=Object.entries(c.slots).filter(([,id])=>Boolean(id)).map(([slot,id])=>({slot,module:byId[id]})),equipped=equippedInstances.map(x=>x.module);
    const cap=c.baseMaxEnergy+equipped.reduce((v,m)=>v+(m.capacity||0),0);
    let t=0,E=cap*c.initialPercent/100,HP=c.health,fuel=c.fuel*c.fuelSecondsPerUnit,state='alive';
    let depletedAt=null,agonyAt=null,deathAt=null,famine=false,nextFamine=Infinity,idleSince=null;
    const logs=[],samples=[],ledger={},cooldowns={},uses={},on=clone(c.on),actions=(c.actions||[]).map((a,i)=>({...a,index:i})).sort((a,b)=>a.time-b.time||a.index-b.index);
    const total=c.scenario.reduce((v,s)=>v+s.duration,0);let segIndex=0,segStart=0,segEnd=c.scenario[0].duration,ai=0,wasted=0,unmet=0,minE=E,rejected=0,spentActions=0,receivedActions=0,resources=0;
    const gameplay={bonusDamage:0,armorSeconds:0,lightSeconds:0,combatSeconds:0,darkSeconds:0,actionValue:0};
    function log(type,message){logs.push({t,type,message});}
    function record(id,amount){ledger[id]=(ledger[id]||0)+amount;}
    function check(){
      E=Math.max(0,Math.min(cap,E));minE=Math.min(minE,E);
      if(state!=='alive')return;
      if(E<=EPS&&!famine){E=0;famine=true;nextFamine=t+1;if(depletedAt===null)depletedAt=t;log('danger','Énergie épuisée.');if(c.death==='instant'){state='dead';deathAt=t;log('danger','Mort immédiate : variante GDD.');}}
      if(famine&&E>=1-EPS){famine=false;nextFamine=Infinity;log('info','Famine arrêtée : énergie ≥ 1.');}
      if(HP<=EPS&&state==='alive'){HP=0;state=c.agonyDuration===0?'dead':'agony';agonyAt=t;deathAt=c.agonyDuration===0?t:deathAt;nextFamine=Infinity;log('danger',c.agonyDuration===0?'Mort à la fin des PV.':'Agonie : PV épuisés. Modules suspendus dans ce profil.');}
    }
    function rates(){
      const seg=c.scenario[segIndex],parts=[];
      if(state!=='alive')return {net:0,parts,states:{},activeIds:[]};
      let drain=c.basePassiveDrainPercent/100*(c.drainBasis==='max'?cap:c.baseMaxEnergy)*(seg.drainMultiplier??1),reduction=0;const states={};
      const idle=seg.movement==='idle'&&idleSince!==null&&t-idleSince>=5-EPS,activeIds=[];
      for(const m of equipped){
        let active=true,reason='Actif';
        if(m.mode==='action'){states[m.id]='Action';continue;}
        if(m.mode==='toggle'){
          active=on[m.id]!==false;
          if(c.policy==='auto'){
            const trigger=m.toggleRule||(m.id==='lamp'?'dark':'always');
            if(trigger==='dark')active=active&&['night','cave'].includes(seg.environment);
            if(trigger==='combat')active=active&&seg.activity==='combat';
            if(trigger==='never')active=false;
          }
          if(!active)reason='Éteint';
        }
        if(active&&m.condition){
          active={sun:seg.environment==='sun',wind:seg.wind&&!['cave','safe'].includes(seg.environment),moving:['sprint','slide'].includes(seg.movement),idle,fuel:fuel>EPS}[m.condition];
          if(!active)reason=m.condition==='fuel'?'Sans combustible':'Condition absente';
        }
        states[m.id]=active?'Actif':reason;
        if(active){
          activeIds.push(m.id);
          if(m.production)parts.push({id:m.id,rate:m.production*c.rateScale});
          if(m.consumption)parts.push({id:m.id,rate:-m.consumption*c.rateScale});
          if(m.reduction)reduction+=m.reduction*c.rateScale;
        }
      }
      parts.unshift({id:'passive',rate:-drain});
      if(reduction)parts.push({id:'standby',rate:Math.min(drain,reduction)});
      if(seg.environment==='safe')parts.push({id:'safe',rate:c.safeZoneRegenRate});
      return {net:parts.reduce((v,p)=>v+p.rate,0),parts,states,activeIds};
    }
    function sample(){const r=rates();samples.push({t,E,HP,state,net:r.net,parts:r.parts,states:r.states,segment:segIndex,fuel:fuel/c.fuelSecondsPerUnit});}
    function fail(msg){rejected++;log('refused',msg);}
    function enterSegment(seg){const energy=seg.energyDelta||0,health=seg.healthDelta||0;resources+=seg.resourceReward||0;if(energy){E+=energy;record('segment:'+segIndex,energy);log('event',(energy>0?'+':'')+energy+' énergie : '+seg.name+'.');}if(health){HP+=health;log(health<0?'danger':'event',(health>0?'+':'')+health+' PV : '+seg.name+'.');}check();}
    function act(a){
      if(state!=='alive'){fail('Action refusée : joueur '+(state==='agony'?'en agonie':'mort')+'.');return;}
      if(a.kind==='toggle'){
        const m=equipped.find(m=>m.id===a.id&&m.mode==='toggle');
        if(!m){fail('Bascule refusée : module toggle absent.');return;}
        on[m.id]=a.on;log('action',m.name+' : '+(a.on?'ON':'OFF'));return;
      }
      let cost=0,gain=0,cd=0,name=a.id,actionKey=a.slot?`${a.id}@${a.slot}`:a.id;
      if(a.id==='flower'){name='Fleur d’Altanis';gain=20;cd=180;}
      else if(a.id==='dungeon'){name='Ouverture donjon P1';cost=30;if(uses[a.id]){fail('Donjon déjà ouvert.');return;}}
      else{
        const instance=a.slot?equippedInstances.find(x=>x.slot===a.slot&&x.module.id===a.id):equippedInstances.find(x=>x.module.id===a.id&&x.module.mode==='action'),m=instance?.module;
        if(!m){fail('Action refusée : module action absent ('+a.id+').');return;}
        name=m.name;cost=m.cost;cd=m.cooldown||0;
        if(m.cooldown===null&&uses[actionKey]){fail(name+' : une utilisation par essai (hypothèse).');return;}
      }
      if((cooldowns[actionKey]||0)>t+EPS){fail(name+' : recharge restante '+Math.ceil(cooldowns[actionKey]-t)+' s.');return;}
      if(E+EPS<cost){fail(name+' : énergie insuffisante ('+E.toFixed(1)+' / '+cost+').');return;}
      const accepted=Math.min(gain,cap-E);wasted+=gain-accepted;E=E-cost+accepted;spentActions+=cost;receivedActions+=gain;record('action:'+a.id,gain-cost);
      cooldowns[actionKey]=t+cd;uses[actionKey]=(uses[actionKey]||0)+1;log('action',name+' : '+(gain?'+'+accepted.toFixed(1):'−'+cost)+' énergie.');check();
      const actionModule=byId[a.id];if(actionModule?.effectValue){if(actionModule.effectFamily==='damage')gameplay.bonusDamage+=actionModule.effectValue;else gameplay.actionValue+=actionModule.effectValue;}
    }
    if(c.scenario[0].movement==='idle')idleSince=0;
    log('segment',c.scenario[0].name);enterSegment(c.scenario[0]);check();
    for(let guard=0;t<=total+EPS&&guard<50000;guard++){
      if(t>=segEnd-EPS&&segIndex<c.scenario.length-1){const previous=c.scenario[segIndex];segStart=segEnd;segIndex++;segEnd+=c.scenario[segIndex].duration;const seg=c.scenario[segIndex];if(seg.movement!=='idle')idleSince=null;else if(previous.movement!=='idle')idleSince=t;log('segment',seg.name);enterSegment(seg);}
      while(ai<actions.length&&actions[ai].time<=t+EPS)act(actions[ai++]);
      if(state==='alive'&&famine&&t>=nextFamine-EPS){HP-=c.starvationDamage;nextFamine+=1;check();}
      if(state==='agony'&&t>=agonyAt+c.agonyDuration-EPS){state='dead';deathAt=t;log('danger','Mort après '+c.agonyDuration+' s d’agonie.');}
      sample();if(t>=total-EPS)break;
      const r=rates();let next=Math.min(total,t+1,segEnd,ai<actions.length?actions[ai].time:Infinity,state==='alive'?nextFamine:Infinity,state==='agony'?agonyAt+c.agonyDuration:Infinity);
      if(state==='alive'){
        if(idleSince!==null&&idleSince+5>t+EPS)next=Math.min(next,idleSince+5);
        if(r.net< -EPS&&E>EPS)next=Math.min(next,t+E/-r.net);
        if(famine&&r.net>EPS&&E<1-EPS)next=Math.min(next,t+(1-E)/r.net);
        if(r.states.burner==='Actif'&&fuel>EPS)next=Math.min(next,t+fuel);
      }
      const dt=next-t;if(dt<=EPS)throw Error('Simulation bloquée à '+t);
      if(state==='alive'){
        const seg=c.scenario[segIndex],combat=seg.activity==='combat',dark=['night','cave'].includes(seg.environment);
        if(combat)gameplay.combatSeconds+=dt;if(dark)gameplay.darkSeconds+=dt;
        for(const id of r.activeIds||[]){const m=byId[id];if(!m)continue;
          if(combat&&m.effectFamily==='damage')gameplay.bonusDamage+=(m.effectValue||0)*(seg.combatHitsPerSecond??1)*dt;
          if(combat&&m.effectFamily==='armor')gameplay.armorSeconds+=(m.effectValue||0)*dt;
          if(dark&&m.effectFamily==='light')gameplay.lightSeconds+=dt;
        }
        for(const p of r.parts)record(p.id,p.rate*dt);
        const raw=E+r.net*dt;wasted+=Math.max(0,raw-cap);unmet+=Math.max(0,-raw);E=Math.max(0,Math.min(cap,raw));
        if(r.states.burner==='Actif'){fuel=Math.max(0,fuel-dt);if(fuel<=EPS){t=next;log('warning','Combustible épuisé.');}}
      }
      t=next;check();sample();
    }
    const final=samples[samples.length-1];
    return {errors:[],samples,logs,total,cap,initialEnergy:cap*c.initialPercent/100,final,ledger,wasted,unmet,minE,depletedAt,agonyAt,deathAt,rejected,spentActions,receivedActions,resources,gameplay,returnPossible:state==='alive'&&E>=1-EPS,fuelUsed:c.fuel-fuel/c.fuelSecondsPerUnit,profile:'demo-1.5'};
  }
  return {defaults,presets,slotTypes,slotType,simulate,validate,clone};
})();
if(typeof module!=='undefined')module.exports=CliffEngine;
