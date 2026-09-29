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
  function poisson(lambda,rng){let l=Math.exp(-lambda),p=1,k=0;do{k++;p*=rng();}while(p>l&&k<30);return k-1;}
  function runMonteCarlo(config,defs,options={}){
    const o={iterations:500,seed:42,biome:'altanis',poiCount:3,distanceMin:400,distanceMax:800,speed:8,detourChance:.35,injuryChance:.12,nightChance:.15,safePoiChance:.18,...options};const biome=biomes.find(b=>b.id===o.biome)||biomes[0],rng=mulberry32(Number(o.seed)||42),runs=[];
    for(let i=0;i<o.iterations;i++){
      const c=clone(config),segments=[];let resources=0,injuries=0,combats=0,distance=0;
      for(let p=0;p<o.poiCount;p++){
        const d=o.distanceMin+rng()*(o.distanceMax-o.distanceMin);distance+=d;const detour=rng()<o.detourChance;const climb=rng()<biome.climb;let duration=d/o.speed*(detour?1.15+rng()*.35:1)+(climb?18+rng()*45:0);const rainy=rng()<biome.weather,night=rng()<o.nightChance,cave=rng()<biome.cave;segments.push({name:`Trajet ${p+1}`,duration:Math.max(5,duration),environment:cave?'cave':rainy?'rain':night?'night':'sun',movement:climb?'climb':rng()<.55?'sprint':'run',wind:!cave&&rng()>.25});
        const n=poisson(.28+biome.level*.2,rng);combats+=n;if(n)segments.push({name:`Combat ${p+1}`,duration:12+n*(10+rng()*18),environment:cave?'cave':night?'night':'shade',movement:'run',wind:false});
        if(rng()<o.injuryChance*biome.level/2)injuries++;
        resources+=(6+rng()*8)*(1+(biome.level-1)*.28)*(0.75+rng()*.55);
        if(rng()<o.safePoiChance)segments.push({name:'Moulin · zone sûre',duration:8+rng()*10,environment:'safe',movement:'idle',wind:true});
      }
      c.scenario=segments;c.health=Math.max(1,c.health-injuries*(2+biome.level));c.actions=[];const r=CliffEngine.simulate(c,defs);runs.push({viable:r.returnPossible,energy:r.final.E,duration:r.total,resources,injuries,combats,distance,death:r.deathAt!==null});
    }
    const values=k=>runs.map(r=>r[k]),avg=k=>values(k).reduce((a,b)=>a+b,0)/runs.length;return {options:o,biome,runs,probability:runs.filter(r=>r.viable).length/runs.length,deathProbability:runs.filter(r=>r.death).length/runs.length,energy:{p10:percentile(values('energy'),.1),median:percentile(values('energy'),.5),p90:percentile(values('energy'),.9),mean:avg('energy')},duration:{p10:percentile(values('duration'),.1),median:percentile(values('duration'),.5),p90:percentile(values('duration'),.9)},resources:{p10:percentile(values('resources'),.1),median:percentile(values('resources'),.5),p90:percentile(values('resources'),.9)},averages:{injuries:avg('injuries'),combats:avg('combats'),distance:avg('distance')}};
  }
  return {biomes,utilityWeights,enumerateBuilds,runBatch,runMonteCarlo};
})();
if(typeof module!=='undefined')module.exports=CliffAnalysis;

