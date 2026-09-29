/* CliffDivers build analysis and probabilistic expedition prototype v1.0 */
const CliffAnalysis = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const utilityWeights = {damage:4,armor:3,lamp:1.5,magnet:1.5,shock:3.5,transfer:2,pouch:1.5,solar:.5,dynamo:.5,standby:.5,battery:.5,burner:.5,'wind-wood':.5};
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
  function combinations(items,max=2){const out=[[]];for(let i=0;i<items.length;i++){out.push([items[i]]);for(let j=i+1;j<items.length;j++)out.push([items[i],items[j]]);}return out.filter(x=>x.length<=max);}
  function enumerateBuilds(defs,limit=6500){
    const tops=combinations(defs.filter(m=>m.slots.includes('Top')).map(m=>m.id));
    const sides=combinations(defs.filter(m=>m.slots.includes('Side')).map(m=>m.id));
    const downs=combinations(defs.filter(m=>m.slots.includes('Down')).map(m=>m.id));
    const out=[];
    outer: for(const top of tops)for(const side of sides)for(const down of downs){const ids=[...top,...side,...down];if(new Set(ids).size!==ids.length)continue;out.push({T1:top[0]||null,T2:top[1]||null,S1:side[0]||null,S2:side[1]||null,D1:down[0]||null,D2:down[1]||null});if(out.length>=limit)break outer;}
    return out;
  }
  function power(ids){return ids.reduce((sum,id)=>sum+(utilityWeights[id]||0),0);}
  function versatility(ids,byId){const modes=new Set(),conditions=new Set(),roles=new Set();ids.forEach(id=>{const m=byId[id];if(!m)return;modes.add(m.mode);if(m.condition)conditions.add(m.condition);roles.add(m.production||m.reduction?'prod':m.consumption?'conso':m.mode==='action'?'action':'utility');});return Math.min(10,ids.length*.45+modes.size+conditions.size*.7+roles.size*.65);}
  function metrics(slots,config,defs,scenarios){
    const ids=Object.values(slots).filter(Boolean),byId=Object.fromEntries(defs.map(m=>[m.id,m]));let viable=0,returnRatio=0,autonomy=0,wasted=0;
    for(const scenario of scenarios){const c=clone(config);c.slots=slots;c.scenario=clone(scenario);c.actions=[];const r=CliffEngine.simulate(c,defs);if(r.errors.length)continue;viable+=r.returnPossible?1:0;returnRatio+=r.final.E/r.cap;autonomy+=(r.depletedAt??r.total)/r.total;wasted+=r.wasted;}
    const n=scenarios.length;return {ids,viability:viable/n,returnRatio:returnRatio/n,autonomy:autonomy/n,power:power(ids),versatility:versatility(ids,byId),wasted:wasted/n};
  }
  function dominates(a,b){const axes=['autonomy','power','versatility'];return axes.every(k=>a[k]>=b[k])&&axes.some(k=>a[k]>b[k]);}
  function pareto(rows){const front=[];for(const row of rows){if(front.some(x=>dominates(x,row)))continue;for(let i=front.length-1;i>=0;i--)if(dominates(row,front[i]))front.splice(i,1);front.push(row);}return front;}
  function sensitivity(config,defs,scenarios){
    const equipped=new Set(Object.values(config.slots).filter(Boolean)),tests=[];
    const add=(label,down,up)=>{const base=metrics(config.slots,config,defs,scenarios);const lo=down(),hi=up();tests.push({label,deltaLow:lo.returnRatio-base.returnRatio,deltaHigh:hi.returnRatio-base.returnRatio,impact:Math.abs(lo.returnRatio-base.returnRatio)+Math.abs(hi.returnRatio-base.returnRatio)});};
    for(const def of defs.filter(d=>equipped.has(d.id))){for(const key of ['production','consumption','reduction','capacity','cost']){if(!def[key])continue;add(`${def.name} · ${key}`,()=>{const ds=clone(defs),m=ds.find(x=>x.id===def.id);m[key]*=.9;return metrics(config.slots,config,ds,scenarios);},()=>{const ds=clone(defs),m=ds.find(x=>x.id===def.id);m[key]*=1.1;return metrics(config.slots,config,ds,scenarios);});}}
    for(const key of ['basePassiveDrainPercent','initialPercent','health','rateScale']){add(`Scénario · ${key}`,()=>{const c=clone(config);c[key]*=.9;return metrics(c.slots,c,defs,scenarios);},()=>{const c=clone(config);c[key]*=1.1;return metrics(c.slots,c,defs,scenarios);});}
    return tests.sort((a,b)=>b.impact-a.impact);
  }
  function runBatch(config,defs){
    const scenarios=Object.values(CliffEngine.presets),builds=enumerateBuilds(defs);const rows=builds.map(slots=>{const m=metrics(slots,config,defs,scenarios);m.slots=slots;m.score=m.viability*50+m.returnRatio*25+m.autonomy*15+m.power*4+m.versatility*2-m.wasted*.002;return m;}).sort((a,b)=>b.score-a.score);
    const frontier=pareto(rows),top=rows.slice(0,Math.min(50,rows.length)),counts=Object.fromEntries(defs.map(d=>[d.id,0]));top.forEach(r=>r.ids.forEach(id=>counts[id]++));
    const rates=defs.map(d=>({id:d.id,name:d.name,rate:counts[d.id]/top.length})).sort((a,b)=>b.rate-a.rate);const never=rates.filter(x=>x.rate===0);
    const cliffs=[];for(const row of rows.slice(0,250)){const c1=clone(config);c1.slots=row.slots;c1.basePassiveDrainPercent*=1.1;const stressed=metrics(row.slots,c1,defs,scenarios);if(row.viability>stressed.viability)cliffs.push({slots:row.slots,before:row.viability,after:stressed.viability,trigger:'+10 % perte passive'});if(cliffs.length>=12)break;}
    return {count:rows.length,rows,frontier:frontier.sort((a,b)=>b.score-a.score),rates,never,cliffs,sensitivity:sensitivity(config,defs,scenarios),scenarios:scenarios.length};
  }
  function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}}
  function percentile(values,p){const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.floor((s.length-1)*p)))];}
  function runMonteCarlo(config,defs,options={}){
    const o={iterations:500,seed:42,...options},rng=mulberry32(Number(o.seed)||42),runs=[];
    for(let i=0;i<o.iterations;i++){
      const c=clone(config),segments=[];let injuries=0,combats=0,detours=0,weatherChanges=0,skipped=0;
      for(const original of config.scenario){
        const segment=clone(original),p=segment.probabilistic||{};
        if(!p.enabled){segments.push(segment);if(segment.activity==='combat')combats++;continue;}
        if(rng()>(p.occurrenceChance??1)){skipped++;continue;}
        const biome=biomes.find(item=>item.id===(p.biome||'altanis'))||biomes[0];
        const variance=p.durationVariance??0;segment.duration=Math.max(1,segment.duration*(1+(rng()*2-1)*variance));
        if(rng()<(p.detourChance??0)){segment.duration*=1.1+rng()*.4;detours++;}
        const before=segment.environment;
        const caveChance=Math.min(1,(p.caveChance??0)+biome.cave*.5),weatherChance=Math.min(1,(p.weatherChance??.1)*(0.75+biome.level*.12)+biome.weather*.25);
        if(rng()<(p.safeChance??0))segment.environment='safe';
        else if(rng()<caveChance)segment.environment='cave';
        else if(rng()<weatherChance)segment.environment='rain';
        else if(rng()<(p.nightChance??0))segment.environment='night';
        if(segment.environment!==before)weatherChanges++;
        if(rng()<Math.min(1,(p.injuryChance??0)*Math.max(1,biome.level/2))){segment.healthDelta=(segment.healthDelta||0)-(p.injuryDamage??5);injuries++;}
        const resourceVariance=p.resourceVariance??0;segment.resourceReward=Math.max(0,(segment.resourceReward||0)*(1+(rng()*2-1)*resourceVariance));
        if(segment.activity==='combat')combats++;
        segments.push(segment);
      }
      if(!segments.length)segments.push({...clone(config.scenario[0]),duration:1,resourceReward:0});
      segments.forEach(segment=>segment.duration=Math.min(1200,Math.max(1,segment.duration)));
      const generatedTotal=segments.reduce((sum,segment)=>sum+segment.duration,0);if(generatedTotal>3600)segments.forEach(segment=>segment.duration*=3600/generatedTotal);
      c.scenario=segments;c.actions=[];const r=CliffEngine.simulate(c,defs);runs.push({viable:r.returnPossible,energy:r.final.E,duration:r.total,resources:r.resources,injuries,combats,detours,weatherChanges,skipped,death:r.deathAt!==null});
    }
    const values=k=>runs.map(r=>r[k]),avg=k=>values(k).reduce((a,b)=>a+b,0)/runs.length;return {options:o,runs,probability:runs.filter(r=>r.viable).length/runs.length,deathProbability:runs.filter(r=>r.death).length/runs.length,energy:{p10:percentile(values('energy'),.1),median:percentile(values('energy'),.5),p90:percentile(values('energy'),.9),mean:avg('energy')},duration:{p10:percentile(values('duration'),.1),median:percentile(values('duration'),.5),p90:percentile(values('duration'),.9)},resources:{p10:percentile(values('resources'),.1),median:percentile(values('resources'),.5),p90:percentile(values('resources'),.9)},averages:{injuries:avg('injuries'),combats:avg('combats'),detours:avg('detours'),weatherChanges:avg('weatherChanges'),skipped:avg('skipped')}};
  }
  return {biomes,utilityWeights,enumerateBuilds,runBatch,runMonteCarlo};
})();
if(typeof module!=='undefined')module.exports=CliffAnalysis;

