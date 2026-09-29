/* CliffDivers build analysis and probabilistic expedition prototype v1.6 */
const CliffAnalysis = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const biomes = [
    {id:'altanis',name:'Plaine d’Altanis',level:1,weather:.10,cave:.08,climb:.08},
    {id:'golden',name:'Golden',level:2,weather:.14,cave:.10,climb:.12},
    {id:'shroom',name:'Shroom',level:2,weather:0,cave:.88,climb:.28},
    {id:'storm',name:'Eternal Storm',level:3,weather:.78,cave:.08,climb:.22},
    {id:'breeze',name:'Brise',level:3,weather:.18,cave:.08,climb:.35},
    {id:'jungle',name:'Jungle',level:4,weather:.32,cave:.12,climb:.30},
    {id:'fantoma',name:'Fantoma',level:4,weather:.22,cave:.18,climb:.26},
    {id:'floating',name:'Les Îles flottantes',level:4,weather:.26,cave:.04,climb:.55},
    {id:'merchant',name:'Cité marchande volante',level:5,weather:.20,cave:.03,climb:.40},
    {id:'war',name:'Les Champs de guerre',level:5,weather:.24,cave:.06,climb:.16},
    {id:'gods',name:'La Cité des Dieux',level:6,weather:.30,cave:.10,climb:.42},
    {id:'void',name:'Void',level:5,weather:.08,cave:.48,climb:.38}
  ];
  const method={
    formula:'Score = viabilité × 50 + énergie au retour × 20 + autonomie × 15 + valeur de gameplay × 3 + polyvalence × 1 − saturation − 8 par module dormant. La survie reste prioritaire.',
    gameplay:'Dégâts : bonus actif pendant les combats. Armure : points d’armure × secondes de combat couvertes. Lumière : part des secondes sombres effectivement éclairées.',
    confidence:'La confiance dépend de la part des modules dont l’effet est renseigné et du nombre de scénarios évalués.',
    limits:['Les familles pilotes sont dégâts, armure et lumière.','Les autres effets restent neutres sans valeur de gameplay.','Les actions suivent une politique déclarée ; aucune tactique optimale n’est inventée.','Toute limite du nombre de builds est signalée.']
  };
  function combinationsWithRepetition(items,count){const values=[null,...items],out=[];function walk(start,current){if(current.length===count){out.push([...current]);return;}for(let i=start;i<values.length;i++){current.push(values[i]);walk(i,current);current.pop();}}walk(0,[]);return out;}
  function enumerateBuilds(defs,config={},limit=6500){
    const keys=Object.keys(config.slots||CliffEngine.defaults().slots),groups={Top:[],Side:[],Down:[]};keys.forEach(key=>{const type=CliffEngine.slotType(key);if(type)groups[type].push(key);});
    const options={};for(const type of Object.keys(groups))options[type]=combinationsWithRepetition(defs.filter(m=>m.slots.includes(type)).map(m=>m.id),groups[type].length);
    const theoretical=options.Top.length*options.Side.length*options.Down.length,out=[];let validSeen=0,truncated=false;
    outer:for(const top of options.Top)for(const side of options.Side)for(const down of options.Down){const slots={};[['Top',top],['Side',side],['Down',down]].forEach(([type,values])=>groups[type].forEach((key,index)=>slots[key]=values[index]||null));validSeen++;out.push(slots);if(out.length>=limit){truncated=theoretical>limit;break outer;}}
    return {builds:out,theoretical,validSeen,truncated,limit};
  }
  function triggerMatches(module,segment){const trigger=module.usageTrigger||'always';return trigger==='always'||(trigger==='combat'&&segment.activity==='combat')||(trigger==='dark'&&['night','cave'].includes(segment.environment));}
  function policyActions(slots,defs,scenario){
    const byId=Object.fromEntries(defs.map(m=>[m.id,m])),actions=[],starts=[];let cursor=0;scenario.forEach((s,index)=>{starts.push({time:cursor,segment:s,index});cursor+=s.duration;});
    for(const [slot,id] of Object.entries(slots).filter(([,id])=>Boolean(id))){const m=byId[id];if(!m||m.mode!=='action')continue;const policy=m.usagePolicy||'never',matches=starts.filter(x=>triggerMatches(m,x.segment));if(!matches.length||policy==='never')continue;
      if(policy==='once')actions.push({id,slot,kind:'action',time:matches[0].time});
      if(policy==='perCombat'||policy==='perSegment')for(const x of matches)if(policy==='perSegment'||x.segment.activity==='combat')actions.push({id,slot,kind:'action',time:x.time});
      if(policy==='cooldown'){const cd=Math.max(1,m.cooldown||cursor+1);for(const x of matches)for(let t=x.time;t<x.time+x.segment.duration;t+=cd)actions.push({id,slot,kind:'action',time:t});}
    }
    return actions.sort((a,b)=>a.time-b.time);
  }
  function isModeled(m){return Boolean(m&&(m.production||m.reduction||m.consumption||m.capacity||((m.effectFamily&&m.effectFamily!=='none')&&m.effectValue)||(m.mode==='action'&&(m.usagePolicy||'never')!=='never')))&&!(m.mode==='toggle'&&m.toggleRule==='never')&&!(m.mode==='action'&&(m.usagePolicy||'never')==='never');}
  function versatility(ids,byId){const modes=new Set(),conditions=new Set(),roles=new Set(),effects=new Set();let useful=0;new Set(ids).forEach(id=>{const m=byId[id];if(!isModeled(m))return;useful++;modes.add(m.mode);if(m.condition)conditions.add(m.condition);if(m.effectFamily&&m.effectFamily!=='none')effects.add(m.effectFamily);roles.add(m.production||m.reduction?'prod':m.consumption?'conso':m.mode==='action'?'action':'utility');});return Math.min(10,useful*.35+modes.size*.8+conditions.size*.45+roles.size*.55+effects.size*.8);}
  function gameplayScore(g){const combat=Math.max(1,g.combatSeconds),dark=Math.max(1,g.darkSeconds);const damage=Math.min(4,(g.bonusDamage/combat)/10*4),armor=Math.min(3,(g.armorSeconds/combat)/10*3),light=Math.min(2,g.lightSeconds/dark*2),actions=Math.min(1,g.actionValue/20);return {total:damage+armor+light+actions,damage,armor,light,actions};}
  function metrics(slots,config,defs,scenarios){
    const ids=Object.values(slots).filter(Boolean),byId=Object.fromEntries(defs.map(m=>[m.id,m]));let viable=0,returnRatio=0,autonomy=0,wasted=0,gameplay=0,actionCost=0,rejected=0;const details=[];
    for(const scenario of scenarios){const c=clone(config);c.slots=slots;c.scenario=clone(scenario);c.actions=policyActions(slots,defs,c.scenario);const r=CliffEngine.simulate(c,defs);if(r.errors.length)continue;const gp=gameplayScore(r.gameplay);viable+=r.returnPossible?1:0;returnRatio+=r.final.E/r.cap;autonomy+=(r.depletedAt??r.total)/r.total;wasted+=r.wasted;gameplay+=gp.total;actionCost+=r.spentActions;rejected+=r.rejected;details.push({gameplay:gp,actions:c.actions.length,cost:r.spentActions,rejected:r.rejected});}
    const n=Math.max(1,scenarios.length),modeled=ids.filter(id=>isModeled(byId[id])).length,confidence=Math.min(.95,.35+(modeled/Math.max(1,ids.length))*.4+Math.min(.2,scenarios.length*.05));
    const deadSlots=ids.filter(id=>!isModeled(byId[id])).length;
    return {ids,viability:viable/n,returnRatio:returnRatio/n,autonomy:autonomy/n,power:gameplay/n,versatility:versatility(ids,byId),wasted:wasted/n,actionCost:actionCost/n,rejected:rejected/n,deadSlots,confidence,details};
  }
  function dominates(a,b){const axes=['autonomy','power','versatility'];return axes.every(k=>a[k]>=b[k])&&axes.some(k=>a[k]>b[k]);}
  function pareto(rows){const front=[];for(const row of rows){if(front.some(x=>dominates(x,row)))continue;for(let i=front.length-1;i>=0;i--)if(dominates(row,front[i]))front.splice(i,1);front.push(row);}return front;}
  function sensitivity(config,defs,scenarios){const equipped=new Set(Object.values(config.slots).filter(Boolean)),tests=[],value=m=>m.returnRatio+m.power/10;const add=(label,down,up)=>{const base=metrics(config.slots,config,defs,scenarios),lo=down(),hi=up();tests.push({label,impact:Math.abs(value(lo)-value(base))+Math.abs(value(hi)-value(base))});};for(const def of defs.filter(d=>equipped.has(d.id))){for(const key of ['production','consumption','reduction','capacity','cost','effectValue']){if(!def[key])continue;add(`${def.name} · ${key}`,()=>{const ds=clone(defs),m=ds.find(x=>x.id===def.id);m[key]*=.9;return metrics(config.slots,config,ds,scenarios);},()=>{const ds=clone(defs),m=ds.find(x=>x.id===def.id);m[key]*=1.1;return metrics(config.slots,config,ds,scenarios);});}}for(const key of ['basePassiveDrainPercent','initialPercent','health','rateScale'])add(`Scénario · ${key}`,()=>{const c=clone(config);c[key]*=.9;return metrics(c.slots,c,defs,scenarios);},()=>{const c=clone(config);c[key]*=1.1;return metrics(c.slots,c,defs,scenarios);});return tests.sort((a,b)=>b.impact-a.impact);}
  function scenarioSet(config){const candidates=[clone(config.scenario),...Object.values(CliffEngine.presets).map(clone)],seen=new Set();return candidates.filter(s=>{const key=JSON.stringify(s);if(seen.has(key))return false;seen.add(key);return true;});}
  function runBatch(config,defs){
    const scenarios=scenarioSet(config),enumeration=enumerateBuilds(defs,config),rows=enumeration.builds.map(slots=>{const m=metrics(slots,config,defs,scenarios);m.slots=slots;m.score=m.viability*50+m.returnRatio*20+m.autonomy*15+m.power*3+m.versatility-m.wasted*.002-m.deadSlots*8;return m;}).sort((a,b)=>b.score-a.score);
    const frontier=pareto(rows),top=rows.slice(0,Math.min(50,rows.length)),counts=Object.fromEntries(defs.map(d=>[d.id,0]));top.forEach(r=>new Set(r.ids).forEach(id=>counts[id]++));const rates=defs.map(d=>({id:d.id,name:d.name,rate:counts[d.id]/Math.max(1,top.length)})).sort((a,b)=>b.rate-a.rate),never=rates.filter(x=>x.rate===0);
    const cliffs=[];for(const row of rows.slice(0,250)){const c1=clone(config);c1.slots=row.slots;c1.basePassiveDrainPercent*=1.1;const stressed=metrics(row.slots,c1,defs,scenarios);if(row.viability>stressed.viability)cliffs.push({slots:row.slots,before:row.viability,after:stressed.viability,trigger:'+10 % perte passive'});if(cliffs.length>=12)break;}
    return {count:rows.length,rows,frontier:frontier.sort((a,b)=>b.score-a.score),rates,never,cliffs,sensitivity:sensitivity(config,defs,scenarios),scenarios:scenarios.length,enumeration,method};
  }
  function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  function percentile(values,p){const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.floor((s.length-1)*p)))];}
  function runMonteCarlo(config,defs,options={}){
    const o={iterations:500,seed:42,...options},rng=mulberry32(Number(o.seed)||42),runs=[];
    for(let i=0;i<o.iterations;i++){const c=clone(config),segments=[];let injuries=0,combats=0,detours=0,weatherChanges=0,skipped=0;for(const original of config.scenario){const segment=clone(original),p=segment.probabilistic||{};if(!p.enabled){segments.push(segment);if(segment.activity==='combat')combats++;continue;}if(rng()>(p.occurrenceChance??1)){skipped++;continue;}const biome=biomes.find(item=>item.id===(p.biome||'altanis'))||biomes[0],variance=p.durationVariance??0;segment.duration=Math.max(1,segment.duration*(1+(rng()*2-1)*variance));if(rng()<(p.detourChance??0)){segment.duration*=1.1+rng()*.4;detours++;}const before=segment.environment,caveChance=Math.min(1,(p.caveChance??0)+biome.cave*.5),weatherChance=Math.min(1,(p.weatherChance??.1)*(0.75+biome.level*.12)+biome.weather*.25);if(rng()<(p.safeChance??0))segment.environment='safe';else if(rng()<caveChance)segment.environment='cave';else if(rng()<weatherChance)segment.environment='rain';else if(rng()<(p.nightChance??0))segment.environment='night';if(segment.environment!==before)weatherChanges++;if(rng()<Math.min(1,(p.injuryChance??0)*Math.max(1,biome.level/2))){segment.healthDelta=(segment.healthDelta||0)-(p.injuryDamage??5);injuries++;}const resourceVariance=p.resourceVariance??0;segment.resourceReward=Math.max(0,(segment.resourceReward||0)*(1+(rng()*2-1)*resourceVariance));if(segment.activity==='combat')combats++;segments.push(segment);}if(!segments.length)segments.push({...clone(config.scenario[0]),duration:1,resourceReward:0});segments.forEach(segment=>segment.duration=Math.min(1200,Math.max(1,segment.duration)));const generatedTotal=segments.reduce((sum,segment)=>sum+segment.duration,0);if(generatedTotal>3600)segments.forEach(segment=>segment.duration*=3600/generatedTotal);c.scenario=segments;c.actions=policyActions(c.slots,defs,segments);const r=CliffEngine.simulate(c,defs);runs.push({viable:r.returnPossible,energy:r.final.E,duration:r.total,resources:r.resources,injuries,combats,detours,weatherChanges,skipped,death:r.deathAt!==null,gameplay:gameplayScore(r.gameplay).total,actionCost:r.spentActions});}
    const values=k=>runs.map(r=>r[k]),avg=k=>values(k).reduce((a,b)=>a+b,0)/runs.length,probability=runs.filter(r=>r.viable).length/runs.length,z=1.96,n=runs.length,den=1+z*z/n,center=(probability+z*z/(2*n))/den,half=z*Math.sqrt(probability*(1-probability)/n+z*z/(4*n*n))/den;return {options:o,runs,probability,confidence95:{low:Math.max(0,center-half),high:Math.min(1,center+half)},deathProbability:runs.filter(r=>r.death).length/runs.length,energy:{p10:percentile(values('energy'),.1),median:percentile(values('energy'),.5),p90:percentile(values('energy'),.9),mean:avg('energy')},duration:{p10:percentile(values('duration'),.1),median:percentile(values('duration'),.5),p90:percentile(values('duration'),.9)},resources:{p10:percentile(values('resources'),.1),median:percentile(values('resources'),.5),p90:percentile(values('resources'),.9)},gameplay:{median:percentile(values('gameplay'),.5)},actionCost:{median:percentile(values('actionCost'),.5)},averages:{injuries:avg('injuries'),combats:avg('combats'),detours:avg('detours'),weatherChanges:avg('weatherChanges'),skipped:avg('skipped')}};
  }
  return {biomes,method,enumerateBuilds,policyActions,gameplayScore,runBatch,runMonteCarlo};
})();
if(typeof module!=='undefined')module.exports=CliffAnalysis;
