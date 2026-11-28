/* ═══════════════════════════════════════════════════════════════════════
   מסכי בית לפי תפקיד
   • 🎛️ חדר בקרה (מנהל): מה דורש החלטה היום, יעדים, בריאות הנתונים, הצוות
   • 🏠 הקבוצה שלי (מדריכים ואנשי צוות): היום והשבוע, לטיפול שלי, החניכים שלי
   קורא רק נתונים שכבר קיימים בפורטל: רמזור, נוכחות (att_sc), מרכז למידה (lc), CRM (msg), יעדים, לוח שנה.
   משתמש ב: ME, USERS, STUDENTS_DATA, ACAD_STUDENTS, RAMZOR_DATA_NEW, GRP_CLR, secureDb, avatar, showStudentDetails,
            ATTD/attdLoad/ATTD_OK_REASONS, PC/pcLoad/pcLoadCustom, GOALS/goalsFetch, MSG (msg.js)
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>(typeof ME!=='undefined'&&ME)||null;
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const addD=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); };
const dd=s=>{ const [,m,d]=String(s).split('-'); return `${+d}.${+m}`; };
const WD=['א','ב','ג','ד','ה','ו','ש'];
const wd=s=>WD[new Date(s+'T12:00:00').getDay()];
const ageDays=ts=>ts?Math.floor((Date.now()-new Date(ts).getTime())/864e5):null;
const HEB_M=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const H={lc:null,loading:false,loaded:0};
window.HOME=H;

/* ---------- מי החניכים "שלי" ---------- */
const allStu=()=>STUDENTS_DATA.map((s,i)=>({s,i})).concat((typeof ACAD_STUDENTS!=='undefined'?ACAD_STUDENTS:[]).map((s,k)=>({s,i:STUDENTS_DATA.length+k,acad:true})));
function myGroupNames(u){ u=u||me(); if(!u) return [];
  const named=Object.keys(GRP_CLR).filter(g=>String(u.r||'').includes(g));
  if(named.length) return named;
  if(u.scope==='ya') return ['שלדג','שחף','שיר'];
  if(u.scope==='yb') return ['חוף','צוק'];
  if(u.scope==='academy') return ['אקדמיה'];
  return Object.keys(GRP_CLR); }
function myStudents(u){ u=u||me(); if(!u) return [];
  if(u.mode==='admin'||u.scope==='all') return allStu();
  if(u.scope==='academy') return allStu().filter(x=>x.acad);
  const g=myGroupNames(u); return allStu().filter(x=>!x.acad&&g.includes(x.s.g)); }
/* מפתח הקבוצה בלשונית "ניהול קבוצה" */
function myGroupKey(u){ u=u||me(); if(!u) return null; if(u.scope==='academy') return 'academy'; if(u.scope==='yb') return 'yb';
  const g=myGroupNames(u); return g.length===1?g[0]:(u.scope==='ya'?'ya':null); }
window.homeGoGroup=function(){ show('groups'); const k=myGroupKey(); setTimeout(()=>{ const b=document.querySelector(`#grSubnav button[data-k="${k}"]`); if(b) b.click(); },50); };
/* יומן הקבוצה — שם היומן לאירועים שהמדריך/ה מוסיף/ה */
window.homeCalGroups=function(u){ u=u||me(); if(!u) return [];
  if(u.mode==='admin') return ['שלדג','שחף','שיר',"קהילת יב'",'חוף','צוק','אקדמיה'];
  const named=Object.keys(GRP_CLR).filter(g=>String(u.r||'').includes(g)); if(named.length) return named;
  if(u.scope==='yb') return ["קהילת יב'"]; if(u.scope==='academy') return ['אקדמיה']; if(u.scope==='ya') return ['שלדג','שחף','שיר'];
  return []; };

