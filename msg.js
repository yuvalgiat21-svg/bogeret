/* ═══════════════════════════════════════════════════════════════════════
   מסרים ומשימות — מערכת תקשורת פנימית לצוות בוגרת (במקום וואטסאפ)
   • משימות: אחראי/ם, תחום אחריות, תאריך יעד, דחיפות, קישור לחניך/ה, סטטוס, הערות
   • הודעות: קהל יעד, דחוף, אישור קריאה ("קראתי") ומעקב מי אישר ומי לא, תגובות
   • מעקב (רכז): עומס לפי איש צוות, משימות באיחור, הודעות שלא אושרו
   נשמר באזור המוגן: portal/bogeret/secure/msg/{tasks,posts}/<id> — כל פריט בצומת משלו,
   כך ששני אנשי צוות שעובדים במקביל לא דורסים זה את זה. מתעדכן חי אצל כולם.
   משתמש ב: ME, USERS, STUDENTS_DATA, ACAD_STUDENTS, secureDb, showStudentDetails (מ-index.html)
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
const MSG_PATH='portal/bogeret/secure/msg';
const AREAS=['רווחה ורמזור','לימודים','נוכחות','משפחות','בריאות','פעילות וחוגים','לוגיסטיקה ומבנה','מנהלה','אחר'];
const PRI={low:{l:'רגיל',c:'#7A6A66'},high:{l:'חשוב',c:'#b45309'},urgent:{l:'דחוף',c:'#b91c1c'}};
const STS={open:{l:'פתוחה',c:'#8496ab'},doing:{l:'בעבודה',c:'#c2410c'},done:{l:'הושלמה',c:'#047857'}};
const AUD={all:'כל הצוות',ya:"צוות י\"א",yb:"צוות י\"ב",academy:'צוות האקדמיה',pick:'אנשים מסוימים'};
const M={tasks:{},posts:{},ok:false,err:'',view:'mine',f:{st:'active',who:'',area:'',q:''},open:null,form:null,started:false,notified:{}};
window.MSG=M;
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const me=()=>(typeof ME!=='undefined'&&ME)||null;
const isAdmin=()=>!!(me()&&me().mode==='admin');
const canTask=()=>!!(me()&&(me().mode==='admin'||me().mode==='edit'));
const staff=()=>(typeof USERS!=='undefined'?USERS:[]);
const uName=id=>{ const u=staff().find(x=>x.id===id); return u?u.n:id; };
const uRole=id=>{ const u=staff().find(x=>x.id===id); return u?u.r:''; };
const pad=n=>String(n).padStart(2,'0');
const todayIso=()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const dayDiff=iso=>Math.round((new Date(iso+'T12:00:00')-new Date(todayIso()+'T12:00:00'))/864e5);
const fmtDue=iso=>{ if(!iso) return ''; const n=dayDiff(iso), [y,m,d]=iso.split('-');
  if(n<0) return `באיחור ${-n===1?'יום':-n+' ימים'}`; if(n===0) return 'היום'; if(n===1) return 'מחר'; return `עד ${+d}.${+m}`; };
const fmtAt=ts=>{ if(!ts) return ''; const d=new Date(ts), n=Math.round((new Date(todayIso()+'T12:00:00')-new Date(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T12:00:00'))/864e5);
  const hm=pad(d.getHours())+':'+pad(d.getMinutes()); return n===0?'היום '+hm:n===1?'אתמול '+hm:`${d.getDate()}.${d.getMonth()+1} ${hm}`; };
const students=()=>(typeof STUDENTS_DATA!=='undefined'?STUDENTS_DATA:[]).concat(typeof ACAD_STUDENTS!=='undefined'?ACAD_STUDENTS:[]);
const stuIdx=name=>students().findIndex(s=>s.n===name);
const list=o=>Object.entries(o||{}).filter(([id,v])=>v&&typeof v==='object'&&(v.t||v.body||v.title||v.x)).map(([id,v])=>Object.assign({id},v));
const isLate=t=>t.st!=='done'&&t.due&&dayDiff(t.due)<0;
const mineT=t=>(t.who||[]).includes(me()&&me().id);
function inAud(p,u){ u=u||me(); if(!u) return false; if(p.by===u.id) return true;
  if(Array.isArray(p.to)) return p.to.includes(u.id);
  if(!p.to||p.to==='all') return true;
  return u.scope==='all'||u.mode==='admin'||u.scope===p.to; }
function audUsers(p){ return staff().filter(u=>u.id!==p.by&&inAud(p,u)); }
const needAck=p=>p.ack!==false&&inAud(p)&&p.by!==(me()&&me().id)&&!(p.acks&&p.acks[me().id]);

/* ---------- ענן ---------- */
let DB=null;
async function db(){ if(!DB) DB=await secureDb(); return DB; }
/* החיבור לענן נופל לפעמים זמן קצר אחרי הכניסה. כל שמירה מנסה שוב פעם אחת עם חיבור טרי לפני שמודיעה על כישלון */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(op,fail){
  for(let i=0;i<2;i++){
    try{ const {dbm,rdb}=await db(); await op(dbm,rdb); return true; }
    catch(e){ console.warn('msg',e); DB=null; if(i===0){ await sleep(1200); continue; }
      msgToast((fail||'⚠️ השמירה נכשלה')+' — '+(String(e&&e.code||'').includes('PERMISSION')?'אין הרשאה':'בדקו חיבור ונסו שוב')); restartListen(); return false; }
  }
}
const put=(path,val)=>run((dbm,rdb)=>dbm.set(dbm.ref(rdb,MSG_PATH+'/'+path),val));
const patch=(path,val)=>run((dbm,rdb)=>dbm.update(dbm.ref(rdb,MSG_PATH+'/'+path),val));
const del=path=>run((dbm,rdb)=>dbm.remove(dbm.ref(rdb,MSG_PATH+'/'+path)),'⚠️ המחיקה נכשלה');
let UNSUB=null, RETRY=0;
function restartListen(){ if(UNSUB){ try{ UNSUB(); }catch(e){} UNSUB=null; } M.started=false; setTimeout(msgStart,1500); }
async function msgStart(){
  if(M.started||!me()) return; M.started=true;
  try{ const {dbm,rdb}=await db();
    UNSUB=dbm.onValue(dbm.ref(rdb,MSG_PATH),snap=>{ const v=snap.val()||{}; const prev=M.ok; M.tasks=v.tasks||{}; M.posts=v.posts||{}; M.ok=true; M.err=''; RETRY=0;
      if(prev) notifyNew(); else markKnown(); badge(); if(active()) softRender(); },
      e=>{ console.warn('msg listen',e); DB=null; UNSUB=null; M.started=false;
        /* ההאזנה נותקה (בדרך כלל בגלל ניתוק רגעי של הכניסה) — מתחברים מחדש לבד */
        if(++RETRY<=6) setTimeout(msgStart,2000*RETRY); else { M.err='החיבור לנתוני ה-CRM נותק. רעננו את הדף.'; if(active()) msgRender(); } });
  }catch(e){ DB=null; M.started=false; if(++RETRY<=6) setTimeout(msgStart,2000*RETRY); else { M.err='לא ניתן להתחבר לענן. נסו לרענן.'; if(active()) msgRender(); } }
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&!M.started&&me()){ RETRY=0; msgStart(); } });
/* עדכון חי בלי למחוק טקסט שמישהו באמצע להקליד */
let PEND=false;
function softRender(){ const ae=document.activeElement, sec=document.getElementById('sec-msg');
  if(M.form||(ae&&sec&&sec.contains(ae)&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)&&(ae.value||ae.tagName==='SELECT'))){ PEND=true; return; }
  PEND=false; msgRender(); }
