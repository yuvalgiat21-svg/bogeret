/* ═══════════════════════════════════════════════════════════════════════
   תיק חניך/ה + רשומות (בקשת יובל 28.11.2026)
   • לשונית ראשית "חניכים": לחיצה על חניך/ה פותחת תיק אישי עם כל המידע עליו/ה במקום אחד:
     פרטים · יומן אישי · שיחות (אישיות / משמעת / הורים) · מונה אירועים · חוזי התנהגות · בריאות ותזונה · לימודי ורמזור
   • כל רשומה נכתבת פעם אחת ומשויכת לחניך/ה, והריכוז הקבוצתי (ניהול קבוצה ← סיכומי פגישות) קורא את אותן רשומות.
   • לכל סוג רשומה יש פורמט מובנה: הורדת פורמט ריק, מסמך מוכן (הדפסה / PDF / Word),
     ופורמט משלי — קובץ Word עם תגיות כמו {שם_החניך} שהפורטל ממלא.
   • הקלטה ותמלול חינמי (כרום / אנדרואיד) + כפתור העתקה ל-Claude לסיכום (השם מוחלף ב"החניך/ה").
   • שיחות אישיות / משמעת / הורים הן חסויות: התוכן גלוי רק למי שכתב, למדריך/ה של הקבוצה, לרכז ולעו"ס.
     התוכן החסוי (השדות והתמלול) נשמר בנפרד: bogeret_conf/<קבוצה>/<id> = {f, tr, bm:מייל הכותב}
     וחוקי Firebase מתירים לקרוא אותו רק לרכז, למדריך/ה של הקבוצה, לעו"ס של השכבה ולמי שכתב.
     ב-tik/r נשאר רק שהתקיימה שיחה (סוג, תאריך, כותב) עם conf:1.
   נשמר באזור המוגן: portal/bogeret/secure/tik/r/<id> = {t, stu, g, d, by, at, f:{שדות}, tr?}
                     portal/bogeret/secure/tik/fmt/<id> = {t, name, by, at, b64}  (פורמט Word משלי)
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
const ROOT='portal/bogeret/secure/tik';
const TYPES={
  personal:{i:'💬',l:'שיחה אישית',stu:1,priv:1,f:['נושא השיחה','מה עלה בשיחה','איך החניך/ה מרגיש/ה','הסכמות','צעדים הבאים ומעקב']},
  discipline:{i:'⚖️',l:'שיחת משמעת',stu:1,priv:1,f:['מה קרה','הגרסה של החניך/ה','החלטה / תגובה חינוכית','הסכמות','מועד מעקב']},
  parents:{i:'📞',l:'שיחה עם הורים',stu:1,priv:1,f:['עם מי דיברנו','נושא השיחה','מה עלה','הסכמות','צעדים הבאים']},
  contracts:{i:'📜',l:'חוזה התנהגות',stu:1,f:['הרקע לחוזה','החניך/ה מתחייב/ת','הצוות מתחייב','תקופת החוזה ומועד בדיקה','מה קורה אם לא עומדים בחוזה']},
  events:{i:'📊',l:'אירוע',stu:1,ev:1,f:['מה קרה','מה נעשה']},
  meetings:{i:'📋',l:'סיכום פגישה',f:['משתתפים','נושאים','החלטות','משימות ואחראים']},
  weekly:{i:'📅',l:'סיכום שבועי',f:['מה היה השבוע','הצלחות','קשיים','חניכים במעקב','יעדים לשבוע הבא']},
};
const EV_CAT=['איחור','היעדרות / יציאה בלי אישור','אלימות פיזית','אלימות מילולית','ונדליזם','עישון / אלכוהול','הפרעה בכיתה','טלפון ומסכים','סדר וניקיון בחדר','אחר'];
const EV_SEV={1:{l:'קל',c:'#b45309'},2:{l:'בינוני',c:'#c2410c'},3:{l:'חמור',c:'#b91c1c'}};
const CONF='bogeret_conf';
const T={r:{},fmt:{},c:{},mine:{},ok:false,started:false,stu:null,tab:'info',q:'',g:'',ed:null,rec:null};
window.TIK=T;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jq=s=>E(String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const me=()=>(typeof ME!=='undefined'&&ME)||null;
const isAdmin=()=>!!(me()&&me().mode==='admin');
const canEdit=()=>!!(me()&&(me().mode==='admin'||me().mode==='edit'));
const staff=()=>(typeof USERS!=='undefined'?USERS:[]);
const uName=id=>{ const u=staff().find(x=>x.id===id); return u?u.n:(id||''); };
const pad=n=>String(n).padStart(2,'0');
const todayIso=()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fmtD=iso=>{ if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${+d}.${+m}.${y.slice(2)}`; };
const students=()=>(typeof STUDENTS_DATA!=='undefined'?STUDENTS_DATA:[]).concat(typeof ACAD_STUDENTS!=='undefined'?ACAD_STUDENTS:[]);
const stuBy=n=>students().find(s=>s.n===n);
const stuIdxOf=n=>students().findIndex(s=>s.n===n);
const GC=g=>(typeof GRP_CLR!=='undefined'&&GRP_CLR[g])||'#8E033C';
const toast=t=>{ if(window.famToastShow) return famToastShow(t); let el=document.getElementById('tikToast'); if(!el){ el=document.createElement('div'); el.id='tikToast'; document.body.appendChild(el); }
  el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),3500); };
const recs=()=>Object.entries(T.r||{}).filter(([k,v])=>v&&v.t).map(([id,v])=>Object.assign({id},v));
const ofStu=n=>recs().filter(r=>r.stu===n);
const sortD=a=>a.sort((x,y)=>String(y.d||'').localeCompare(String(x.d||''))||(y.at-x.at));

/* ---- מי רואה תוכן רגיש: מי שכתב, רכז, עו"ס, והמדריך/ה של הקבוצה ---- */
const sGrade=s=>String(s&&s.l||'').replace(/['׳"]/g,'');
const isSocial=u=>/עו"ס|עו״ס|עובד[ת]? סוציאלי/.test(String(u&&u.r||''));
/* מדריך/ה = בעל/ת הרשאת עריכה שאחראי/ת על הקבוצה (שינשינים לא רואים תוכן רגיש); עו"ס — רק בשכבה שלה */
const layerOk=(u,s)=>u.scope==='all'||!u.scope||(u.scope==='ya'&&sGrade(s)==='יא')||(u.scope==='yb'&&sGrade(s)==='יב')||(u.scope==='academy'&&s.g==='אקדמיה');
const GROUPS=['שלדג','שחף','שיר','קהילת יב','חוף','צוק','אקדמיה'];
function guideOf(u,s){ if(!u||!s||u.mode!=='edit') return false; const r=String(u.r||'');
  if(s.g&&r.includes(s.g)) return true;
  if(s.g==='קהילת יב'&&(u.scope==='yb'||/חוף|צוק|יב/.test(r))) return true;   /* קהילת יב — כל מדריכי י"ב */
  if(GROUPS.some(g=>r.includes(g))) return false;
  if(u.scope==='academy') return s.g==='אקדמיה';
  if(u.scope==='yb') return sGrade(s)==='יב';
  if(u.scope==='ya') return sGrade(s)==='יא'&&!/שלדג|שחף|שיר/.test(r);
  return false; }
function canSee(r){ const t=TYPES[r.t]; if(!t||!t.priv) return true; const u=me(); if(!u) return false;
  const st=stuBy(r.stu); return (isAdmin()||r.by===u.id||(isSocial(u)&&(!st||(layerOk(u,st)&&st.g!=='אקדמיה')))||guideOf(u,st))&&(!r.conf||!!cont(r)); }
/* התוכן של רשומה חסויה מגיע מהאזור הנפרד (רק אם Firebase התיר לקרוא אותו) */
function cont(r){ if(!r.conf) return {f:r.f||{},tr:r.tr||''}; return (T.c[r.g]||{})[r.id]||T.mine[r.id]||null; }
const rf=r=>(cont(r)||{}).f||{}, rtr=r=>(cont(r)||{}).tr||'';
const myEmail=()=>{ try{ const u=(typeof FBAUTH!=='undefined'&&FBAUTH&&FBAUTH.a&&FBAUTH.a.currentUser)||(typeof FBUSER!=='undefined'&&FBUSER); return String(u&&u.email||'').trim().toLowerCase(); }catch(e){ return ''; } };

/* ---- ענן ---- */
let DB=null; async function db(){ if(!DB) DB=await secureDb(); return DB; }
async function run(op){ for(let i=0;i<2;i++){ try{ const {dbm,rdb}=await db(); await op(dbm,rdb); return true; }catch(e){ console.warn('tik',e); DB=null; if(i===0){ await new Promise(r=>setTimeout(r,1000)); continue; } toast('⚠️ השמירה נכשלה — בדקו חיבור ונסו שוב'); return false; } } }
const put=(p,v)=>run((dbm,rdb)=>dbm.set(dbm.ref(rdb,ROOT+'/'+p),v));
/* ═══ מרכז הלמידה: תגבורים (בקשות + קבוצות קבועות) — לסנכרון מול המצב הלימודי ═══ */
const LC={req:[],grp:[],tch:[],ses:{},ok:false};
function lcListen(dbm,rdb){ ['requests','fixedGroups','teachers','sessions'].forEach(k=>{ try{ dbm.onValue(dbm.ref(rdb,'portal/bogeret/secure/lc/'+k),sn=>{ let v=[]; try{ v=JSON.parse(sn.val()||'[]')||[]; }catch(e){}
  if(k==='requests') LC.req=Array.isArray(v)?v:[]; else if(k==='fixedGroups') LC.grp=v; else if(k==='teachers') LC.tch=v; else LC.ses=v||{}; LC.ok=true; refresh();
  /* מסך הבית מציג התראת "חלשים בלי תגבור" — מרעננים אותו כשהנתונים מגיעים */
  clearTimeout(LC.t); LC.t=setTimeout(()=>{ if(document.querySelector('#sec-home.active,#sec-mine.active')&&window.homeRender) homeRender(); },400); },()=>{}); }catch(e){} }); }
const nrm=x=>String(x||'').replace(/["'״׳`]/g,'').replace(/[יו]/g,'').replace(/\s+/g,'').replace(/\d.*$/,'');
const sameSubj=(a,b)=>{ const x=nrm(a), y=nrm(b); return !!x&&!!y&&(x===y||x.startsWith(y)||y.startsWith(x)); };
/* מקצועות חלשים = ציון מתחת ל-55; לכל אחד — האם יש תגבור (בקשה פעילה או קבוצה קבועה) */
function tutorGap(name){ const lr=typeof limFind==='function'?limFind(name):null; if(!lr) return null;
  let weak=[]; if(Array.isArray(lr['מקצועות'])) weak=lr['מקצועות'].filter(x=>x[2]!==''&&x[2]!=null&&+x[2]<55).map(x=>({s:x[0],g:+x[2]}));
  else weak=String(lr['ציונים_נמוכים']||'').split(' · ').filter(Boolean).map(t=>{ const i=t.lastIndexOf(':'); return {s:t.slice(0,i),g:+t.slice(i+1)}; });
  const reqs=(LC.req||[]).filter(r=>r&&r.sid===name&&!/reject|cancel|done|closed/.test(String(r.status||'')));
  const grps=(LC.grp||[]).filter(g=>g&&(g.sids||[]).includes(name));
  weak.forEach(w=>{ const r=reqs.find(r=>sameSubj(r.subject,w.s)), g=grps.find(g=>sameSubj(g.subject,w.s));
    w.tut=g?'קבוצה קבועה':r?(r.status==='assigned'?'משובץ/ת לתגבור':'ביקש/ה תגבור — ממתין לשיבוץ'):''; });
  const lvl=lr['רמה']; return {lvl,weak,missing:weak.filter(w=>!w.tut),bad:lvl==='אדום'||lvl==='כתום'||weak.length>0}; }
window.tikTutorGap=tutorGap;
const gapAlert=n=>{ const g=tutorGap(n); return !!(g&&g.missing.length); };
const CONF_ON={};
function confListen(dbm,rdb){ GROUPS.forEach(g=>{ if(CONF_ON[g]) return; CONF_ON[g]=1;
  try{ dbm.onValue(dbm.ref(rdb,CONF+'/'+g),snap=>{ T.c[g]=snap.val()||{}; refresh(); },()=>{ /* אין הרשאה לקבוצה הזו — זה תקין */ }); }catch(e){} }); }
/* רשומות חסויות שכתבתי בקבוצה שאין לי גישה אליה — נקראות אחת אחת */
const MINE_TRY={};
function mineFetch(dbm,rdb){ const u=me(); if(!u) return; recs().forEach(r=>{ if(!r.conf||r.by!==u.id||MINE_TRY[r.id]||(T.c[r.g]||{})[r.id]) return; MINE_TRY[r.id]=1;
  dbm.get(dbm.ref(rdb,CONF+'/'+r.g+'/'+r.id)).then(s=>{ const v=s.val(); if(v){ T.mine[r.id]=v; refresh(); } }).catch(()=>{}); }); }
/* העברה חד-פעמית (רכז): רשומות חסויות ישנות שהתוכן שלהן עוד בתיק הכללי עוברות לאזור הנפרד */
let MIGR=false;
async function migrate(dbm,rdb){ if(MIGR||!isAdmin()) return; MIGR=true;
  for(const r of recs()){ if(!TYPES[r.t].priv||r.conf||!r.g) continue;
    try{ await dbm.set(dbm.ref(rdb,CONF+'/'+r.g+'/'+r.id),{f:r.f||{},tr:r.tr||'',bm:'',at:r.at||Date.now()});
      await dbm.update(dbm.ref(rdb,ROOT+'/r/'+r.id),{f:null,tr:null,conf:1}); }catch(e){ console.warn('tik migrate',e); } } }
function start(){ if(T.started||!me()) return; T.started=true;
  db().then(({dbm,rdb})=>{ confListen(dbm,rdb); lcListen(dbm,rdb); return dbm.onValue(dbm.ref(rdb,ROOT),snap=>{ const v=snap.val()||{}; T.r=v.r||{}; T.fmt=v.fmt||{}; T.ok=true; mineFetch(dbm,rdb); migrate(dbm,rdb); refresh(); },
    e=>{ console.warn('tik listen',e); T.started=false; DB=null; setTimeout(start,3000); }); }).catch(()=>{ T.started=false; DB=null; setTimeout(start,3000); }); }
function refresh(){ const ae=document.activeElement; if(T.ed||T.rec) return; if(ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)&&ae.closest('#sec-tik,.tik-modal')) return;
  if(active()) render(); document.querySelectorAll('[data-tikgrp]').forEach(el=>{ el.innerHTML=grpHtml(el.dataset.tikgrp,el.dataset.tikt); }); }
const active=()=>{ const s=document.getElementById('sec-tik'); return s&&s.classList.contains('active'); };

/* חדר + מבנה (ורד / זית / ג׳נטילי) — מתוך שיבוץ החדרים בפועל */
let RMAP=null, RMAP_T=0;
function roomMap(){ if(RMAP&&Date.now()-RMAP_T<3000) return RMAP; RMAP={}; RMAP_T=Date.now();
  if(typeof rmBuild==='function') [['ya','ורד'],['yb',''],['ac','ג׳נטילי']].forEach(([k,b0])=>{ try{ rmBuild(k).rooms.forEach(r=>(r.m||[]).forEach(m=>{ if(m&&m.n&&!RMAP[m.n]) RMAP[m.n]={r:r.r,b:r.b||b0}; })); }catch(e){} });
  return RMAP; }
const roomTxt=s=>{ const o=roomMap()[s.n]; if(o) return `חדר ${o.r}${o.b?' · '+o.b:''}`; return s.r?`חדר ${s.r}`:''; };
/* ═══════════ רשימת החניכים ═══════════ */
function myGroups(){ const all=[...new Set(students().map(s=>s.g).filter(Boolean))]; return all; }
function listView(){
  const q=T.q.trim(), canLim=!!(window.LIMUDI&&LIMUDI.students), nGap=canLim?students().filter(s=>gapAlert(s.n)).length:0;
  const L=students().filter(s=>(!T.g||s.g===T.g)&&(!q||s.n.includes(q)||String(s.r||'').includes(q))&&(!T.gap||gapAlert(s.n))).sort((a,b)=>String(a.g).localeCompare(String(b.g),'he')||a.n.localeCompare(b.n,'he'));
  const cm=window.MSG&&MSG.logs?MSG.logs:{};
  return `<div class="info-box"><div class="icon">🧑‍🎓</div><div><b>חניכים — תיק אישי</b><br>לחיצה על חניך/ה פותחת את כל המידע במקום אחד: יומן, שיחות, אירועים, חוזים, בריאות, לימודים ועוד.</div></div>
  <div class="tk-bar"><input class="tk-q" placeholder="🔍 חיפוש לפי שם או חדר" value="${E(T.q)}" oninput="tikQ(this.value)">
    ${nGap?`<button class="tk-chip${T.gap?' on':''}" onclick="tikGap()">📚⚠️ חלשים בלי תגבור <b>${nGap}</b></button>`:''}<select onchange="tikG(this.value)"><option value="">כל הקבוצות (${students().length})</option>${myGroups().map(g=>`<option ${T.g===g?'selected':''} value="${E(g)}">${E(g)} (${students().filter(s=>s.g===g).length})</option>`).join('')}</select></div>
  <div class="tk-grid">${L.map(s=>{ const R=ofStu(s.n), ev=R.filter(r=>r.t==='events').length, al=Object.values(cm).some(l=>l&&l.stu===s.n&&l.k==='alert'&&!l.res);
    return `<div class="tk-card" style="--g:${GC(s.g)}" onclick="tikOpen('${jq(s.n)}')">${typeof avatar==='function'?avatar(s,46,GC(s.g)):''}
      <div style="min-width:0;flex:1"><b>${E(s.n)}</b><small>${E(s.g||'')}${s.cls?' · '+E(s.cls):''}${roomTxt(s)?' · '+E(roomTxt(s)):''}</small>
      ${s.ph?`<small>📱 ${E(s.ph)}</small>`:''}</div>
      <div class="tk-tags">${canLim&&gapAlert(s.n)?'<span title="חלש/ה במקצוע ואין תגבור">📚⚠️</span>':''}${al?'<span title="התרעת דאגה פתוחה">⚠️</span>':''}${ev?`<span title="אירועים">📊${ev}</span>`:''}${R.filter(r=>TYPES[r.t].priv).length?`<span title="שיחות">💬${R.filter(r=>TYPES[r.t].priv).length}</span>`:''}</div></div>`; }).join('')||'<div class="tk-empty">לא נמצאו חניכים</div>'}</div>`;
}
window.tikQ=function(v){ T.q=v; const el=document.getElementById('tikBody'); const pos=document.activeElement&&document.activeElement.selectionStart; render(); const i=document.querySelector('#tikBody .tk-q'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(e){} } };
window.tikG=function(v){ T.g=v; render(); };
window.tikGap=function(){ T.gap=!T.gap; render(); };

/* ═══════════ התיק האישי ═══════════ */
const TABS=[['info','📇 פרטים'],['diary','🕓 יומן אישי'],['talks','💬 שיחות ותיעוד'],['events','📊 מונה אירועים'],['contracts','📜 חוזים'],['clubs','🎨 חוגים ותוכנית מלווה'],['home','🏡 ביקורי בית ודמי כיס'],['health','🏥 בריאות ותזונה'],['study','🏫 בית ספר'],['lc','📖 מרכז למידה'],['ramzor','🚦 רמזור נשירה']];
window.tikOpen=function(n,tab){ if(!stuBy(n)) return; const sm=document.getElementById('student-modal'); if(sm) sm.style.display='none';
  T.stu=n; T.tab=tab||'info'; if(!active()) show('tik'); else render(); window.scrollTo({top:0}); };
window.tikBack=function(){ T.stu=null; render(); };
window.tikTab=function(k){ T.tab=k; render(); };
function fileView(){
  const s=stuBy(T.stu); if(!s){ T.stu=null; return listView(); }
  const R=ofStu(s.n), clr=GC(s.g);
  const ML=Object.values((window.MSG&&MSG.logs)||{}).filter(l=>l&&l.stu===s.n).length;
  const cnt={talks:R.filter(r=>TYPES[r.t].priv).length+ML,events:R.filter(r=>r.t==='events').length,contracts:R.filter(r=>r.t==='contracts').length};
  let body='';
  if(T.tab==='info') body=infoTab(s); else if(T.tab==='diary') body=diaryTab(s); else if(T.tab==='talks') body=talksTab(s);
  else if(T.tab==='events') body=eventsTab(s); else if(T.tab==='contracts') body=recTab(s,['contracts']); else if(T.tab==='clubs') body=clubsTab(s); else if(T.tab==='home') body=homeTab(s); else if(T.tab==='health') body=healthTab(s); else if(T.tab==='lc') body=lcTab(s); else if(T.tab==='ramzor') body=ramzorTab(s); else body=studyTab(s);
  return `<div class="tk-head" style="--g:${clr}"><button class="tk-back" onclick="tikBack()">→ כל החניכים</button>
    <div class="tk-hm">${typeof avatar==='function'?avatar(s,64,clr):''}<div><h2>${E(s.n)}</h2><div class="tk-sub">${E(s.g||'')}${s.cls?' · '+E(s.cls):''}${roomTxt(s)?' · '+E(roomTxt(s)):''}</div></div></div></div>
    <div class="tk-tabs">${TABS.map(([k,l])=>`<button class="${T.tab===k?'on':''}" onclick="tikTab('${k}')">${l}${cnt[k]?` <span>${cnt[k]}</span>`:''}</button>`).join('')}</div>
    <div class="tk-body">${body}</div>`;
}
const row=(l,v)=>v?`<div class="tk-f"><span>${l}</span><b>${v}</b></div>`:'';
const tel=p=>p?`<a href="tel:${E(String(p).replace(/[^\d+]/g,''))}">${E(p)}</a>`:'';
function infoTab(s){
  return `<div class="tk-cols"><div class="tk-box"><h3>פרטים</h3>${row('קבוצה',E(s.g))}${row('כיתה',E(s.cls))}${row('חדר',E(roomTxt(s).replace(/^חדר /,'')))}${row('📱 נייד',tel(s.ph))}${row('תאריך לידה',E(s.bd))}${row('כתובת',E([s.addr,s.city].filter(Boolean).join(', ')))}</div>
    <div class="tk-box"><h3>👨‍👩‍👦 הורים</h3>${row('אבא',E(s.fa)+(s.fp?' · '+tel(s.fp):''))}${row('אמא',E(s.mo)+(s.mp?' · '+tel(s.mp):''))}${s.ps?`<div class="tk-note">${E(s.ps)}</div>`:''}${!s.fa&&!s.mo?'<div class="tk-empty">אין פרטי הורים</div>':''}</div></div>`;
}
function quick(s){ if(!canEdit()) return '';
  return `<div class="tk-quick">${['personal','discipline','parents','events','contracts'].map(t=>`<button onclick="tikNew('${t}','${jq(s.n)}')">➕ ${TYPES[t].i} ${TYPES[t].l}</button>`).join('')}
    ${window.msgLog?`<button onclick="msgLog('${jq(s.n)}')">➕ 📝 תיעוד מגע קצר</button>`:''}</div>`; }
const MK={stu:'🗣️ שיחה עם החניך/ה',par:'📞 שיחה עם הורים',meet:'🤝 פגישה',home:'🏠 ביקור בית',msg:'💬 הודעה',note:'📝 הערה',alert:'⚠️ דאגה / התרעה'};
function logLine(l){ const d=l.on||new Date(l.at).toISOString().slice(0,10);
  return {ts:d,h:`<div class="tk-ev${l.k==='alert'&&!l.res?' al':''}"><div class="tk-evh"><b>${MK[l.k]||'📝 תיעוד'}</b><span class="tk-pill" style="--c:#0e7490">תיעוד מגע קצר</span><small>${fmtD(d)} · ${E(uName(l.by))}${l.k==='alert'?(l.res?' · ✓ טופל':' · פתוחה'):''}</small></div><div>${E(l.x).replace(/\n/g,'<br>')}</div></div>`}; }
function diaryTab(s){
  const ev=[];
  recs().filter(r=>r.stu===s.n).forEach(r=>{ const t=TYPES[r.t]; ev.push({ts:r.d||'',h:recLine(r)}); });
  const M=window.MSG||{};
  Object.values(M.logs||{}).forEach(l=>{ if(l&&l.stu===s.n) ev.push(logLine(l)); });
  Object.entries(M.tasks||{}).forEach(([id,t])=>{ if(!t||t.stu!==s.n) return; const d=new Date(t.at).toISOString().slice(0,10);
    ev.push({ts:d,h:`<div class="tk-ev tk-evt" onclick="show('msg');msgOpenTask&&msgOpenTask('${id}')"><div class="tk-evh"><b>✅ משימה: ${E(t.t)}</b><small>${fmtD(d)} · ${E((t.who||[]).map(uName).join(', '))} · ${t.st==='done'?'הושלמה':'פתוחה'}</small></div></div>`}); });
  ev.sort((a,b)=>String(b.ts).localeCompare(String(a.ts)));
  return `<div class="tk-tl">${ev.map(e=>e.h).join('')||'<div class="tk-empty">עוד אין שום תיעוד על החניך/ה</div>'}</div>`;
}
function recLine(r){ const t=TYPES[r.t], see=canSee(r);
  const sev=r.t==='events'&&EV_SEV[r.sev]?`<span class="tk-pill" style="--c:${EV_SEV[r.sev].c}">${EV_SEV[r.sev].l}</span>`:'';
  const first=see?Object.entries(rf(r)).filter(([k,v])=>v).slice(0,2).map(([k,v])=>`<div><small>${E(k)}:</small> ${E(String(v).slice(0,220))}${String(v).length>220?'…':''}</div>`).join(''):'<div class="tk-lock">🔒 חסוי — התוכן גלוי רק למדריך/ה של הקבוצה, לעו"ס של השכבה ולרכז</div>';
  return `<div class="tk-ev" ${see?`onclick="tikView('${r.id}')"`:''}><div class="tk-evh"><b>${t.i} ${t.l}${r.cat?' · '+E(r.cat):''}</b>${t.priv?'<span class="tk-pill" style="--c:#7A6A66">🔒 חסוי</span>':''}${sev}<small>${fmtD(r.d)} · ${E(uName(r.by))}${see&&rtr(r)?' · 🎙️':''}</small></div>${first}</div>`; }
function recTab(s,types){
  const L=sortD(recs().filter(r=>r.stu===s.n&&types.includes(r.t)));
  return `<div class="tk-acts">${canEdit()?types.map(t=>`<button class="tk-btn" onclick="tikNew('${t}','${jq(s.n)}')">➕ ${TYPES[t].l}</button>`).join(''):''}</div>${fmtPanel(types)}
    ${L.map(recLine).join('')||'<div class="tk-empty">אין עדיין רשומות</div>'}`;
}
function talksTab(s){
  const ev=sortD(recs().filter(r=>r.stu===s.n&&TYPES[r.t].priv)).map(r=>({ts:r.d||'',h:recLine(r)}));
  Object.values((window.MSG&&MSG.logs)||{}).forEach(l=>{ if(l&&l.stu===s.n) ev.push(logLine(l)); });
  ev.sort((a,b)=>String(b.ts).localeCompare(String(a.ts)));
  return quick(s)+fmtPanel(['personal','discipline','parents','events','contracts'])
    +`<div class="tk-note">אירועים וחוזים נשמרים גם בלשוניות "מונה אירועים" ו"חוזים".</div>${ev.map(e=>e.h).join('')||'<div class="tk-empty">אין עדיין שיחות או תיעודים</div>'}`;
}
function evCounts(L){ const c={}; L.forEach(r=>{ const k=r.cat||'אחר'; c[k]=(c[k]||0)+1; }); return Object.entries(c).sort((a,b)=>b[1]-a[1]); }
function eventsTab(s){
  const L=sortD(recs().filter(r=>r.stu===s.n&&r.t==='events')), C=evCounts(L);
  return `<div class="tk-acts">${canEdit()?`<button class="tk-btn" onclick="tikNew('events','${jq(s.n)}')">➕ אירוע חדש</button>`:''}</div>${fmtPanel(['events'])}
    <div class="tk-tiles"><div class="tk-tile"><b>${L.length}</b><small>אירועים בסך הכל</small></div>${[3,2,1].map(v=>`<div class="tk-tile" style="--c:${EV_SEV[v].c}"><b>${L.filter(r=>+r.sev===v).length}</b><small>${EV_SEV[v].l}</small></div>`).join('')}</div>
    ${C.length?`<div class="tk-cnt">${C.map(([k,n])=>`<span>${E(k)} <b>${n}</b></span>`).join('')}</div>`:''}
    ${L.map(recLine).join('')||'<div class="tk-empty">אין אירועים 👏</div>'}`;
}
function clubsTab(s){
  const h=typeof hugLoad==='function'?(hugLoad()[s.n]||{}):{}, hd=typeof cmpHug==='function'?(cmpHug(s.n)||{}):{};
  const p1=h.p1||hd.p1||'', p2=h.p2||hd.p2||'', mev=h.mev||hd.mechina||'';
  const B=typeof cmpBodiesOf==='function'?cmpBodiesOf(s.n):[];
  const aft=typeof aftLoad==='function'?((aftLoad()[s.n]||{}).d||[]):[];
  return `<div class="tk-cols"><div class="tk-box"><h3>🎨 חוגי פנאי</h3>${row('חוג ראשון',E(p1))}${row('חוג שני',E(p2))}${!p1&&!p2?'<div class="tk-empty">לא משובץ/ת לחוג פנאי</div>':''}</div>
    <div class="tk-box"><h3>🤝 מעורבות חברתית</h3>${mev?`<div class="tk-row"><span>איפה</span><b>${E(mev)}</b></div>`:'<div class="tk-empty">לא רשום/ה</div>'}</div></div>
    <div class="tk-box"><h3>🧭 תוכנית מלווה — גופי מנהיגות</h3>${B.length?`<div class="tk-cnt">${B.map(b=>`<span style="border-color:${b.clr};color:${b.clr}">${b.icon} ${E(b.label)}</span>`).join('')}</div>`:'<div class="tk-empty">לא חבר/ה באף גוף</div>'}</div>
    ${aft.length?`<div class="tk-box"><h3>📖 לימודי אחר הצהריים</h3><div class="tk-cnt">${aft.map(d=>`<span>${E(typeof d==='number'&&typeof DAYS5!=='undefined'?DAYS5[d]:d)}</span>`).join('')}</div></div>`:''}
    <div class="tk-note">עריכה: ניהול קבוצה ← חוגים / לימודי אחה"צ, ותוכנית מלווה. המידע מתעדכן כאן אוטומטית.</div>`;
}
function homeTab(s){
  const V=typeof visLoad==='function'?visLoad():{}, ph0=sGrade(s)==='יב'?(typeof VIS_PHASES_YB!=='undefined'?VIS_PHASES_YB:['סוכות']):(typeof VIS_PHASES_YA!=='undefined'?VIS_PHASES_YA:[]);
  const phs=[...new Set(ph0.concat(Object.keys(V).filter(k=>k.startsWith(s.n+'|')).map(k=>k.slice(s.n.length+1))))];
  const VC={'מתוכנן':'#b45309','בוצע':'#047857','בוטל':'#b91c1c','לא רלוונטי':'#8496ab'};
  const isUrl=x=>/^https?:\/\//.test(String(x||'').trim());
  const vis=phs.map(ph=>{ const e=V[s.n+'|'+ph]||{}; const st=e.status||'';
    return `<div class="tk-f"><span>🏡 ${E(ph)}</span><b>${st?`<span class="tk-pill" style="--c:${VC[st]||'#8496ab'}">${E(st)}</span>`:'<span class="tk-mut">לא תוכנן</span>'}${e.date?' · '+fmtD(e.date):''}</b>
      <small>${e.form?(isUrl(e.form)?`<a href="${E(e.form)}" target="_blank" rel="noopener">📎 פורמט הביקור</a>`:'📎 '+E(e.form)):(st==='בוצע'?'📎 עוד לא צורף פורמט':'')}</small></div>`; }).join('');
  const P=typeof pmLoad==='function'?(pmLoad()[s.n]||{}):{}, M=typeof MONTHS9!=='undefined'?MONTHS9:[], num=v=>{ const n=parseFloat(v); return isNaN(n)?0:n; };
  const tot=M.reduce((a,m)=>a+num(P[m]),0), paid=M.filter(m=>num(P[m])>0);
  const pm=num(P.base)||tot?`<div class="tk-f"><span>🔑 מפתח חודשי</span><b>${num(P.base)?num(P.base).toLocaleString()+' ₪':'—'}</b></div><div class="tk-f"><span>💰 סה"כ קיבל/ה השנה</span><b>${tot.toLocaleString()} ₪</b></div>
    <div class="tk-wide"><div class="tk-cnt">${M.map(m=>`<span class="${num(P[m])>0?'':'tk-mut'}">${E(m)}: <b>${num(P[m])>0?num(P[m]).toLocaleString():'—'}</b></span>`).join('')}</div></div>`
    :'<div class="tk-empty">לא מוגדרים דמי כיס לחניך/ה</div>';
  return `<div class="tk-box"><h3>🏡 ביקורי בית</h3>${vis||'<div class="tk-empty">אין ביקורי בית</div>'}</div>
    <div class="tk-box"><h3>💰 דמי כיס</h3>${pm}</div>
    <div class="tk-note">עריכה: ניהול קבוצה ← ${E(s.g||'')} ← ביקורי בית / דמי כיס. המידע מתעדכן כאן אוטומטית.</div>`;
}
function healthTab(s){
  const m=typeof medLoad==='function'?(medLoad()[s.n]||{}):{}, d=typeof dietLoad==='function'?(dietLoad()[s.n]||{}):{};
  return `<div class="tk-cols"><div class="tk-box"><h3>🏥 רפואי</h3>${row('אבחנות / מידע',E(m.info))}${row('תרופות קבועות',E(m.meds))}${row('רגישויות',E(m.alrg))}${!m.info&&!m.meds&&!m.alrg?'<div class="tk-empty">אין מידע רפואי</div>':''}</div>
    <div class="tk-box"><h3>🥗 תזונה</h3>${(d.tags||[]).length?`<div class="tk-cnt">${d.tags.map(t=>`<span>${E(t)}</span>`).join('')}</div>`:''}${row('הערה',E(d.note))}${!(d.tags||[]).length&&!d.note?'<div class="tk-empty">אין העדפות תזונה</div>':''}</div></div>
    <div class="tk-note">עריכה: ניהול קבוצה ← ${E(s.g||'')} ← רפואי / תזונה. המידע מתעדכן כאן אוטומטית.</div>`;
}
function studyTab(s){
  const lr=typeof limFind==='function'?limFind(s.n):null, rz=(typeof RAMZOR_DATA_NEW!=='undefined'?RAMZOR_DATA_NEW:[]).find(x=>x.n===s.n);
  const RC={green:'#059669',yellow:'#eab308',orange:'#ea580c',red:'#dc2626'}, RL={green:'תקין',yellow:'מעקב',orange:'מדאיג',red:'בסכנה'};
  const rzH=rz&&rz.s?Object.entries(rz.s).filter(([m,v])=>v&&v!=='none').map(([m,v])=>`<span class="tk-pill" style="--c:${RC[v]||'#94a3b8'}" title="${E((rz.nt||{})[m]||'')}">${E(m)}: ${RL[v]||v}</span>`).join(''):'';
  const may=isAdmin()||(typeof limCan==='function'&&limCan(s.g==='אקדמיה'?'academy':s.g))||(typeof limCan==='function'&&sGrade(s)==='יב'&&limCan('yb'));
  const LV={'אדום':'#dc2626','כתום':'#ea580c','צהוב':'#eab308','ירוק':'#059669'};
  const L=window.LIMUDI;
  let lim='';
  if(!may) lim='<div class="tk-empty">🔒 המצב הלימודי גלוי לרכז ולמדריך/ה של הקבוצה</div>';
  else if(!lr) lim=`<div class="tk-empty">${L&&L.students?'החניך/ה לא נמצא/ה בנתונים מסמרט סקול':'עוד לא נטענו נתונים מסמרט סקול'}</div>`;
  else{
    const sum=[['כיתה',lr['כיתה']],['מגמה',lr['מגמה']],['ממוצע',lr['ממוצע']],['חיסורים',lr['חיסורים']!=null?`${lr['חיסורים']} (${lr['אחוז_חיסור']}%)`:''],['הפרעות',lr['הפרעות']],['סלולרי',lr['סלולרי']],
      ['יח"ל מתמטיקה',lr['יחל_מתמטיקה']],['יח"ל אנגלית',lr['יחל_אנגלית']],['ציונים מתחת ל-55',lr['ציונים_נמוכים']],['היעדרות גבוהה במקצוע',lr['היעדרות_במקצוע']],['בגרויות מתחת ל-55',lr['בגרות_מתחת_55']],['הערת מעקב אחרונה',lr['הערת_מעקב_אחרונה']]];
    const SJ=Array.isArray(lr['מקצועות'])?lr['מקצועות']:null, BG=Array.isArray(lr['בגרויות'])?lr['בגרויות']:null, TT=lr['מערכת'];
    lim=`<div class="tk-lvl"><span class="tk-pill" style="--c:${LV[lr['רמה']]||'#94a3b8'}">רמת סיכון: ${E(lr['רמה']||'')}${lr['ניקוד_סיכון']!=null?' ('+E(lr['ניקוד_סיכון'])+')':''}</span>${L&&L.date?`<small>עודכן ${E(L.date)}${L.period?' · '+E(L.period):''}</small>`:''}</div>
      ${sum.filter(([k,v])=>v!==''&&v!=null).map(([k,v])=>row(k,E(v))).join('')}
      <h3 style="margin-top:14px">📘 כל המקצועות</h3>${SJ&&SJ.length?`<div class="tk-tblw"><table class="tk-tbl"><tr><th>מקצוע</th><th>יח"ל</th><th>ציון</th><th>שיעורים</th><th>חיסורים</th></tr>
        ${SJ.map(x=>{ const g=x[2]===''||x[2]==null?'':Math.round(+x[2]), ab=+x[4]||0, n=+x[3]||0, hi=n>=8&&ab/n>=0.4;
          return `<tr><td>${E(x[0])}</td><td>${E(x[1]||'')}</td><td style="${g!==''&&g<55?'color:#b91c1c;font-weight:800':''}">${g}</td><td>${n||''}</td><td style="${hi?'color:#b91c1c;font-weight:800':''}">${ab||''}${n&&ab?` (${Math.round(ab/n*100)}%)`:''}</td></tr>`; }).join('')}</table></div>`
        :'<div class="tk-empty">הפירוט לפי מקצוע יופיע אחרי העדכון השבועי הבא מסמרט סקול</div>'}
      ${BG&&BG.length?`<h3 style="margin-top:14px">🎓 ציוני בגרות</h3><div class="tk-cnt">${BG.map(b=>`<span style="${+b[1]<55?'color:#b91c1c;border-color:#fecaca':''}">${E(b[0])}: <b>${E(b[1])}</b></span>`).join('')}</div>`:''}
      <h3 style="margin-top:14px">🗓️ מערכת שעות</h3>${ttHtml(TT)}`;
  }
  const G=may&&lr?tutorGap(s.n):null;
  const gapBox0=G&&(G.weak.length||G.bad)?`<div class="tk-box ${G.missing.length?'tk-warn':''}"><h3>🎯 תגבורים מול מקצועות חלשים</h3>
    ${G.weak.length?G.weak.map(w=>`<div class="tk-f ${w.tut?'ok':'bad'}"><span>${E(w.s)} · ציון ${w.g}</span><b>${w.tut?'✓ '+E(w.tut):'⚠️ אין תגבור'}</b></div>`).join('')
      :'<div class="tk-empty">אין ציונים מתחת ל-55, אבל רמת הסיכון '+E(G.lvl||'')+' — כדאי לבדוק נוכחות והתנהגות בשיעורים</div>'}
    ${G.missing.length?`<div class="tk-note">📌 כדאי לפתוח בקשת תגבור במרכז הלמידה ב${G.missing.map(w=>E(w.s)).join(', ')}. ${canEdit()?`<a href="#" onclick="show('lc');return false">למרכז הלמידה ←</a>`:''}</div>`:''}</div>`:'';
  const ptr=G&&G.missing.length?`<div class="tk-box tk-warn"><div class="tk-note">⚠️ חלש/ה ב${G.missing.map(w=>E(w.s)).join(', ')} ואין תגבור — <a href="#" onclick="tikTab('lc');return false">ללשונית מרכז למידה ←</a></div></div>`:'';
  return ptr+`<div class="tk-box"><h3>🏫 בית ספר — סמרט סקול</h3>${lim}</div>`;
}

function gapHtml(s){ const lr=typeof limFind==='function'?limFind(s.n):null;
  const may=isAdmin()||(typeof limCan==='function'&&(limCan(s.g==='אקדמיה'?'academy':s.g)||(sGrade(s)==='יב'&&limCan('yb'))));
  if(!may) return ''; if(!lr) return '<div class="tk-box"><h3>🎯 תגבורים מול מקצועות חלשים</h3><div class="tk-empty">אין נתונים מסמרט סקול לחניך/ה</div></div>';
  const G=tutorGap(s.n);
  return `<div class="tk-box ${G.missing.length?'tk-warn':''}"><h3>🎯 תגבורים מול מקצועות חלשים</h3>
    ${G.weak.length?G.weak.map(w=>`<div class="tk-f ${w.tut?'ok':'bad'}"><span>${E(w.s)} · ציון ${w.g}</span><b>${w.tut?'✓ '+E(w.tut):'⚠️ אין תגבור'}</b></div>`).join('')
      :`<div class="tk-empty">אין ציונים מתחת ל-55${G.bad?' · רמת הסיכון '+E(G.lvl||'')+' — כדאי לבדוק נוכחות והתנהגות בשיעורים':''}</div>`}
    ${G.missing.length?`<div class="tk-note">📌 כדאי לפתוח בקשת תגבור במרכז הלמידה ב${G.missing.map(w=>E(w.s)).join(', ')}. <a href="#" onclick="show('lc');return false">למרכז הלמידה ←</a></div>`:''}</div>`; }
const LDAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי'];
const RQS={pending:'ממתין לשיבוץ',assigned:'משובץ/ת',done:'התקיים',rejected:'נדחה',cancelled:'בוטל'};
function lcTab(s){
  const n=s.n, tch=id=>((LC.tch||[]).find(t=>t.id===id)||{}).name||'';
  const reqs=(LC.req||[]).filter(r=>r&&r.sid===n).sort((a,b)=>(b.created||0)-(a.created||0));
  const grps=(LC.grp||[]).filter(g=>g&&(g.sids||[]).includes(n));
  const ses=Object.entries(LC.ses||{}).filter(([k,v])=>v&&(v.students||[]).includes(n)).map(([k,v])=>{ const [w,d,h,t]=k.split('|'); const dt=new Date(w+'T12:00:00'); dt.setDate(dt.getDate()+(+d||0));
    return {iso:isNaN(dt)?'':dt.toISOString().slice(0,10),d:+d,h:+h,t,v}; }).sort((a,b)=>String(b.iso).localeCompare(String(a.iso)));
  const today=todayIso(), up=ses.filter(x=>x.iso>=today).reverse(), past=ses.filter(x=>x.iso<today);
  const att=x=>{ const a=(x.v.att||{})[n]; return a===true||a==='v'||a===1?'✓ הגיע/ה':a===false||a==='x'||a===0?'✕ לא הגיע/ה':''; };
  const sesF=x=>`<div class="tk-f"><span>${LDAYS[x.d]||''} ${fmtD(x.iso)} · ${String(x.h).padStart(2,'0')}:00</span><b>${E(x.v.subject||'')}${x.v.level?' · '+E(x.v.level)+' יח"ל':''}</b><small>${E(tch(x.t))}${att(x)?' · '+att(x):''}</small></div>`;
  return gapHtml(s)
   +`<div class="tk-box"><h3>📅 תגבורים קרובים</h3>${up.length?up.slice(0,8).map(sesF).join(''):'<div class="tk-empty">אין תגבורים מתוכננים</div>'}</div>`
   +`<div class="tk-box"><h3>👥 קבוצות קבועות</h3>${grps.length?grps.map(g=>`<div class="tk-f"><span>${LDAYS[g.d]||''} · ${String(g.h||'').padStart(2,'0')}:00</span><b>${E(g.subject||'')}${g.level?' · '+E(g.level)+' יח"ל':''}</b><small>${E(tch(g.tid))}</small></div>`).join(''):'<div class="tk-empty">לא משובץ/ת לקבוצה קבועה</div>'}</div>`
   +`<div class="tk-box"><h3>🙋 בקשות תגבור</h3>${reqs.length?reqs.map(r=>`<div class="tk-f ${r.status==='pending'?'':'ok'}"><span>${r.created?fmtD(new Date(r.created).toISOString().slice(0,10)):''}${r.exam?' · מבחן '+fmtD(r.exam):''}</span><b>${E(r.subject||'')}</b><small>${E(RQS[r.status]||r.status||'')}${r.reason?' · '+E(r.reason):''}</small></div>`).join(''):'<div class="tk-empty">אין בקשות תגבור</div>'}</div>`
   +`<div class="tk-box"><h3>🕘 תגבורים שהתקיימו</h3>${past.length?`<div class="tk-f"><span>סה"כ</span><b>${past.length}</b></div><div class="tk-f"><span>הגיע/ה</span><b>${past.filter(x=>/✓/.test(att(x))).length}</b></div>`+past.slice(0,6).map(sesF).join(''):'<div class="tk-empty">עוד לא היו תגבורים</div>'}</div>`
   +`<div class="tk-note">${canEdit()?`<a href="#" onclick="show('lc');return false">פתיחת מרכז הלמידה ←</a>`:''}</div>`;
}
function ramzorTab(s){
  const rz=(typeof RAMZOR_DATA_NEW!=='undefined'?RAMZOR_DATA_NEW:[]).find(x=>x.n===s.n);
  const RC={green:'#059669',yellow:'#eab308',orange:'#ea580c',red:'#dc2626'}, RL={green:'🟢 תקין',yellow:'🟡 מעקב',orange:'🟠 מדאיג',red:'🔴 בסכנה'};
  const M=rz&&rz.s?Object.entries(rz.s):[];
  const cur=[...M].reverse().find(([m,v])=>v&&v!=='none');
  return `<div class="tk-box"><h3>🚦 רמזור נשירה</h3>${cur?`<div class="tk-f" style="border-color:${RC[cur[1]]}"><span>המצב האחרון (${E(cur[0])})</span><b style="color:${RC[cur[1]]}">${RL[cur[1]]||cur[1]}</b></div>`:''}
    ${M.length?M.map(([m,v])=>`<div class="tk-f"><span>${E(m)}</span><b style="color:${RC[v]||'#94a3b8'}">${v&&v!=='none'?RL[v]||v:'—'}</b>${(rz.nt||{})[m]?`<small>${E(rz.nt[m])}</small>`:''}</div>`).join(''):'<div class="tk-empty">אין סימונים ברמזור</div>'}</div>
    <div class="tk-note">עריכה: ניהול קבוצה ← ${E(s.g||'')} ← רמזור נשירה.</div>`;
}
/* מערכת שעות: {ימים:[...], שעות:[[תא לכל יום]...]} או רשימת [יום, שעה, מקצוע, מורה] */
function ttHtml(TT){ if(!TT) return '<div class="tk-empty">מערכת השעות תופיע אחרי העדכון השבועי הבא מסמרט סקול</div>';
  if(Array.isArray(TT)&&TT.length&&Array.isArray(TT[0])){ const ORD=['ראשון','שני','שלישי','רביעי','חמישי','שישי']; const days=[...new Set(TT.map(r=>r[0]))].sort((a,b)=>ORD.indexOf(a)-ORD.indexOf(b)), hrs=[...new Set(TT.map(r=>r[1]))].sort((a,b)=>(+a||0)-(+b||0));
    return `<div class="tk-tblw"><table class="tk-tbl tk-tt"><tr><th>שעה</th>${days.map(d=>`<th>${E(d)}</th>`).join('')}</tr>${hrs.map(h=>`<tr><td><b>${E(h)}</b></td>${days.map(d=>{ const c=TT.filter(r=>r[0]===d&&r[1]===h); return `<td>${c.map(r=>`<b>${E(r[2])}</b>${r[3]?`<br><small>${E(r[3])}</small>`:''}${r[4]?`<br><small>חדר ${E(r[4])}</small>`:''}`).join('<hr>')}</td>`; }).join('')}</tr>`).join('')}</table></div>`; }
  return '<div class="tk-empty">מערכת השעות לא בפורמט מוכר</div>'; }
/* ═══════════ עורך רשומה (כולל הקלטה ותמלול) ═══════════ */
window.tikNew=function(t,stu,g){ if(!canEdit()) return; T.ed={id:null,t,stu:stu||'',g:g||(stuBy(stu)||{}).g||'',d:todayIso(),f:{},cat:'',sev:'1',tr:''}; edRender(); };
window.tikEdit=function(id){ const r0=T.r[id]; if(!r0) return; const r=Object.assign({id},r0); if(r.conf&&!cont(r)){ toast('🔒 אין הרשאה לתוכן החסוי'); return; }
  T.ed=Object.assign({id},JSON.parse(JSON.stringify(r0)),{f:Object.assign({},rf(r)),tr:rtr(r)}); T.ed.sev=String(r.sev||1); edRender(); };
function edRead(){ const e=T.ed, g=k=>document.getElementById('te-'+k); if(!e) return;
  ['stu','d','cat','sev','tr'].forEach(k=>{ if(g(k)) e[k]=g(k).value; });
  TYPES[e.t].f.forEach((k,i)=>{ const el=g('f'+i); if(el) e.f[k]=el.value; }); }
function edRender(){
  let m=document.getElementById('tikEd'); const e=T.ed; if(!e){ if(m) m.remove(); return; }
  if(!m){ m=document.createElement('div'); m.id='tikEd'; m.className='tik-modal'; document.body.appendChild(m); }
  const t=TYPES[e.t], sr=window.SpeechRecognition||window.webkitSpeechRecognition;
  m.innerHTML=`<div class="tk-dlg"><div class="tk-dlh"><b>${t.i} ${e.id?'עריכת ':''}${t.l}${t.priv?' <span class="tk-pill" style="--c:#7A6A66" title="גלוי רק למי שכתב, למדריך/ה של הקבוצה, לעו&quot;ס ולרכז">🔒 חסוי</span>':''}</b><button onclick="tikEdClose()">✕</button></div>
    <div class="tk-g2">${t.stu?`<label>חניך/ה<input id="te-stu" list="te-stul" value="${E(e.stu)}" placeholder="חובה — התחילו להקליד שם"><datalist id="te-stul">${students().map(s=>`<option value="${E(s.n)}">${E(s.g)}</option>`).join('')}</datalist></label>`
      :`<label>חניך/ה (לא חובה)<input id="te-stu" list="te-stul" value="${E(e.stu)}"><datalist id="te-stul">${students().map(s=>`<option value="${E(s.n)}">${E(s.g)}</option>`).join('')}</datalist></label>`}
      <label>תאריך<input type="date" id="te-d" value="${E(e.d)}"></label>
      ${t.ev?`<label>סוג האירוע<select id="te-cat">${EV_CAT.map(c=>`<option ${e.cat===c?'selected':''}>${c}</option>`).join('')}</select></label>
        <label>חומרה<select id="te-sev">${Object.entries(EV_SEV).map(([k,v])=>`<option value="${k}" ${String(e.sev)===k?'selected':''}>${v.l}</option>`).join('')}</select></label>`:''}</div>
    ${t.priv||e.t==='meetings'?`<div class="tk-recbox">
      <div class="tk-rech"><b>🎙️ הקלטה ותמלול</b>${sr?'':'<small> — התמלול עובד בכרום במחשב ובאנדרואיד. באייפון אפשר להשתמש בכפתור המיקרופון של המקלדת בתוך השדה.</small>'}</div>
      ${sr?(T.rec?`<button class="tk-btn red" onclick="tikRecStop()">⏹️ עצירת ההקלטה</button> <span class="tk-live">● מקליט… <span id="te-int"></span></span>`
        :`<label class="tk-cb"><input type="checkbox" id="te-ok"> המשתתפים יודעים שהשיחה מוקלטת ומסכימים</label><button class="tk-btn" onclick="tikRecStart()">🎙️ התחלת הקלטה</button>`):''}
      <label>תמלול<textarea id="te-tr" class="tk-tr" placeholder="התמלול יופיע כאן תוך כדי השיחה. אפשר גם להקליד או להדביק.">${E(e.tr)}</textarea></label>
      <div class="tk-acts"><button class="tk-btn2" onclick="tikClaude()">📋 העתקה ל-Claude לסיכום</button><button class="tk-btn2" onclick="tikPasteSum()">📥 הדבקת הסיכום מ-Claude</button></div>
      <div class="tk-note">השם של החניך/ה מוחלף ב"החניך/ה" לפני ההעתקה. ההקלטה עצמה לא נשמרת — רק הטקסט.</div></div>`:''}
    ${t.f.map((k,i)=>`<label>${E(k)}<textarea id="te-f${i}" rows="${i<2?3:2}">${E(e.f[k]||'')}</textarea></label>`).join('')}
    <div class="tk-dlf"><button class="tk-btn" onclick="tikSave()">שמירה</button><button class="tk-btn2" onclick="tikEdClose()">ביטול</button>
      ${e.id&&(isAdmin()||T.r[e.id]&&T.r[e.id].by===me().id)?`<button class="tk-btn2 red" onclick="tikDel('${e.id}')">🗑️ מחיקה</button>`:''}</div></div>`;
  const ta=document.getElementById('te-tr'); if(ta) ta.scrollTop=ta.scrollHeight;
}
window.tikEdClose=function(){ if(T.rec) tikRecStop(); T.ed=null; edRender(); refresh(); };
window.tikSave=function(){ edRead(); const e=T.ed, t=TYPES[e.t];
  if(e.stu&&!stuBy(e.stu)){ toast('בחרו חניך/ה מהרשימה'); return; }
  if(t.stu&&!e.stu){ toast('צריך לשייך לחניך/ה — כך זה נכנס לתיק האישי'); return; }
  if(!Object.values(e.f).some(v=>String(v).trim())&&!e.tr.trim()){ toast('מלאו לפחות שדה אחד'); return; }
  if(T.rec) tikRecStop();
  const s=stuBy(e.stu), o={t:e.t,stu:e.stu||'',g:s?s.g:(e.g||''),d:e.d||todayIso(),f:e.f,upd:Date.now()};
  if(e.tr.trim()) o.tr=e.tr.trim(); if(t.ev){ o.cat=e.cat||'אחר'; o.sev=+e.sev||1; }
  const id=e.id||uid(), old=e.id?(T.r[e.id]||{}):null; o.by=old?old.by||me().id:me().id; o.at=old?old.at||Date.now():Date.now();
  if(t.priv&&o.g){ const c={f:o.f,tr:o.tr||'',bm:(old&&old.conf&&cont(Object.assign({id},old))||{}).bm||myEmail(),at:o.at};
    if(old&&old.conf&&old.g&&old.g!==o.g) run((dbm,rdb)=>dbm.remove(dbm.ref(rdb,CONF+'/'+old.g+'/'+id)));
    run((dbm,rdb)=>dbm.set(dbm.ref(rdb,CONF+'/'+o.g+'/'+id),c)).then(ok=>{ if(!ok) return; T.mine[id]=c; delete o.f; delete o.tr; o.conf=1; put('r/'+id,o); });
  } else put('r/'+id,o);
  if(!e.id&&e.legacy) knLegacyDone(e.legacy);
  T.ed=null; edRender(); toast(`✅ נשמר${o.stu?' בתיק של '+o.stu:''}`); refresh(); };
window.tikDel=function(id){ if(!confirm('למחוק את הרשומה? אי אפשר לשחזר.')) return; const r=T.r[id];
  if(r&&r.conf&&r.g) run((dbm,rdb)=>dbm.remove(dbm.ref(rdb,CONF+'/'+r.g+'/'+id))); put('r/'+id,null); T.ed=null; edRender(); };
window.tikView=function(id){ const r0=T.r[id]; if(!r0||!canSee(Object.assign({id},r0))) return; const t=TYPES[r0.t]; const r=Object.assign({},r0,{f:rf(Object.assign({id},r0)),tr:rtr(Object.assign({id},r0))});
  let m=document.getElementById('tikEd'); if(!m){ m=document.createElement('div'); m.id='tikEd'; m.className='tik-modal'; document.body.appendChild(m); }
  m.innerHTML=`<div class="tk-dlg"><div class="tk-dlh"><b>${t.i} ${t.l}${r.stu?' — '+E(r.stu):''}</b><button onclick="document.getElementById('tikEd').remove()">✕</button></div>
    <div class="tk-sub">${fmtD(r.d)} · ${E(uName(r.by))}${r.cat?' · '+E(r.cat):''}${r.t==='events'&&EV_SEV[r.sev]?' · '+EV_SEV[r.sev].l:''}</div>
    ${t.f.map(k=>r.f&&r.f[k]?`<div class="tk-fv"><small>${E(k)}</small><div>${E(r.f[k]).replace(/\n/g,'<br>')}</div></div>`:'').join('')}
    ${r.tr?`<details class="tk-trd"><summary>🎙️ התמלול המלא</summary><div>${E(r.tr).replace(/\n/g,'<br>')}</div></details>`:''}
    <div class="tk-dlf">${canEdit()?`<button class="tk-btn" onclick="tikEdit('${id}')">✏️ עריכה</button>`:''}<button class="tk-btn2" onclick="tikDoc('${r.t}','${id}')">📄 מסמך להדפסה / PDF</button>
      <button class="tk-btn2" onclick="tikDoc('${r.t}','${id}','word')">⬇️ Word</button>${myFmts(r.t).map(f=>`<button class="tk-btn2" onclick="tikFill('${f.id}','${id}')">📎 ${E(f.name)}</button>`).join('')}</div></div>`; };

/* ---- הקלטה ותמלול חינמי של הדפדפן (כרום / אנדרואיד) ---- */
let SR=null;
window.tikRecStart=function(){ edRead(); const ok=document.getElementById('te-ok'); if(ok&&!ok.checked){ toast('קודם מסמנים שהמשתתפים יודעים ומסכימים להקלטה'); return; }
  const C=window.SpeechRecognition||window.webkitSpeechRecognition; if(!C) return;
  SR=new C(); SR.lang='he-IL'; SR.continuous=true; SR.interimResults=true; T.rec=true;
  SR.onresult=ev=>{ let fin='', intr=''; for(let i=ev.resultIndex;i<ev.results.length;i++){ const x=ev.results[i]; if(x.isFinal) fin+=x[0].transcript; else intr+=x[0].transcript; }
    const ta=document.getElementById('te-tr'); if(fin&&ta){ ta.value=(ta.value?ta.value.replace(/\s+$/,'')+' ':'')+fin.trim(); T.ed.tr=ta.value; ta.scrollTop=ta.scrollHeight; }
    const it=document.getElementById('te-int'); if(it) it.textContent=intr.slice(-80); };
  SR.onerror=e=>{ if(e.error==='not-allowed'){ toast('הדפדפן לא קיבל אישור למיקרופון'); T.rec=false; SR=null; edRead(); edRender(); } };
  SR.onend=()=>{ if(T.rec&&SR){ try{ SR.start(); }catch(e){} } };
  try{ SR.start(); }catch(e){ T.rec=false; toast('לא ניתן להתחיל הקלטה'); } edRender(); };
window.tikRecStop=function(){ edRead(); T.rec=false; if(SR){ try{ SR.onend=null; SR.stop(); }catch(e){} SR=null; } if(T.ed) edRender(); };

/* ---- סיכום עם Claude: העתקה (בלי שם החניך/ה) והדבקה חזרה לשדות ---- */
function anon(txt,n){ let o=String(txt||''); String(n||'').split(/\s+/).filter(w=>w.length>1).concat(n?[n]:[]).sort((a,b)=>b.length-a.length).forEach(w=>{ o=o.split(w).join('החניך/ה'); }); return o; }
window.tikClaude=function(){ edRead(); const e=T.ed, t=TYPES[e.t]; if(!e.tr.trim()){ toast('אין עדיין תמלול להעתקה'); return; }
  const p=`אני איש צוות חינוכי בפנימייה (שכבה בוגרת, תיכון). לפניך תמלול של ${t.l}.\nסכם אותו בעברית פשוטה ועניינית, בלי להמציא פרטים שלא נאמרו, לפי השדות הבאים בדיוק.\nכתוב כל שדה בשורה נפרדת שמתחילה בשם השדה ואחריו נקודתיים:\n${t.f.map(k=>k+':').join('\n')}\n\nהתמלול:\n"""\n${anon(e.tr,e.stu)}\n"""`;
  navigator.clipboard.writeText(p).then(()=>{ toast('📋 הועתק. הדביקו ב-Claude, ואחר כך העתיקו את התשובה ולחצו "הדבקת הסיכום"'); window.open('https://claude.ai/new','_blank','noopener'); },()=>prompt('העתיקו:',p)); };
window.tikPasteSum=async function(){ edRead(); let txt=''; try{ txt=await navigator.clipboard.readText(); }catch(e){}
  if(!txt||!/:/.test(txt)) txt=prompt('הדביקו כאן את הסיכום מ-Claude:')||''; if(!txt) return;
  const e=T.ed, F=TYPES[e.t].f, out={}; let cur=null;
  txt.replace(/\*\*/g,'').split(/\r?\n/).forEach(line=>{ const L=line.replace(/^[\s#\-•*]+/,''); const k=F.find(f=>L.startsWith(f+':')||L.startsWith(f+' :'));
    if(k){ cur=k; out[k]=L.slice(L.indexOf(':')+1).trim(); } else if(cur&&L.trim()) out[cur]+=(out[cur]?'\n':'')+L.trim(); });
  if(!Object.keys(out).length){ toast('לא זוהו שדות בסיכום — הדביקו ידנית בשדות'); return; }
  const n=e.stu; F.forEach(k=>{ if(out[k]) e.f[k]=n?out[k].split('החניך/ה').join(n.split(' ')[0]):out[k]; }); edRender(); toast('✅ הסיכום הוכנס לשדות — בדקו ושמרו'); };

/* ═══════════ פורמטים ומסמכים ═══════════ */
const LOGO='docs/guides/atid-logo.jpg';
function fmtPanel(types){ return `<details class="tk-fmtd"><summary>📄 פורמטים ומסמכים</summary><div class="tk-note">פורמט ריק להדפסה, או פורמט Word משלכם שהפורטל ממלא בכל רשומה (בתוך הרשומה: כפתור 📎).</div>
  ${types.map(t=>`<div class="tk-fmtr"><b>${TYPES[t].i} ${TYPES[t].l}</b>${fmtBtns(t)}</div>`).join('')}</details>`; }
function fmtBtns(t){ const F=myFmts(t);
  return `<span class="tk-fmts"><button class="tk-btn2 sm" onclick="tikDoc('${t}')">🖨️ פורמט ריק</button><button class="tk-btn2 sm" onclick="tikDoc('${t}',null,'word')">⬇️ Word ריק</button>
    ${canEdit()?`<button class="tk-btn2 sm" onclick="tikFmtUp('${t}')" title="קובץ Word משלכם עם תגיות שהפורטל ממלא">📎 צירוף פורמט משלי</button>`:''}
    ${F.length?F.map(f=>`<span class="tk-fchip">📎 ${E(f.name)}${(isAdmin()||f.by===(me()||{}).id)?` <a href="#" onclick="tikFmtDel('${f.id}');return false" title="הסרה">✕</a>`:''}</span>`).join(''):''}</span>`; }
const myFmts=t=>Object.entries(T.fmt||{}).filter(([id,f])=>f&&f.t===t).map(([id,f])=>Object.assign({id},f));
function docHtml(t,r){ const ty=TYPES[t], s=r&&stuBy(r.stu);
  const fld=k=>r?E((r.f||{})[k]||'').replace(/\n/g,'<br>'):'';
  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${ty.l}${r&&r.stu?' — '+E(r.stu):''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@700;800&family=Assistant:wght@400;600&display=swap" rel="stylesheet">
  <style>@page{size:A4;margin:13mm}body{font:14px/1.6 Assistant,Arial,sans-serif;color:#222;margin:0 auto;max-width:760px;padding:18px}
  header{display:flex;align-items:center;border-bottom:3px solid #FC5028;padding-bottom:8px;margin-bottom:12px}header div{flex:1}
  .k{font-size:12px;color:#7A6A66}h1{font:800 24px Heebo,Arial;color:#8E033C;margin:2px 0}.s{color:#FC5028;font:700 14px Heebo,Arial}
  img{height:48px}table{width:100%;border-collapse:collapse;margin-bottom:10px}td{border:1px solid #F3C2B0;padding:7px 10px;vertical-align:top}
  td.l{background:#FFF1EB;color:#8E033C;font-weight:700;width:30%;font-family:Heebo,Arial}td.v{min-height:${r?'0':'60px'};height:${r?'auto':'64px'}}
  .sig{display:flex;gap:30px;margin-top:26px}.sig div{flex:1;border-top:1px solid #999;padding-top:4px;font-size:12px;color:#7A6A66}
  .pb{position:fixed;top:10px;left:10px}@media print{.pb{display:none}}</style></head><body>
  <button class="pb" onclick="print()">🖨️ הדפסה / שמירה כ-PDF</button>
  <header><div><div class="k">שכבה בוגרת · עתיד מבואות ים</div><h1>${ty.l}</h1><div class="s">${r&&r.stu?E(r.stu)+(s?' · '+E(s.g):''):'פורמט למילוי'}</div></div><img src="${location.origin+location.pathname.replace(/[^/]*$/,'')+LOGO}" alt=""></header>
  <table><tr><td class="l">תאריך</td><td>${r?fmtD(r.d):''}</td></tr>${ty.stu?`<tr><td class="l">חניך/ה</td><td>${r?E(r.stu):''}</td></tr>`:''}
  <tr><td class="l">${t==='weekly'||t==='meetings'?'נכתב ע"י':'איש/אשת הצוות'}</td><td>${r?E(uName(r.by)):''}</td></tr>
  ${ty.ev?`<tr><td class="l">סוג האירוע</td><td>${r?E(r.cat):''}</td></tr><tr><td class="l">חומרה</td><td>${r&&EV_SEV[r.sev]?EV_SEV[r.sev].l:''}</td></tr>`:''}
  ${ty.f.map(k=>`<tr><td class="l">${E(k)}</td><td class="v">${fld(k)}</td></tr>`).join('')}</table>
  ${t==='contracts'?'<div class="sig"><div>חתימת החניך/ה</div><div>חתימת המדריך/ה</div><div>חתימת הרכז</div></div>':''}</body></html>`; }
window.tikDoc=function(t,id,mode){ let r=id?Object.assign({id},T.r[id]):null; if(r) r.f=rf(r); const h=docHtml(t,r);
  if(mode==='word'){ const b=new Blob(['﻿'+h],{type:'application/msword'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`${TYPES[t].l}${r&&r.stu?' - '+r.stu:''}.doc`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); return; }
  const w=window.open('','_blank'); if(!w){ toast('הדפדפן חסם חלון חדש — אפשרו חלונות קופצים'); return; } w.document.open(); w.document.write(h); w.document.close(); };
/* פורמט משלי: קובץ Word (‎.docx) עם תגיות בסוגריים מסולסלים */
const tagOf=k=>k.replace(/[\/()'"״׳]/g,'').trim().replace(/\s+/g,'_');
const tagHelp=t=>['שם_החניך','קבוצה','תאריך','כותב'].concat(TYPES[t].ev?['סוג_האירוע','חומרה']:[]).concat(TYPES[t].f.map(tagOf)).map(x=>'{'+x+'}').join('  ');
window.tikFmtUp=function(t){ if(!confirm(`צירוף פורמט משלי ל"${TYPES[t].l}":\n\nמכינים קובץ Word (‎.docx) בעיצוב שלכם, וכותבים בו את התגיות האלה במקום שבו צריך להופיע המידע:\n\n${tagHelp(t)}\n\nלהמשיך לבחירת הקובץ?`)) return;
  const i=document.createElement('input'); i.type='file'; i.accept='.docx'; i.onchange=()=>{ const f=i.files[0]; if(!f) return; if(f.size>900000){ toast('הקובץ גדול מדי (עד 900KB)'); return; }
    const fr=new FileReader(); fr.onload=()=>{ const b64=String(fr.result).split(',')[1]; const name=(prompt('שם לפורמט:',f.name.replace(/\.docx$/i,''))||f.name).slice(0,40);
      put('fmt/'+uid(),{t,name,by:me().id,at:Date.now(),b64}).then(ok=>ok&&toast('📎 הפורמט נשמר. בכל רשומה מסוג זה יופיע כפתור להפקה בו')); }; fr.readAsDataURL(f); }; i.click(); };
window.tikFmtDel=function(id){ if(confirm('להסיר את הפורמט?')) put('fmt/'+id,null); };
let LIBS=null; function loadLibs(){ if(LIBS) return LIBS; const ld=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
  LIBS=ld('https://cdn.jsdelivr.net/npm/pizzip@3.1.7/dist/pizzip.min.js').then(()=>ld('https://cdn.jsdelivr.net/npm/docxtemplater@3.47.1/build/docxtemplater.js')); LIBS.catch(()=>{ LIBS=null; }); return LIBS; }
window.tikFill=async function(fid,id){ const f=T.fmt[fid], r0=T.r[id]; if(!f||!r0) return; const r=Object.assign({},r0,{f:rf(Object.assign({id},r0))});
  try{ await loadLibs(); const bin=atob(f.b64); const zip=new PizZip(bin);
    const d=new window.docxtemplater(zip,{paragraphLoop:true,linebreaks:true,nullGetter:()=>''});
    const s=stuBy(r.stu)||{}, data={'שם_החניך':r.stu||'','קבוצה':s.g||'','תאריך':fmtD(r.d),'כותב':uName(r.by),'סוג_האירוע':r.cat||'','חומרה':EV_SEV[r.sev]?EV_SEV[r.sev].l:''};
    TYPES[r.t].f.forEach(k=>data[tagOf(k)]=(r.f||{})[k]||''); d.render(data);
    const blob=d.getZip().generate({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${f.name}${r.stu?' - '+r.stu:''}.docx`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){ console.warn(e); toast('⚠️ לא הצלחתי למלא את הפורמט — בדקו שהתגיות כתובות נכון'); } };

/* ═══════════ ריכוז קבוצתי (ניהול קבוצה ← סיכומי פגישות) ═══════════
   scope = שם קבוצה / 'yb' / 'acad' ; כל סוג מציג את הרשומות של חניכי הקבוצה + רשומות ישנות שעוד לא שויכו */
const GT={meetings:'meetings',contracts:'contracts',weekly:'weekly',personal_talks:'personal',events:'events'};
function scopeStu(scope){ const S=students(); if(scope==='yb') return S.filter(s=>sGrade(s)==='יב'); if(scope==='acad') return S.filter(s=>s.g==='אקדמיה'); return S.filter(s=>s.g===scope); }
function grpHtml(scope,kt){
  const t=GT[kt]||kt, ty=TYPES[t]; if(!ty) return '';
  const names=new Set(scopeStu(scope).map(s=>s.n)), types=t==='personal'?['personal','discipline','parents']:[t];
  const L=sortD(recs().filter(r=>types.includes(r.t)&&((r.stu&&names.has(r.stu))||(!r.stu&&r.g===scope))));
  const legacy=(typeof knGet==='function'?knGet(scope,kt):[]);
  let extra='';
  if(t==='events'&&L.length){ const per={}; L.forEach(r=>{ per[r.stu]=per[r.stu]||[]; per[r.stu].push(r); });
    extra=`<div class="tk-box"><h3>📊 מונה אירועים לפי חניך/ה</h3><div class="tk-tblw"><table class="tk-tbl"><tr><th>חניך/ה</th><th>סה"כ</th><th>חמורים</th><th>הנפוץ ביותר</th></tr>
      ${Object.entries(per).sort((a,b)=>b[1].length-a[1].length).map(([n,a])=>`<tr><td><a href="#" onclick="tikOpen('${jq(n)}','events');return false">${E(n)}</a></td><td><b>${a.length}</b></td><td>${a.filter(r=>+r.sev===3).length||''}</td><td>${E((evCounts(a)[0]||[''])[0])}</td></tr>`).join('')}</table></div></div>`; }
  return `<div class="tk-acts">${canEdit()?types.map(x=>`<button class="tk-btn" onclick="tikNew('${x}','',${JSON.stringify(scope).replace(/"/g,'&quot;')})">➕ ${TYPES[x].l}</button>`).join(''):''}</div>${fmtPanel(types)}
    ${ty.stu?'<div class="tk-note">כל רשומה משויכת לחניך/ה ונשמרת גם בתיק האישי שלו/ה (לשונית חניכים).</div>':''}${extra}
    ${L.map(r=>`<div class="tk-wr">${r.stu?`<a class="tk-who" href="#" onclick="tikOpen('${jq(r.stu)}');return false">🧑‍🎓 ${E(r.stu)}</a>`:''}${recLine(r)}</div>`).join('')||'<div class="tk-empty">אין עדיין רשומות</div>'}
    ${legacy.length?`<div class="tk-box tk-leg"><h3>🗂️ רשומות ישנות שעוד לא שויכו (${legacy.length})</h3><div class="tk-note">נכתבו לפני התיק האישי. ${ty.stu?'לחצו "שיוך לחניך/ה" כדי להעביר לתיק.':''}</div>
      ${legacy.map((it,i)=>`<div class="tk-ev"><div class="tk-evh"><b>${E(it.title)}</b><small>${E(it.date)}</small></div><div>${E(it.content)}</div>
        ${canEdit()&&ty.stu?`<button class="tk-btn2 sm" onclick="tikLegacy('${jq(scope)}','${kt}',${i})">↪ שיוך לחניך/ה</button>`:''}</div>`).join('')}</div>`:''}`;
}
window.tikGrpHtml=grpHtml;
window.tikLegacy=function(scope,kt,i){ const it=(knGet(scope,kt)||[])[i]; if(!it) return; const t=GT[kt]; tikNew(t,'',scope);
  T.ed.f[TYPES[t].f[0]]=it.title||''; T.ed.f[TYPES[t].f[1]]=it.content||''; T.ed.legacy={scope,kt,i,title:it.title}; edRender(); };
function knLegacyDone(l){ const a=knGet(l.scope,l.kt); const j=a.findIndex((x,ix)=>ix===l.i&&x.title===l.title); if(j>=0){ a.splice(j,1); knSet(l.scope,l.kt,a); } }

/* ═══════════ חיבור לפורטל ═══════════ */
function render(){ const el=document.getElementById('tikBody'); if(!el||!me()) return; el.innerHTML=T.stu?fileView():listView(); }
window.tikRender=render;
window.tikMount=function(){ if(!me()||me().lcOnly) return;
  if(!document.getElementById('sec-tik')){ const s=document.createElement('div'); s.className='sec'; s.id='sec-tik'; s.innerHTML='<div id="tikBody"></div>'; document.getElementById('mainContent').appendChild(s); }
  start(); };
const prevShow=window.show; window.show=function(id){ prevShow&&prevShow(id); if(id==='tik') render(); };
/* לחיצה על שם חניך/ה בכל מקום בפורטל פותחת את התיק האישי */
window.showStudentDetails=function(idx){ const s=students()[idx]; if(s) tikOpen(s.n); };

const css=document.createElement('style'); css.textContent=`
#tikToast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(30px);background:#0f1e2e;color:#fff;padding:11px 18px;border-radius:12px;font:600 14px Heebo,sans-serif;opacity:0;pointer-events:none;transition:.25s;z-index:9999;max-width:90vw}#tikToast.on{opacity:1;transform:translateX(-50%)}
.tk-bar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}.tk-bar input,.tk-bar select{border:1px solid #F3C2B0;border-radius:10px;padding:9px 12px;font:15px Assistant,Heebo,sans-serif;background:#fff}.tk-q{flex:1;min-width:180px}
.tk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.tk-card{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #F3C2B0;border-right:5px solid var(--g);border-radius:14px;padding:10px 12px;cursor:pointer;transition:box-shadow .15s}
.tk-card:hover{box-shadow:0 4px 14px rgba(142,3,60,.12)}.tk-card b{display:block;font:700 15px Heebo,sans-serif}.tk-card small{display:block;color:#7A6A66;font-size:12.5px}
.tk-tags{display:flex;flex-direction:column;gap:2px;font-size:12px;align-items:flex-end}
.tk-empty{color:#8496ab;padding:14px;font-size:14px}.tk-note{font-size:12.5px;color:#7A6A66;margin:6px 0}
.tk-head{background:linear-gradient(115deg,color-mix(in srgb,var(--g) 14%,#fff),#fff);border:1px solid #F3C2B0;border-right:6px solid var(--g);border-radius:16px;padding:12px 16px;margin-bottom:10px}
.tk-back{border:none;background:none;color:#8E033C;font:700 14px Heebo,sans-serif;cursor:pointer;padding:0;margin-bottom:6px}
.tk-hm{display:flex;align-items:center;gap:14px}.tk-hm h2{margin:0;font:800 24px Heebo,sans-serif;color:#0f1e2e}.tk-sub{color:#7A6A66;font-size:14px}
.tk-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:12px;scrollbar-width:thin}
.tk-tabs button{flex:none;border:1px solid #F3C2B0;background:#fff;border-radius:999px;padding:8px 14px;font:700 14px Heebo,sans-serif;color:#7A6A66;cursor:pointer;white-space:nowrap}
.tk-tabs button.on{background:#FC5028;border-color:#FC5028;color:#fff}.tk-tabs button span{background:#FFF1EB;color:#8E033C;border-radius:999px;padding:0 7px;font-size:12px}
.tk-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}
.tk-box{background:#fff;border:1px solid #F3C2B0;border-radius:14px;padding:12px 14px;margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;align-content:start}
.tk-box>*:not(.tk-f){grid-column:1/-1}.tk-box h3{margin:0 0 2px;font:800 16px Heebo,sans-serif;color:#8E033C}
.tk-f{background:#FBF6F3;border:1px solid #F6DDD3;border-radius:11px;padding:8px 11px;display:flex;flex-direction:column;gap:2px;min-width:0}
.tk-f>span{font-size:12px;color:#7A6A66;font-weight:600}.tk-f>b{font:700 15px Heebo,sans-serif;color:#0f1e2e;overflow-wrap:anywhere}.tk-f>small{font-size:12px;color:#7A6A66}
.tk-f a{color:#0369a1;text-decoration:none}.tk-f.ok{background:#ecfdf5;border-color:#bbf7d0}.tk-f.ok>b{color:#047857}.tk-f.bad{background:#fff1f1;border-color:#fecaca}.tk-f.bad>b{color:#b91c1c}
.tk-warn{border:2px solid #fca5a5}.tk-mut{color:#a8a29e!important;font-weight:400}.tk-wide{grid-column:1/-1}
.tk-chip{border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:999px;padding:7px 13px;font:700 13.5px Heebo,sans-serif;cursor:pointer}.tk-chip.on{background:#b91c1c;color:#fff}
.tk-row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid #FFF1EB;font-size:14px}.tk-row span{color:#7A6A66}.tk-row b{text-align:left;font-weight:600}
.tk-row a{color:#0369a1;text-decoration:none}
.tk-quick,.tk-acts{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px;align-items:center}
.tk-quick button{border:1px solid #F3C2B0;background:#FFF1EB;color:#8E033C;border-radius:10px;padding:7px 12px;font:700 13.5px Heebo,sans-serif;cursor:pointer}
.tk-btn{background:#FC5028;color:#fff;border:none;border-radius:10px;padding:8px 15px;font:800 14px Heebo,sans-serif;cursor:pointer}
.tk-btn.red{background:#b91c1c}.tk-btn2{background:#fff;color:#8E033C;border:1px solid #F3C2B0;border-radius:10px;padding:7px 13px;font:700 13.5px Heebo,sans-serif;cursor:pointer}.tk-btn2.red{color:#b91c1c}
.tk-btn2.sm{padding:5px 10px;font-size:12.5px}.tk-fmts{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}
.tk-fchip{font-size:12.5px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:999px;padding:3px 10px}.tk-fchip a{color:#b91c1c;text-decoration:none}
.tk-tl{display:flex;flex-direction:column;gap:7px;border-right:3px solid #F3C2B0;padding-right:10px}
.tk-ev{background:#fff;border:1px solid #F3C2B0;border-radius:12px;padding:9px 12px;font-size:14px;line-height:1.5;cursor:pointer;margin-bottom:7px}.tk-tl .tk-ev{margin:0}
.tk-ev:hover{box-shadow:0 3px 10px rgba(142,3,60,.1)}.tk-ev.al{background:#fff1f1;border-color:#fecaca}.tk-evt{border-style:dashed}
.tk-evh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px}.tk-evh small{color:#8496ab;margin-inline-start:auto}.tk-ev small{color:#7A6A66}
.tk-lock{color:#8496ab;font-size:13px}
.tk-pill{font-size:12px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 10%,#fff);border:1px solid color-mix(in srgb,var(--c) 35%,#fff);border-radius:999px;padding:1px 9px;white-space:nowrap}
.tk-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px}
.tk-tile{background:#fff;border:1px solid #F3C2B0;border-top:4px solid var(--c,#8E033C);border-radius:12px;padding:9px;text-align:center}.tk-tile b{display:block;font:800 24px Heebo,sans-serif;color:var(--c,#8E033C)}.tk-tile small{color:#7A6A66}
.tk-cnt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.tk-cnt span{background:#fff;border:1px solid #F3C2B0;border-radius:999px;padding:3px 11px;font-size:13px}
.tk-tblw{overflow-x:auto}.tk-tbl{width:100%;border-collapse:collapse;font-size:14px}.tk-tbl th{background:#8E033C;color:#fff;padding:7px;text-align:right;font:700 13px Heebo,sans-serif}.tk-tbl td{padding:6px 8px;border-bottom:1px solid #FFF1EB}.tk-tbl a{color:#0f1e2e}
.tk-wr{position:relative}.tk-who{display:inline-block;font:700 13px Heebo,sans-serif;color:#0e7490;text-decoration:none;margin:2px 4px 3px}
.tk-leg{background:#FBF6F3}
.tk-lvl{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.tk-lvl small{color:#8496ab}
.tk-tt td,.tk-tt th{text-align:center;font-size:12.5px;min-width:86px;vertical-align:top;line-height:1.35}.tk-tt td b{font-weight:700}.tk-tt hr{border:0;border-top:1px dashed #F3C2B0;margin:4px 0}.tk-tt td small{color:#7A6A66}
.tk-fmtd{background:#fff;border:1px solid #F3C2B0;border-radius:12px;padding:7px 12px;margin-bottom:10px}.tk-fmtd summary{cursor:pointer;font:700 14px Heebo,sans-serif;color:#8E033C}
.tk-fmtr{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 0;border-top:1px solid #FFF1EB}.tk-fmtr>b{font:700 13.5px Heebo,sans-serif;min-width:120px}
.tik-modal{position:fixed;inset:0;background:rgba(15,30,46,.45);z-index:9100;display:flex;align-items:flex-start;justify-content:center;padding:30px 10px;overflow:auto}
.tk-dlg{background:#fff;border-radius:16px;padding:16px 18px;width:min(680px,100%);display:flex;flex-direction:column;gap:9px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.tk-dlg label{display:flex;flex-direction:column;gap:4px;font:700 13px Heebo,sans-serif;color:#7A6A66}
.tk-dlg input,.tk-dlg select,.tk-dlg textarea{border:1px solid #F3C2B0;border-radius:9px;padding:8px 10px;font:15px Assistant,Heebo,sans-serif;background:#fff;width:100%;box-sizing:border-box;color:#222}
.tk-dlg textarea{resize:vertical}.tk-dlh{display:flex;align-items:center;gap:10px}.tk-dlh b{flex:1;font:800 19px Heebo,sans-serif;color:#8E033C}.tk-dlh button{border:none;background:none;font-size:18px;cursor:pointer;opacity:.6}
.tk-dlf{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px}.tk-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}
.tk-recbox{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px}.tk-rech small{color:#52637a;font-weight:400}
.tk-tr{min-height:110px;max-height:260px}.tk-live{color:#b91c1c;font-weight:800;font-size:13.5px}.tk-live span{color:#52637a;font-weight:400}
.tk-cb{flex-direction:row!important;align-items:center;font-weight:600!important}.tk-cb input{width:auto!important}
.tk-fv{border-bottom:1px solid #FFF1EB;padding:6px 0}.tk-fv small{color:#8E033C;font:700 12.5px Heebo,sans-serif}.tk-trd summary{cursor:pointer;font-weight:700;color:#52637a}.tk-trd div{font-size:13.5px;color:#334;max-height:260px;overflow:auto;margin-top:6px}
@media (max-width:640px){.tk-hm h2{font-size:20px}.tk-dlg{padding:12px}.tik-modal{padding:12px 6px}.tk-grid{grid-template-columns:1fr}}
`; document.head.appendChild(css);
})();