/* ---------- נתונים ---------- */
function curMonth(){ return HEB_M[new Date().getMonth()]; }
function ramzorOf(name){ const r=(typeof RAMZOR_DATA_NEW!=='undefined'?RAMZOR_DATA_NEW:[]).find(x=>x.n===name); if(!r||!r.s) return {cur:'none',prev:'none'};
  const ms=Object.keys(r.s); let m=curMonth(); let i=ms.indexOf(m);
  if(i<0){ i=ms.length-1; while(i>0&&(!r.s[ms[i]]||r.s[ms[i]]==='none')) i--; }
  let cur=r.s[ms[i]]||'none', j=i;
  if(cur==='none'){ while(j>0&&(!r.s[ms[j]]||r.s[ms[j]]==='none')) j--; cur=r.s[ms[j]]||'none'; }
  let k=j-1; while(k>=0&&(!r.s[ms[k]]||r.s[ms[k]]==='none')) k--;
  return {cur, prev:k>=0?r.s[ms[k]]:'none', month:ms[j]}; }
const RZ={red:{c:'#dc2626',l:'אדום'},orange:{c:'#ea580c',l:'כתום'},yellow:{c:'#eab308',l:'צהוב'},green:{c:'#059669',l:'ירוק'},none:{c:'#cbd5e1',l:'לא סומן'}};
function absences(days){ const A={}; const from=addD(today(),-(days||7));
  if(typeof ATTD==='undefined'||!ATTD.days) return A;
  Object.entries(ATTD.days).forEach(([d,rows])=>{ if(d<from||d>today()) return;
    (rows||[]).forEach(r=>{ if(r[3]===0&&!(ATTD_OK_REASONS||[]).includes(r[4])){ (A[r[2]]=A[r[2]]||[]).push({d,slot:r[0],why:r[4]}); } }); });
  return A; }
function lcCol(k){ try{ return H.lc&&H.lc[k]?JSON.parse(H.lc[k]):null; }catch(e){ return null; } }
async function loadAll(){
  if(H.loading) return; H.loading=true;
  const jobs=[];
  if(typeof attdLoad==='function') jobs.push(attdLoad());
  jobs.push((async()=>{ const {dbm,rdb}=await secureDb(); const s=await dbm.get(dbm.ref(rdb,'portal/bogeret/secure/lc')); H.lc=s.exists()?s.val():{}; })());
  if(typeof goalsFetch==='function'&&typeof GOALS!=='undefined'&&GOALS===null) jobs.push(goalsFetch());
  if(typeof PC!=='undefined'){ if(!PC.ev&&typeof pcLoad==='function') jobs.push(pcLoad()); if((PC.custom===null||PC.custom===undefined)&&typeof pcLoadCustom==='function') jobs.push(pcLoadCustom()); }
  if(window.msgMount&&me()&&!me().lcOnly) try{ msgMount(); }catch(e){}
  await Promise.allSettled(jobs);
  H.loading=false; H.loaded=Date.now();
}
const msgTasks=()=>window.MSG&&MSG.ok?Object.entries(MSG.tasks||{}).filter(([k,v])=>v&&v.t).map(([id,v])=>Object.assign({id},v)):[];
const msgPosts=()=>window.MSG&&MSG.ok?Object.entries(MSG.posts||{}).filter(([k,v])=>v&&(v.body||v.title)).map(([id,v])=>Object.assign({id},v)):[];
const lateT=t=>t.st!=='done'&&t.due&&t.due<today();
function inAud(p,u){ if(p.by===u.id) return false; if(Array.isArray(p.to)) return p.to.includes(u.id); if(!p.to||p.to==='all') return true; return u.scope==='all'||u.mode==='admin'||u.scope===p.to; }

/* ---------- רכיבים ---------- */
const card=(title,body,act)=>`<section class="hm-card"><div class="hm-h"><h3>${title}</h3>${act||''}</div>${body}</section>`;
const item=(sev,ic,txt,go,lbl)=>`<div class="hm-it hm-${sev}"><span class="hm-ic">${ic}</span><div class="hm-tx">${txt}</div>${go?`<button class="hm-go" onclick="${go}">${lbl||'לטיפול'} ←</button>`:''}</div>`;
const kpi=(n,l,c,go)=>`<button class="hm-kpi" style="--c:${c}" ${go?`onclick="${go}"`:''}><b>${n}</b><small>${l}</small></button>`;
const names=(arr,max)=>{ max=max||6; const a=arr.slice(0,max).map(E).join(', '); return a+(arr.length>max?` ועוד ${arr.length-max}`:''); };
const goOv=k=>`show('overview');setTimeout(()=>{const b=document.querySelector('#ovSubnav button[data-k=&quot;${k}&quot;]');if(b)b.click();},50)`;
const goAtt=(k)=>`show('attendance');setTimeout(()=>{const b=document.querySelector('#atSubnav button[data-k=&quot;${k||'main'}&quot;]');if(b)b.click();},50)`;
const goMsg=v=>`show('msg');setTimeout(()=>{if(window.msgView)msgView('${v}')},30)`;