document.addEventListener('focusout',()=>setTimeout(()=>{ if(PEND&&active()) softRender(); },150));
const active=()=>{ const s=document.getElementById('sec-msg'); return s&&s.classList.contains('active'); };

/* ---------- התראות: מונה על הלשונית + התראת דפדפן כשהפורטל פתוח ---------- */
function myCount(){ if(!me()) return 0;
  return list(M.posts).filter(needAck).length + list(M.tasks).filter(t=>mineT(t)&&t.st!=='done'&&(!t.seen||!t.seen[me().id]||isLate(t))).length; }
function badge(){ const b=document.getElementById('tab-msg'); if(!b) return; let s=b.querySelector('.msg-badge'); const n=myCount();
  if(!s){ s=document.createElement('span'); s.className='msg-badge'; b.appendChild(s); } s.textContent=n; s.style.display=n?'':'none';
  document.title=(n?`(${n}) `:'')+document.title.replace(/^\(\d+\)\s*/,''); }
window.msgBadgeRefresh=()=>{ if(M.ok) badge(); };
function markKnown(){ list(M.posts).forEach(p=>M.notified['p'+p.id]=1); list(M.tasks).forEach(t=>M.notified['t'+t.id]=1); }
function notifyNew(){
  const out=[];
  list(M.posts).forEach(p=>{ if(!M.notified['p'+p.id]){ M.notified['p'+p.id]=1; if(p.by!==me().id&&inAud(p)) out.push([(p.urgent?'🔴 דחוף: ':'📢 ')+(p.title||'הודעה חדשה'),uName(p.by)+': '+(p.body||'').slice(0,90)]); } });
  list(M.tasks).forEach(t=>{ if(!M.notified['t'+t.id]){ M.notified['t'+t.id]=1; if(t.by!==me().id&&mineT(t)) out.push(['✅ משימה חדשה: '+t.t,'מאת '+uName(t.by)+(t.due?' · '+fmtDue(t.due):'')]); } });
  out.forEach(([a,b])=>{ msgToast(a); try{ if(window.Notification&&Notification.permission==='granted') new Notification(a,{body:b,icon:'icons/icon-192.png',lang:'he',dir:'rtl'}); }catch(e){} });
}
let toastT=null;
function msgToast(txt){ let t=document.getElementById('msgToast'); if(!t){ t=document.createElement('div'); t.id='msgToast'; document.body.appendChild(t); }
  t.textContent=txt; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),4200); }

/* ---------- פעולות ---------- */
window.msgAck=function(id){ const p=M.posts[id]; if(!p) return; patch('posts/'+id+'/acks',{[me().id]:Date.now()}); };
window.msgReply=function(id){ const i=document.getElementById('rep-'+id); const x=(i&&i.value||'').trim(); if(!x) return;
  put('posts/'+id+'/rep/'+uid(),{u:me().id,at:Date.now(),x}); i.value=''; if(!(M.posts[id].acks||{})[me().id]&&M.posts[id].by!==me().id) msgAck(id); };
window.msgDelPost=function(id){ const p=M.posts[id]; if(!p||!(isAdmin()||p.by===me().id)) return; if(confirm('למחוק את ההודעה?')) del('posts/'+id); };
window.msgSend=function(){
  const g=k=>document.getElementById('mp-'+k); const body=g('body').value.trim(), title=g('title').value.trim();
  if(!body&&!title){ msgToast('כתבו תוכן להודעה'); return; }
  let to=g('to').value; if(to==='pick'){ to=[...document.querySelectorAll('.mp-pick:checked')].map(x=>x.value); if(!to.length){ msgToast('בחרו למי לשלוח'); return; } }
  const id=uid(); put('posts/'+id,{title,body,to,urgent:g('urgent').checked,ack:g('ack').checked,by:me().id,at:Date.now()});
  g('body').value=''; g('title').value=''; g('urgent').checked=false; msgToast('📢 ההודעה נשלחה');
};
window.msgTaskSt=function(id,st){ const t=M.tasks[id]; if(!t||!canEditSt(t)) return;
  const ch={st,upd:Date.now()}; if(st==='done'){ ch.doneAt=Date.now(); ch.doneBy=me().id; } else { ch.doneAt=null; ch.doneBy=null; }
  patch('tasks/'+id,ch); put('tasks/'+id+'/cm/'+uid(),{u:me().id,at:Date.now(),sys:1,x:'שינה/תה סטטוס ל"'+STS[st].l+'"'}); };
