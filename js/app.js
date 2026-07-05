const DATA = window.OSRS_DATA;
const STORAGE_KEY = 'osrs_companion_save_v5';
const IMPORT_KEY = 'osrs_companion_imported_quest_data_v1';
let save = loadSave();
let imported = loadImported();
let currentView = 'dashboard';
let selectedQuestId = DATA.quests[0]?.id;
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const SKILLS = DATA.skills || ['Attack','Strength','Defence','Ranged','Prayer','Magic','Runecrafting','Construction','Hitpoints','Agility','Herblore','Thieving','Crafting','Fletching','Slayer','Hunter','Mining','Smithing','Fishing','Cooking','Firemaking','Woodcutting','Farming'];
function defaultSave(){return {quests:{},diaries:{},skills:{},items:{},notes:'',timers:{}}}
function loadSave(){try{return {...defaultSave(), ...(JSON.parse(localStorage.getItem(STORAGE_KEY))||{})}}catch{return defaultSave()}}
function loadImported(){try{return JSON.parse(localStorage.getItem(IMPORT_KEY))||{}}catch{return {}}}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(save));}
function persistImported(){localStorage.setItem(IMPORT_KEY,JSON.stringify(imported));}
function html(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function slug(s){return String(s||'').toLowerCase().replace(/[’']/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function wikiUrl(name){return 'https://oldschool.runescape.wiki/w/'+encodeURIComponent(String(name).replace(/ /g,'_')).replace(/'/g,'%27')}
function status(id){return save.quests[id]||'not-started'}
function setStatus(id,val){save.quests[id]=val; persist(); render();}
function questByName(n){const key=slug(n);return DATA.quests.find(q=>slug(q.name)===key||slug(q.rawName)===key)}
function baseQuest(id){return DATA.quests.find(q=>q.id===id)}
function qData(q){
  const extra = imported[q.id] || {};
  const out = {...q, ...extra};
  ['questRequirements','skillRequirements','itemRequirements','recommendedItems','xpRewards','rewards','steps','bosses','warnings','teleports'].forEach(k=>{
    const a = Array.isArray(q[k])?q[k]:[];
    const b = Array.isArray(extra[k])?extra[k]:[];
    out[k]=dedupe([...a,...b]);
  });
  if(extra.description) out.description = extra.description;
  if(extra.notes) out.notes = extra.notes;
  if(extra.source) out.source = extra.source;
  if(extra.importedAt) out.localInfoStatus = 'wiki-imported';
  out.wiki = out.wiki || wikiUrl(out.name);
  return out;
}
function allQuests(){return DATA.quests.map(qData)}
function dedupe(arr){const seen=new Set();return (arr||[]).filter(x=>{const k=typeof x==='object'?JSON.stringify(x).toLowerCase():String(x).toLowerCase(); if(seen.has(k))return false; seen.add(k); return x!=='' && x!=null;})}
function setTitle(t,st){$('#viewTitle').textContent=t; $('#viewSubtitle').textContent=st||''}
function chips(arr, cls=''){if(!arr||!arr.length)return '<span class="muted">None listed locally.</span>';return arr.map(x=>`<span class="pill ${cls}">${html(typeof x==='object'?`${x.level} ${x.skill}`:x)}</span>`).join('')}
function list(arr){if(!arr||!arr.length)return '<p class="muted">None listed locally yet.</p>';return `<ul class="list">${arr.map(x=>`<li>${renderInlineQuestText(typeof x==='object'?`${x.level} ${x.skill}`:x)}</li>`).join('')}</ul>`}
function renderInlineQuestText(text){
  let s=html(text);
  allQuests().sort((a,b)=>b.name.length-a.name.length).slice(0,260).forEach(q=>{
    const safe=html(q.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    s=s.replace(new RegExp(`\\b${safe}\\b`,'g'),`<button class="inline-quest" onclick="openQuest('${q.id}')">${html(q.name)}</button>`);
  });
  return s;
}
function questLink(name){const q=questByName(name);return q?`<button class="inline-quest" onclick="openQuest('${q.id}')">${html(name)}</button>`:`<span class="pill warn">${html(name)}</span>`}
function isCompleteName(name){const q=questByName(name);return q ? status(q.id)==='complete' : false}
function blockers(q){return (q.questRequirements||[]).filter(r=>!isCompleteName(r));}
function missingSkills(q){return (q.skillRequirements||[]).filter(r=>(+save.skills[r.skill]||1)<+r.level);}
function openQuest(id){selectedQuestId=id; currentView='quests'; $('.tab.active')?.classList.remove('active'); $(`.tab[data-view="quests"]`)?.classList.add('active'); render(); setTimeout(()=>{$('.detail')?.scrollIntoView({behavior:'smooth',block:'start'});},30)}
window.openQuest=openQuest; window.setStatus=setStatus;
function render(){({dashboard,quests,skills,items,diaries,timers,calc,tools,notes,settings,datapack}[currentView]||dashboard)()}
$$('.tab').forEach(b=>b.onclick=()=>{currentView=b.dataset.view; $$('.tab').forEach(x=>x.classList.toggle('active',x===b)); render();});
$('#globalSearch').addEventListener('input',()=>{if(currentView!=='quests'){currentView='quests'; $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view==='quests'));} render();});
$('#quickComplete').onclick=()=>selectedQuestId&&setStatus(selectedQuestId,'complete');

function dashboard(){
  setTitle('Dashboard','Your account command center: route progress, blockers, prep, and next moves.');
  const qs=allQuests(); const total=qs.length; const done=qs.filter(q=>status(q.id)==='complete').length;
  const qOnly=qs.filter(q=>q.type==='Quest'); const qDone=qOnly.filter(q=>status(q.id)==='complete').length;
  const qp=qs.reduce((s,q)=>s+(status(q.id)==='complete'?(+q.questPoints||0):0),0);
  const membersDone=qs.filter(q=>q.members&&status(q.id)==='complete').length, membersTotal=qs.filter(q=>q.members).length;
  const f2pDone=qs.filter(q=>!q.members&&status(q.id)==='complete').length, f2pTotal=qs.filter(q=>!q.members).length;
  const pct=Math.round(done/Math.max(total,1)*100), qpPct=Math.min(100,Math.round(qp/327*100));
  const detailed=qs.filter(q=>q.localInfoStatus==='curated'||q.localInfoStatus==='wiki-imported').length;
  const next=qs.find(q=>status(q.id)!=='complete' && blockers(q).length===0 && missingSkills(q).length===0) || qs.find(q=>status(q.id)!=='complete');
  const hardBlockers = qs.filter(q=>status(q.id)!=='complete' && (blockers(q).length||missingSkills(q).length)).slice(0,6);
  const upcoming=qs.filter(q=>status(q.id)!=='complete').slice(0,8);
  const skillMiss={}; qs.filter(q=>status(q.id)!=='complete').forEach(q=>(q.skillRequirements||[]).forEach(r=>{const have=+save.skills[r.skill]||1;if(have<+r.level) skillMiss[r.skill]=Math.max(skillMiss[r.skill]||0,+r.level-have)}));
  const missRows=Object.entries(skillMiss).sort((a,b)=>b[1]-a[1]).slice(0,7);
  $('#content').innerHTML=`<div class="view dashboard-grid grid">
    <div class="grid cards hero-cards">
      ${statCard('Route complete',`${done}/${total}`,pct)}${statCard('Quest log',`${qDone}/${qOnly.length}`,Math.round(qDone/Math.max(qOnly.length,1)*100))}${statCard('Quest points',`${qp}/327`,qpPct)}${statCard('Data coverage',`${detailed}/${total}`,Math.round(detailed/total*100))}
    </div>
    <div class="grid two">
      <div class="panel dashboard-card"><h3>Next best step</h3>${next?`<div class="donut-card"><div class="donut" style="--deg:${pct*3.6}deg"><span>${pct}%</span></div><div><button class="link-button big-link" onclick="openQuest('${next.id}')">#${next.order} ${html(next.name)}</button><p class="muted">${next.members?'Members':'F2P'} • ${html(next.type)} ${next.questPoints?`• ${next.questPoints} QP`:''}</p><p>${html(next.description||'Ready as the next checkpoint in your optimal route.')}</p></div></div>`:'<p>Route complete. Beast behavior.</p>'}
      <hr><h3>Membership split</h3>${miniBar('Members',membersDone,membersTotal)}${miniBar('F2P / free unlocks',f2pDone,f2pTotal)}</div>
      <div class="panel dashboard-card"><h3>Blocker radar</h3>${hardBlockers.length?hardBlockers.map(q=>`<p><button class="link-button" onclick="openQuest('${q.id}')">${html(q.name)}</button><br><span class="muted">${[...blockers(q).map(x=>'Quest: '+x),...missingSkills(q).map(x=>`${x.skill} ${x.level}`)].slice(0,4).map(html).join(' • ')}</span></p>`).join(''):'<p class="ok">No blockers detected from populated local data.</p>'}</div>
    </div>
    <div class="grid two">
      <div class="panel dashboard-card"><h3>Upcoming route</h3><ol class="route-list">${upcoming.map(q=>`<li><button class="link-button" onclick="openQuest('${q.id}')">#${q.order} ${html(q.name)}</button> <span class="pill ${q.localInfoStatus==='wiki-imported'?'green':q.localInfoStatus==='curated'?'blue':'warn'}">${q.localInfoStatus==='wiki-imported'?'Imported':q.localInfoStatus==='curated'?'Curated':'Route'}</span></li>`).join('')}</ol></div>
      <div class="panel dashboard-card"><h3>Missing skill levels</h3>${missRows.length?missRows.map(([s,gap])=>miniSkill(s,+save.skills[s]||1,(+save.skills[s]||1)+gap)).join(''):'<p class="ok">No skill blockers detected from populated local data.</p>'}</div>
    </div>
  </div>`;
}
function statCard(t,v,p){return `<div class="card"><h3>${t}</h3><div class="big">${v}</div><div class="bar gold"><span style="width:${Math.max(0,Math.min(100,p))}%"></span></div><p class="muted">${p}%</p></div>`}
function miniBar(t,a,b){const p=Math.round(a/Math.max(b,1)*100);return `<div class="mini-stat"><div class="mini-head"><b>${html(t)}</b><span>${a}/${b}</span></div><div class="bar small"><span style="width:${p}%"></span></div></div>`}
function miniSkill(s,have,need){const p=Math.round(have/Math.max(need,1)*100);return `<div class="mini-stat"><div class="mini-head"><b>${html(s)}</b><span>${have}/${need}</span></div><div class="bar small"><span style="width:${Math.min(100,p)}%"></span></div></div>`}

function quests(){
  setTitle('Quest Log','Search, track, and open prereqs directly inside the tracker.');
  const query=$('#globalSearch').value.toLowerCase().trim();
  const qs=allQuests().filter(q=>!query || [q.name,q.type,q.description,q.notes,(q.questRequirements||[]).join(' '),(q.itemRequirements||[]).join(' ')].join(' ').toLowerCase().includes(query));
  if(!qs.find(q=>q.id===selectedQuestId)) selectedQuestId=qs[0]?.id || DATA.quests[0].id;
  const selected=qData(baseQuest(selectedQuestId)||DATA.quests[0]);
  $('#content').innerHTML=`<div class="view quest-layout"><div><div class="filters"><select id="statusFilter"><option value="all">All statuses</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select><select id="dataFilter"><option value="all">All data</option><option value="detailed">Curated/imported only</option><option value="route-only">Route-only</option></select></div><div class="quest-list">${qs.map(q=>questRow(q)).join('')}</div></div><div class="detail panel">${questDetail(selected)}</div></div>`;
  $$('.quest-row').forEach(r=>r.onclick=e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='A')return;selectedQuestId=r.dataset.id;render();});
  $$('.qstatus').forEach(s=>{s.value=status(s.dataset.id);s.onchange=e=>{e.stopPropagation();setStatus(s.dataset.id,s.value)}});
  $('#statusFilter').onchange=()=>applyQuestFilters(); $('#dataFilter').onchange=()=>applyQuestFilters(); applyQuestFilters();
}
function applyQuestFilters(){const sf=$('#statusFilter')?.value||'all',df=$('#dataFilter')?.value||'all';$$('.quest-row').forEach(r=>{const q=qData(baseQuest(r.dataset.id));const okS=sf==='all'||status(q.id)===sf;const okD=df==='all'||(df==='detailed'?(q.localInfoStatus==='curated'||q.localInfoStatus==='wiki-imported'):q.localInfoStatus==='route-only');r.style.display=(okS&&okD)?'grid':'none';});}
function questRow(q){const b=blockers(q).length, ms=missingSkills(q).length;return `<div class="quest-row ${status(q.id)==='complete'?'done':''} ${selectedQuestId===q.id?'selected':''}" data-id="${q.id}"><div class="num">#${q.order}</div><div><div class="qname">${html(q.name)} <a class="mini-link" href="${q.wiki||wikiUrl(q.name)}" target="_blank" rel="noopener">Wiki</a></div><div class="meta">${q.members?'Members':'F2P'} • ${html(q.type)} ${q.questPoints?`• ${q.questPoints} QP`:''} ${b||ms?`• <span class="danger">${b+ms} blocker${b+ms>1?'s':''}</span>`:''} • ${q.localInfoStatus==='wiki-imported'?'Wiki imported':q.localInfoStatus==='curated'?'Curated':'Route only'}</div></div><select class="qstatus" data-id="${q.id}"><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></div>`}
function questDetail(q){
  const bl=blockers(q), ms=missingSkills(q);
  const dataNote = q.localInfoStatus==='wiki-imported'?'<p class="ok"><b>Imported:</b> This entry has cached wiki-derived detail stored in your browser.</p>':q.localInfoStatus==='curated'?'<p class="ok"><b>Curated:</b> This entry has built-in local planning detail.</p>':'<p class="muted"><b>Route-only:</b> This entry is tracked in order. Use the Data Pack importer to cache full wiki-derived details locally.</p>';
  return `<div class="detail-actions"><div><h3>${html(q.name)}</h3><div>${chips([q.members?'Members':'F2P',q.type,q.questPoints?`${q.questPoints} QP`:null,q.difficulty,q.length].filter(Boolean))}</div></div><a class="wiki-link" href="${q.wiki||wikiUrl(q.name)}" target="_blank" rel="noopener">Open OSRS Wiki ↗</a></div>
  <div class="detail-section"><h4>Overview</h4><p>${html(q.description||q.notes||'Track this route step, then add personal notes or import wiki-derived detail from the Data Pack page.')}</p>${q.startPoint?`<p><b>Start:</b> ${html(q.startPoint)}</p>`:''}${dataNote}</div>
  <div class="detail-section"><h4>Prerequisites / blockers</h4>${bl.length?`<p class="danger"><b>Blocked by quests:</b> ${bl.map(questLink).join(' ')}</p>`:'<p class="ok">No incomplete quest prereqs detected from local/imported data.</p>'}${ms.length?`<p class="danger"><b>Missing skills:</b> ${ms.map(x=>`${html(x.skill)} ${x.level} — you have ${+save.skills[x.skill]||1}`).join('<br>')}</p>`:''}<b>Quest prereqs:</b><br>${(q.questRequirements||[]).length?q.questRequirements.map(questLink).join(' '):'<span class="muted">None listed locally.</span>'}<br><br><b>Skill prereqs:</b><br>${chips(q.skillRequirements)}</div>
  <div class="grid two"><div class="detail-section"><h4>Items & prep</h4>${list([...(q.itemRequirements||[]),...(q.recommendedItems||[]).map(x=>'Recommended: '+x)])}</div><div class="detail-section"><h4>Rewards / unlocks</h4>${list([...(q.xpRewards||[]),...(q.rewards||[])])}</div></div>
  <div class="detail-section"><h4>Quick notes</h4>${list(q.steps&&q.steps.length?q.steps:[q.notes].filter(Boolean))}</div>${q.bosses&&q.bosses.length?`<div class="detail-section"><h4>Enemies / bosses</h4>${chips(q.bosses,'red')}</div>`:''}${q.warnings&&q.warnings.length?`<div class="detail-section"><h4>Warnings</h4>${list(q.warnings)}</div>`:''}
  <div class="detail-section"><button onclick="setStatus('${q.id}','complete')">Mark complete</button> <button onclick="setStatus('${q.id}','in-progress')">Mark in progress</button> <button onclick="setStatus('${q.id}','not-started')">Reset</button></div>`;
}
function missingForSkill(skill){let lvl=+save.skills[skill]||1;let misses=[];allQuests().filter(q=>status(q.id)!=='complete').forEach(q=>(q.skillRequirements||[]).forEach(r=>{if(r.skill===skill && lvl<+r.level)misses.push(`${q.name} (${r.level})`)}));return misses.slice(0,6).join(', ')||'—'}
function skills(){setTitle('Skill Planner','Track current levels and see missing quest requirements.');let rows=SKILLS.map(s=>`<tr><td>${s}</td><td><input type="number" min="1" max="99" value="${save.skills[s]||1}" data-skill="${s}"></td><td>${html(missingForSkill(s))}</td></tr>`).join('');$('#content').innerHTML=`<div class="view grid"><div class="notice">Put in your real levels here and the dashboard/quest pages will show what is actually blocking you.</div><div class="panel"><table class="table"><tr><th>Skill</th><th>Your level</th><th>Blocks</th></tr>${rows}</table></div></div>`;$$('input[data-skill]').forEach(i=>i.oninput=()=>{save.skills[i.dataset.skill]=+i.value;persist();});}
function itemKey(i){return String(i||'').replace(/^Recommended:\s*/,'').replace(/\([^)]*\)/g,'').trim()}
function itemEntries(){let map={};allQuests().filter(q=>status(q.id)!=='complete').forEach(q=>{[...(q.itemRequirements||[]).map(i=>({i,kind:'Required'})),...(q.recommendedItems||[]).map(i=>({i,kind:'Recommended'}))].forEach(({i,kind})=>{let k=itemKey(i); if(!k)return; map[k]=map[k]||{item:k,quests:[],earliest:q.order,kinds:new Set(),count:0}; map[k].quests.push(q); map[k].earliest=Math.min(map[k].earliest,q.order); map[k].kinds.add(kind); map[k].count++;})});return Object.values(map).sort((a,b)=>a.earliest-b.earliest || b.count-a.count || a.item.localeCompare(b.item));}
function items(){setTitle('Prep Checklist','Ordered by upcoming route use, with quest links.');let entries=itemEntries();let upcoming=allQuests().filter(q=>status(q.id)!=='complete'&&((q.itemRequirements||[]).length||(q.recommendedItems||[]).length)).slice(0,10);$('#content').innerHTML=`<div class="view grid"><div class="notice"><b>This is now route-first:</b> upcoming quest prep on top, then a master list sorted by the first quest that needs each item.</div><div class="panel"><h3>Upcoming quest prep</h3><div class="prep-grid">${upcoming.map(q=>`<div class="prep-card"><button class="link-button" onclick="openQuest('${q.id}')"><b>#${q.order} ${html(q.name)}</b></button><p class="muted">${q.members?'Members':'F2P'} • ${q.type}</p>${list([...(q.itemRequirements||[]),...(q.recommendedItems||[]).map(x=>'Recommended: '+x)])}</div>`).join('')||'<p class="muted">No upcoming item prep in local/imported data.</p>'}</div></div><div class="panel"><h3>Master prep list</h3><table class="table"><tr><th>Have</th><th>Item</th><th>Need it first</th><th>Also used for</th><th>Type</th></tr>${entries.map(e=>{let first=e.quests.find(q=>q.order===e.earliest)||e.quests[0];return `<tr><td><input type="checkbox" ${save.items[e.item]?'checked':''} data-item="${html(e.item)}"></td><td><b>${html(e.item)}</b></td><td><button class="link-button" onclick="openQuest('${first.id}')">#${first.order} ${html(first.name)}</button></td><td>${e.quests.slice(1,5).map(q=>`<button class="inline-quest" onclick="openQuest('${q.id}')">${html(q.name)}</button>`).join(' ')||'<span class="muted">—</span>'}</td><td>${[...e.kinds].map(k=>`<span class="pill">${k}</span>`).join('')}</td></tr>`}).join('')||'<tr><td colspan="5">No item requirements in remaining local/imported data.</td></tr>'}</table></div></div>`;$$('input[data-item]').forEach(i=>i.onchange=()=>{save.items[i.dataset.item]=i.checked;persist();});}
function diaries(){setTitle('Achievement Diaries','Simple tier tracker.');let rows=DATA.diaries.map(d=>`<tr><td>${d.area}</td><td>${d.tier}</td><td><select data-diary="${d.id}"><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="complete">Complete</option></select></td></tr>`).join('');$('#content').innerHTML=`<div class="view"><div class="panel"><table class="table"><tr><th>Area</th><th>Tier</th><th>Status</th></tr>${rows}</table></div></div>`;$$('select[data-diary]').forEach(s=>{s.value=save.diaries[s.dataset.diary]||'not-started';s.onchange=()=>{save.diaries[s.dataset.diary]=s.value;persist();}});}
function timers(){setTitle('Timers','Lightweight local timers for farming/birdhouses/dailies.');let timers=[['Birdhouse run',50],['Herb run',80],['Seaweed',40],['Daily reset',1440],['Kingdom approval check',1440]];$('#content').innerHTML=`<div class="view grid two">${timers.map(([n,m])=>`<div class="panel"><h3>${n}</h3><p class="muted">Default ${m} minutes.</p><button onclick="startTimer('${slug(n)}',${m})">Start</button><button onclick="clearTimer('${slug(n)}')">Clear</button><div class="timer"><span class="time" id="timer-${slug(n)}">--:--</span></div></div>`).join('')}</div>`;tickTimers();}
function startTimer(id,m){save.timers[id]=Date.now()+m*60000;persist();tickTimers();} function clearTimer(id){delete save.timers[id];persist();tickTimers();} window.startTimer=startTimer; window.clearTimer=clearTimer;
function tickTimers(){Object.keys(save.timers||{}).forEach(id=>{let el=$(`#timer-${id}`);if(!el)return;let ms=save.timers[id]-Date.now();if(ms<=0){el.textContent='READY';el.classList.add('ok')}else{let min=Math.floor(ms/60000),sec=Math.floor((ms%60000)/1000);el.textContent=`${min}:${String(sec).padStart(2,'0')}`}})} setInterval(()=>{if(currentView==='timers')tickTimers()},1000);
function xpForLevel(level){let points=0;for(let lvl=1;lvl<level;lvl++){points+=Math.floor(lvl+300*Math.pow(2,lvl/7));}return Math.floor(points/4)}
function calc(){setTitle('Calculators','XP to level and quick planning math.');$('#content').innerHTML=`<div class="view grid two"><div class="panel"><h3>XP to Level</h3><input id="currentXp" type="number" placeholder="Current XP"><input id="targetLevel" type="number" placeholder="Target level" value="70"><button id="xpBtn">Calculate</button><p id="xpOut"></p></div><div class="panel"><h3>Quest point estimate</h3><p>Known completed QP: <b>${allQuests().reduce((s,q)=>s+(status(q.id)==='complete'?(+q.questPoints||0):0),0)}</b></p><p class="muted">Imported data improves this as more QP fields are cached.</p></div></div>`;$('#xpBtn').onclick=()=>{let xp=+$('#currentXp').value||0,lvl=+$('#targetLevel').value||1,target=xpForLevel(lvl);$('#xpOut').innerHTML=`Need <b>${Math.max(0,target-xp).toLocaleString()}</b> XP for level ${lvl}.`;};}
function tools(){setTitle('Tools','Shortcuts to the OSRS tools people actually use, grouped by purpose.');let groups={};DATA.tools.forEach(t=>{groups[t.category]=groups[t.category]||[];groups[t.category].push(t)});$('#content').innerHTML=`<div class="view grid"><div class="notice">These open as links. The local tracker stays offline; external calculators stay current without us recreating every formula.</div>${Object.entries(groups).map(([cat,arr])=>`<div class="panel"><h3>${html(cat)}</h3><div class="tool-grid">${arr.map(t=>`<a class="tool-card" href="${t.url||'#'}" target="_blank" rel="noopener"><div><b>${html(t.name)}</b><span class="pill blue">Open tool ↗</span></div><p>${html(t.why)}</p><small><b>Best use:</b> ${html(t.recommendedUse)}</small></a>`).join('')}</div></div>`).join('')}</div>`}
function notes(){setTitle('Notes','Account-specific notes stored locally.');$('#content').innerHTML=`<div class="view"><div class="panel"><textarea id="notesBox" placeholder="Gear goals, clue steps, account goals, next unlocks…">${html(save.notes||'')}</textarea><p><button id="saveNotes">Save notes</button></p></div></div>`;$('#saveNotes').onclick=()=>{save.notes=$('#notesBox').value;persist();};}
function settings(){setTitle('Save / Import','Back up or move your local progress.');$('#content').innerHTML=`<div class="view grid two"><div class="panel"><h3>Export save</h3><button id="exportSave">Export progress save</button><button id="exportData">Export imported data pack</button></div><div class="panel"><h3>Import save</h3><input type="file" id="importSave" accept="application/json"><p><button id="wipe">Wipe progress only</button></p></div></div>`;$('#exportSave').onclick=()=>downloadJSON(save,'osrs-companion-save.json');$('#exportData').onclick=()=>downloadJSON(imported,'osrs-companion-imported-data.json');$('#importSave').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{save={...defaultSave(),...JSON.parse(r.result)};persist();render();};r.readAsText(f);};$('#wipe').onclick=()=>{if(confirm('Wipe progress only? Imported quest data stays.')){localStorage.removeItem(STORAGE_KEY);save=loadSave();render();}};}
function downloadJSON(obj,name){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;a.click();}

function datapack(){
  setTitle('Data Pack','Bulk-import wiki-derived quest details into local browser storage.');
  const qs=allQuests(); const importedCount=Object.keys(imported).length;
  $('#content').innerHTML=`<div class="view grid">
    <div class="notice"><b>Hybrid mode:</b> the app ships with the route and curated starter data. This page can fetch quest detail from the OSRS Wiki API once, compress it into structured fields, and cache it locally so the tracker fills out without you opening wiki tabs manually.</div>
    <div class="grid cards"><div class="card"><h3>Bundled route entries</h3><div class="big">${DATA.quests.length}</div></div><div class="card"><h3>Curated entries</h3><div class="big">${qs.filter(q=>q.localInfoStatus==='curated').length}</div></div><div class="card"><h3>Imported entries</h3><div class="big" id="impCount">${importedCount}</div></div><div class="card"><h3>Coverage</h3><div class="big">${Math.round(qs.filter(q=>q.localInfoStatus==='curated'||q.localInfoStatus==='wiki-imported').length/qs.length*100)}%</div></div></div>
    <div class="panel"><h3>One-click import</h3><p>This makes up to one request per quest. It is intentionally slow-ish and respectful, because nuking the wiki API like a goblin with a cannon is bad manners.</p><p><button id="importAll">Import / update all quest pages</button> <button id="importMissing">Import missing only</button> <button id="clearImported">Clear imported data</button></p><div class="bar"><span id="importBar" style="width:0%"></span></div><p id="importStatus" class="muted">Idle.</p></div>
    <div class="panel"><h3>Import a saved data pack</h3><p>If you export the data pack later, you can re-import it here on another browser/computer.</p><input type="file" id="importDataPack" accept="application/json"></div>
    <div class="panel"><h3>Notes</h3><ul><li>Works best in Chrome/Edge/Firefox. Safari may block some local-file API calls; if that happens, run <span class="kbd">python3 -m http.server</span> in the folder and open <span class="kbd">http://localhost:8000</span>.</li><li>Imported info is cached in your browser. It does not overwrite your completion progress.</li><li>Parsing wiki pages is broad, not perfect. The goal is to fill practical tracker fields first; hand-polish can happen after.</li></ul></div>
  </div>`;
  $('#importAll').onclick=()=>runImporter(false); $('#importMissing').onclick=()=>runImporter(true); $('#clearImported').onclick=()=>{if(confirm('Clear imported wiki data?')){imported={};persistImported();render();}};$('#importDataPack').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{imported={...imported,...JSON.parse(r.result)};persistImported();render();};r.readAsText(f);};
}
async function runImporter(missingOnly){
  const targets=DATA.quests.filter(q=>!missingOnly || !(imported[q.id]));
  const statusEl=$('#importStatus'), bar=$('#importBar'); let ok=0, fail=0;
  for(let i=0;i<targets.length;i++){
    const q=targets[i]; statusEl.textContent=`Importing ${i+1}/${targets.length}: ${q.name}`; bar.style.width=`${Math.round(i/targets.length*100)}%`;
    try{const data=await fetchQuestWikiData(q); imported[q.id]=data; ok++; persistImported();}
    catch(e){console.warn('Import failed',q.name,e); fail++;}
    await new Promise(r=>setTimeout(r,350));
  }
  bar.style.width='100%'; statusEl.textContent=`Finished. Imported/updated ${ok}; failed ${fail}.`; render();
}
async function fetchQuestWikiData(q){
  const page=String(q.rawName||q.name).replace(/ /g,'_');
  const url=`https://oldschool.runescape.wiki/api.php?action=parse&format=json&formatversion=2&origin=*&page=${encodeURIComponent(page)}&prop=text|displaytitle`;
  const res=await fetch(url,{headers:{'Accept':'application/json'}}); if(!res.ok) throw new Error(res.statusText);
  const js=await res.json(); const text=js?.parse?.text||''; if(!text) throw new Error('No page text');
  const doc=new DOMParser().parseFromString(text,'text/html');
  return parseQuestDoc(q,doc,text);
}
function parseQuestDoc(q,doc,rawHtml){
  const text=doc.body.textContent.replace(/\s+/g,' ').trim();
  const firstP=Array.from(doc.querySelectorAll('p')).map(p=>p.textContent.trim()).find(t=>t.length>70 && !/This quest has a quick guide/i.test(t));
  const info={}; doc.querySelectorAll('table tr').forEach(tr=>{const th=tr.querySelector('th'),td=tr.querySelector('td'); if(th&&td){let k=th.textContent.trim().replace(/\s+/g,' '); let v=td.textContent.trim().replace(/\s+/g,' '); if(k&&v&&k.length<40) info[k]=v;}});
  const section = name=>sectionText(doc,name);
  const reqText = section('Requirements') || '';
  const rewardText = section('Rewards') || '';
  const enemyText = info['Enemies to defeat'] || section('Enemies') || '';
  const questReqs = DATA.quests.map(x=>x.name).filter(n=>n!==q.name && reqText.toLowerCase().includes(n.toLowerCase())).slice(0,20);
  const skillReqs=[]; SKILLS.forEach(sk=>{const re=new RegExp(`(?:level\\s*)?(\\d{1,2})\\s+${sk}`,'i'); const m=reqText.match(re); if(m) skillReqs.push({skill:sk,level:+m[1]});});
  const liReq = sectionLis(doc,'Requirements').map(cleanBullet).filter(Boolean);
  const itemReqs = liReq.filter(x=>!SKILLS.some(s=>new RegExp(`\\b${s}\\b`,'i').test(x)) && !questReqs.some(n=>x.toLowerCase().includes(n.toLowerCase()))).slice(0,18);
  const rewards = sectionLis(doc,'Rewards').map(cleanBullet).filter(Boolean).slice(0,20);
  const qp = (info['Quest points']||text).match(/(\d+)\s+Quest point/i)?.[1];
  return {
    importedAt:new Date().toISOString(), source:'OSRS Wiki API local import', wiki:q.wiki||wikiUrl(q.name), localInfoStatus:'wiki-imported',
    description:firstP || q.description || `${q.name} is cached from the OSRS Wiki import for local tracking.`,
    difficulty: info['Difficulty'] || q.difficulty || '', length: info['Length'] || q.length || '', startPoint: info['Start point'] || q.startPoint || '',
    questPoints: qp?+qp:q.questPoints, questRequirements:questReqs, skillRequirements:skillReqs,
    itemRequirements:itemReqs, rewards:rewards, xpRewards:rewards.filter(x=>/xp|experience/i.test(x)),
    bosses: enemyText?enemyText.split(/,|;/).map(x=>x.trim()).filter(Boolean).slice(0,8):[],
    steps: sectionLis(doc,'Walkthrough').map(cleanBullet).filter(Boolean).slice(0,8)
  };
}
function sectionText(doc,heading){return sectionNodes(doc,heading).map(n=>n.textContent).join(' ').replace(/\s+/g,' ').trim();}
function sectionLis(doc,heading){return sectionNodes(doc,heading).flatMap(n=>Array.from(n.querySelectorAll? n.querySelectorAll('li'):[]).map(li=>li.textContent));}
function sectionNodes(doc,heading){const hs=Array.from(doc.querySelectorAll('h2,h3'));const h=hs.find(x=>x.textContent.replace(/\[edit\]/g,'').trim().toLowerCase().includes(heading.toLowerCase())); if(!h)return []; const arr=[]; let n=h.nextElementSibling; while(n && !/^H2$/.test(n.tagName)){arr.push(n); n=n.nextElementSibling;} return arr;}
function cleanBullet(s){return String(s||'').replace(/\[.*?\]/g,'').replace(/\s+/g,' ').trim().replace(/^[-•*]\s*/,'').slice(0,240)}
render();