function eventsAhead(n, layersFilter){
  if(typeof PC==='undefined') return [];
  const all=(PC.ev||[]).concat(PC.custom||[]), a=today(), b=addD(a,n||7);
  return all.filter(e=>e.s<=b&&e.e>=a&&layersFilter(e)).sort((x,y)=>(x.s<y.s?-1:x.s>y.s?1:String(x.tm||'').localeCompare(String(y.tm||''))));
}
function evList(list){
  if(!list.length) return '<div class="hm-empty">אין אירועים בשבוע הקרוב</div>';
  let cur='', h='';
  list.slice(0,14).forEach(e=>{ const d=e.s<today()?today():e.s;
    if(d!==cur){ cur=d; h+=`<div class="hm-day">${d===today()?'היום':d===addD(today(),1)?'מחר':'יום '+wd(d)} · ${dd(d)}</div>`; }
    const clr=(typeof PCL!=='undefined'&&PCL[e.l]||{}).c||'#FC5028';
    h+=`<div class="hm-ev" style="--c:${clr}"><b>${E(e.t)}</b>${e.grp?` <span class="hm-tag" style="--c:${GRP_CLR[e.grp]||'#7c3aed'}">${E(e.grp)}</span>`:''}<small>${e.tm?E(e.tm)+(e.et?'–'+E(e.et):'')+' · ':''}${e.s!==e.e?'עד '+dd(e.e)+' · ':''}${E((typeof PCL!=='undefined'&&PCL[e.l]||{}).n||e.src||'')}</small></div>`; });
  return h;
}