window.msgTaskComment=function(id){ const i=document.getElementById('tc-'+id); const x=(i&&i.value||'').trim(); if(!x) return;
  put('tasks/'+id+'/cm/'+uid(),{u:me().id,at:Date.now(),x}); i.value=''; };
window.msgTaskDel=function(id){ const t=M.tasks[id]; if(!t||!(isAdmin()||t.by===me().id)) return; if(confirm('למחוק את המשימה "'+t.t+'"?')){ M.open=null; del('tasks/'+id); } };
const canEditSt=t=>isAdmin()||t.by===me().id||mineT(t);
window.msgOpenTask=function(id){ M.open=id; const t=M.tasks[id]; if(t&&mineT(t)&&!(t.seen||{})[me().id]) patch('tasks/'+id+'/seen',{[me().id]:Date.now()}); msgRender(); };
window.msgClose=function(){ M.open=null; M.form=null; msgRender(); };
window.msgNewTask=function(pre){ if(!canTask()) return; M.form=Object.assign({id:null,t:'',d:'',area:'',who:[],due:'',pri:'low',stu:''},pre||{}); msgRender(); };
window.msgEditTask=function(id){ const t=M.tasks[id]; if(!t) return; M.open=null; M.form=Object.assign({},t,{id,who:[...(t.who||[])]}); msgRender(); };
window.msgSaveTask=function(){
  const g=k=>document.getElementById('tf-'+k); const t=g('t').value.trim(); if(!t){ msgToast('כתבו שם למשימה'); return; }
  const who=[...document.querySelectorAll('.tf-who:checked')].map(x=>x.value); if(!who.length){ msgToast('בחרו לפחות אחראי/ת אחד/ת'); return; }
  const stu=g('stu').value.trim();
  const o={t,d:g('d').value.trim(),area:g('area').value,who,due:g('due').value,pri:g('pri').value,stu:stu&&stuIdx(stu)>=0?stu:stu,upd:Date.now()};
  if(M.form.id){ patch('tasks/'+M.form.id,o); put('tasks/'+M.form.id+'/cm/'+uid(),{u:me().id,at:Date.now(),sys:1,x:'עדכן/ה את פרטי המשימה'}); msgToast('✓ המשימה עודכנה'); }
  else { const id=uid(); put('tasks/'+id,Object.assign(o,{st:'open',by:me().id,at:Date.now()})); msgToast('✅ המשימה נשלחה ל'+who.map(uName).join(', ')); }
  M.form=null; msgRender();
};
window.msgView=function(v){ M.view=v; M.open=null; msgRender(); };
window.msgF=function(k,v){ M.f[k]=v; msgRender(); };
window.msgNotifOn=async function(){ try{ const r=await Notification.requestPermission(); msgToast(r==='granted'?'🔔 התראות בדפדפן הופעלו':'ההתראות לא אושרו בדפדפן'); msgRender(); }catch(e){ msgToast('הדפדפן לא תומך בהתראות'); } };
window.msgStu=function(name){ const i=stuIdx(name); if(i>=0&&window.showStudentDetails) showStudentDetails(i); };

/* ---------- רכיבי תצוגה ---------- */
const av=(id,sz)=>{ const n=uName(id)||'?'; const ini=n.split(' ').slice(0,2).map(w=>w[0]).join('');
  let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))%360; return `<span class="m-av" style="--s:${sz||28}px;background:hsl(${h} 55% 92%);color:hsl(${h} 50% 32%)" title="${E(n)}">${E(ini)}</span>`; };
