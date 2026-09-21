
const KEY = "studyflow-v1";
const REVIEW_INTERVALS = [1,3,7,14,30];
const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const DEFAULT_STATE = {
  subjects:["Concurrentes","Redes","Ingeniería de Software II","Gestión","Modelación Numérica","Probabilidad y Estadística"],
  sessions:[],
  reviews:[],
  planner:{
    Lunes:"Concurrentes · Concurrentes · Redes\nIS2 · IS2 · Gestión",
    Martes:"Redes · Redes · Concurrentes\nIS2 · IS2 · Concurrentes",
    Miércoles:"Concurrentes · Concurrentes · Redes\nIS2 · Redes · IS2",
    Jueves:"Redes · Redes · Concurrentes\nIS2 · IS2 · Concurrentes",
    Viernes:"IS2 · IS2 · Concurrentes\nRedes · Redes · Gestión",
    Sábado:"Concurrentes · Redes · Modelación\nConcurrentes · Redes · Probabilidad",
    Domingo:"Concurrentes · Redes · Modelación\nConcurrentes · Redes · Gestión"
  }
};

function clone(x){return JSON.parse(JSON.stringify(x))}
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {...clone(DEFAULT_STATE), ...parsed};
  }catch{return clone(DEFAULT_STATE)}
}
let state = loadState();
function saveState(){localStorage.setItem(KEY, JSON.stringify(state))}

function isoDate(d=new Date()){
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return copy.toISOString().slice(0,10);
}
function addDays(dateStr, days){
  const [y,m,d] = dateStr.split("-").map(Number);
  const x = new Date(y,m-1,d); x.setDate(x.getDate()+days);
  return isoDate(x);
}
function prettyDate(s){
  const [y,m,d]=s.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(y,m-1,d));
}
function todayName(){
  const js = new Date().getDay(); // 0 domingo
  return DAYS[(js+6)%7];
}
function uid(){return crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random()}

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.onclick=()=>showView(btn.dataset.view);
});
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active", v.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===id));
  if(id==="dashboard") renderDashboard();
  if(id==="reviews") renderReviews();
  if(id==="planner") renderPlanner();
  if(id==="data") renderData();
  if(id==="timer") renderSubjectSelect();
}
document.getElementById("quickStart").onclick=()=>showView("timer");