/* ═══════════ 🎛️ חדר בקרה ═══════════ */
function vControl(){
  const S=allStu(), abs=absences(7), T=msgTasks(), P=msgPosts(), staff=USERS.filter(u=>u.id!==me().id);
  const rz=S.map(x=>({x,r:ramzorOf(x.s.n)}));
  const red=rz.filter(o=>o.r.cur==='red'), newRed=red.filter(o=>o.r.prev!=='red'&&o.r.prev!=='none'), orange=rz.filter(o=>o.r.cur==='orange');
  const absHigh=Object.entries(abs).filter(([n,a])=>a.length>=2).sort((a,b)=>b[1].length-a[1].length);
  const late=T.filter(lateT);
  const oldPosts=P.filter(p=>p.ack!==false&&Date.now()-p.at>864e5).map(p=>({p,miss:USERS.filter(u=>inAud(p,u)&&!(p.acks||{})[u.id])})).filter(o=>o.miss.length);
  const exits=lcCol('exits')||[], reqs=lcCol('requests')||[];
  const exPend=exits.filter(e=>e.status==='pending'), exOld=exPend.filter(e=>Date.now()-(e.ts||0)>2*864e5), exPar=exPend.filter(e=>e.madOk&&!e.parOk);
  const urgent=reqs.filter(r=>r.status==='pending'&&r.exam&&r.exam>=today()&&r.exam<=addD(today(),4));
  const reqOld=reqs.filter(r=>r.status==='pending'&&Date.now()-(r.created||0)>3*864e5);

  const its=[];
  if(newRed.length) its.push(item('err','🚦',`<b>${newRed.length} עברו לאדום</b> ברמזור הנשירה החודש: ${names(newRed.map(o=>o.x.s.n))}`,goOv('ramzor'),'לרמזור'));
  if(red.length) its.push(item(newRed.length?'warn':'err','🔴',`<b>${red.length} חניכים באדום</b> כרגע${red.length-newRed.length>0&&newRed.length?` (מתוכם ${red.length-newRed.length} כבר מהחודש הקודם)`:''}`,goOv('ramzor'),'לרמזור'));
  if(absHigh.length) its.push(item('err','🏫',`<b>${absHigh.length} חניכים עם 2+ היעדרויות מדאיגות</b> בשבוע האחרון: ${names(absHigh.map(([n,a])=>n+' ('+a.length+')'))}`,goAtt('main'),'לנוכחות'));
  if(urgent.length) its.push(item('err','🔥',`<b>${urgent.length} בקשות תגבור דחופות</b> — מבחן בעוד 4 ימים או פחות`,`show('lc')`,'למרכז הלמידה'));
  if(late.length) its.push(item('warn','⏰',`<b>${late.length} משימות באיחור</b> בקשר ומעקב: ${names(late.map(t=>t.t+' — '+(t.who||[]).map(w=>(USERS.find(u=>u.id===w)||{}).n||w).join(', ')),3)}`,goMsg('track'),'למעקב'));
  if(exOld.length) its.push(item('warn','🚪',`<b>${exOld.length} בקשות יציאה ממתינות מעל יומיים</b>`,goAtt('exits'),'ליציאות'));
  if(exPar.length) its.push(item('info','👪',`<b>${exPar.length} יציאות שהמדריך/ה אישר/ה</b> וממתינות לאישור הורים`,goAtt('exits'),'ליציאות'));
  if(oldPosts.length) its.push(item('warn','📢',`<b>${oldPosts.length} הודעות</b> שלא כולם אישרו את קריאתן אחרי יום: ${names(oldPosts.map(o=>(o.p.title||o.p.body||'').slice(0,30)+' ('+o.miss.length+')'),3)}`,goMsg('posts'),'להודעות'));
  if(reqOld.length) its.push(item('info','⏳',`<b>${reqOld.length} בקשות תגבור</b> ממתינות לשיבוץ מעל 3 ימים`,`show('lc')`,'למרכז הלמידה'));
  if(orange.length) its.push(item('info','🟠',`<b>${orange.length} חניכים בכתום</b> — כדאי לוודא שיש תוכנית`,goOv('ramzor'),'לרמזור'));
  if(!its.length) its.push(item('ok','✅','אין כרגע משהו שדורש החלטה. הכל מתוקתק.'));

  /* בריאות הנתונים */
  const fresh=(lbl,ts,txt,go,warnD,errD)=>{ const a=ts?ageDays(ts):null; const sev=a==null?'err':a>errD?'err':a>warnD?'warn':'ok';
    return `<div class="hm-fr hm-${sev}"><span class="hm-dot"></span><div><b>${lbl}</b><small>${txt}</small></div>${go&&sev!=='ok'?`<button class="hm-go" onclick="${go}">לעדכון ←</button>`:''}</div>`; };
  const am=typeof ATTD!=='undefined'&&ATTD.meta, lim=window.LIMUDI, sync=lcCol('sync');
  const limTs=lim&&(lim.updated||lim.at||(lim.date&&/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(lim.date)?lim.date.split('.').reverse().map(x=>x.padStart(2,'0')).join('-'):null));
  const syncTs=sync&&(sync.at||sync.ts||sync.date||(Array.isArray(sync)&&sync.length&&(sync[sync.length-1].at||sync[sync.length-1].ts)));
  const health=fresh('נוכחות (סמרט קמפוס)',am&&am.updated,am?`עודכן ${dd(String(am.updated).slice(0,10))} · נתונים עד ${dd(am.to)}`:'עוד לא הועלה דוח',goAtt('main'),3,7)
    +fresh('מצב לימודי (סמרט סקול)',limTs,lim&&lim.date?`עודכן ${E(lim.date)}`:'אין נתונים',`show('pedagogy')`,8,14)
    +fresh('מערכות שעות (מרכז למידה)',syncTs,syncTs?`סונכרן ${dd(new Date(syncTs).toISOString().slice(0,10))}`:'עוד לא סונכרן — פעם במחצית',`show('lc')`,120,180)
    +fresh('רמזור נשירה',rz.some(o=>o.r.month===curMonth()&&o.r.cur!=='none')?Date.now():null,rz.some(o=>o.r.month===curMonth()&&o.r.cur!=='none')?`יש סימונים לחודש ${curMonth()}`:`אין עדיין סימונים לחודש ${curMonth()}`,goOv('ramzor'),20,40);

  /* יעדים */
  const G=(typeof GOALS!=='undefined'&&Array.isArray(GOALS))?GOALS:[];
  const gst={'לא התחיל':'#8496ab','בתהליך':'#b45309','הושג':'#047857'};
  const goals=G.length?G.map((g,i)=>`<div class="hm-goal" style="--c:${gst[g.st]||'#8496ab'}"><b>${E(g.t||'יעד ללא שם')}</b><span>${E(g.st||'לא התחיל')}${g.pub?'':' · טיוטה'}</span></div>`).join(''):'<div class="hm-empty">אין יעדים</div>';

  /* צוות */
  const crew=staff.map(u=>{ const mt=T.filter(t=>(t.who||[]).includes(u.id)); const pend=P.filter(p=>p.ack!==false&&inAud(p,u)&&!(p.acks||{})[u.id]).length;
    return {u,open:mt.filter(t=>t.st!=='done').length,late:mt.filter(lateT).length,pend}; }).filter(r=>r.open||r.late||r.pend).sort((a,b)=>b.late-a.late||b.pend-a.pend);
  const crewTop=crew.filter(r=>r.late||r.open).concat(crew.filter(r=>!r.late&&!r.open)).slice(0,7), onlyPend=crew.filter(r=>!r.late&&!r.open);
  const crewMore=crew.length>crewTop.length?`<div class="hm-empty">ועוד ${crew.length-crewTop.length} אנשי צוות עם הודעות שלא נקראו</div>`:'';
  const crewH=crew.length?`<div class="hm-crew">${crewTop.map(r=>`<div><b>${E(r.u.n)}</b><small>${E(r.u.r)}</small><span>${r.open} פתוחות${r.late?` · <em class="bad">${r.late} באיחור</em>`:''}${r.pend?` · <em class="warn">${r.pend} לא נקראו</em>`:''}</span></div>`).join('')}</div>${crewMore}`:'<div class="hm-empty">אין משימות או הודעות פתוחות לצוות</div>';

  const absCnt=Object.values(abs).reduce((a,x)=>a+x.length,0);
  return `<div class="hm-hello">בוקר טוב ${E((me().n||'').split(' ')[0])} 👋 <small>${['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][new Date().getDay()]}, ${dd(today())} · ${S.length} חניכים</small><button class="hm-ref" onclick="homeRefresh()">🔄 רענון</button></div>
   <div class="hm-kpis">${kpi(red.length,'באדום ברמזור','#dc2626',goOv('ramzor'))}${kpi(absCnt,'היעדרויות מדאיגות השבוע','#c2410c',goAtt('main'))}${kpi(T.filter(t=>t.st!=='done').length,'משימות פתוחות','#8E033C',goMsg('tasks'))}${kpi(late.length,'משימות באיחור','#b91c1c',goMsg('track'))}${kpi(exPend.length,'יציאות ממתינות','#0e7490',goAtt('exits'))}</div>
   <div class="hm-grid">
    ${card('🎯 דורש החלטה',its.join(''))}
    <div class="hm-col">${card('🩺 בריאות הנתונים',health)}${card('👥 הצוות',crewH,`<button class="hm-lnk" onclick="${goMsg('track')}">למעקב המלא ←</button>`)}</div>
   </div>
   <div class="hm-grid">${card('🏁 יעדי השנה',`<div class="hm-goals">${goals}</div>`,`<button class="hm-lnk" onclick="${goOv('goals')}">לעריכה ←</button>`)}
     ${card('📅 השבוע בבוגרת',evList(eventsAhead(7,e=>!['fixed'].includes(e.l))),`<button class="hm-lnk" onclick="show('calendar')">ליומן ←</button>`)}</div>`;
}