const chip=(txt,c)=>`<span class="m-chip" style="--c:${c}">${txt}</span>`;
function taskCard(t){
  const late=isLate(t), p=PRI[t.pri]||PRI.low, s=STS[t.st]||STS.open, cm=Object.keys(t.cm||{}).filter(k=>!t.cm[k].sys).length, isNew=mineT(t)&&t.st!=='done'&&!(t.seen||{})[me().id];
  return `<div class="m-task${late?' late':''}${t.st==='done'?' done':''}" style="--p:${p.c}" onclick="msgOpenTask('${t.id}')">
    <div class="m-task-h">${isNew?'<span class="m-new">חדש</span>':''}<b>${E(t.t)}</b></div>
    <div class="m-task-m">${t.area?chip('🏷️ '+E(t.area),'#6d28d9'):''}${t.pri!=='low'?chip((t.pri==='urgent'?'🔴 ':'🟠 ')+p.l,p.c):''}
      ${t.due?chip('📅 '+fmtDue(t.due),late?'#b91c1c':(t.st!=='done'&&dayDiff(t.due)<=1?'#c2410c':'#52637a')):''}
      ${t.stu?chip('🧑‍🎓 '+E(t.stu),'#0e7490'):''}${cm?chip('💬 '+cm,'#52637a'):''}</div>
    <div class="m-task-f"><span class="m-avs">${(t.who||[]).map(w=>av(w,24)).join('')}</span><small>${E((t.who||[]).map(uName).join(', '))}</small>
      <span class="m-st" style="--c:${s.c}">${s.l}</span></div></div>`;
}
function postCard(p){
  const mine=p.by===me().id, aud=audUsers(p), acks=p.acks||{}, nAck=aud.filter(u=>acks[u.id]).length, need=needAck(p);
  const reps=list(p.rep).sort((a,b)=>a.at-b.at);
  const audTxt=Array.isArray(p.to)?p.to.map(uName).join(', '):AUD[p.to||'all'];
  return `<div class="m-post${p.urgent?' urgent':''}${need?' need':''}">
    <div class="m-post-h">${av(p.by,34)}<div style="flex:1;min-width:0"><b>${E(uName(p.by))}</b> <small>${E(uRole(p.by))}</small><div class="m-sub">${fmtAt(p.at)} · אל: ${E(audTxt)}</div></div>
      ${p.urgent?'<span class="m-urg">🔴 דחוף</span>':''}${(mine||isAdmin())?`<button class="m-x" title="מחיקה" onclick="msgDelPost('${p.id}')">🗑️</button>`:''}</div>
    ${p.title?`<div class="m-post-t">${E(p.title)}</div>`:''}<div class="m-post-b">${E(p.body).replace(/\n/g,'<br>')}</div>
    <div class="m-post-a">${need?`<button class="m-ack" onclick="msgAck('${p.id}')">✓ קראתי</button>`:(p.ack!==false&&!mine&&acks[me().id]?`<span class="m-acked">✓ אישרת קריאה</span>`:'')}
      ${p.ack!==false&&(mine||isAdmin())&&aud.length?`<details class="m-ackd"><summary>✓ ${nAck}/${aud.length} אישרו קריאה</summary><div class="m-ackl">
        ${aud.map(u=>`<span class="${acks[u.id]?'y':'n'}">${acks[u.id]?'✓':'⏳'} ${E(u.n)}${acks[u.id]?` <small>${fmtAt(acks[u.id])}</small>`:''}</span>`).join('')}</div></details>`:''}</div>
    ${reps.length?`<div class="m-reps">${reps.map(r=>`<div class="m-rep">${av(r.u,22)}<div><b>${E(uName(r.u))}</b> <small>${fmtAt(r.at)}</small><div>${E(r.x).replace(/\n/g,'<br>')}</div></div></div>`).join('')}</div>`:''}
    <div class="m-repbox"><input id="rep-${p.id}" placeholder="תגובה…" onkeydown="if(event.key==='Enter')msgReply('${p.id}')"><button onclick="msgReply('${p.id}')">שליחה</button></div></div>`;
}
function composeBox(){
  const opts=Object.entries(AUD).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
  return `<div class="m-compose"><div class="m-ch">📢 הודעה חדשה לצוות</div>
    <input id="mp-title" placeholder="כותרת (לא חובה)">
    <textarea id="mp-body" placeholder="מה רוצים להגיד לצוות?"></textarea>
    <div class="m-crow"><label>אל: <select id="mp-to" onchange="document.getElementById('mp-pickbox').style.display=this.value==='pick'?'flex':'none'">${opts}</select></label>
      <label class="m-cb"><input type="checkbox" id="mp-ack" checked> לבקש אישור קריאה</label>
      <label class="m-cb"><input type="checkbox" id="mp-urgent"> 🔴 דחוף</label>
      <button class="m-btn" onclick="msgSend()">שליחה</button></div>
    <div id="mp-pickbox" class="m-pick" style="display:none">${staff().filter(u=>u.id!==me().id).map(u=>`<label><input type="checkbox" class="mp-pick" value="${u.id}"> ${E(u.n)} <small>${E(u.r)}</small></label>`).join('')}</div></div>`;
}
function taskForm(){
  const f=M.form; const sl=(id,opts,val)=>`<select id="tf-${id}">${opts.map(([k,l])=>`<option value="${E(k)}" ${k===val?'selected':''}>${E(l)}</option>`).join('')}</select>`;
  return `<div class="m-modal" onclick="if(event.target===this)msgClose()"><div class="m-dlg">
    <div class="m-dlg-h"><b>${f.id?'✏️ עריכת משימה':'➕ משימה חדשה'}</b><button class="m-x" onclick="msgClose()">✕</button></div>
    <label>מה צריך לעשות?<input id="tf-t" value="${E(f.t)}" placeholder="למשל: שיחה עם הורי החניך/ה לגבי ההיעדרויות"></label>
    <label>פירוט<textarea id="tf-d" placeholder="הסבר, הקשר, מה נחשב 'בוצע'…">${E(f.d)}</textarea></label>
    <div class="m-g3"><label>תחום אחריות${sl('area',[['','— בחרו —']].concat(AREAS.map(a=>[a,a])),f.area)}</label>
      <label>תאריך יעד<input type="date" id="tf-due" value="${E(f.due)}"></label>
      <label>דחיפות${sl('pri',Object.entries(PRI).map(([k,v])=>[k,v.l]),f.pri)}</label></div>
    <label>קשור לחניך/ה (לא חובה)<input id="tf-stu" list="tf-stul" value="${E(f.stu)}" placeholder="התחילו להקליד שם…"><datalist id="tf-stul">${students().map(s=>`<option value="${E(s.n)}">`).join('')}</datalist></label>
    <div class="m-lbl">מי אחראי/ת? <small>(אפשר כמה)</small></div>
    <div class="m-pick">${staff().map(u=>`<label><input type="checkbox" class="tf-who" value="${u.id}" ${(f.who||[]).includes(u.id)?'checked':''}> ${E(u.n)} <small>${E(u.r)}</small></label>`).join('')}</div>
    <div class="m-dlg-f"><button class="m-btn" onclick="msgSaveTask()">${f.id?'שמירה':'שליחת המשימה'}</button><button class="m-btn2" onclick="msgClose()">ביטול</button></div></div></div>`;
}
function taskModal(t){
  const cms=list(t.cm).sort((a,b)=>a.at-b.at), s=STS[t.st]||STS.open, ed=canEditSt(t), own=isAdmin()||t.by===me().id;
  return `<div class="m-modal" onclick="if(event.target===this)msgClose()"><div class="m-dlg">
    <div class="m-dlg-h"><b>${E(t.t)}</b><button class="m-x" onclick="msgClose()">✕</button></div>
    <div class="m-task-m" style="margin-bottom:10px">${chip(s.l,s.c)}${t.area?chip('🏷️ '+E(t.area),'#6d28d9'):''}${chip((PRI[t.pri]||PRI.low).l,(PRI[t.pri]||PRI.low).c)}
      ${t.due?chip('📅 '+fmtDue(t.due)+' ('+t.due.split('-').reverse().join('.')+')',isLate(t)?'#b91c1c':'#52637a'):''}
      ${t.stu?`<span class="m-chip m-link" style="--c:#0e7490" onclick="msgStu('${E(t.stu).replace(/'/g,"\\'")}')">🧑‍🎓 ${E(t.stu)}</span>`:''}</div>
    ${t.d?`<div class="m-desc">${E(t.d).replace(/\n/g,'<br>')}</div>`:''}
    <div class="m-meta">נפתחה ע"י <b>${E(uName(t.by))}</b> · ${fmtAt(t.at)}<br>אחראים: <b>${E((t.who||[]).map(uName).join(', '))}</b>
      ${(t.who||[]).map(w=>(t.seen||{})[w]?`<small class="y"> · ${E(uName(w))} ראה/תה ${fmtAt(t.seen[w])}</small>`:`<small class="n"> · ${E(uName(w))} עוד לא פתח/ה</small>`).join('')}
      ${t.st==='done'&&t.doneAt?`<br>✓ הושלמה ע"י ${E(uName(t.doneBy))} · ${fmtAt(t.doneAt)}`:''}</div>
    ${ed?`<div class="m-sts">${Object.entries(STS).map(([k,v])=>`<button class="${t.st===k?'on':''}" style="--c:${v.c}" onclick="msgTaskSt('${t.id}','${k}')">${k==='done'?'✓ ':''}${v.l}</button>`).join('')}</div>`:''}
    <div class="m-lbl">עדכונים והערות</div>
    <div class="m-cms">${cms.map(c=>c.sys?`<div class="m-sys">${E(uName(c.u))} ${E(c.x)} · ${fmtAt(c.at)}</div>`:`<div class="m-rep">${av(c.u,22)}<div><b>${E(uName(c.u))}</b> <small>${fmtAt(c.at)}</small><div>${E(c.x).replace(/\n/g,'<br>')}</div></div></div>`).join('')||'<div class="m-sys">אין עדיין עדכונים</div>'}</div>
    <div class="m-repbox"><input id="tc-${t.id}" placeholder="כתבו עדכון…" onkeydown="if(event.key==='Enter')msgTaskComment('${t.id}')"><button onclick="msgTaskComment('${t.id}')">הוספה</button></div>
    ${own?`<div class="m-dlg-f"><button class="m-btn2" onclick="msgEditTask('${t.id}')">✏️ עריכה</button><button class="m-btn2 red" onclick="msgTaskDel('${t.id}')">🗑️ מחיקה</button></div>`:''}</div></div>`;
}
const sortTasks=a=>a.sort((x,y)=>(x.st==='done')-(y.st==='done')||(isLate(y)-isLate(x))||String(x.due||'9999').localeCompare(String(y.due||'9999'))||(y.at-x.at));

/* ---------- מסכים ---------- */
function vMine(){
  const P=list(M.posts).filter(needAck).sort((a,b)=>(b.urgent-a.urgent)||(b.at-a.at));
  const T=sortTasks(list(M.tasks).filter(t=>mineT(t)&&t.st!=='done'));
  const G=sortTasks(list(M.tasks).filter(t=>t.by===me().id&&!mineT(t)&&t.st!=='done'));
  const late=T.filter(isLate).length;
  return `<div class="m-hello">שלום ${E((me().n||'').split(' ')[0])} 👋 ${!P.length&&!T.length?'אין לך כרגע משהו פתוח. יום טוב!':`יש לך <b>${P.length}</b> הודעות שמחכות לאישור קריאה ו-<b>${T.length}</b> משימות פתוחות${late?` (<b style="color:#b91c1c">${late} באיחור</b>)`:''}.`}</div>
    ${P.length?`<h3 class="m-h">📢 הודעות שמחכות לאישור שלך</h3>${P.map(postCard).join('')}`:''}
    <h3 class="m-h">✅ המשימות שלי ${canTask()?`<button class="m-btn sm" onclick="msgNewTask()">➕ משימה חדשה</button>`:''}</h3>
    <div class="m-grid">${T.map(taskCard).join('')||'<div class="m-empty">אין משימות פתוחות 🎉</div>'}</div>
    ${G.length?`<h3 class="m-h">📤 משימות שנתתי לאחרים ועוד פתוחות</h3><div class="m-grid">${G.map(taskCard).join('')}</div>`:''}`;
}
function vTasks(){
  const f=M.f, q=f.q.trim(); let A=list(M.tasks);
  const flt={active:t=>t.st!=='done',late:isLate,done:t=>t.st==='done',all:()=>true};
  A=A.filter(flt[f.st]||flt.active).filter(t=>(!f.who||(t.who||[]).includes(f.who))&&(!f.area||t.area===f.area)&&(!q||[t.t,t.d,t.stu,t.area].some(v=>String(v||'').includes(q))));
  const cnt=k=>list(M.tasks).filter(flt[k]).length;
  const cols=f.st==='active'?['open','doing']:f.st==='all'?['open','doing','done']:null;
  return `<div class="m-bar">
      ${[['active','פתוחות'],['late','באיחור'],['done','הושלמו'],['all','הכל']].map(([k,l])=>`<button class="m-f${f.st===k?' on':''}" onclick="msgF('st','${k}')">${l} <b>${cnt(k)}</b></button>`).join('')}
      <select onchange="msgF('who',this.value)"><option value="">כל האחראים</option>${staff().map(u=>`<option value="${u.id}" ${f.who===u.id?'selected':''}>${E(u.n)}</option>`).join('')}</select>
      <select onchange="msgF('area',this.value)"><option value="">כל התחומים</option>${AREAS.map(a=>`<option ${f.area===a?'selected':''}>${a}</option>`).join('')}</select>
      <input class="m-q" placeholder="🔍 חיפוש" value="${E(f.q)}" onchange="msgF('q',this.value)">
      ${canTask()?'<button class="m-btn" onclick="msgNewTask()">➕ משימה חדשה</button>':''}</div>
    ${cols?`<div class="m-cols">${cols.map(c=>{ const L=sortTasks(A.filter(t=>t.st===c)); return `<div class="m-col"><div class="m-col-h" style="--c:${STS[c].c}">${STS[c].l} <b>${L.length}</b></div>${L.map(taskCard).join('')||'<div class="m-empty">—</div>'}</div>`; }).join('')}</div>`
      :`<div class="m-grid">${sortTasks(A).map(taskCard).join('')||'<div class="m-empty">אין משימות</div>'}</div>`}`;
}
function vPosts(){
  const P=list(M.posts).filter(p=>inAud(p)).sort((a,b)=>b.at-a.at);
  return composeBox()+(P.map(postCard).join('')||'<div class="m-empty">עוד אין הודעות</div>');
}
function vTrack(){
  const T=list(M.tasks), P=list(M.posts), wk=Date.now()-7*864e5;
  const rows=staff().map(u=>{ const mt=T.filter(t=>(t.who||[]).includes(u.id));
    const pend=P.filter(p=>p.ack!==false&&p.by!==u.id&&inAud(p,u)&&!(p.acks||{})[u.id]);
    return {u,open:mt.filter(t=>t.st!=='done').length,late:mt.filter(isLate).length,done:mt.filter(t=>t.st==='done'&&t.doneAt>wk).length,pend:pend.length}; });
  const late=sortTasks(T.filter(isLate));
  const byArea=AREAS.map(a=>({a,n:T.filter(t=>t.area===a&&t.st!=='done').length})).filter(x=>x.n);
  const tot={open:T.filter(t=>t.st!=='done').length,late:late.length,done:T.filter(t=>t.st==='done'&&t.doneAt>wk).length};
  const ackP=P.filter(p=>p.ack!==false), ackRate=(()=>{ let a=0,n=0; ackP.forEach(p=>audUsers(p).forEach(u=>{ n++; if((p.acks||{})[u.id]) a++; })); return n?Math.round(a/n*100):100; })();
  const tile=(n,l,c)=>`<div class="m-tile" style="--c:${c}"><b>${n}</b><small>${l}</small></div>`;
  return `<div class="m-tiles">${tile(tot.open,'משימות פתוחות','#c2410c')}${tile(tot.late,'באיחור','#b91c1c')}${tile(tot.done,'הושלמו השבוע','#047857')}${tile(ackRate+'%','אישורי קריאה','#8E033C')}</div>
    <h3 class="m-h">👥 לפי איש צוות</h3>
    <div class="m-tblw"><table class="m-tbl"><thead><tr><th>איש/ת צוות</th><th>פתוחות</th><th>באיחור</th><th>הושלמו השבוע</th><th>הודעות שלא אושרו</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${av(r.u.id,24)} ${E(r.u.n)} <small>${E(r.u.r)}</small></td><td><a href="#" onclick="M_go('${r.u.id}');return false">${r.open}</a></td><td class="${r.late?'bad':''}">${r.late}</td><td>${r.done}</td><td class="${r.pend?'warn':''}">${r.pend}</td></tr>`).join('')}</tbody></table></div>
    ${byArea.length?`<h3 class="m-h">🏷️ משימות פתוחות לפי תחום</h3><div class="m-areas">${byArea.map(x=>`<span>${E(x.a)} <b>${x.n}</b></span>`).join('')}</div>`:''}
    <h3 class="m-h">⏰ משימות באיחור</h3><div class="m-grid">${late.map(taskCard).join('')||'<div class="m-empty">אין משימות באיחור 👏</div>'}</div>`;
}
window.M_go=function(id){ M.view='tasks'; M.f={st:'active',who:id,area:'',q:''}; msgRender(); };

