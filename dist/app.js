(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const slotNames = {T1:"Top gauche",T2:"Top droit",S1:"Side gauche",S2:"Side droit",D1:"Down gauche",D2:"Down droit"};
  const atlasIndex = {"wind-wood":0,burner:1,dynamo:2,solar:3,standby:4,lamp:5,armor:6,damage:7,battery:8,magnet:9,shock:10,transfer:11,pouch:12};
  const segmentColors = ["#45dce6", "#bd8cff", "#f0b35f"];
  const defaultSegmentProbability={enabled:false,biome:"altanis",occurrenceChance:1,durationVariance:.15,detourChance:.1,weatherChance:.1,nightChance:.1,caveChance:.05,injuryChance:.05,injuryDamage:5,resourceVariance:.2,safeChance:0};
  const defaultRules={cards:[
    {title:"Énergie",text:"Valeurs par défaut : 100 points et 0,3 %/s de perte passive. Production, consommation et réduction restent des leviers distincts."},
    {title:"Épuisement",text:"Le profil TDD applique 1 PV/s à énergie nulle. La variante GDD déclenche la mort immédiate."},
    {title:"Actions",text:"Une action vérifie état vital, présence du module, cooldown et ressources. Un refus ne dépense rien."},
    {title:"Hypothèses",text:"Deux Top, deux Side et deux Down. Les flux Excel sont interprétés en points/s uniquement dans ce prototype."}
  ],documented:["Capacité de base : 100.","PV de base : 25.","Famine : −1 PV/s.","Agonie : 300 secondes.","Zone sûre : +20 énergie/s.","Fleur : +20, recharge 180 s.","Donjon P1 : −30 énergie."],arbitrations:["Assiette de la perte passive.","Gain ou réduction pour les chargeurs.","Slots GDD, TDD ou Excel.","Effets alimentés à énergie nulle.","Cumul des auras et doublons.","Priorité des événements simultanés."]};
  const state = {config:null, defs:[], baseDefs:[], all:[], byId:{}, selected:"solar", selectedCatalogue:"solar", cursor:0, result:null, reference:null, refResult:null, history:[], versions:[], scenarioTemplates:[], changeLog:[], rules:CliffEngine.clone(defaultRules),rulesEditing:false,batch:null, monte:null, playing:false, timer:null, tooltipTimer:null, editorTimer:null};
  const storageKey="cliffdivers-balance-lab-v1.2";
  const parameterHelp={
    "initial-energy":["Charge au départ","Pourcentage de la capacité maximale disponible au début. Une valeur basse réduit directement la marge de survie."],"initial-health":["PV au départ","Points de vie disponibles. En profil Famine, ils diminuent lorsque l’énergie reste à zéro."],"initial-fuel":["Combustible","Nombre d’unités disponibles pour les modules qui brûlent une ressource."],"flow-scale":["Flux modules","Multiplie toutes les productions, consommations et réductions des modules sans modifier la perte naturelle."],"base-max-energy":["Énergie maximale","Capacité du joueur avant les bonus de batteries et de modules."],"passive-drain-rate":["Perte passive","Pourcentage d’énergie perdu chaque seconde. Accepte un point ou une virgule, par exemple 0,3 ou 1,25."],"starvation-damage":["Dégâts de famine","PV perdus chaque seconde tant que l’énergie est à zéro dans le profil Famine."],"safe-zone-regen":["Régénération de zone sûre","Énergie gagnée chaque seconde dans un segment marqué Zone sûre."],"agony-duration":["Durée d’agonie","Temps entre la perte de tous les PV et la mort définitive. Zéro supprime l’agonie."],"fuel-seconds":["Durée du combustible","Nombre de secondes actives fourni par une unité de combustible."],"drain-basis":["Assiette de perte","Choisit si le pourcentage passif s’applique à la capacité de base ou à la capacité totale avec bonus."],"death-rule":["Règle à zéro énergie","Famine retire des PV progressivement. Mort immédiate termine l’expédition dès que l’énergie atteint zéro."],"toggle-policy":["Politique des toggles","En automatique, certains modules suivent le contexte. En manuel, seuls les événements ON/OFF programmés les contrôlent."],
    "mc-biome":["Biome","Détermine le niveau de danger et les probabilités de météo, grotte et escalade utilisées par la Monte-Carlo."],"mc-iterations":["Itérations","Nombre d’expéditions aléatoires simulées. Plus il est élevé, plus les percentiles sont stables et le calcul long."],"mc-pois":["Nombre de POI","Nombre d’objectifs visités avant le retour. Chaque POI génère un trajet et peut générer des événements."],"mc-seed":["Graine aléatoire","Rejoue exactement le même tirage aléatoire pour comparer deux builds dans des conditions identiques."],"mc-distance-min":["Distance minimale","Distance la plus courte tirée entre deux POI."],"mc-distance-max":["Distance maximale","Distance la plus longue tirée entre deux POI."],"mc-speed":["Vitesse","Vitesse moyenne utilisée pour convertir les distances en durées de trajet."],"mc-detour":["Chance de détour","Probabilité qu’un trajet soit rallongé par une attraction, un obstacle ou un changement d’itinéraire."],"mc-injury":["Chance de blessure","Probabilité de subir une blessure à chaque POI, modulée par le niveau du biome."],"mc-night":["Chance de nuit","Probabilité qu’un trajet se déroule de nuit et modifie les conditions des modules."],"mc-safe":["Chance de moulin","Probabilité de rencontrer une zone sûre qui recharge l’énergie après un POI."],
    production:["Production","Énergie produite chaque seconde lorsque le module est actif et que sa condition est satisfaite."],consumption:["Consommation","Énergie dépensée chaque seconde lorsque le module fonctionne."],reduction:["Réduction de perte","Part de la perte naturelle annulée chaque seconde, sans créer de production excédentaire."],capacity:["Bonus de capacité","Énergie maximale ajoutée par le module."],cost:["Coût par action","Énergie retirée lors de chaque activation ponctuelle."],cooldown:["Recharge","Temps minimal entre deux activations. Une valeur vide signifie une utilisation par essai."],"edit-mode":["Fonctionnement","Passif : toujours évalué. Toggle : état ON/OFF. Action : coût payé au moment programmé."],"edit-condition":["Condition","Contexte nécessaire pour que le flux du module soit actif." ]
  };
  function helpButton(title,text){return `<button type="button" class="param-help" data-help-title="${esc(title)}" data-help="${esc(text)}" aria-label="Aide : ${esc(title)}">?</button>`;}

  function iconStyle(id){
    const index = atlasIndex[id] ?? 12, col=index%4, row=Math.floor(index/4);
    return `background-position:${col*100/3}% ${row*100/3}%`;
  }
  function roleOf(module){
    if(module.mode === "action") return "action";
    if(module.consumption) return "consumer";
    if(module.production || module.reduction) return "producer";
    return "neutral";
  }
  function roleLabel(role){return {producer:"Produit",consumer:"Consomme",neutral:"Neutre",action:"Action"}[role];}
  function flowText(module){
    if(module.mode === "action") return `−${module.cost} / action`;
    if(module.capacity) return `+${module.capacity} capacité`;
    if(module.reduction) return `≤ ${module.reduction.toFixed(1)} /s`;
    const net=(module.production||0)-(module.consumption||0);
    return `${net>=0?"+":"−"}${Math.abs(net).toFixed(1)} /s`;
  }
  function statRows(module){
    const rows=[];
    if(module.production)rows.push(["Production",`+${module.production} /s`]);
    if(module.consumption)rows.push(["Consommation",`−${module.consumption} /s`]);
    if(module.reduction)rows.push(["Réduction",`jusqu’à ${module.reduction} /s`]);
    if(module.capacity)rows.push(["Capacité",`+${module.capacity}`]);
    if(module.cost)rows.push(["Activation",`−${module.cost}`]);
    if(module.cooldown!==undefined&&module.cooldown!==null)rows.push(["Recharge",`${module.cooldown} s`]);
    if(module.condition)rows.push(["Condition",{sun:"Soleil",wind:"Vent",moving:"Sprint / glissade",idle:"Immobile 5 s",fuel:"Combustible"}[module.condition]||module.condition]);
    return rows;
  }
  function tooltipMarkup(module){
    const role=roleOf(module);
    return `<div class="tooltip-head"><span class="module-icon" style="${iconStyle(module.id)}"></span><div><span class="tooltip-role">${roleLabel(role)} · ${esc(module.slots.join(" / "))}</span><strong>${esc(module.name)}</strong></div></div><div class="tooltip-stats">${statRows(module).map(([label,value])=>`<span>${esc(label)}</span><b>${esc(value)}</b>`).join("")||"<span>Flux énergétique</span><b>Neutre</b>"}</div><p>${esc(module.note||"Paramètres de démonstration à arbitrer.")}</p>`;
  }
  function placeTooltip(event){
    const tip=$("module-tooltip"),pad=16,w=300,h=tip.offsetHeight||220;
    tip.style.left=`${Math.min(innerWidth-w-pad,Math.max(pad,event.clientX+18))}px`;
    tip.style.top=`${Math.min(innerHeight-h-pad,Math.max(pad,event.clientY+18))}px`;
  }
  function showTooltip(element,event){
    const module=state.byId[element.dataset.module];if(!module)return;
    clearTimeout(state.tooltipTimer);const tip=$("module-tooltip");tip.innerHTML=tooltipMarkup(module);tip.dataset.role=roleOf(module);tip.hidden=false;
    if(event?.clientX)placeTooltip(event);else{const r=element.getBoundingClientRect();placeTooltip({clientX:r.right,clientY:r.top});}
  }
  function hideTooltip(){clearTimeout(state.tooltipTimer);state.tooltipTimer=setTimeout(()=>$("module-tooltip").hidden=true,60);}
  function bindTooltips(root){
    root.querySelectorAll("[data-module]").forEach(element=>{
      element.onmouseenter=event=>showTooltip(element,event);element.onmousemove=placeTooltip;element.onmouseleave=hideTooltip;
      element.onfocus=()=>showTooltip(element);element.onblur=hideTooltip;
    });
  }
  function placeParameterTooltip(event){const tip=$("parameter-tooltip"),pad=14,w=310,h=tip.offsetHeight||140;tip.style.left=`${Math.min(innerWidth-w-pad,Math.max(pad,event.clientX+16))}px`;tip.style.top=`${Math.min(innerHeight-h-pad,Math.max(pad,event.clientY+16))}px`;}
  function showParameterTooltip(button,event){const tip=$("parameter-tooltip");tip.innerHTML=`<strong>${esc(button.dataset.helpTitle)}</strong><p>${esc(button.dataset.help)}</p>`;tip.hidden=false;if(event?.clientX)placeParameterTooltip(event);else{const r=button.getBoundingClientRect();placeParameterTooltip({clientX:r.right,clientY:r.top});}}
  function bindParameterHelp(root=document){root.querySelectorAll(".param-help").forEach(button=>{button.onmouseenter=e=>showParameterTooltip(button,e);button.onmousemove=placeParameterTooltip;button.onmouseleave=()=>$("parameter-tooltip").hidden=true;button.onfocus=()=>showParameterTooltip(button);button.onblur=()=>$("parameter-tooltip").hidden=true;button.onclick=e=>{e.preventDefault();showParameterTooltip(button,e);};});}
  function decorateParameterHelp(){for(const [id,[title,description]] of Object.entries(parameterHelp)){const control=$(id),label=control?.closest("label");if(!label||label.querySelector(".param-help"))continue;label.insertBefore(document.createRange().createContextualFragment(helpButton(title,description)),control);}bindParameterHelp(document);}
  function formatTime(value){
    if(value === null || value === undefined) return "—";
    const total=Math.round(value),minutes=Math.floor(total/60), seconds=total%60;
    return `${minutes}:${String(seconds).padStart(2,"0")}`;
  }
  function signed(value){return `${value>=0?"+":"−"}${Math.abs(value).toFixed(2)}`;}
  function parseLocalized(value){return Number(String(value).trim().replace(",","."));}
  function notify(message){$("global-notice").textContent=message;}
  function saveLocal(){try{localStorage.setItem(storageKey,JSON.stringify({config:state.config,defs:state.defs,versions:state.versions,scenarioTemplates:state.scenarioTemplates,changeLog:state.changeLog.slice(0,200),rules:state.rules}));}catch(error){console.warn("Sauvegarde locale indisponible",error);}}
  function recordChange(message){if(!message)return;state.changeLog.unshift({at:new Date().toISOString(),message});if(state.changeLog.length>200)state.changeLog.length=200;}
  function snapshot(){state.history.push({config:CliffEngine.clone(state.config),defs:CliffEngine.clone(state.defs),rules:CliffEngine.clone(state.rules)});if(state.history.length>30)state.history.shift();$("undo").disabled=false;}
  function mutate(fn,message=""){
    snapshot();fn();recordChange(message);saveLocal();notify(message);simulate();
  }
  function moduleFromSource(module){
    return {id:module.id,name:module.name,...module.prototype};
  }
  function normalizeScenarioSegments(){state.config.scenario=state.config.scenario.map(segment=>({...segment,activity:segment.activity||"explore",drainMultiplier:segment.drainMultiplier??1,energyDelta:segment.energyDelta??0,healthDelta:segment.healthDelta??0,resourceReward:segment.resourceReward??0,probabilistic:{...defaultSegmentProbability,...(segment.probabilistic||{})}}));}
  function draftModule(source){
    const n=source.normalized||{},activation=n.activation;
    return {id:source.id,name:source.name,slots:Array.isArray(n.slots)&&n.slots.length?n.slots:["Top","Side","Down"],mode:activation==="action"?"action":activation==="toggle"?"toggle":"passive",production:n.productionPerSecond||0,consumption:n.consumptionPerSecond||0,reduction:n.passiveReductionPerSecond||0,capacity:n.capacityBonus||0,cost:n.energyCost||0,cooldown:n.cooldownSeconds??null,note:`Prototype configurable créé depuis les données consolidées. ${source.issues?.[0]||"Valeurs à valider."}`,customDraft:true};
  }
  function currentSample(result=state.result){
    let previous=result.samples[0];
    for(const sample of result.samples){
      if(sample.t<=state.cursor+1e-8) previous=sample;
      else {
        const ratio=(state.cursor-previous.t)/(sample.t-previous.t);
        return {...previous,E:previous.E+(sample.E-previous.E)*ratio,HP:previous.HP+(sample.HP-previous.HP)*ratio,fuel:previous.fuel+(sample.fuel-previous.fuel)*ratio};
      }
    }
    return previous;
  }

  function simulate(){
    state.result=CliffEngine.simulate(state.config,state.defs);
    if(state.result.errors.length){notify(state.result.errors.join(" · "));return;}
    state.cursor=Math.min(state.cursor,state.result.total);
    state.refResult=state.reference?CliffEngine.simulate({...state.config,slots:state.reference.slots,on:state.reference.on},state.defs):null;
    renderAll();
  }

  function renderModules(){
    const query=$("module-search").value.trim().toLowerCase(), filter=$("slot-filter").value;
    const visible=state.defs.filter(m=>m.name.toLowerCase().includes(query)&&(filter==="all"||m.slots.includes(filter)));
    $("module-count").textContent=`${visible.length}/${state.defs.length}`;
    $("module-list").innerHTML=visible.map(module=>{
      const role=roleOf(module), equipped=Object.values(state.config.slots).includes(module.id);
      return `<button class="module-card ${state.selected===module.id?"selected":""}" data-id="${module.id}" data-module="${module.id}" data-role="${role}" draggable="true" aria-pressed="${state.selected===module.id}">
        <span class="icon-shell"><span class="module-icon" style="${iconStyle(module.id)}" aria-hidden="true"></span></span>
        <span class="copy"><strong>${esc(module.name)}</strong><small>${roleLabel(role)} · ${esc(module.slots.join(" / "))}${equipped?" · Équipé":""}</small></span>
        <span class="flow-badge">${esc(flowText(module))}</span>
      </button>`;
    }).join("") || `<p class="helper">Aucun module ne correspond au filtre.</p>`;
    document.querySelectorAll(".module-card").forEach(card=>{
      card.addEventListener("click",()=>{state.selected=card.dataset.id;renderModules();renderBag();});
      card.addEventListener("dragstart",event=>{event.dataTransfer.setData("text/plain",card.dataset.id);state.selected=card.dataset.id;highlightSlots(card.dataset.id);});
      card.addEventListener("dragend",()=>highlightSlots(null));
    });
    bindTooltips($("module-list"));
  }

  function highlightSlots(id){
    document.querySelectorAll(".slot-node").forEach(node=>{
      const valid=id&&state.byId[id].slots.includes(CliffEngine.slotTypes[node.dataset.slot]);
      node.classList.toggle("valid",Boolean(valid));
      node.classList.toggle("invalid",Boolean(id)&&!valid);
    });
  }
  function equip(id,slot){
    const module=state.byId[id], type=CliffEngine.slotTypes[slot];
    if(!module?.slots.includes(type)){notify(`${module?.name||id} ne peut pas être placé sur un slot ${type}.`);return;}
    mutate(()=>{
      const origin=Object.keys(state.config.slots).find(key=>state.config.slots[key]===id);
      const displaced=state.config.slots[slot];
      if(origin&&origin!==slot) state.config.slots[origin]=displaced&&state.byId[displaced].slots.includes(CliffEngine.slotTypes[origin])?displaced:null;
      state.config.slots[slot]=id;
    },`${module.name} branché sur ${slotNames[slot]}.`);
  }
  function renderBag(){
    const sample=currentSample();
    document.querySelectorAll(".slot-node").forEach(node=>node.remove());
    Object.keys(CliffEngine.slotTypes).forEach(slot=>{
      const id=state.config.slots[slot], module=state.byId[id], role=module?roleOf(module):"neutral";
      const node=document.createElement("button");
      node.className=`slot-node ${module?"":"empty"}`;node.dataset.slot=slot;node.dataset.role=role;if(module)node.dataset.module=id;
      node.setAttribute("aria-label",module?`${slotNames[slot]} : ${module.name}`:`${slotNames[slot]} libre`);
      node.innerHTML=module?`<span class="module-icon" style="${iconStyle(id)}" aria-hidden="true"></span><strong>${esc(module.name)}</strong><small>${esc(sample.states[id]||module.mode)}</small><span class="slot-type">${CliffEngine.slotTypes[slot]}</span><span class="remove-module" data-remove="${slot}" aria-hidden="true">×</span>`:`<strong>＋</strong><small>Brancher</small><span class="slot-type">${CliffEngine.slotTypes[slot]}</span>`;
      node.addEventListener("click",event=>{
        if(event.target.closest("[data-remove]")){mutate(()=>state.config.slots[slot]=null,"Module retiré.");return;}
        if(module){state.selected=id;renderModules();renderSelected();}else if(state.selected)equip(state.selected,slot);
      });
      node.addEventListener("dragover",event=>event.preventDefault());
      node.addEventListener("drop",event=>{event.preventDefault();highlightSlots(null);equip(event.dataTransfer.getData("text/plain"),slot);});
      $("bag-stage").appendChild(node);
    });
    bindTooltips($("bag-stage"));
    $("slot-count").textContent=`${Object.values(state.config.slots).filter(Boolean).length}/6`;
    $("core-energy").textContent=Math.round(sample.E);
    renderSelected();
  }
  function renderSelected(){
    const module=state.byId[state.selected];
    if(!module){$("selected-detail").innerHTML="";return;}
    const role=roleOf(module), toggle=module.mode==="toggle"?`<label class="wind-toggle"><input id="selected-toggle" type="checkbox" ${state.config.on[module.id]!==false?"checked":""}> ON au départ</label>`:"";
    $("selected-detail").innerHTML=`<span class="module-icon" style="${iconStyle(module.id)}" aria-hidden="true"></span><div><strong>${esc(module.name)}</strong><p>${esc(module.note)}</p>${toggle}</div><span class="source-badge">HYPOTHÈSE VISIBLE</span>`;
    const input=$("selected-toggle");if(input)input.addEventListener("change",()=>mutate(()=>state.config.on[module.id]=input.checked,`${module.name} : ${input.checked?"ON":"OFF"} au départ.`));
  }

  function renderTelemetry(){
    const sample=currentSample(), ratio=sample.E/state.result.cap;
    $("energy-now").textContent=sample.E.toFixed(1);$("energy-cap").textContent=`/ ${state.result.cap}`;
    $("gauge-value").style.strokeDashoffset=String(188.5*(1-Math.max(0,Math.min(1,ratio))));
    $("net-flow").textContent=signed(sample.net);$("net-flow").style.color=sample.net>=0?"var(--green)":"var(--red)";
    $("depletion-time").textContent=formatTime(state.result.depletedAt);$("depletion-context").textContent=`sur ${formatTime(state.result.total)}`;
    $("return-energy").textContent=state.result.final.E.toFixed(1);$("wasted-energy").textContent=state.result.wasted.toFixed(1);$("scenario-resources").textContent=state.result.resources.toFixed(0);
    $("return-pill").textContent=state.result.returnPossible?"RETOUR VIABLE":"RETOUR COMPROMIS";$("return-pill").className=`result-pill ${state.result.returnPossible?"ok":"danger"}`;
    $("flow-breakdown").innerHTML=sample.parts.map(part=>{
      const name=part.id==="passive"?"Perte naturelle":part.id==="safe"?"Zone sûre":state.byId[part.id]?.name||part.id;
      return `<div class="flow-row ${part.rate>=0?"positive":"negative"}"><span>${esc(name)}</span><span>${signed(part.rate)}</span></div>`;
    }).join("");
    const alerts=[];
    if(state.result.depletedAt!==null)alerts.push({type:"danger",text:`Énergie nulle à ${formatTime(state.result.depletedAt)}`});
    if(state.result.agonyAt!==null)alerts.push({type:"danger",text:`Agonie à ${formatTime(state.result.agonyAt)}`});
    if(state.result.rejected)alerts.push({text:`${state.result.rejected} action(s) refusée(s)`});
    if(state.result.wasted>1)alerts.push({text:`${state.result.wasted.toFixed(1)} énergie perdue à saturation`});
    $("alerts").innerHTML=alerts.map(a=>`<div class="alert ${a.type||""}">${esc(a.text)}</div>`).join("")||`<div class="alert" style="background:var(--green-soft);color:var(--green)">Aucune alerte énergétique sur cet essai</div>`;
  }

  function chartPath(result,key,x,y){return result.samples.map((point,index)=>`${index?"L":"M"}${x(point.t).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");}
  function renderChart(){
    const svg=$("energy-chart"), width=1000,height=240,left=58,right=18,top=18,bottom=36,plotW=width-left-right,plotH=height-top-bottom;
    const max=Math.max(state.result.cap,state.refResult?.cap||0,50),x=t=>left+t/state.result.total*plotW,y=v=>top+plotH-v/max*plotH;
    let content=`<title>Énergie et santé sur ${state.result.total} secondes</title>`;
    for(let i=0;i<=4;i++){const value=max*i/4,yy=y(value);content+=`<line class="grid" x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}"></line><text x="${left-10}" y="${yy+4}" text-anchor="end">${Math.round(value)}</text>`;}
    for(let i=0;i<=4;i++){const value=state.result.total*i/4;content+=`<text x="${x(value)}" y="${height-10}" text-anchor="${i===0?"start":i===4?"end":"middle"}">${formatTime(value)}</text>`;}
    if(state.refResult)content+=`<path class="ref-path" d="${chartPath(state.refResult,"E",x,y)}"></path>`;
    content+=`<path class="health-path" d="${chartPath(state.result,"HP",x,y)}"></path><path class="energy-path" d="${chartPath(state.result,"E",x,y)}"></path><line class="cursor-line" x1="${x(state.cursor)}" x2="${x(state.cursor)}" y1="${top}" y2="${top+plotH}"></line>`;
    svg.innerHTML=content;
    svg.onclick=event=>{const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)/rect.width*width;state.cursor=Math.max(0,Math.min(state.result.total,(px-left)/plotW*state.result.total));renderTemporal();};
    let start=0;$("segment-strip").innerHTML=state.config.scenario.map((segment,index)=>{const time=start;start+=segment.duration;return `<button class="segment-chip" style="flex:${segment.duration};--segment-color:${segmentColors[index%segmentColors.length]}" data-time="${time}">${esc(segment.name)}</button>`;}).join("");
    document.querySelectorAll(".segment-chip").forEach(button=>button.onclick=()=>{state.cursor=Number(button.dataset.time);renderTemporal();});
  }
  function renderTemporal(){
    $("time-cursor").max=state.result.total;$("time-cursor").value=state.cursor;$("time-output").textContent=`${formatTime(state.cursor)} / ${formatTime(state.result.total)}`;
    renderBag();renderTelemetry();renderChart();
  }

  function renderScenario(){
    const env=[['sun','Soleil direct'],['night','Nuit'],['rain','Pluie'],['cave','Grotte'],['shade','Abri / ombre'],['safe','Zone sûre']],mov=[['idle','Immobile'],['run','Course'],['sprint','Sprint'],['slide','Glissade'],['climb','Escalade']];
    const activities=[['travel','Trajet'],['combat','Combat'],['harvest','Récolte'],['climb','Escalade'],['explore','Exploration'],['rest','Repos'],['safe','Zone sûre']];
    const options=(values,current)=>values.map(([value,label])=>`<option value="${value}" ${value===current?"selected":""}>${label}</option>`).join("");
    const actionOptions=()=>`<option value="">Choisir une action…</option><option value="flower">Fleur · +20</option><option value="dungeon">Donjon P1 · −30</option>`+Object.values(state.config.slots).filter(Boolean).map(id=>state.byId[id]).filter(m=>m?.mode==='action').map(m=>`<option value="${m.id}">${esc(m.name)} · −${m.cost}</option>`).join("");
    const probabilityFields=(segment,index)=>{const p={...defaultSegmentProbability,...(segment.probabilistic||{})},percent=(field)=>Math.round((p[field]??0)*100);return `<div class="segment-probability"><label class="probability-toggle"><input type="checkbox" data-segment-prob="${index}" data-prob-field="enabled" ${p.enabled?'checked':''}> Activer les variations sur ce segment ${helpButton('Variations du segment','La simulation déterministe conserve les valeurs exactes. La Monte-Carlo tire une version différente de ce segment à chaque essai.')}</label><div class="segment-probability-grid ${p.enabled?'':'is-disabled'}">
      <label>Biome${helpButton('Biome du segment','Module les risques de météo et de blessure selon le niveau du biome.')}<select data-segment-prob="${index}" data-prob-field="biome">${CliffAnalysis.biomes.map(b=>`<option value="${b.id}" ${b.id===p.biome?'selected':''}>Niv. ${b.level} · ${esc(b.name)}</option>`).join('')}</select></label>
      <label>Chance d’occurrence (%)${helpButton('Chance d’occurrence','Probabilité que ce segment soit présent dans un essai. Utile pour un combat, un détour ou un POI optionnel.')}<input type="number" min="0" max="100" value="${percent('occurrenceChance')}" data-segment-prob="${index}" data-prob-field="occurrenceChance" data-prob-percent></label>
      <label>Variation de durée (± %)${helpButton('Variation de durée','Amplitude aléatoire autour de la durée de référence. 20 % fait varier un segment de 60 s entre 48 et 72 s avant un éventuel détour.')}<input type="number" min="0" max="100" value="${percent('durationVariance')}" data-segment-prob="${index}" data-prob-field="durationVariance" data-prob-percent></label>
      <label>Chance de détour (%)${helpButton('Chance de détour','Ajoute entre 10 et 50 % de durée lorsque le détour survient.')}<input type="number" min="0" max="100" value="${percent('detourChance')}" data-segment-prob="${index}" data-prob-field="detourChance" data-prob-percent></label>
      <label>Chance de pluie (%)${helpButton('Chance de pluie','Remplace ponctuellement le milieu du segment par Pluie et modifie les conditions des modules.')}<input type="number" min="0" max="100" value="${percent('weatherChance')}" data-segment-prob="${index}" data-prob-field="weatherChance" data-prob-percent></label>
      <label>Chance de nuit (%)${helpButton('Chance de nuit','Remplace ponctuellement le milieu du segment par Nuit si aucune variation prioritaire n’est tirée.')}<input type="number" min="0" max="100" value="${percent('nightChance')}" data-segment-prob="${index}" data-prob-field="nightChance" data-prob-percent></label>
      <label>Chance de grotte (%)${helpButton('Chance de grotte','Remplace ponctuellement le milieu par Grotte. La grotte coupe notamment les productions solaire et éolienne.')}<input type="number" min="0" max="100" value="${percent('caveChance')}" data-segment-prob="${index}" data-prob-field="caveChance" data-prob-percent></label>
      <label>Chance de blessure (%)${helpButton('Chance de blessure','Applique les dégâts indiqués au début du segment. Le niveau du biome augmente le risque effectif.')}<input type="number" min="0" max="100" value="${percent('injuryChance')}" data-segment-prob="${index}" data-prob-field="injuryChance" data-prob-percent></label>
      <label>Dégâts de blessure${helpButton('Dégâts de blessure','PV retirés lorsque la blessure est tirée. Ces dégâts s’ajoutent à la variation de PV déterministe du segment.')}<input type="number" min="0" max="1000" value="${p.injuryDamage}" data-segment-prob="${index}" data-prob-field="injuryDamage"></label>
      <label>Variation ressources (± %)${helpButton('Variation des ressources','Fait varier la récompense du segment autour de sa valeur de référence.')}<input type="number" min="0" max="100" value="${percent('resourceVariance')}" data-segment-prob="${index}" data-prob-field="resourceVariance" data-prob-percent></label>
      <label>Chance de zone sûre (%)${helpButton('Chance de zone sûre','Transforme le milieu en Zone sûre pour cet essai et active sa régénération énergétique.')}<input type="number" min="0" max="100" value="${percent('safeChance')}" data-segment-prob="${index}" data-prob-field="safeChance" data-prob-percent></label>
    </div></div>`;};
    $("scenario-segments").innerHTML=state.config.scenario.map((segment,index)=>`<article class="scenario-card scenario-card-full" style="--segment-color:${segmentColors[index%segmentColors.length]}"><div class="scenario-card-head"><span class="scenario-index">${index+1}</span><label class="segment-name">Nom du segment${helpButton('Nom du segment','Nom lisible dans la chronologie et les journaux de simulation.')}<input type="text" value="${esc(segment.name)}" data-segment="${index}" data-field="name"></label><div class="segment-tools"><button data-move-segment="${index}" data-direction="-1" class="ghost" aria-label="Monter le segment" ${index===0?'disabled':''}>↑</button><button data-move-segment="${index}" data-direction="1" class="ghost" aria-label="Descendre le segment" ${index===state.config.scenario.length-1?'disabled':''}>↓</button><button data-duplicate-segment="${index}" class="ghost">Dupliquer</button><button data-delete-segment="${index}" class="ghost" ${state.config.scenario.length===1?'disabled':''}>Supprimer</button></div></div><div class="segment-main-grid">
      <label>Activité${helpButton('Activité','Décrit l’intention du segment. Ce classement sert à la lecture et préparera les futurs modèles de gameplay.')}<select data-segment="${index}" data-field="activity">${options(activities,segment.activity||'explore')}</select></label>
      <label>Durée (s)${helpButton('Durée','Temps déterministe du segment. Tous les flux énergétiques actifs sont intégrés pendant cette durée.')}<input type="number" min="1" max="1200" value="${segment.duration}" data-segment="${index}" data-field="duration"></label>
      <label>Milieu${helpButton('Milieu','Active ou désactive les conditions Soleil, Nuit, Pluie, Grotte, Abri et Zone sûre des modules.')}<select data-segment="${index}" data-field="environment">${options(env,segment.environment)}</select></label>
      <label>Mouvement${helpButton('Mouvement','Déclenche les modules liés au sprint, à la glissade, à l’immobilité ou à l’escalade.')}<select data-segment="${index}" data-field="movement">${options(mov,segment.movement)}</select></label>
      <label class="wind-toggle"><input type="checkbox" data-segment="${index}" data-field="wind" ${segment.wind?"checked":""}> Vent ${helpButton('Vent','Autorise les modules éoliens, sauf dans les grottes et les zones sûres.')}</label></div>
      <details class="segment-advanced"><summary>Impacts et événements</summary><div class="segment-impact-grid">
        <label>Perte passive ×${helpButton('Perte du segment','Multiplie seulement la perte passive pendant ce segment. Exemple : 1,5 pour une zone éprouvante.')}<input type="number" min="0" max="10" step="0.1" value="${segment.drainMultiplier??1}" data-segment="${index}" data-field="drainMultiplier"></label>
        <label>Variation énergie au début${helpButton('Variation énergie','Ajoute ou retire immédiatement de l’énergie au début du segment. Utilisez une valeur négative pour un coût.')}<input type="number" step="1" value="${segment.energyDelta??0}" data-segment="${index}" data-field="energyDelta"></label>
        <label>Variation PV au début${helpButton('Variation PV','Ajoute ou retire des PV au début du segment. Une blessure peut être représentée par une valeur négative.')}<input type="number" step="1" value="${segment.healthDelta??0}" data-segment="${index}" data-field="healthDelta"></label>
        <label>Ressources obtenues${helpButton('Ressources','Quantité ajoutée au bilan du scénario à l’entrée dans ce segment.')}<input type="number" min="0" step="1" value="${segment.resourceReward??0}" data-segment="${index}" data-field="resourceReward"></label>
      </div>${probabilityFields(segment,index)}<div class="segment-action-row"><select data-quick-action="${index}">${actionOptions()}</select><button data-add-segment-action="${index}" class="secondary">Ajouter au début du segment</button></div></details></article>`).join("");
    document.querySelectorAll("[data-segment]").forEach(control=>control.onchange=()=>{
      const value=control.type==="checkbox"?control.checked:control.type==="number"?parseLocalized(control.value):control.value;
      if(control.dataset.field==="duration"&&(!Number.isFinite(value)||value<1||value>1200)){control.value=state.config.scenario[control.dataset.segment].duration;return;}
      mutate(()=>{state.config.scenario[control.dataset.segment][control.dataset.field]=value;const total=state.config.scenario.reduce((sum,item)=>sum+item.duration,0);state.config.actions=state.config.actions.filter(action=>action.time<=total);},"Scénario recalculé.");
    });
    document.querySelectorAll("[data-segment-prob]").forEach(control=>control.onchange=()=>{const index=Number(control.dataset.segmentProb),field=control.dataset.probField;let value=control.type==="checkbox"?control.checked:control.tagName==="SELECT"?control.value:parseLocalized(control.value);if(control.hasAttribute("data-prob-percent"))value/=100;if(typeof value==="number"&&!Number.isFinite(value))return;mutate(()=>{state.config.scenario[index].probabilistic={...defaultSegmentProbability,...state.config.scenario[index].probabilistic,[field]:value};},"Variations probabilistes du segment recalculées.");});
    document.querySelectorAll("[data-move-segment]").forEach(button=>button.onclick=()=>mutate(()=>{const from=Number(button.dataset.moveSegment),to=from+Number(button.dataset.direction),[segment]=state.config.scenario.splice(from,1);state.config.scenario.splice(to,0,segment);},"Segment déplacé."));
    document.querySelectorAll("[data-duplicate-segment]").forEach(button=>button.onclick=()=>mutate(()=>{const i=Number(button.dataset.duplicateSegment),copy=CliffEngine.clone(state.config.scenario[i]);copy.name+=' · copie';state.config.scenario.splice(i+1,0,copy);},"Segment dupliqué."));
    document.querySelectorAll("[data-delete-segment]").forEach(button=>button.onclick=()=>mutate(()=>state.config.scenario.splice(Number(button.dataset.deleteSegment),1),"Segment supprimé."));
    document.querySelectorAll("[data-add-segment-action]").forEach(button=>button.onclick=()=>{const index=Number(button.dataset.addSegmentAction),select=document.querySelector(`[data-quick-action="${index}"]`),id=select.value;if(!id){notify("Choisissez une action à ajouter.");return;}const time=state.config.scenario.slice(0,index).reduce((sum,s)=>sum+s.duration,0);addAction({id,kind:"action",time});});
    const inputs={"initial-energy":"initialPercent","initial-health":"health","initial-fuel":"fuel","flow-scale":"rateScale","base-max-energy":"baseMaxEnergy","passive-drain-rate":"basePassiveDrainPercent","starvation-damage":"starvationDamage","safe-zone-regen":"safeZoneRegenRate","agony-duration":"agonyDuration","fuel-seconds":"fuelSecondsPerUnit","drain-basis":"drainBasis","death-rule":"death","toggle-policy":"policy"};
    Object.entries(inputs).forEach(([id,key])=>$(id).value=id==="passive-drain-rate"?String(state.config[key]).replace('.',','):state.config[key]);
    $("scenario-name").value=state.config.scenarioName||"Scénario personnalisé";
    $("saved-scenarios").innerHTML=`<option value="">Scénarios enregistrés…</option>`+state.scenarioTemplates.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join("");
    const p=state.config.probabilistic;$("mc-iterations").value=p.iterations;$("mc-seed").value=p.seed;
    const basis=state.config.drainBasis==='max'?state.result.cap:state.config.baseMaxEnergy,loss=state.config.basePassiveDrainPercent/100*basis;$("passive-preview").textContent=`Perte actuelle au départ : −${loss.toFixed(3)} énergie / s sur une assiette de ${basis}.`;
    decorateParameterHelp();
  }
  function renderActions(){
    const equipped=Object.values(state.config.slots).filter(Boolean).map(id=>state.byId[id]);
    const buttons=equipped.filter(m=>m.mode==="action").map(m=>`<button data-action="${m.id}">${esc(m.name)} · −${m.cost}</button>`).join("")+`<button data-action="flower">Fleur · +20</button><button data-action="dungeon">Donjon P1 · −30</button>`+equipped.filter(m=>m.mode==="toggle").map(m=>`<button data-toggle="${m.id}" data-on="true">${esc(m.name)} ON</button><button data-toggle="${m.id}" data-on="false">${esc(m.name)} OFF</button>`).join("");
    $("action-buttons").innerHTML=buttons;
    document.querySelectorAll("[data-action]").forEach(button=>button.onclick=()=>addAction({id:button.dataset.action,kind:"action"}));
    document.querySelectorAll("[data-toggle]").forEach(button=>button.onclick=()=>addAction({id:button.dataset.toggle,kind:"toggle",on:button.dataset.on==="true"}));
    $("action-list").innerHTML=state.config.actions.map((action,index)=>`<div class="action-event"><time>${formatTime(action.time)}</time><span>${esc(state.byId[action.id]?.name||{flower:"Fleur d’Altanis",dungeon:"Ouverture donjon P1"}[action.id]||action.id)}${action.kind==="toggle"?` · ${action.on?"ON":"OFF"}`:""}</span><button data-delete-action="${index}" aria-label="Supprimer cette action">×</button></div>`).join("")||`<p class="helper">Aucune action programmée.</p>`;
    document.querySelectorAll("[data-delete-action]").forEach(button=>button.onclick=()=>mutate(()=>state.config.actions.splice(Number(button.dataset.deleteAction),1),"Action retirée."));
  }
  function addAction(action){const time=action.time??Math.round(state.cursor*10)/10;mutate(()=>state.config.actions.push({...action,time}),`Action programmée à ${formatTime(time)}.`);}

  function renderComparison(){
    $("ref-legend").hidden=!state.reference;$("pin-build").textContent=state.reference?"Actualiser le build A":"Figer le build A";
    if(!state.refResult){$("comparison").innerHTML="";return;}
    const rows=[['Énergie au retour',state.refResult.final.E.toFixed(1),state.result.final.E.toFixed(1)],['Premier épuisement',formatTime(state.refResult.depletedAt),formatTime(state.result.depletedAt)],['Retour viable',state.refResult.returnPossible?'Oui':'Non',state.result.returnPossible?'Oui':'Non'],['Saturation',state.refResult.wasted.toFixed(1),state.result.wasted.toFixed(1)],['Actions refusées',state.refResult.rejected,state.result.rejected]];
    $("comparison").innerHTML=`<div class="analysis-heading"><div><span class="kicker">COMPARAISON A/B</span><h2>Même scénario, équipements différents</h2></div><button id="clear-reference" class="ghost">Retirer A</button></div><table><thead><tr><th>Mesure</th><th>Build A</th><th>Build B</th></tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,index)=>`<${index?'td':'th'}>${esc(cell)}</${index?'td':'th'}>`).join("")}</tr>`).join("")}</tbody></table>`;
    $("clear-reference").onclick=()=>{state.reference=null;state.refResult=null;renderComparison();renderChart();};
  }
  function rebuildIndex(){state.byId=Object.fromEntries(state.defs.map(module=>[module.id,module]));}
  function numberField(id,label,value,step="0.1",min="0"){const help=parameterHelp[id];return `<label>${label}${help?helpButton(help[0],help[1]):""}<input id="${id}" data-module-number="${id}" type="number" min="${min}" step="${step}" value="${value??0}"></label>`;}
  function renderModuleEditor(){
    const source=state.all.find(module=>module.id===state.selectedCatalogue),module=state.byId[state.selectedCatalogue];
    if(!source){$("module-editor").innerHTML=`<p class="helper">Sélectionnez un module.</p>`;return;}
    if(!module){$("module-editor").innerHTML=`<span class="kicker">DONNÉES INCOMPLÈTES</span><h2>${esc(source.name)}</h2><p class="helper">Créez un prototype configurable à partir des valeurs déjà documentées. Les valeurs absentes démarrent à zéro et les emplacements inconnus restent tous disponibles jusqu’à arbitrage.</p><div class="source-box"><strong>Points à arbitrer</strong><ul>${(source.issues||[]).map(issue=>`<li>${esc(issue)}</li>`).join("")||'<li>Aucune règle chiffrée complète.</li>'}</ul></div><button id="create-module-draft" class="primary">Créer le prototype de simulation</button>`;$("create-module-draft").onclick=()=>mutate(()=>{state.defs.push(draftModule(source));rebuildIndex();state.selected=source.id;},`Prototype de ${source.name} créé.`);return;}
    const conditionOptions=[["","Aucune"],["sun","Soleil direct"],["wind","Vent"],["moving","Sprint / glissade"],["idle","Immobile 5 s"],["fuel","Combustible"]];
    $("module-editor").innerHTML=`<div class="editor-title"><span class="module-icon" style="${iconStyle(module.id)}"></span><div><span class="kicker">PARAMÈTRES DE SIMULATION</span><h2>${esc(module.name)}</h2><p>${esc(source.id)}</p></div><span class="result-pill ok">RECALCUL DIRECT</span></div>
      <div class="editor-grid">
        <label>Fonctionnement${helpButton(...parameterHelp["edit-mode"])}<select id="edit-mode"><option value="passive">Continu passif</option><option value="toggle">Toggle ON/OFF</option><option value="action">Action ponctuelle</option></select></label>
        <label>Condition${helpButton(...parameterHelp["edit-condition"])}<select id="edit-condition">${conditionOptions.map(([v,l])=>`<option value="${v}">${l}</option>`).join("")}</select></label>
        ${numberField("production","Production énergie / s",module.production)}${numberField("consumption","Consommation énergie / s",module.consumption)}
        ${numberField("reduction","Réduction de perte / s",module.reduction)}${numberField("capacity","Bonus de capacité",module.capacity,"1")}
        ${numberField("cost","Coût par action",module.cost,"1")}${numberField("cooldown","Recharge (s ; vide = usage unique)",module.cooldown??"","1")}
      </div>
      <fieldset class="slot-checks"><legend>Emplacements compatibles ${helpButton('Emplacements compatibles','Détermine les rails du sac qui acceptent le module. Un module doit conserver au moins un emplacement.')}</legend>${["Top","Side","Down"].map(slot=>`<label><input type="checkbox" data-edit-slot="${slot}" ${module.slots.includes(slot)?"checked":""}> ${slot}</label>`).join("")}</fieldset>
      <label class="editor-note">Description affichée ${helpButton('Description affichée','Texte présenté dans la fiche RPG du module. Utilisez-le pour rappeler la source et signaler les hypothèses.')}<textarea id="edit-note" rows="3">${esc(module.note||"")}</textarea></label>
      <div class="editor-impact"><span>Impact actuel ${helpButton('Impact actuel','Résumé du principal effet énergétique utilisé par le moteur avec les valeurs saisies.')}</span><strong>${esc(flowText(module))}</strong><small>Les courbes, alertes et métriques utilisent ces valeurs dès leur modification.</small></div>
      ${module.customDraft?'<div class="custom-draft-note">Prototype de travail : les valeurs restent des hypothèses modifiables tant qu’elles ne sont pas validées dans le GDD.</div>':''}
      <div class="editor-actions"><button id="reset-module" class="ghost">${module.customDraft?'Retirer du simulateur':'Réinitialiser ce module'}</button><button id="reset-all-modules" class="ghost">Tout réinitialiser</button></div>
      <details class="source-box"><summary>Sources et divergences</summary><ul>${source.issues.map(issue=>`<li>${esc(issue)}</li>`).join("")}</ul></details>`;
    $("edit-mode").value=module.mode;$("edit-condition").value=module.condition||"";
    bindParameterHelp($("module-editor"));
    const commit=(fn,message)=>mutate(()=>{fn();rebuildIndex();normalizeSlots();},message);
    $("edit-mode").onchange=()=>commit(()=>module.mode=$("edit-mode").value,"Mode du module modifié.");
    $("edit-condition").onchange=()=>commit(()=>module.condition=$("edit-condition").value||undefined,"Condition du module modifiée.");
    document.querySelectorAll("[data-module-number]").forEach(control=>control.oninput=()=>{clearTimeout(state.editorTimer);const key=control.dataset.moduleNumber,raw=control.value;state.editorTimer=setTimeout(()=>{const value=raw===""&&key==="cooldown"?null:Number(raw);if(value!==null&&!Number.isFinite(value))return;commit(()=>module[key]=value,`${module.name} recalculé.`);},220);});
    document.querySelectorAll("[data-edit-slot]").forEach(control=>control.onchange=()=>{const selected=[...document.querySelectorAll("[data-edit-slot]:checked")].map(item=>item.dataset.editSlot);if(!selected.length){control.checked=true;notify("Un module simulable doit conserver au moins un emplacement.");return;}commit(()=>module.slots=selected,"Compatibilité des emplacements modifiée.");});
    $("edit-note").oninput=()=>{clearTimeout(state.editorTimer);const value=$("edit-note").value;state.editorTimer=setTimeout(()=>commit(()=>module.note=value,"Description modifiée."),300);};
    $("reset-module").onclick=()=>mutate(()=>{const original=state.baseDefs.find(item=>item.id===module.id),index=state.defs.findIndex(item=>item.id===module.id);if(original)state.defs[index]=CliffEngine.clone(original);else state.defs.splice(index,1);rebuildIndex();normalizeSlots();},module.customDraft?"Prototype retiré du simulateur.":"Module réinitialisé.");
    $("reset-all-modules").onclick=()=>mutate(()=>{state.defs=CliffEngine.clone(state.baseDefs);rebuildIndex();normalizeSlots();},"Tous les modules ont été réinitialisés.");
  }
  function normalizeSlots(){for(const [slot,id] of Object.entries(state.config.slots)){if(id&&!state.byId[id]?.slots.includes(CliffEngine.slotTypes[slot]))state.config.slots[slot]=null;}}
  function renderCatalogue(){
    const query=$("catalogue-search").value.trim().toLowerCase();
    const visible=state.all.filter(module=>JSON.stringify(module).toLowerCase().includes(query));
    $("catalogue-list").innerHTML=visible.map(source=>{const module=state.byId[source.id],role=module?roleOf(module):"neutral";return `<button class="catalogue-item ${state.selectedCatalogue===source.id?"selected":""}" data-catalogue-id="${source.id}" data-role="${role}"><span class="module-icon" style="${iconStyle(source.id)}"></span><span><strong>${esc(source.name)}</strong><small>${module?`${roleLabel(role)} · ${esc(flowText(module))}`:"Prototype à créer"}</small></span><em>${module?(module.customDraft?"HYPOTHÈSE":"SIMULABLE"):"CONFIGURABLE"}</em></button>`;}).join("")||`<p class="helper">Aucun résultat.</p>`;
    document.querySelectorAll("[data-catalogue-id]").forEach(button=>button.onclick=()=>{state.selectedCatalogue=button.dataset.catalogueId;renderCatalogue();});
    renderModuleEditor();
  }

  function buildLabel(row){return row.ids.map(id=>state.byId[id]?.name||id).join(" · ")||"Sac vide";}
  function miniBars(items,max=10){return `<div class="mini-bars">${items.slice(0,max).map(item=>`<div><span>${esc(item.label)}</span><i><b style="width:${Math.max(2,Math.min(100,item.value*100))}%"></b></i><strong>${esc(item.text)}</strong></div>`).join("")}</div>`;}
  function renderBatch(){
    if(!state.batch){$("batch-results").innerHTML="";return;}const b=state.batch,top=b.rows.slice(0,8);
    $("batch-summary").innerHTML=`<div class="analysis-kpis"><article><strong>${b.count}</strong><span>builds testés ${helpButton('Builds testés','Nombre de compositions valides évaluées avec les emplacements Top, Side et Down disponibles.')}</span></article><article><strong>${b.frontier.length}</strong><span>builds Pareto ${helpButton('Frontière de Pareto','Builds qu’aucune autre composition ne surpasse simultanément en autonomie, puissance et polyvalence.')}</span></article><article><strong>${b.never.length}</strong><span>jamais dans le top 50 ${helpButton('Modules jamais choisis','Modules absents des cinquante compositions ayant le meilleur score global.')}</span></article><article><strong>${b.cliffs.length}</strong><span>ruptures détectées ${helpButton('Ruptures de viabilité','Builds qui cessent d’être viables après une hausse de 10 % de la perte passive.')}</span></article></div>`;
    const rates=b.rates.map(x=>({label:x.name,value:x.rate,text:`${Math.round(x.rate*100)} %`}));
    $("batch-results").innerHTML=`<div class="result-grid"><article><h3>Builds dominants</h3><ol class="rank-list">${top.map((row,index)=>`<li><span>${index+1}</span><div><strong>${esc(buildLabel(row))}</strong><small>Viable ${Math.round(row.viability*100)} % · autonomie ${Math.round(row.autonomy*100)} % · puissance ${row.power.toFixed(1)} · polyvalence ${row.versatility.toFixed(1)}</small></div><button data-apply-build="${index}" class="ghost">Appliquer</button></li>`).join("")}</ol></article><article><h3>Taux d’équipement · top 50</h3>${miniBars(rates,13)}<p class="helper">Jamais choisis : ${b.never.map(x=>esc(x.name)).join(" · ")||"aucun"}</p></article><article><h3>Frontière de Pareto</h3><div class="pareto-plot">${b.frontier.slice(0,80).map(row=>`<i title="${esc(buildLabel(row))}" style="left:${Math.min(96,row.autonomy*92+2)}%;bottom:${Math.min(92,row.power/18*88+2)}%;width:${6+row.versatility}px;height:${6+row.versatility}px"></i>`).join("")}</div><div class="axis-note"><span>Autonomie →</span><span>Puissance ↑ · taille = polyvalence</span></div></article><article><h3>Sensibilité du build actif</h3>${miniBars(b.sensitivity.map(x=>({label:x.label,value:Math.min(1,x.impact*5),text:`${(x.impact*100).toFixed(1)} pts`})),10)}</article><article><h3>Ruptures de viabilité</h3>${b.cliffs.length?`<ul class="cliff-list">${b.cliffs.map(x=>`<li><strong>${Math.round(x.before*100)} → ${Math.round(x.after*100)} %</strong><span>${esc(x.trigger)} · ${esc(buildLabel({ids:Object.values(x.slots).filter(Boolean)}))}</span></li>`).join("")}</ul>`:`<p class="helper">Aucun basculement dans les 250 meilleurs builds avec le stress testé.</p>`}</article></div>`;
    bindParameterHelp($("view-analysis"));
    document.querySelectorAll("[data-apply-build]").forEach(button=>button.onclick=()=>{const row=top[Number(button.dataset.applyBuild)];mutate(()=>state.config.slots=CliffEngine.clone(row.slots),"Build issu de l’analyse appliqué.");});
  }
  function renderMonte(){
    if(!state.monte)return;const m=state.monte,fmt=v=>formatTime(v);
    $("monte-results").innerHTML=`<div class="analysis-kpis"><article class="${m.probability>=.7?"good":m.probability<.4?"bad":""}"><strong>${Math.round(m.probability*100)} %</strong><span>probabilité de retour ${helpButton('Probabilité de retour','Part des variantes où le joueur termine vivant avec au moins un point d’énergie.')}</span></article><article><strong>${m.energy.median.toFixed(1)}</strong><span>énergie médiane ${helpButton('Énergie médiane','La moitié des essais finit au-dessus de cette valeur et l’autre moitié en dessous.')}</span></article><article><strong>${fmt(m.duration.median)}</strong><span>durée médiane ${helpButton('Durée médiane','Durée centrale après variation des segments, détours et segments optionnels.')}</span></article><article><strong>${m.resources.median.toFixed(0)}</strong><span>ressources médianes ${helpButton('Ressources médianes','Récompense centrale après les variations de ressources et les segments optionnels.')}</span></article></div><div class="distribution-grid"><div><h3>Fourchettes 10–90 % ${helpButton('Fourchette 10–90 %','Intervalle contenant les 80 % centraux des résultats. Les 10 % les plus bas et les 10 % les plus hauts sont exclus.')}</h3><dl><dt>Énergie au retour</dt><dd>${m.energy.p10.toFixed(1)} → ${m.energy.p90.toFixed(1)}</dd><dt>Durée</dt><dd>${fmt(m.duration.p10)} → ${fmt(m.duration.p90)}</dd><dt>Ressources</dt><dd>${m.resources.p10.toFixed(0)} → ${m.resources.p90.toFixed(0)}</dd></dl></div><div><h3>Événements moyens ${helpButton('Événements moyens','Nombre moyen d’événements tirés par expédition sur l’ensemble des essais.')}</h3><dl><dt>Combats</dt><dd>${m.averages.combats.toFixed(1)}</dd><dt>Blessures</dt><dd>${m.averages.injuries.toFixed(1)}</dd><dt>Détours</dt><dd>${m.averages.detours.toFixed(1)}</dd><dt>Milieux modifiés</dt><dd>${m.averages.weatherChanges.toFixed(1)}</dd><dt>Segments évités</dt><dd>${m.averages.skipped.toFixed(1)}</dd><dt>Mort</dt><dd>${Math.round(m.deathProbability*100)} %</dd></dl></div></div>`;bindParameterHelp($("monte-results"));
  }
  function renderAnalysis(){
    const p=state.config.probabilistic,variable=state.config.scenario.filter(s=>s.probabilistic?.enabled).length;$("mc-config-summary").innerHTML=`<strong>${esc(state.config.scenarioName||'Scénario personnalisé')}</strong><span>${p.iterations} essais · graine ${p.seed}</span><span>${variable}/${state.config.scenario.length} segments avec variations</span><button id="edit-probabilistic" class="ghost">Modifier dans Scénario</button>`;$("edit-probabilistic").onclick=()=>document.querySelector('.tab[data-view="scenario"]').click();renderBatch();renderMonte();
  }
  function downloadFile(name,type,content){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function profilePayload(name="Profil exporté",note=""){return {schema:"cliffdivers-balance-profile",version:"1.4",exportedAt:new Date().toISOString(),name,note,config:CliffEngine.clone(state.config),modules:CliffEngine.clone(state.defs),rules:CliffEngine.clone(state.rules),savedScenarios:CliffEngine.clone(state.scenarioTemplates),metrics:{returnEnergy:state.result.final.E,depletedAt:state.result.depletedAt,returnPossible:state.result.returnPossible,wasted:state.result.wasted,resources:state.result.resources}};}
  function renderProfiles(){
    $("version-count").textContent=state.versions.length;
    $("version-list").innerHTML=state.versions.map((version,index)=>`<article class="version-card"><div><strong>${esc(version.name)}</strong><time>${new Date(version.createdAt).toLocaleString("fr-FR")}</time><p>${esc(version.note||"Sans note de balance.")}</p></div><div><button data-restore-version="${index}" class="secondary">Restaurer</button><button data-export-version="${index}" class="ghost">JSON</button><button data-delete-version="${index}" class="ghost">Supprimer</button></div></article>`).join("")||`<p class="analysis-placeholder">Aucune version nommée.</p>`;
    $("change-log").innerHTML=state.changeLog.map(item=>`<div><time>${new Date(item.at).toLocaleString("fr-FR")}</time><span>${esc(item.message)}</span></div>`).join("")||`<p class="helper">Aucun changement enregistré.</p>`;
    document.querySelectorAll("[data-restore-version]").forEach(button=>button.onclick=()=>{const v=state.versions[Number(button.dataset.restoreVersion)];mutate(()=>{state.config=CliffEngine.clone(v.config);state.defs=CliffEngine.clone(v.modules);if(v.rules)state.rules=CliffEngine.clone(v.rules);normalizeScenarioSegments();rebuildIndex();normalizeSlots();},`Version « ${v.name} » restaurée.`);renderProfiles();});
    document.querySelectorAll("[data-export-version]").forEach(button=>button.onclick=()=>{const v=state.versions[Number(button.dataset.exportVersion)];downloadFile(`${v.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()||"profil"}.json`,"application/json",JSON.stringify(v,null,2));});
    document.querySelectorAll("[data-delete-version]").forEach(button=>button.onclick=()=>{const v=state.versions.splice(Number(button.dataset.deleteVersion),1)[0];recordChange(`Version « ${v.name} » supprimée.`);saveLocal();renderProfiles();});
  }
  function renderRules(){
    const root=$("rules-editor"),list=items=>`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`;
    if(!state.rulesEditing){root.innerHTML=`<div class="rules-toolbar"><div><span class="kicker">CONTRAT DE SIMULATION</span><h1 id="rules-title">Règles et hypothèses ${helpButton('Règles de simulation','Ces textes documentent les conventions utilisées par le prototype. Leur édition sert à aligner le game design et la programmation.')}</h1></div><div class="rules-actions"><button id="edit-rules" class="primary">Éditer les règles</button></div></div><div class="rule-grid">${state.rules.cards.map((rule,index)=>`<article><span class="rule-number">${String(index+1).padStart(2,'0')}</span><h2>${esc(rule.title)}</h2><p>${esc(rule.text)}</p></article>`).join("")}</div><div class="rules-columns"><div><h2>Documenté ${helpButton('Documenté','Valeurs ou comportements suffisamment établis pour servir de référence au simulateur.')}</h2>${list(state.rules.documented)}</div><div><h2>À arbitrer ${helpButton('À arbitrer','Décisions encore ouvertes. Les valeurs correspondantes doivent rester visibles comme hypothèses de travail.')}</h2>${list(state.rules.arbitrations)}</div></div>`;$("edit-rules").onclick=()=>{state.rulesEditing=true;renderRules();};bindParameterHelp(root);return;}
    root.innerHTML=`<div class="rules-toolbar"><div><span class="kicker">ÉDITION</span><h1 id="rules-title">Modifier le contrat de simulation</h1></div><div class="rules-actions"><button id="save-rules" class="primary">Enregistrer</button><button id="cancel-rules" class="ghost">Annuler</button><button id="reset-rules" class="ghost">Valeurs initiales</button></div></div><div class="rule-edit-grid">${state.rules.cards.map((rule,index)=>`<article class="rule-edit-card"><label>Titre<input data-rule-title="${index}" value="${esc(rule.title)}"></label><label>Description<textarea data-rule-text="${index}">${esc(rule.text)}</textarea></label></article>`).join("")}</div><div class="rules-textareas"><label>Éléments documentés · une ligne par élément<textarea id="rules-documented">${esc(state.rules.documented.join('\n'))}</textarea></label><label>Éléments à arbitrer · une ligne par élément<textarea id="rules-arbitrations">${esc(state.rules.arbitrations.join('\n'))}</textarea></label></div>`;
    const before=CliffEngine.clone(state.rules);
    $("save-rules").onclick=()=>mutate(()=>{state.rules.cards=state.rules.cards.map((rule,index)=>({title:document.querySelector(`[data-rule-title="${index}"]`).value.trim()||rule.title,text:document.querySelector(`[data-rule-text="${index}"]`).value.trim()}));state.rules.documented=$("rules-documented").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);state.rules.arbitrations=$("rules-arbitrations").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);state.rulesEditing=false;},"Règles de simulation mises à jour.");
    $("cancel-rules").onclick=()=>{state.rules=before;state.rulesEditing=false;renderRules();};
    $("reset-rules").onclick=()=>mutate(()=>{state.rules=CliffEngine.clone(defaultRules);state.rulesEditing=false;},"Règles initiales restaurées.");
  }

  function renderAll(){
    $("undo").disabled=!state.history.length;
    renderModules();renderBag();renderTelemetry();renderChart();renderScenario();renderActions();renderComparison();
    if(!$("view-catalogue").hidden)renderCatalogue();
    if(!$("view-rules").hidden)renderRules();
  }
  function bind(){
    document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
      document.querySelectorAll(".tab").forEach(item=>item.classList.toggle("active",item===tab));
      document.querySelectorAll(".view").forEach(view=>{const active=view.id===`view-${tab.dataset.view}`;view.hidden=!active;view.classList.toggle("active",active);});
      if(tab.dataset.view==="catalogue")renderCatalogue();
      if(tab.dataset.view==="analysis")renderAnalysis();
      if(tab.dataset.view==="profiles")renderProfiles();
      if(tab.dataset.view==="rules")renderRules();
    });
    $("module-search").oninput=renderModules;$("slot-filter").onchange=renderModules;$("catalogue-search").oninput=renderCatalogue;
    $("undo").onclick=()=>{if(!state.history.length)return;const previous=state.history.pop();state.config=previous.config;state.defs=previous.defs;if(previous.rules)state.rules=previous.rules;rebuildIndex();recordChange("Dernière modification annulée.");saveLocal();notify("Dernière modification annulée.");simulate();};
    $("pin-build").onclick=()=>{state.reference={slots:CliffEngine.clone(state.config.slots),on:CliffEngine.clone(state.config.on)};notify("Build A figé. Les réglages de scénario resteront communs.");simulate();};
    $("time-cursor").oninput=()=>{state.cursor=Number($("time-cursor").value);renderTemporal();};
    $("restart").onclick=()=>{state.cursor=0;renderTemporal();};
    $("play").onclick=()=>{
      if(state.playing){clearInterval(state.timer);state.playing=false;$("play").textContent="Lire";return;}
      if(state.cursor>=state.result.total)state.cursor=0;state.playing=true;$("play").textContent="Pause";
      state.timer=setInterval(()=>{state.cursor=Math.min(state.result.total,state.cursor+1);renderTemporal();if(state.cursor>=state.result.total){clearInterval(state.timer);state.playing=false;$("play").textContent="Lire";}},80);
    };
    $("scenario-preset").onchange=()=>mutate(()=>{const key=$("scenario-preset").value;state.config.scenario=CliffEngine.clone(CliffEngine.presets[key]);normalizeScenarioSegments();state.config.scenarioName={mixed:'Falaise et grotte',night:'Sortie nocturne',rain:'Pluie et abri'}[key];state.config.actions=[];state.cursor=0;},"Scénario chargé ; actions précédentes retirées.");
    $("add-segment").onclick=()=>mutate(()=>state.config.scenario.push({name:`Segment ${state.config.scenario.length+1}`,activity:'explore',duration:30,environment:'shade',movement:'run',wind:false,drainMultiplier:1,energyDelta:0,healthDelta:0,resourceReward:0,probabilistic:CliffEngine.clone(defaultSegmentProbability)}),"Nouveau segment ajouté.");
    $("scenario-name").onchange=()=>mutate(()=>state.config.scenarioName=$("scenario-name").value.trim()||"Scénario personnalisé","Scénario renommé.");
    $("save-scenario").onclick=()=>{const name=$("scenario-name").value.trim()||"Scénario personnalisé",entry={name,createdAt:new Date().toISOString(),scenario:CliffEngine.clone(state.config.scenario),actions:CliffEngine.clone(state.config.actions),probabilistic:CliffEngine.clone(state.config.probabilistic)};const existing=state.scenarioTemplates.findIndex(s=>s.name===name);if(existing>=0)state.scenarioTemplates[existing]=entry;else state.scenarioTemplates.unshift(entry);recordChange(`Scénario « ${name} » enregistré.`);saveLocal();notify(`Scénario « ${name} » enregistré.`);renderScenario();};
    $("saved-scenarios").onchange=()=>{const raw=$("saved-scenarios").value;if(raw==="")return;const entry=state.scenarioTemplates[Number(raw)];if(!entry)return;mutate(()=>{state.config.scenarioName=entry.name;state.config.scenario=CliffEngine.clone(entry.scenario);normalizeScenarioSegments();state.config.actions=CliffEngine.clone(entry.actions||[]);state.config.probabilistic={...state.config.probabilistic,...CliffEngine.clone(entry.probabilistic||{})};state.cursor=0;},`Scénario « ${entry.name} » chargé.`);};
    const inputs={"initial-energy":"initialPercent","initial-health":"health","initial-fuel":"fuel","flow-scale":"rateScale","base-max-energy":"baseMaxEnergy","passive-drain-rate":"basePassiveDrainPercent","starvation-damage":"starvationDamage","safe-zone-regen":"safeZoneRegenRate","agony-duration":"agonyDuration","fuel-seconds":"fuelSecondsPerUnit","drain-basis":"drainBasis","death-rule":"death","toggle-policy":"policy"};
    Object.entries(inputs).forEach(([id,key])=>$(id).onchange=()=>{const control=$(id),numeric=control.type==="number"||id==="passive-drain-rate",value=numeric?parseLocalized(control.value):control.value;if(numeric&&!Number.isFinite(value)){control.value=state.config[key];notify("Valeur numérique invalide.");return;}mutate(()=>state.config[key]=value,"Paramètres recalculés.");});
    $("passive-drain-rate").onchange=null;
    $("passive-drain-rate").oninput=()=>{clearTimeout(state.editorTimer);const raw=$("passive-drain-rate").value.trim();if(!/^\d+(?:[.,]\d+)?$/.test(raw))return;state.editorTimer=setTimeout(()=>{const value=parseLocalized(raw);if(Number.isFinite(value))mutate(()=>state.config.basePassiveDrainPercent=value,"Perte passive recalculée.");},450);};
    const probabilityInputs={"mc-iterations":["iterations",1],"mc-seed":["seed",1]};
    Object.entries(probabilityInputs).forEach(([id,[key,scale]])=>$(id).onchange=()=>{const value=parseLocalized($(id).value)*scale;if(!Number.isFinite(value))return;mutate(()=>state.config.probabilistic[key]=value,"Paramètre probabiliste modifié.");});
    $("run-batch").onclick=()=>{$("run-batch").disabled=true;$("run-batch").textContent="Calcul…";$("batch-summary").textContent="Exploration des compositions valides…";setTimeout(()=>{state.batch=CliffAnalysis.runBatch(state.config,state.defs);renderBatch();$("run-batch").disabled=false;$("run-batch").textContent="Relancer l’analyse";recordChange(`Analyse en lot : ${state.batch.count} builds testés.`);saveLocal();},20);};
    $("run-monte").onclick=()=>{const opts=CliffEngine.clone(state.config.probabilistic);opts.iterations=Math.max(50,Math.min(5000,opts.iterations||500));$("run-monte").disabled=true;$("monte-results").textContent="Simulation des expéditions…";setTimeout(()=>{state.monte=CliffAnalysis.runMonteCarlo(state.config,state.defs,opts);renderMonte();$("run-monte").disabled=false;recordChange(`Monte-Carlo : ${opts.iterations} variantes du scénario.`);saveLocal();},20);};
    $("save-version").onclick=()=>{const name=$("version-name").value.trim()||`Version ${state.versions.length+1}`,note=$("version-note").value.trim();state.versions.unshift({schema:"cliffdivers-balance-version",name,note,createdAt:new Date().toISOString(),config:CliffEngine.clone(state.config),modules:CliffEngine.clone(state.defs),rules:CliffEngine.clone(state.rules)});recordChange(`Version « ${name} » enregistrée.`);saveLocal();$("version-name").value="";$("version-note").value="";$("profile-status").textContent=`Version « ${name} » enregistrée localement.`;renderProfiles();};
    $("export-json").onclick=()=>{downloadFile("cliffdivers-balance-profile.json","application/json",JSON.stringify(profilePayload(),null,2));$("profile-status").textContent="Profil JSON exporté.";};
    $("export-csv").onclick=()=>{const q=v=>`"${String(v??"").replace(/"/g,'""')}"`,rows=[["section","id","nom","paramètre","valeur","note"]];for(const [key,value] of Object.entries(state.config))if(!["slots","on","scenario","actions"].includes(key))rows.push(["scenario","global","Conditions initiales",key,value,""]);state.config.scenario.forEach((s,i)=>Object.entries(s).forEach(([k,v])=>rows.push(["segment",i+1,s.name,k,v,""])));state.defs.forEach(m=>['mode','condition','production','consumption','reduction','capacity','cost','cooldown'].forEach(k=>rows.push(["module",m.id,m.name,k,m[k]??"",m.note||""])));rows.push(["résultat","build","Build actif","énergie_retour",state.result.final.E,""],["résultat","build","Build actif","retour_viable",state.result.returnPossible,""],["résultat","build","Build actif","saturation",state.result.wasted,""]);downloadFile("cliffdivers-balance-profile.csv","text/csv;charset=utf-8","\ufeff"+rows.map(r=>r.map(q).join(";")).join("\n"));$("profile-status").textContent="Profil CSV exporté.";};
    $("import-json").onchange=event=>{const file=event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result),defs=data.modules,base=CliffEngine.defaults();if(!data.config||!Array.isArray(defs))throw Error("Format de profil incomplet.");const config={...base,...data.config,probabilistic:{...base.probabilistic,...(data.config.probabilistic||{})}};const errors=CliffEngine.validate(config,defs);if(errors.length)throw Error(errors.join(" · "));mutate(()=>{state.config=CliffEngine.clone(config);state.defs=CliffEngine.clone(defs);normalizeScenarioSegments();if(data.rules)state.rules=CliffEngine.clone(data.rules);if(Array.isArray(data.savedScenarios))state.scenarioTemplates=CliffEngine.clone(data.savedScenarios);rebuildIndex();normalizeSlots();},`Profil importé : ${data.name||file.name}.`);$("profile-status").textContent="Import terminé et simulation recalculée.";renderProfiles();}catch(error){$("profile-status").textContent=`Import refusé : ${error.message}`;}finally{event.target.value="";}};reader.readAsText(file);};
    $("clear-log").onclick=()=>{state.changeLog=[];saveLocal();renderProfiles();};
  }

  async function init(){
    try{
      const catalogue=window.CLIFF_CATALOGUE||await fetch("./catalogue-modules.json").then(response=>{if(!response.ok)throw new Error("Catalogue indisponible");return response.json();});
      state.all=catalogue.modules;state.defs=state.all.filter(module=>module.prototype).map(moduleFromSource);state.baseDefs=CliffEngine.clone(state.defs);state.config=CliffEngine.defaults();
      try{const saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved?.config&&Array.isArray(saved.defs)){const merged={...state.config,...saved.config,probabilistic:{...state.config.probabilistic,...(saved.config.probabilistic||{})}};if(!CliffEngine.validate(merged,saved.defs).length){state.config=merged;state.defs=saved.defs;}}state.versions=Array.isArray(saved?.versions)?saved.versions:[];state.scenarioTemplates=Array.isArray(saved?.scenarioTemplates)?saved.scenarioTemplates:[];state.changeLog=Array.isArray(saved?.changeLog)?saved.changeLog:[];if(saved?.rules)state.rules=saved.rules;}catch(error){console.warn("Profil local ignoré",error);}
      normalizeScenarioSegments();rebuildIndex();normalizeSlots();
      bind();simulate();renderCatalogue();
    }catch(error){document.body.innerHTML=`<main style="padding:32px"><h1>Impossible de charger l’application</h1><p>${esc(error.message)}</p></main>`;}
  }
  init();
})();