/* ═══════════ 🏠 הקבוצה שלי ═══════════ */
function vMine(){
  const u=me(), S=myStudents(u), names_=new Set(S.map(x=>x.s.n)), abs=absences(7), grps=myGroupNames(u), calG=homeCalGroups(u);
  const T=msgTasks().filter(t=>(t.who||[]).includes(u.id)&&t.st!=='done'), P=msgPosts().filter(p=>p.ack!==false&&inAud(p,u)&&!(p.acks||{})[u.id]);
  const exits=(lcCol('exits')||[]).filter(e=>names_.has(e.sid));
  const exPend=exits.filter(e=>e.status==='pending'), exSoon=exits.filter(e=>e.status==='approved'&&e.date>=today()&&e.date<=addD(today(),7));
  const rz=S.map(x=>({x,r:ramzorOf(x.s.n)}));
  const red=rz.filter(o=>o.r.cur==='red'||o.r.cur==='orange');
  const absHigh=S.filter(x=>(abs[x.s.n]||[]).length>=2);
  const layer=u.scope==='ya'?'sch_ya':u.scope==='yb'?'sch_yb':'';
  const ev=eventsAhead(7,e=>e.l!=='fixed'&&(!e.grp||calG.includes(e.grp)||u.mode==='admin')&&(!/^sch_/.test(e.l)||e.l===layer||e.l==='sch_all'));

  const its=[];
  if(P.length) its.push(item('warn','📢',`<b>${P.length} הודעות</b> מחכות לאישור הקריאה שלך`,goMsg('mine'),'לקריאה'));
  T.sort((a,b)=>String(a.due||'9').localeCompare(String(b.due||'9'))).slice(0,5).forEach(t=>its.push(item(lateT(t)?'err':'info','✅',`<b>${E(t.t)}</b>${t.due?` · ${t.due<today()?'באיחור':'עד '+dd(t.due)}`:''}${t.stu?` · ${E(t.stu)}`:''}`,`show('msg');setTimeout(()=>msgOpenTask('${t.id}'),40)`,'לפתיחה')));
  if(T.length>5) its.push(item('info','➕',`עוד ${T.length-5} משימות פתוחות`,goMsg('mine'),'לכולן'));
  if(exPend.length) its.push(item('warn','🚪',`<b>${exPend.length} בקשות יציאה</b> ממתינות: ${names(exPend.map(e=>e.sid+' ('+(e.madOk?'חסר אישור הורים':e.parOk?'חסר אישור שלך':'חסר אישור שלך + הורים')+')'),3)}`,goAtt('exits'),'ליציאות'));
  if(red.length) its.push(item('err','🚦',`<b>${red.length} חניכים באדום/כתום</b>: ${names(red.map(o=>o.x.s.n))}`,'homeGoGroup()','לרמזור הקבוצה'));
  if(absHigh.length) its.push(item('err','🏫',`<b>${absHigh.length} עם 2+ היעדרויות מדאיגות</b> השבוע: ${names(absHigh.map(x=>x.s.n+' ('+abs[x.s.n].length+')'))}`,goAtt('main'),'לנוכחות'));
  if(!its.length) its.push(item('ok','✅','אין כרגע משהו שמחכה לך. יום טוב!'));

  const exMap={}; exits.filter(e=>e.status!=='rejected'&&e.date>=today()).forEach(e=>{ (exMap[e.sid]=exMap[e.sid]||[]).push(e); });
  const cards=S.slice().sort((a,b)=>{ const o={red:0,orange:1,yellow:2,green:3,none:4}; return (o[ramzorOf(a.s.n).cur]-o[ramzorOf(b.s.n).cur])||String(a.s.n).localeCompare(String(b.s.n),'he'); })
    .map(({s,i})=>{ const r=ramzorOf(s.n), a=(abs[s.n]||[]).length, ex=(exMap[s.n]||[])[0], gc=GRP_CLR[s.g]||'#94a3b8';
      return `<div class="hm-stu" onclick="showStudentDetails(${i})" style="--g:${gc}">${typeof avatar==='function'?avatar(s,40,gc):''}<div><b>${E(s.n)}</b><small>${E(s.g||'')}${s.r?' · חדר '+E(s.r):''}</small>
        <div class="hm-chips"><span class="hm-tag" style="--c:${RZ[r.cur].c}" title="רמזור נשירה">● ${RZ[r.cur].l}</span>${a?`<span class="hm-tag" style="--c:#c2410c">${a} היעדרויות</span>`:''}${ex?`<span class="hm-tag" style="--c:#0e7490">🚪 ${dd(ex.date)}${ex.status==='approved'?'':' ⏳'}</span>`:''}</div></div></div>`; }).join('');

  return `<div class="hm-hello">שלום ${E((u.n||'').split(' ')[0])} 👋 <small>${E(u.r||'')} · ${S.length} חניכים${grps.length&&grps.length<4?' · '+grps.map(E).join(', '):''}</small><button class="hm-ref" onclick="homeRefresh()">🔄 רענון</button></div>
   <div class="hm-quick"><button onclick="homeGoGroup()">👥 לניהול הקבוצה</button><button onclick="${goAtt('exits')}">🚪 אישורי יציאה</button>${calG.length?`<button onclick="homeNewGroupEvent()">➕ אירוע ביומן הקבוצה</button>`:''}${(u.mode==='edit'||u.mode==='admin')?`<button onclick="show('msg');setTimeout(()=>msgNewTask(),40)">✅ משימה חדשה</button>`:''}</div>
   <div class="hm-grid">${card('📌 לטיפול שלי',its.join(''))}${card('📅 היום והשבוע',evList(ev),`<button class="hm-lnk" onclick="show('calendar')">ליומן ←</button>`)}</div>
   ${card(`🧑‍🎓 החניכים שלי <small>(${S.length})</small>`,`<div class="hm-stus">${cards||'<div class="hm-empty">אין חניכים משויכים</div>'}</div>`)}`;
}
window.homeNewGroupEvent=function(){ show('calendar'); setTimeout(()=>{ if(typeof PC!=='undefined'){ PC.form={s:today(),grp:(homeCalGroups()[0]||'')}; if(window.pcalRender) pcalRender(); } },60); };