window.msgRender=function(){
  const el=document.getElementById('msgBody'); if(!el||!me()) return;
  badge();
  if(!M.ok){ el.innerHTML=M.err?`<div class="m-err">${E(M.err)}</div>`:'<div class="m-empty">טוען…</div>'; msgStart(); return; }
  const nP=list(M.posts).filter(needAck).length, nT=list(M.tasks).filter(t=>mineT(t)&&t.st!=='done').length;
  const tabs=[['mine','📥 שלי',nP+nT],['tasks','✅ משימות',0],['posts','📢 הודעות',nP]].concat(isAdmin()?[['track','📊 מעקב',0]]:[]);
  const nb=window.Notification&&Notification.permission==='default'?'<button class="m-btn2 sm" onclick="msgNotifOn()">🔔 הפעלת התראות בדפדפן</button>':'';
  const body=M.view==='tasks'?vTasks():M.view==='posts'?vPosts():M.view==='track'&&isAdmin()?vTrack():vMine();
  const t=M.open&&M.tasks[M.open]?Object.assign({id:M.open},M.tasks[M.open]):null;
  el.innerHTML=`<div class="m-tabs">${tabs.map(([k,l,n])=>`<button class="${M.view===k?'on':''}" onclick="msgView('${k}')">${l}${n?` <span class="m-n">${n}</span>`:''}</button>`).join('')}<span style="flex:1"></span>${nb}</div>
    ${body}${M.form?taskForm():t?taskModal(t):''}`;
  if(t&&mineT(t)&&!(t.seen||{})[me().id]) patch('tasks/'+t.id+'/seen',{[me().id]:Date.now()});
};