function renderDashboard(){
  const day = todayName();
  const plan = state.planner[day] || "";
  const planEl = document.getElementById("todayPlan");
  if(!plan.trim()) planEl.innerHTML=`<div class="empty">No hay plan cargado para ${day}.</div>`;
  else planEl.innerHTML = plan.split("\n").filter(Boolean).map((x,i)=>`<div class="today-plan-row"><b>Serie ${i+1}</b><div class="muted">${escapeHtml(x)}</div></div>`).join("");

  const due = dueReviews();
  document.getElementById("dueSummary").innerHTML = due.length
    ? `<div class="list">${due.slice(0,5).map(r=>reviewCard(r,true)).join("")}</div>${due.length>5?`<p class="tiny">+ ${due.length-5} más en Repasos</p>`:""}`
    : `<div class="empty">Nada vencido. Perfecto.</div>`;

  const sessions = [...state.sessions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  document.getElementById("recentSessions").innerHTML = sessions.length
    ? `<div class="list">${sessions.map(s=>sessionCard(s)).join("")}</div>`
    : `<div class="empty">Todavía no guardaste sesiones.</div>`;
  wireReviewButtons();
}

function renderSubjectSelect(){
  const sel=document.getElementById("sessionSubject");
  const current=sel.value;
  sel.innerHTML=state.subjects.map(s=>`<option>${escapeHtml(s)}</option>`).join("");
  if(state.subjects.includes(current)) sel.value=current;
}

function sessionCard(s){
  return `<div class="item">
    <div class="item-top">
      <div><h3>${escapeHtml(s.subject)} · ${escapeHtml(s.topic||"Sin tema")}</h3>
      <p>${prettyDate(s.date)} · ${ratingLabel(s.rating)}</p></div>
      <span class="tag">${s.reviewId ? "repasos activos" : "sin repaso"}</span>
    </div>
    ${s.difficulties?`<p><b>Costó:</b> ${escapeHtml(shorten(s.difficulties,150))}</p>`:""}
  </div>`;
}

function reviewCard(r, compact=false){
  return `<div class="item">
    <div class="item-top">
      <div><h3>${escapeHtml(r.subject)} · ${escapeHtml(r.topic||"Sin tema")}</h3>
      <p>Repaso ${r.stage+1}/${REVIEW_INTERVALS.length} · vence ${prettyDate(r.nextDue)}</p></div>
      <span class="tag">${r.nextDue < isoDate() ? "vencido" : "hoy"}</span>
    </div>
    ${!compact && r.difficulties ? `<p><b>Enfócate en:</b> ${escapeHtml(shorten(r.difficulties,170))}</p>`:""}
    <div class="item-actions"><button class="review-open" data-id="${r.id}">Empezar repaso</button></div>
  </div>`;
}

function dueReviews(){
  const t=isoDate();
  return state.reviews.filter(r=>!r.done && r.nextDue<=t).sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
}
function renderReviews(){
  const due=dueReviews();
  const future=state.reviews.filter(r=>!r.done && r.nextDue>isoDate()).sort((a,b)=>a.nextDue.localeCompare(b.nextDue));
  const el=document.getElementById("reviewList");
  el.innerHTML = `
    <h3>Para hoy / vencidos</h3>
    ${due.length?`<div class="list">${due.map(r=>reviewCard(r)).join("")}</div>`:`<div class="empty">No hay repasos pendientes.</div>`}
    <h3 style="margin-top:26px">Próximos</h3>
    ${future.length?`<div class="list">${future.slice(0,10).map(r=>reviewCard(r)).join("")}</div>`:`<div class="empty">No hay próximos repasos.</div>`}
  `;
  wireReviewButtons();
}

function wireReviewButtons(){
  document.querySelectorAll(".review-open").forEach(b=>b.onclick=()=>openReview(b.dataset.id));
}
let activeReviewId=null;
function openReview(id){
  const r=state.reviews.find(x=>x.id===id); if(!r)return;
  activeReviewId=id;
  document.getElementById("reviewTitle").textContent=`${r.subject} · ${r.topic||"Sin tema"}`;
  document.getElementById("reviewMeta").textContent=`Repaso ${r.stage+1}/${REVIEW_INTERVALS.length} · programado para ${prettyDate(r.nextDue)}`;
  document.getElementById("reviewQuestions").textContent=r.questions||"No guardaste preguntas. Intentá explicar el tema completo sin mirar.";
  document.getElementById("reviewHighlights").textContent=r.highlights||"Sin highlights guardados.";
  document.getElementById("reviewDifficulties").textContent=r.difficulties||"Sin dificultades guardadas.";
  document.getElementById("reviewDialog").showModal();
}
document.querySelectorAll("[data-review-rating]").forEach(btn=>{
  btn.onclick=()=>completeReview(btn.dataset.reviewRating);
});
function completeReview(rating){
  const r=state.reviews.find(x=>x.id===activeReviewId); if(!r)return;
  const today=isoDate();

  if(rating==="hard"){
    r.nextDue=addDays(today,1); // no avanza etapa
    r.lastRating="hard";
  }else{
    r.stage += rating==="easy" ? 2 : 1;
    r.lastRating=rating;
    if(r.stage>=REVIEW_INTERVALS.length){
      r.done=true;
    }else{
      r.nextDue=addDays(today, REVIEW_INTERVALS[r.stage]);
    }
  }
  r.history = r.history || [];
  r.history.push({date:today,rating});
  saveState();
  document.getElementById("reviewDialog").close();
  renderReviews(); renderDashboard();
}

function ratingLabel(r){return r==="hard"?"Difícil":r==="easy"?"Fácil":"Bien"}
function shorten(t,n){return t.length>n?t.slice(0,n)+"…":t}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

// TIMER
const focusPhases = [
  {type:"focus", title:"Recall anterior", help:"Sin mirar: recuperá lo que recordás del tema anterior.", sec:5*60, range:"0–5 min"},
  {type:"focus", title:"Estudio nuevo", help:"Teoría, ejemplos y ejercicios. Comprendé, no copies por copiar.", sec:25*60, range:"5–30 min"},
  {type:"focus", title:"Active recall", help:"Cerrá todo. Explicá, respondé o resolvé desde memoria.", sec:10*60, range:"30–40 min"},
  {type:"focus", title:"Corrección", help:"Abrí material y compará. Corregí activamente tus errores.", sec:7*60, range:"40–47 min"},
  {type:"focus", title:"Registro de errores", help:"Anotá 3–5 cosas que más costaron. Van al próximo repaso.", sec:3*60, range:"47–50 min"},
];
function makeTimeline(){
  const arr=[];
  for(let cycle=1;cycle<=3;cycle++){
    focusPhases.forEach(p=>arr.push({...p,cycle}));
    if(cycle<3) arr.push({type:"break",title:"Descanso",help:"Agua, baño, caminar, mirar lejos. Sin redes.",sec:10*60,range:"10 min",cycle});
  }
  return arr;
}
const timerSteps=makeTimeline();
let stepIndex=0, remaining=timerSteps[0].sec, running=false, timerHandle=null, soundOn=true;

function renderTimer(){
  const s=timerSteps[stepIndex];
  document.getElementById("sessionCycleLabel").textContent=s.type==="break"?`DESCANSO · DESPUÉS DEL BLOQUE ${s.cycle}`:`BLOQUE ${s.cycle} DE 3`;
  document.getElementById("phaseTitle").textContent=s.title;
  document.getElementById("phaseHelp").textContent=s.help;
  document.getElementById("phaseRange").textContent=s.range;
  document.getElementById("timerDisplay").textContent=fmt(remaining);
  document.getElementById("progressFill").style.width=`${100*(1-remaining/s.sec)}%`;
  document.title=`${fmt(remaining)} · ${s.title} · StudyFlow`;

  const visual = [];
  for(let i=0;i<timerSteps.length;i++){
    const x=timerSteps[i];
    const label = x.type==="break" ? `Descanso ${x.cycle}` : `${x.cycle}.${focusPhases.findIndex(p=>p.title===x.title)+1}`;
    visual.push(`<span class="step ${i===stepIndex?"current":""}">${label}</span>`);
  }
  document.getElementById("timeline").innerHTML=visual.join("");
}
function fmt(sec){
  const m=Math.floor(sec/60).toString().padStart(2,"0");
  const s=(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}
function beep(){
  if(!soundOn)return;
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const now=ctx.currentTime;
  [0,.17].forEach(o=>{
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.frequency.value=640;
    g.gain.setValueAtTime(.0001,now+o);
    g.gain.exponentialRampToValueAtTime(.045,now+o+.02);
    g.gain.exponentialRampToValueAtTime(.0001,now+o+.13);
    osc.connect(g);g.connect(ctx.destination);osc.start(now+o);osc.stop(now+o+.14);
  });
}
function nextTimerStep(){
  beep();
  if(stepIndex<timerSteps.length-1){
    stepIndex++; remaining=timerSteps[stepIndex].sec; renderTimer();
  }else{
    running=false; clearInterval(timerHandle); timerHandle=null;
    document.getElementById("phaseTitle").textContent="✓ Serie terminada";
    document.getElementById("phaseHelp").textContent="Hiciste 3 bloques. Ahora tomá 30–45 min de descanso largo.";
    document.getElementById("timerDisplay").textContent="FIN";
    document.getElementById("progressFill").style.width="100%";
    document.getElementById("startPause").textContent="▶ Reiniciar serie";
  }
}
function tick(){
  if(remaining>0){remaining--;renderTimer()} else nextTimerStep()
}
document.getElementById("startPause").onclick=()=>{
  if(stepIndex===timerSteps.length-1 && remaining===0){resetTimer();return}
  running=!running;
  if(running){
    document.getElementById("startPause").textContent="⏸ Pausar";
    if(!timerHandle) timerHandle=setInterval(tick,1000);
  }else{
    document.getElementById("startPause").textContent="▶ Continuar";
    clearInterval(timerHandle);timerHandle=null;
  }
};
document.getElementById("nextPhase").onclick=nextTimerStep;
document.getElementById("resetTimer").onclick=resetTimer;
document.getElementById("toggleSound").onclick=()=>{
  soundOn=!soundOn;
  document.getElementById("toggleSound").textContent=soundOn?"🔊 Sonido":"🔇 Silencio";
};
function resetTimer(){
  running=false;clearInterval(timerHandle);timerHandle=null;
  stepIndex=0;remaining=timerSteps[0].sec;
  document.getElementById("startPause").textContent="▶ Iniciar";
  renderTimer();
}

// SAVE SESSION
document.getElementById("saveSession").onclick=()=>{
  const subject=document.getElementById("sessionSubject").value;
  const topic=document.getElementById("sessionTopic").value.trim();
  const questions=document.getElementById("sessionQuestions").value.trim();
  const highlights=document.getElementById("sessionHighlights").value.trim();
  const difficulties=document.getElementById("sessionDifficulties").value.trim();
  const rating=document.getElementById("sessionRating").value;
  if(!subject || !topic){alert("Elegí una materia y escribí el tema.");return}

  const date=isoDate();
  const reviewId=uid();
  const review={
    id:reviewId,subject,topic,questions,highlights,difficulties,
    createdAt:new Date().toISOString(),stage:0,nextDue:addDays(date,1),
    done:false,history:[]
  };
  const session={
    id:uid(),subject,topic,questions,highlights,difficulties,rating,date,
    createdAt:new Date().toISOString(),reviewId
  };
  state.sessions.push(session);
  state.reviews.push(review);
  saveState();

  ["sessionTopic","sessionQuestions","sessionHighlights","sessionDifficulties"].forEach(id=>document.getElementById(id).value="");
  alert("Sesión guardada. Primer repaso programado para mañana.");
  renderDashboard();
};

// PLANNER
function renderPlanner(){
  const wrap=document.getElementById("weekPlanner");
  wrap.innerHTML=DAYS.map(d=>`<div class="day"><h3>${d}</h3><textarea data-day="${d}" placeholder="Serie 1...\nSerie 2...">${escapeHtml(state.planner[d]||"")}</textarea></div>`).join("");
}
document.getElementById("savePlanner").onclick=()=>{
  document.querySelectorAll("[data-day]").forEach(t=>state.planner[t.dataset.day]=t.value);
  saveState(); alert("Plan semanal guardado."); renderDashboard();
};

// DATA / SUBJECTS
function renderData(){
  const el=document.getElementById("subjectList");
  el.innerHTML=state.subjects.map((s,i)=>`<div class="subject-chip"><span>${escapeHtml(s)}</span><button data-remove-subject="${i}">×</button></div>`).join("");
  document.querySelectorAll("[data-remove-subject]").forEach(b=>b.onclick=()=>{
    state.subjects.splice(Number(b.dataset.removeSubject),1);saveState();renderData();renderSubjectSelect();
  });
}
document.getElementById("addSubject").onclick=()=>{
  const inp=document.getElementById("newSubject");
  const v=inp.value.trim(); if(!v)return;
  if(!state.subjects.includes(v))state.subjects.push(v);
  inp.value="";saveState();renderData();renderSubjectSelect();
};
document.getElementById("exportData").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`studyflow-backup-${isoDate()}.json`;a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("importData").onchange=async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    state={...clone(DEFAULT_STATE),...data};saveState();
    renderAll(); alert("Backup importado.");
  }catch{alert("El archivo no parece ser un backup válido.");}
};
document.getElementById("clearData").onclick=()=>{
  if(confirm("¿Seguro? Se borrarán sesiones, repasos y plan local de este navegador.")){
    state=clone(DEFAULT_STATE);saveState();renderAll();
  }
};

function renderAll(){
  renderSubjectSelect();renderDashboard();renderReviews();renderPlanner();renderData();renderTimer();
}
renderAll();