/* ---------- הרכבה ---------- */
window.homeRender=async function(which){
  const id=which||(document.querySelector('#sec-home.active')?'home':'mine');
  const el=document.getElementById(id+'Body'); if(!el||!me()) return;
  if(!H.loaded){ el.innerHTML='<div class="hm-empty">טוען את התמונה העדכנית…</div>'; await loadAll(); }
  try{ el.innerHTML=id==='home'?vControl():vMine(); }catch(e){ console.warn('home',e); el.innerHTML='<div class="hm-empty">⚠️ לא הצלחנו להציג את המסך. נסו לרענן.</div>'; }
};
window.homeRefresh=async function(){ H.loaded=0; if(typeof ATTD!=='undefined') ATTD.days=null; if(typeof GOALS!=='undefined') try{ GOALS=null; }catch(e){}
  const id=document.querySelector('#sec-home.active')?'home':'mine'; await homeRender(id); };
window.homeMount=function(){
  if(!me()||me().lcOnly) return;
  const main=document.getElementById('mainContent');
  [['home','🎛️','חדר בקרה','כל מה שדורש את תשומת ליבך — מרוכז במסך אחד. לחיצה על שורה מובילה ישר למקום הטיפול.'],
   ['mine','🏠','הקבוצה שלי','מה מחכה לך היום, מה קורה השבוע, ומצב החניכים שלך במבט אחד.']].forEach(([id,ic,t,d])=>{
    if(document.getElementById('sec-'+id)) return;
    const s=document.createElement('div'); s.className='sec'; s.id='sec-'+id;
    s.innerHTML=`<div id="${id}Body"></div>`; main.appendChild(s); });
};
const prevShow=window.show;
window.show=function(id){ prevShow&&prevShow(id); if(id==='home'||id==='mine') homeRender(id); };
/* עדכון חי כשמגיעה משימה/הודעה */
setInterval(()=>{ const a=document.querySelector('#sec-home.active,#sec-mine.active'); if(a&&H.loaded&&window.MSG&&MSG.ok&&!document.querySelector('.hm-card:hover')) homeRender(a.id.replace('sec-','')); },60000);