/* ---------- חיבור לפורטל ---------- */
window.msgMount=function(){
  if(!me()||me().lcOnly){ const b=document.getElementById('tab-msg'); if(b) b.remove(); return; }
  if(!document.getElementById('sec-msg')){
    const s=document.createElement('div'); s.className='sec'; s.id='sec-msg';
    s.innerHTML=`<div class="info-box"><div class="icon">💬</div><div><b>CRM — מסרים ומשימות לצוות בוגרת</b><br>משימות עם אחראי ותאריך יעד, הודעות לצוות עם אישור קריאה. הכל נשמר בענן ומתעדכן אצל כולם מיד.</div></div><div id="msgBody"></div>`;
    document.getElementById('mainContent').appendChild(s);
  }
  msgStart();
};
const prevShow=window.show;
window.show=function(id){ prevShow&&prevShow(id); if(id==='msg') msgRender(); };
/* פתיחת משימה חדשה מכל מקום בפורטל, למשל מכרטיס חניך/ה: msgNewTaskFor('שם') */
window.msgNewTaskFor=function(name,area){ show('msg'); msgNewTask({stu:name||'',area:area||''}); };

const css=document.createElement('style'); css.textContent=`
#tab-msg{position:relative}.msg-badge{background:#b91c1c;color:#fff;border-radius:999px;font-size:11px;font-weight:800;padding:1px 6px;margin-inline-start:5px;}
#msgToast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(30px);background:#0f1e2e;color:#fff;padding:11px 18px;border-radius:12px;font:600 14px Heebo,sans-serif;opacity:0;pointer-events:none;transition:.25s;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw}
#msgToast.on{opacity:1;transform:translateX(-50%)}
#sec-msg .m-tabs{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0 14px;}
#sec-msg .m-tabs>button{border:1px solid #F3C2B0;background:#fff;border-radius:999px;padding:8px 16px;font:700 14px Heebo,sans-serif;color:#7A6A66;cursor:pointer;}
#sec-msg .m-tabs>button.on{background:#FC5028;border-color:#FC5028;color:#fff;}
.m-n{background:#b91c1c;color:#fff;border-radius:999px;font-size:11px;padding:1px 6px;}
.m-tabs>button.on .m-n{background:#fff;color:#b91c1c;}
.m-hello{background:#FFF1EB;border:1px solid #F3C2B0;border-radius:14px;padding:12px 16px;font-size:15px;margin-bottom:6px;}
.m-h{font:800 17px Heebo,sans-serif;color:#8E033C;margin:18px 0 9px;display:flex;align-items:center;gap:10px;}
.m-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;}
.m-empty{color:#8496ab;padding:14px;font-size:14px;}.m-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:12px;}
.m-task{background:#fff;border:1px solid #F3C2B0;border-right:5px solid var(--p);border-radius:12px;padding:10px 12px;cursor:pointer;transition:box-shadow .15s;margin-bottom:8px;}
.m-grid .m-task{margin-bottom:0}.m-task:hover{box-shadow:0 4px 14px rgba(142,3,60,.12);}
.m-task.late{background:#fff7f7;border-color:#fecaca;}.m-task.done{opacity:.6}.m-task.done b{text-decoration:line-through}
.m-task-h{display:flex;gap:6px;align-items:flex-start;}.m-task-h b{font:700 14.5px Heebo,sans-serif;line-height:1.35}
.m-new{background:#FC5028;color:#fff;font-size:10.5px;font-weight:800;border-radius:6px;padding:1px 6px;flex:none;margin-top:2px}
.m-task-m{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0;}
.m-chip{font-size:11.5px;font-weight:600;color:var(--c);background:color-mix(in srgb,var(--c) 10%,#fff);border:1px solid color-mix(in srgb,var(--c) 30%,#fff);border-radius:999px;padding:1px 8px;white-space:nowrap}
.m-link{cursor:pointer;text-decoration:underline}
.m-task-f{display:flex;align-items:center;gap:7px;}.m-task-f small{flex:1;color:#7A6A66;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.m-avs{display:flex}.m-avs .m-av{margin-inline-start:-6px;border:2px solid #fff}.m-avs .m-av:first-child{margin-inline-start:0}
.m-av{width:var(--s);height:var(--s);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:800 calc(var(--s) * .4) Heebo,sans-serif;flex:none;vertical-align:middle}
.m-st{font-size:11.5px;font-weight:700;color:#fff;background:var(--c);border-radius:6px;padding:2px 8px;}
.m-post{background:#fff;border:1px solid #F3C2B0;border-radius:14px;padding:12px 14px;margin-bottom:10px;}
.m-post.urgent{border:2px solid #b91c1c;}.m-post.need{box-shadow:0 0 0 3px #FFF1EB}
.m-post-h{display:flex;gap:9px;align-items:center;}.m-post-h small{color:#7A6A66}.m-sub{font-size:12px;color:#8496ab}
.m-urg{color:#b91c1c;font-weight:800;font-size:12.5px}.m-x{border:none;background:none;cursor:pointer;font-size:15px;opacity:.6}.m-x:hover{opacity:1}
.m-post-t{font:800 16px Heebo,sans-serif;margin:9px 0 3px}.m-post-b{font-size:14.5px;line-height:1.55;margin-top:6px}
.m-post-a{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-top:10px}
.m-ack{background:#047857;color:#fff;border:none;border-radius:10px;padding:8px 18px;font:800 14px Heebo,sans-serif;cursor:pointer}
.m-acked{color:#047857;font-weight:700;font-size:13px}
.m-ackd summary{cursor:pointer;font-size:13px;font-weight:700;color:#8E033C}
.m-ackl{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.m-ackl span{font-size:12px;border-radius:999px;padding:2px 9px}
.m-ackl .y{background:#ecfdf5;color:#047857}.m-ackl .n{background:#fff7ed;color:#b45309}
.m-reps,.m-cms{border-top:1px solid #FFF1EB;margin-top:9px;padding-top:7px;display:flex;flex-direction:column;gap:7px;max-height:300px;overflow:auto}
.m-rep{display:flex;gap:7px;font-size:13.5px}.m-rep small{color:#8496ab}
.m-sys{font-size:12px;color:#8496ab;text-align:center}
.m-repbox{display:flex;gap:6px;margin-top:8px}.m-repbox input{flex:1;border:1px solid #F3C2B0;border-radius:999px;padding:7px 13px;font:14px Assistant,Heebo,sans-serif;min-width:0}
.m-repbox button{border:none;background:#8E033C;color:#fff;border-radius:999px;padding:7px 14px;font:700 13px Heebo,sans-serif;cursor:pointer}
.m-compose{background:#fff;border:2px solid #FC5028;border-radius:14px;padding:12px 14px;margin-bottom:14px;display:flex;flex-direction:column;gap:7px}
.m-ch{font:800 15px Heebo,sans-serif;color:#8E033C}
.m-compose input,.m-compose textarea,.m-compose select,.m-dlg input,.m-dlg textarea,.m-dlg select,.m-bar select,.m-q{border:1px solid #F3C2B0;border-radius:9px;padding:8px 10px;font:14px Assistant,Heebo,sans-serif;background:#fff;width:100%;box-sizing:border-box}
.m-compose textarea{min-height:70px;resize:vertical}
.m-crow{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.m-crow select{width:auto}.m-crow label{font-size:13.5px;font-weight:600;display:flex;gap:5px;align-items:center}
.m-cb input{width:auto!important}
.m-btn{background:#FC5028;color:#fff;border:none;border-radius:10px;padding:9px 18px;font:800 14px Heebo,sans-serif;cursor:pointer;margin-inline-start:auto}
.m-btn.sm,.m-btn2.sm{padding:5px 12px;font-size:12.5px;margin:0}
.m-btn2{background:#fff;color:#8E033C;border:1px solid #F3C2B0;border-radius:10px;padding:8px 16px;font:700 13.5px Heebo,sans-serif;cursor:pointer}.m-btn2.red{color:#b91c1c}
.m-pick{display:flex;flex-wrap:wrap;gap:6px}.m-pick label{border:1px solid #F3C2B0;border-radius:999px;padding:4px 11px;font-size:13px;display:flex;gap:5px;align-items:center;cursor:pointer;background:#fff}
.m-pick label:has(input:checked){background:#FFF1EB;border-color:#FC5028}.m-pick input{width:auto!important}.m-pick small{color:#8496ab}
.m-bar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.m-bar select{width:auto}.m-q{width:180px!important}
.m-f{border:1px solid #F3C2B0;background:#fff;border-radius:999px;padding:6px 13px;font:700 13px Heebo,sans-serif;color:#7A6A66;cursor:pointer}.m-f.on{background:#8E033C;border-color:#8E033C;color:#fff}
.m-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;align-items:start}
.m-col{background:#FBF6F3;border-radius:14px;padding:9px}.m-col-h{font:800 14.5px Heebo,sans-serif;color:var(--c);margin:2px 4px 9px;border-bottom:3px solid var(--c);padding-bottom:5px}
.m-modal{position:fixed;inset:0;background:rgba(15,30,46,.45);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 12px;overflow:auto}
.m-dlg{background:#fff;border-radius:16px;padding:16px 18px;width:min(640px,100%);display:flex;flex-direction:column;gap:9px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.m-dlg>label,.m-g3>label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:700;color:#7A6A66}
.m-dlg textarea{min-height:70px;resize:vertical}.m-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}
.m-dlg-h{display:flex;align-items:flex-start;gap:10px}.m-dlg-h b{flex:1;font:800 18px Heebo,sans-serif;color:#0f1e2e}
.m-dlg-f{display:flex;gap:8px;margin-top:6px}.m-dlg-f .m-btn{margin:0}
.m-lbl{font-size:12.5px;font-weight:700;color:#7A6A66}.m-desc{background:#FBF6F3;border-radius:10px;padding:10px;font-size:14px;line-height:1.55}
.m-meta{font-size:13px;color:#52637a;line-height:1.7}.m-meta .y{color:#047857}.m-meta .n{color:#b45309}
.m-sts{display:flex;gap:6px}.m-sts button{flex:1;border:2px solid var(--c);background:#fff;color:var(--c);border-radius:10px;padding:8px;font:800 14px Heebo,sans-serif;cursor:pointer}.m-sts button.on{background:var(--c);color:#fff}
.m-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.m-tile{background:#fff;border:1px solid #F3C2B0;border-top:4px solid var(--c);border-radius:12px;padding:12px;text-align:center}.m-tile b{display:block;font:800 28px Heebo,sans-serif;color:var(--c)}.m-tile small{color:#7A6A66;font-weight:600}
.m-tblw{overflow-x:auto}.m-tbl{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:13.5px}
.m-tbl th{background:#8E033C;color:#fff;padding:8px;font:700 13px Heebo,sans-serif;text-align:right}.m-tbl td{padding:7px 8px;border-bottom:1px solid #FFF1EB}.m-tbl td small{color:#8496ab}
.m-tbl td.bad{color:#b91c1c;font-weight:800}.m-tbl td.warn{color:#b45309;font-weight:800}
.m-areas{display:flex;flex-wrap:wrap;gap:6px}.m-areas span{background:#fff;border:1px solid #F3C2B0;border-radius:999px;padding:4px 12px;font-size:13px}
`;
document.head.appendChild(css);
})();