const css=document.createElement('style'); css.textContent=`
.hm-hello{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font:800 22px Heebo,sans-serif;color:#8E033C;margin:2px 0 12px}.hm-hello small{font:500 14px Heebo,sans-serif;color:#7A6A66}
.hm-ref{margin-inline-start:auto;border:1px solid #F3C2B0;background:#fff;border-radius:999px;padding:5px 12px;font:600 13px Heebo,sans-serif;color:#7A6A66;cursor:pointer}
.hm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;margin-bottom:12px}
.hm-kpi{background:#fff;border:1px solid #F3C2B0;border-top:4px solid var(--c);border-radius:12px;padding:10px;text-align:center;cursor:pointer;font-family:Heebo,sans-serif}
.hm-kpi b{display:block;font:800 28px Heebo,sans-serif;color:var(--c)}.hm-kpi small{color:#7A6A66;font-weight:600;font-size:12.5px}.hm-kpi:hover{box-shadow:0 4px 14px rgba(142,3,60,.12)}
.hm-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:12px;margin-bottom:12px;align-items:start}
@media (max-width:860px){.hm-grid{grid-template-columns:minmax(0,1fr)}}
.hm-col{display:flex;flex-direction:column;gap:12px}
.hm-card{background:#fff;border:1px solid #F3C2B0;border-radius:14px;padding:12px 14px;margin-bottom:0}
.hm-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}.hm-h h3{font:800 16px Heebo,sans-serif;color:#0f1e2e;margin:0;flex:1}.hm-h h3 small{color:#7A6A66;font-weight:600}
.hm-lnk{border:none;background:none;color:#8E033C;font:700 13px Heebo,sans-serif;cursor:pointer}
.hm-it{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;margin-bottom:6px;background:#FBF6F3;border-right:4px solid #cbd5e1}
.hm-it.hm-err{background:#fef2f2;border-right-color:#dc2626}.hm-it.hm-warn{background:#fff7ed;border-right-color:#ea580c}.hm-it.hm-info{background:#f0f9ff;border-right-color:#0e7490}.hm-it.hm-ok{background:#ecfdf5;border-right-color:#059669}
.hm-ic{font-size:18px;flex:none}.hm-tx{flex:1;font-size:14px;line-height:1.5;min-width:0}
.hm-go{flex:none;border:1px solid #F3C2B0;background:#fff;color:#8E033C;border-radius:8px;padding:5px 10px;font:700 12.5px Heebo,sans-serif;cursor:pointer;white-space:nowrap}.hm-go:hover{background:#FC5028;color:#fff;border-color:#FC5028}
.hm-fr{display:flex;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid #FFF1EB}.hm-fr:last-child{border-bottom:none}
.hm-fr>div{flex:1;display:flex;flex-direction:column}.hm-fr small{color:#7A6A66;font-size:12.5px}
.hm-dot{width:12px;height:12px;border-radius:50%;flex:none;background:#059669}.hm-fr.hm-warn .hm-dot{background:#ea580c}.hm-fr.hm-err .hm-dot{background:#dc2626}
.hm-crew{display:flex;flex-direction:column;gap:5px}.hm-crew>div{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13.5px}.hm-crew small{color:#8496ab}.hm-crew span{margin-inline-start:auto;color:#52637a}
.hm-crew em{font-style:normal;font-weight:800}.hm-crew .bad{color:#b91c1c}.hm-crew .warn{color:#b45309}
.hm-goals{display:flex;flex-direction:column;gap:6px}.hm-goal{display:flex;justify-content:space-between;gap:8px;border-right:4px solid var(--c);background:#FBF6F3;border-radius:0;padding:7px 10px;font-size:13.5px}.hm-goal span{color:var(--c);font-weight:700;white-space:nowrap;font-size:12.5px}
.hm-day{font:800 13px Heebo,sans-serif;color:#8E033C;margin:8px 0 4px}.hm-day:first-child{margin-top:0}
.hm-ev{border-right:3px solid var(--c);padding:3px 9px;margin-bottom:4px;display:flex;flex-direction:column}.hm-ev b{font-size:13.5px;font-weight:700}.hm-ev small{color:#7A6A66;font-size:12px}
.hm-tag{font-size:11.5px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 10%,#fff);border:1px solid color-mix(in srgb,var(--c) 30%,#fff);border-radius:999px;padding:0 7px;white-space:nowrap}
.hm-empty{color:#8496ab;padding:10px;font-size:13.5px}
.hm-quick{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.hm-quick button{border:1px solid #F3C2B0;background:#fff;border-radius:12px;padding:9px 14px;font:700 14px Heebo,sans-serif;color:#8E033C;cursor:pointer}.hm-quick button:hover{background:#FFF1EB;border-color:#FC5028}
.hm-stus{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.hm-stu{display:flex;gap:9px;align-items:center;border:1px solid #F3C2B0;border-right:4px solid var(--g);border-radius:12px;padding:8px 10px;cursor:pointer;background:#fff}.hm-stu:hover{box-shadow:0 4px 14px rgba(142,3,60,.12)}
.hm-stu>div{min-width:0;display:flex;flex-direction:column}.hm-stu b{font-size:14px}.hm-stu small{color:#7A6A66;font-size:12px}.hm-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}
`;
document.head.appendChild(css);
})();
