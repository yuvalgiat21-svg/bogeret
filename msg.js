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
const M={tasks:{},posts:{},phones:{},smsg:{},logs:{},stu:null,lf:null,sF:{g:'',q:'',w:'rot'},wa:null,sf:{},ok:false,err:'',view:'mine',f:{st:'active',who:'',area:'',q:''},open:null,form:null,started:false,notified:{}};
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
    UNSUB=dbm.onValue(dbm.ref(rdb,MSG_PATH),snap=>{ const v=snap.val()||{}; const prev=M.ok; M.tasks=v.tasks||{}; M.posts=v.posts||{}; M.phones=v.phones||{}; M.smsg=v.smsg||{}; M.logs=v.logs||{}; M.ok=true; M.err=''; RETRY=0;
      if(prev) notifyNew(); else markKnown(); badge(); if(active()) softRender(); },
      e=>{ console.warn('msg listen',e); DB=null; UNSUB=null; M.started=false;
        /* ההאזנה נותקה (בדרך כלל בגלל ניתוק רגעי של הכניסה) — מתחברים מחדש לבד */
        if(++RETRY<=6) setTimeout(msgStart,2000*RETRY); else { M.err='החיבור לנתוני קשר ומעקב נותק. רעננו את הדף.'; if(active()) msgRender(); } });
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
  const id=uid(), wa=g('wa').checked; put('posts/'+id,{title,body,to,urgent:g('urgent').checked,ack:g('ack').checked,by:me().id,at:Date.now()});
  g('body').value=''; g('title').value=''; g('urgent').checked=false; g('wa').checked=false; msgToast('📢 ההודעה נשלחה בפורטל');
  if(wa){ M.wa={k:'staff',id,p:{title,body,to,by:me().id}}; msgRender(); }
};
window.msgTaskSt=function(id,st){ const t=M.tasks[id]; if(!t||!canEditSt(t)) return;
  const ch={st,upd:Date.now()}; if(st==='done'){ ch.doneAt=Date.now(); ch.doneBy=me().id; } else { ch.doneAt=null; ch.doneBy=null; }
  if(st==='done'&&t.rep&&!t.repNext){ const nid=uid(), due=nextDue(t.due||todayIso(),t.rep);
    const n={t:t.t,d:t.d||'',area:t.area||'',who:t.who||[],due,pri:t.pri||'low',stu:t.stu||'',rep:t.rep,st:'open',by:t.by,at:Date.now(),upd:Date.now()};
    if(t.ck) n.ck=Object.fromEntries(Object.entries(t.ck).map(([k,c])=>[k,{x:c.x,ok:false}]));
    put('tasks/'+nid,n); ch.repNext=nid; msgToast('🔁 נפתחה המשימה הבאה ל'+fmtDue(due)); }
  patch('tasks/'+id,ch); put('tasks/'+id+'/cm/'+uid(),{u:me().id,at:Date.now(),sys:1,x:'שינה/תה סטטוס ל"'+STS[st].l+'"'}); };
window.msgTaskComment=function(id){ const i=document.getElementById('tc-'+id); const x=(i&&i.value||'').trim(); if(!x) return;
  put('tasks/'+id+'/cm/'+uid(),{u:me().id,at:Date.now(),x}); i.value=''; };
window.msgTaskDel=function(id){ const t=M.tasks[id]; if(!t||!(isAdmin()||t.by===me().id)) return; if(confirm('למחוק את המשימה "'+t.t+'"?')){ M.open=null; del('tasks/'+id); } };
const canEditSt=t=>isAdmin()||t.by===me().id||mineT(t);
window.msgOpenTask=function(id){ M.open=id; const t=M.tasks[id]; if(t&&mineT(t)&&!(t.seen||{})[me().id]) patch('tasks/'+id+'/seen',{[me().id]:Date.now()}); msgRender(); };
/* סגירה בשכבות: חלון שנפתח מתוך כרטיס החניך/ה חוזר אליו */
window.msgClose=function(){ if(M.form) M.form=null; else if(M.lf) M.lf=null; else if(M.open) M.open=null; else if(M.wa) M.wa=null; else M.stu=null; msgRender(); };
window.msgNewTask=function(pre){ if(!canTask()) return; M.form=Object.assign({id:null,t:'',d:'',area:'',who:[],due:'',pri:'low',stu:'',rep:''},pre||{}); msgRender(); };
window.msgEditTask=function(id){ const t=M.tasks[id]; if(!t) return; M.open=null; M.form=Object.assign({},t,{id,who:[...(t.who||[])]}); msgRender(); };
window.msgSaveTask=function(){
  const g=k=>document.getElementById('tf-'+k); const t=g('t').value.trim(); if(!t){ msgToast('כתבו שם למשימה'); return; }
  const who=[...document.querySelectorAll('.tf-who:checked')].map(x=>x.value); if(!who.length){ msgToast('בחרו לפחות אחראי/ת אחד/ת'); return; }
  const stu=g('stu').value.trim();
  const o={t,d:g('d').value.trim(),area:g('area').value,who,due:g('due').value,pri:g('pri').value,stu,rep:g('rep').value,upd:Date.now()};
  if(o.rep&&!o.due) o.due=todayIso();
  if(M.form.id){ patch('tasks/'+M.form.id,o); put('tasks/'+M.form.id+'/cm/'+uid(),{u:me().id,at:Date.now(),sys:1,x:'עדכן/ה את פרטי המשימה'}); msgToast('✓ המשימה עודכנה'); }
  else { const id=uid(); put('tasks/'+id,Object.assign(o,{st:'open',by:me().id,at:Date.now()})); msgToast('✅ המשימה נשלחה ל'+who.map(uName).join(', ')); }
  M.form=null; msgRender();
};
window.msgView=function(v){ M.view=v; M.open=null; M.stu=null; msgRender(); };
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
      ${t.stu?chip('🧑‍🎓 '+E(t.stu),'#0e7490'):''}${cm?chip('💬 '+cm,'#52637a'):''}${t.rep?chip('🔁 '+REP[t.rep],'#0369a1'):''}${ckTxt(t)?chip('☑️ '+ckTxt(t),'#047857'):''}</div>
    <div class="m-task-f"><span class="m-avs">${(t.who||[]).map(w=>av(w,24)).join('')}</span><small>${E((t.who||[]).map(uName).join(', '))}</small>
      <span class="m-st" style="--c:${s.c}">${s.l}</span></div></div>`;
}
function postCard(p){
  const mine=p.by===me().id, aud=audUsers(p), acks=p.acks||{}, nAck=aud.filter(u=>acks[u.id]).length, need=needAck(p);
  const reps=list(p.rep).sort((a,b)=>a.at-b.at);
  const audTxt=Array.isArray(p.to)?p.to.map(uName).join(', '):AUD[p.to||'all'];
  return `<div class="m-post${p.urgent?' urgent':''}${need?' need':''}">
    <div class="m-post-h">${av(p.by,34)}<div style="flex:1;min-width:0"><b>${E(uName(p.by))}</b> <small>${E(uRole(p.by))}</small><div class="m-sub">${fmtAt(p.at)} · אל: ${E(audTxt)}</div></div>
      ${p.urgent?'<span class="m-urg">🔴 דחוף</span>':''}${(mine||isAdmin())?`<button class="m-x" title="שליחה גם בוואטסאפ" onclick="msgWa('staff','${p.id}')">📲</button><button class="m-x" title="מחיקה" onclick="msgDelPost('${p.id}')">🗑️</button>`:''}</div>
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
      <label class="m-cb"><input type="checkbox" id="mp-wa"> 📲 גם בוואטסאפ</label>
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
      <label>דחיפות${sl('pri',Object.entries(PRI).map(([k,v])=>[k,v.l]),f.pri)}</label>
      <label>🔁 חוזרת${sl('rep',Object.entries(REP).map(([k,v])=>[k,v]),f.rep||'')}</label></div>
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
      ${t.stu?`<span class="m-chip m-link" style="--c:#0e7490" onclick="msgOpenStu('${jq(t.stu)}')">🧑‍🎓 ${E(t.stu)}</span>`:''}${t.rep?chip('🔁 '+REP[t.rep],'#0369a1'):''}</div>
    ${t.d?`<div class="m-desc">${E(t.d).replace(/\n/g,'<br>')}</div>`:''}
    <div class="m-meta">נפתחה ע"י <b>${E(uName(t.by))}</b> · ${fmtAt(t.at)}<br>אחראים: <b>${E((t.who||[]).map(uName).join(', '))}</b>
      ${(t.who||[]).map(w=>(t.seen||{})[w]?`<small class="y"> · ${E(uName(w))} ראה/תה ${fmtAt(t.seen[w])}</small>`:`<small class="n"> · ${E(uName(w))} עוד לא פתח/ה</small>`).join('')}
      ${t.st==='done'&&t.doneAt?`<br>✓ הושלמה ע"י ${E(uName(t.doneBy))} · ${fmtAt(t.doneAt)}`:''}</div>
    ${ed?`<div class="m-sts">${Object.entries(STS).map(([k,v])=>`<button class="${t.st===k?'on':''}" style="--c:${v.c}" onclick="msgTaskSt('${t.id}','${k}')">${k==='done'?'✓ ':''}${v.l}</button>`).join('')}</div>`:''}
    ${ckBox(t,ed)}
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
    ${T.length?[['⏰ באיחור',t=>isLate(t)],['📌 להיום',t=>t.due&&dayDiff(t.due)===0],['📅 השבוע',t=>t.due&&dayDiff(t.due)>0&&dayDiff(t.due)<=7],['🗂️ בהמשך / בלי תאריך',t=>!t.due||dayDiff(t.due)>7]].map(([l,fn])=>{ const L=T.filter(fn); return L.length?`<div class="m-qh">${l} <b>${L.length}</b></div><div class="m-grid">${L.map(taskCard).join('')}</div>`:''; }).join(''):'<div class="m-empty">אין משימות פתוחות 🎉</div>'}
    ${(()=>{ const al=openAlerts().filter(a=>myStudents().some(s=>s.n===a.stu)), cm=contactMap(), rot=myStudents().filter(s=>!cm[s.n]||daysAgo(cm[s.n].t)>=ROT).length;
      return (al.length||rot)?`<h3 class="m-h">🧑‍🎓 החניכים שלי</h3><div class="m-tiles">${al.length?`<div class="m-tile m-click" style="--c:#b91c1c" onclick="msgView('students');msgSF('w','alert')"><b>${al.length}</b><small>התרעות דאגה פתוחות</small></div>`:''}${rot?`<div class="m-tile m-click" style="--c:#c2410c" onclick="msgView('students');msgSF('w','rot')"><b>${rot}</b><small>בלי קשר מעל ${ROT} יום</small></div>`:''}</div>`:''; })()}
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
    return {u,open:mt.filter(t=>t.st!=='done').length,late:mt.filter(isLate).length,done:mt.filter(t=>t.st==='done'&&t.doneAt>wk).length,pend:pend.length,lg:list(M.logs).filter(l=>l.by===u.id&&l.k!=='note'&&l.at>wk).length}; });
  const late=sortTasks(T.filter(isLate));
  const byArea=AREAS.map(a=>({a,n:T.filter(t=>t.area===a&&t.st!=='done').length})).filter(x=>x.n);
  const tot={open:T.filter(t=>t.st!=='done').length,late:late.length,done:T.filter(t=>t.st==='done'&&t.doneAt>wk).length};
  const ackP=P.filter(p=>p.ack!==false), ackRate=(()=>{ let a=0,n=0; ackP.forEach(p=>audUsers(p).forEach(u=>{ n++; if((p.acks||{})[u.id]) a++; })); return n?Math.round(a/n*100):100; })();
  const tile=(n,l,c)=>`<div class="m-tile" style="--c:${c}"><b>${n}</b><small>${l}</small></div>`;
  return `<div class="m-tiles">${tile(tot.open,'משימות פתוחות','#c2410c')}${tile(tot.late,'באיחור','#b91c1c')}${tile(tot.done,'הושלמו השבוע','#047857')}${tile(ackRate+'%','אישורי קריאה','#8E033C')}</div>
    <h3 class="m-h">👥 לפי איש צוות</h3>
    <div class="m-tblw"><table class="m-tbl"><thead><tr><th>איש/ת צוות</th><th>פתוחות</th><th>באיחור</th><th>הושלמו השבוע</th><th>הודעות שלא אושרו</th><th>מגעים עם חניכים השבוע</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${av(r.u.id,24)} ${E(r.u.n)} <small>${E(r.u.r)}</small></td><td><a href="#" onclick="M_go('${r.u.id}');return false">${r.open}</a></td><td class="${r.late?'bad':''}">${r.late}</td><td>${r.done}</td><td class="${r.pend?'warn':''}">${r.pend}</td><td>${r.lg}</td></tr>`).join('')}</tbody></table></div>
    ${byArea.length?`<h3 class="m-h">🏷️ משימות פתוחות לפי תחום</h3><div class="m-areas">${byArea.map(x=>`<span>${E(x.a)} <b>${x.n}</b></span>`).join('')}</div>`:''}
    <h3 class="m-h">⏰ משימות באיחור</h3><div class="m-grid">${late.map(taskCard).join('')||'<div class="m-empty">אין משימות באיחור 👏</div>'}</div>`;
}
window.M_go=function(id){ M.view='tasks'; M.f={st:'active',who:id,area:'',q:''}; msgRender(); };

window.msgRender=function(){
  const el=document.getElementById('msgBody'); if(!el||!me()) return;
  badge();
  if(!M.ok){ el.innerHTML=M.err?`<div class="m-err">${E(M.err)}</div>`:'<div class="m-empty">טוען…</div>'; msgStart(); return; }
  const nP=list(M.posts).filter(needAck).length, nT=list(M.tasks).filter(t=>mineT(t)&&t.st!=='done').length;
  const nA=openAlerts().filter(a=>myStudents().some(s=>s.n===a.stu)).length;
  const tabs=[['mine','📥 היום שלי',nP+nT],['tasks','✅ משימות',0],['students','🧑‍🎓 חניכים',nA],['posts','📢 הודעות',nP]].concat(canTask()?[['stu','🎓 הודעות לחניכים',0]]:[]).concat(isAdmin()?[['track','📊 מעקב',0]]:[]);
  const nb=window.Notification&&Notification.permission==='default'?'<button class="m-btn2 sm" onclick="msgNotifOn()">🔔 הפעלת התראות בדפדפן</button>':'';
  const body=M.view==='tasks'?vTasks():M.view==='students'?vStudents():M.view==='posts'?vPosts():M.view==='stu'&&canTask()?vStu():M.view==='track'&&isAdmin()?vTrack():vMine();
  const t=M.open&&M.tasks[M.open]?Object.assign({id:M.open},M.tasks[M.open]):null;
  el.innerHTML=`<div class="m-tabs">${tabs.map(([k,l,n])=>`<button class="${M.view===k?'on':''}" onclick="msgView('${k}')">${l}${n?` <span class="m-n">${n}</span>`:''}</button>`).join('')}<span style="flex:1"></span><button class="m-btn2 sm" onclick="msgMyPhone()" title="כדי שאפשר יהיה לשלוח לך הודעות מהפורטל בוואטסאפ">📱 ${M.phones[me().id]?'המספר שלי לוואטסאפ':'הוספת המספר שלי לוואטסאפ'}</button>${nb}</div>
    ${body}${M.form?taskForm():M.lf?logForm():t?taskModal(t):M.wa?waModal():M.stu?stuModal():''}`;
  if(t&&mineT(t)&&!(t.seen||{})[me().id]) patch('tasks/'+t.id+'/seen',{[me().id]:Date.now()});
};

/* ═══════════ וואטסאפ (בקשת יובל 27.11.2026): לחיצה אחת לכל נמען — נפתח וואטסאפ עם ההודעה מוכנה ═══════════
   מספרי הצוות: portal/bogeret/secure/msg/phones/<מזהה משתמש> (כל אחד מוסיף את שלו, הרכז — של כולם).
   מספרי החניכים: מתוך רשימת החניכים בפורטל (שדה הטלפון). */
const waNum=ph=>{ let d=String(ph||'').replace(/\D/g,''); if(!d) return ''; if(d.startsWith('972')) return d; if(d.startsWith('0')) return '972'+d.slice(1); return d.length===9?'972'+d:d; };
const waTxt=(title,body,from)=>[title?'*'+title+'*':'',body,from?'— '+from:''].filter(Boolean).join('\n');
/* במחשב — ישר לוואטסאפ ווב, תמיד באותה לשונית (WA_WIN), בלי דף המעבר של wa.me. בטלפון — לאפליקציה */
const WA_MOBILE=/android|iphone|ipad|ipod/i.test(navigator.userAgent), WA_WIN='bogeret_whatsapp';
const waHref=(ph,txt)=>WA_MOBILE?`https://wa.me/${ph?waNum(ph):''}?text=${encodeURIComponent(txt)}`
  :`https://web.whatsapp.com/send?${ph?'phone='+waNum(ph)+'&':''}text=${encodeURIComponent(txt)}`;
window.msgWa=function(k,id){ M.wa={k,id}; msgRender(); };
function waRows(){
  const w=M.wa; if(!w) return {txt:'',rows:[]};
  if(w.k==='staff'){ const p=w.p||M.posts[w.id]; if(!p) return {txt:'',rows:[]};
    const txt=waTxt(p.title,p.body,uName(p.by)+' · פורטל בוגרת');
    return {txt,rows:audUsers(p).map(u=>({n:u.n,sub:u.r,ph:M.phones[u.id]||'',uid:u.id}))}; }
  const m=M.smsg[w.id]; if(!m) return {txt:'',rows:[]};
  const txt=waTxt(m.title,m.body,uName(m.by)+' · השכבה הבוגרת');
  return {txt,rows:stuTargets(m).map(s=>({n:s.n,sub:s.g,ph:s.ph||''}))};
}
function waModal(){
  const {txt,rows}=waRows(), has=rows.filter(r=>waNum(r.ph)).length;
  return `<div class="m-modal" onclick="if(event.target===this)msgClose()"><div class="m-dlg">
    <div class="m-dlg-h"><b>📲 שליחה בוואטסאפ</b><button class="m-x" onclick="msgClose()">✕</button></div>
    <div class="m-meta">ההודעה כבר נשמרה ${M.wa.k==='staff'?'בפורטל':'לחניכים'}. כאן שולחים אותה גם בוואטסאפ: כל לחיצה פותחת שיחה עם ההודעה מוכנה — רק ללחוץ "שליחה" בוואטסאפ.</div>
    <div class="m-wa-txt">${E(txt).replace(/\n/g,'<br>')}</div>
    <div class="m-wa-grp"><a class="m-wa-b big" target="${WA_WIN}" rel="noopener" href="${waHref('',txt)}">📲 שליחה לקבוצת וואטסאפ</a>
      <div class="m-sub">וואטסאפ ייפתח עם ההודעה מוכנה — בוחרים את הקבוצה (למשל קבוצת הצוות) ולוחצים שליחה. אפשר גם <a href="#" onclick="msgWaCopy();return false">להעתיק את ההודעה</a> ולהדביק.</div></div>
    <details class="m-wa-one"><summary>או לשלוח לכל אחד בנפרד (${has} מתוך ${rows.length} עם מספר)</summary>
    <div class="m-wa-list">${rows.map((r,i)=>`<div class="m-wa-r"><div style="flex:1;min-width:0"><b>${E(r.n)}</b> <small>${E(r.sub||'')}</small></div>
      ${waNum(r.ph)?`<a class="m-wa-b" target="${WA_WIN}" rel="noopener" href="${waHref(r.ph,txt)}" onclick="this.classList.add('sent')">📲 שליחה</a>`
        :r.uid&&(isAdmin()||r.uid===me().id)?`<input class="m-wa-in" id="wap-${i}" placeholder="05X-XXXXXXX" inputmode="tel"><button class="m-btn2 sm" onclick="msgPhone('${r.uid}','wap-${i}')">שמירה</button>`
        :'<span class="m-sub">אין מספר</span>'}</div>`).join('')||'<div class="m-empty">אין נמענים</div>'}</div></details>
    <div class="m-dlg-f"><button class="m-btn2" onclick="msgClose()">סגירה</button></div></div></div>`;
}
window.msgWaCopy=function(){ const {txt}=waRows(); navigator.clipboard.writeText(txt).then(()=>msgToast('📋 ההודעה הועתקה'),()=>prompt('העתיקו:',txt)); };
window.msgPhone=function(u,inId){ const v=(document.getElementById(inId)||{}).value||''; const d=v.replace(/\D/g,'');
  if(d.length<9){ msgToast('מספר לא תקין'); return; } M.phones[u]=v.trim(); put('phones/'+u,v.trim()); msgToast('📱 המספר נשמר'); msgRender(); };
window.msgMyPhone=function(){ const cur=M.phones[me().id]||''; const v=prompt('המספר שלך לוואטסאפ (כדי שהצוות יוכל לשלוח לך הודעות מהפורטל):',cur); if(v==null) return;
  const d=v.replace(/\D/g,''); if(d&&d.length<9){ msgToast('מספר לא תקין'); return; } put('phones/'+me().id,v.trim()||null); msgToast('📱 נשמר'); };

/* ═══════════ הודעות לחניכים: באפליקציית החניכים (me.html) + וואטסאפ ═══════════
   msg/smsg/<id> = {title, body, to:{g:[קבוצות]} או {n:[שמות]}, by, at, inApp}
   לכל חניך/ה עם חשבון באפליקציה: secure/stu/<מזהה>/in/<id> (וסימון קריאה: stu/<מזהה>/inr/<id>) */
const sGrade=s=>String(s.l||'').replace(/['׳"]/g,'');
function stuGroups(){ const all=[...new Set(students().map(s=>s.g).filter(Boolean))].sort(), u=me(); if(!u) return [];
  if(u.mode==='admin'||u.scope==='all') return all; const named=all.filter(g=>String(u.r||'').includes(g)); if(named.length) return named;
  if(u.scope==='academy') return all.filter(g=>g==='אקדמיה');
  if(u.scope==='ya') return all.filter(g=>students().some(s=>s.g===g&&sGrade(s)==='יא'));
  if(u.scope==='yb') return all.filter(g=>students().some(s=>s.g===g&&sGrade(s)==='יב'));
  return all; }
function stuTargets(m){ const to=m.to||{}; return students().filter(s=>(to.n||[]).includes(s.n)||(to.g||[]).includes(s.g)); }
const sKey=n=>typeof sha256hex==='function'?sha256hex('stu:'+n).slice(0,12):'';
let STU_ACC=null;
async function stuAcc(){ if(STU_ACC) return STU_ACC; try{ const {dbm,rdb}=await db(); STU_ACC=(await dbm.get(dbm.ref(rdb,'portal/bogeret/secure/stu'))).val()||{}; }catch(e){ STU_ACC={}; } setTimeout(()=>{STU_ACC=null},60000); return STU_ACC; }
function vStu(){
  const gs=stuGroups(), f=M.sf; if(!f.g) f.g=[];
  const L=list(M.smsg).filter(m=>stuTargets(m).some(s=>gs.includes(s.g))).sort((a,b)=>b.at-a.at);
  const pickList=f.g.length?students().filter(s=>f.g.includes(s.g)).sort((a,b)=>a.n.localeCompare(b.n,'he')):[];
  return `<div class="m-compose"><div class="m-ch">🎓 הודעה חדשה לחניכים</div>
    <input id="ms-title" placeholder="כותרת (לא חובה)" value="${E(f.title||'')}">
    <textarea id="ms-body" placeholder="מה רוצים להגיד לחניכים?">${E(f.body||'')}</textarea>
    <div class="m-lbl">לאילו קבוצות:</div><div class="m-pick">${gs.map(g=>`<label><input type="checkbox" class="ms-g" value="${E(g)}" ${f.g.includes(g)?'checked':''} onchange="msgStuG()"> ${E(g)}</label>`).join('')}</div>
    ${pickList.length?`<label class="m-cb"><input type="checkbox" id="ms-some" ${f.some?'checked':''} onchange="msgStuG()"> רק לחלק מהחניכים</label>
      ${f.some?`<div class="m-pick">${pickList.map(s=>`<label><input type="checkbox" class="ms-n" value="${E(s.n)}" ${(f.n||[]).includes(s.n)?'checked':''}> ${E(s.n)} <small>${E(s.g)}</small></label>`).join('')}</div>`:''}`:''}
    <div class="m-crow"><label class="m-cb"><input type="checkbox" id="ms-wa" ${f.wa===false?'':'checked'}> 📲 גם בוואטסאפ</label>
      <span class="m-sub">באפליקציה ההודעה מגיעה לחניכים שכבר קיבלו קוד כניסה (עם התראה לטלפון).</span><span style="flex:1"></span>
      <button class="m-btn" onclick="msgStuSend()">שליחה</button></div></div>
  ${L.map(m=>{ const tg=stuTargets(m), to=m.to||{};
    return `<div class="m-post"><div class="m-post-h">${av(m.by,34)}<div style="flex:1;min-width:0"><b>${E(uName(m.by))}</b><div class="m-sub">${fmtAt(m.at)} · אל: ${E((to.n&&to.n.length)?to.n.length+' חניכים':(to.g||[]).join(', '))} (${tg.length})${m.inApp!=null?` · באפליקציה: ${m.inApp}`:''}</div></div>
      <button class="m-x" title="שליחה בוואטסאפ" onclick="msgWa('stu','${m.id}')">📲</button>${(m.by===me().id||isAdmin())?`<button class="m-x" title="מחיקה" onclick="msgStuDel('${m.id}')">🗑️</button>`:''}</div>
      ${m.title?`<div class="m-post-t">${E(m.title)}</div>`:''}<div class="m-post-b">${E(m.body).replace(/\n/g,'<br>')}</div></div>`; }).join('')||'<div class="m-empty">עוד לא נשלחו הודעות לחניכים</div>'}`;
}
function stuFormRead(){ const g=k=>document.getElementById('ms-'+k); const f=M.sf;
  f.title=(g('title')||{}).value||''; f.body=(g('body')||{}).value||''; f.g=[...document.querySelectorAll('.ms-g:checked')].map(x=>x.value);
  f.some=!!(g('some')&&g('some').checked); f.n=[...document.querySelectorAll('.ms-n:checked')].map(x=>x.value); f.wa=!!(g('wa')&&g('wa').checked); return f; }
window.msgStuG=function(){ stuFormRead(); msgRender(); };
window.msgStuSend=async function(){
  const f=stuFormRead(), title=f.title.trim(), body=f.body.trim();
  if(!title&&!body){ msgToast('כתבו תוכן להודעה'); return; }
  if(!f.g.length){ msgToast('בחרו לפחות קבוצה אחת'); return; }
  const to=f.some?{n:f.n.filter(n=>students().some(s=>s.n===n&&f.g.includes(s.g)))}:{g:f.g};
  if(f.some&&!to.n.length){ msgToast('בחרו חניכים'); return; }
  const id=uid(), at=Date.now(), m={title,body,to,by:me().id,at};
  const acc=await stuAcc(), up={}; let n=0;
  stuTargets(m).forEach(s=>{ const k=sKey(s.n); if(k&&acc[k]&&acc[k].p){ up[`${k}/in/${id}`]={title,body,by:uName(me().id),at}; n++; } });
  m.inApp=n;
  const ok=await put('smsg/'+id,m); if(!ok) return;
  if(n) await run((dbm,rdb)=>dbm.update(dbm.ref(rdb,'portal/bogeret/secure/stu'),up),'⚠️ השליחה לאפליקציה נכשלה');
  M.sf={wa:f.wa}; msgToast(`🎓 ההודעה נשמרה${n?` ונשלחה ל-${n} חניכים באפליקציה`:''}`);
  if(f.wa){ M.smsg[id]=m; M.wa={k:'stu',id}; } msgRender();
};
window.msgStuDel=async function(id){ const m=M.smsg[id]; if(!m||!confirm('למחוק את ההודעה? היא תימחק גם מהאפליקציה של החניכים.')) return;
  const acc=await stuAcc(), up={}; stuTargets(m).forEach(s=>{ const k=sKey(s.n); if(k&&acc[k]){ up[`${k}/in/${id}`]=null; up[`${k}/inr/${id}`]=null; } });
  if(Object.keys(up).length) await run((dbm,rdb)=>dbm.update(dbm.ref(rdb,'portal/bogeret/secure/stu'),up));
  del('smsg/'+id); };

/* ═══════════ יכולות CRM (בקשת יובל 28.11.2026) — מה שעובד במערכות המובילות, מותאם לבוגרת ═══════════
   • כרטיס 360° לחניך/ה (כמו HubSpot): ציר זמן אחד של כל המגעים, המשימות וההתרעות
   • תיעוד מגע מהיר + "צעד הבא" שהופך למשימה עם תאריך (כמו Pipedrive)
   • "חניכים שנשכחו": מי שלא היה איתו/ה קשר מעל 14 יום מסומן (כמו "עסקאות מרקיבות" ב-Pipedrive)
   • התרעות דאגה פתוחות עד שמסמנים "טופל" (כמו Early Alerts ב-Salesforce Education)
   • משימות חוזרות ורשימת תיוג בתוך משימה (כמו monday / Asana), ותור "היום שלי"
   נשמר ב: msg/logs/<id> = {stu, k, x, on, by, at, res?, resBy?}  (k: סוג המגע; alert = התרעה פתוחה עד res) */
const ROT=14;
const REP={'':'לא חוזרת',w:'כל שבוע','2w':'כל שבועיים',m:'כל חודש'};
const KINDS={stu:{l:'שיחה עם החניך/ה',i:'🗣️'},par:{l:'שיחה עם הורים',i:'📞'},meet:{l:'פגישה',i:'🤝'},home:{l:'ביקור בית',i:'🏠'},msg:{l:'הודעה / וואטסאפ',i:'💬'},note:{l:'הערה בלבד',i:'📝'},alert:{l:'דאגה / התרעה',i:'⚠️'}};
const jq=s=>E(String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
const isoOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function nextDue(iso,r){ const d=new Date(iso+'T12:00:00'), t=todayIso();
  const step=()=>{ if(r==='m') d.setMonth(d.getMonth()+1); else d.setDate(d.getDate()+(r==='2w'?14:7)); };
  step(); while(isoOf(d)<t) step(); return isoOf(d); }
const ckTxt=t=>{ const v=Object.values(t.ck||{}).filter(c=>c&&c.x); return v.length?v.filter(c=>c.ok).length+'/'+v.length:''; };
function ckBox(t,ed){ const L=Object.entries(t.ck||{}).filter(([k,c])=>c&&c.x);
  if(!L.length&&!ed) return '';
  return `<div class="m-lbl">☑️ רשימת תיוג ${ckTxt(t)?'<small>('+ckTxt(t)+')</small>':''}</div><div class="m-ck">
    ${L.map(([k,c])=>`<label class="${c.ok?'ok':''}"><input type="checkbox" ${c.ok?'checked':''} ${ed?'':'disabled'} onchange="msgCk('${t.id}','${k}',this.checked)"> <span>${E(c.x)}</span>${ed?`<button class="m-x" title="הסרה" onclick="event.preventDefault();msgCkDel('${t.id}','${k}')">✕</button>`:''}</label>`).join('')}
    ${ed?`<div class="m-repbox"><input id="ck-${t.id}" placeholder="הוספת שלב…" onkeydown="if(event.key==='Enter')msgCkAdd('${t.id}')"><button onclick="msgCkAdd('${t.id}')">הוספה</button></div>`:''}</div>`; }
window.msgCk=function(tid,k,v){ patch('tasks/'+tid+'/ck/'+k,{ok:!!v,by:me().id}); };
window.msgCkDel=function(tid,k){ del('tasks/'+tid+'/ck/'+k); };
window.msgCkAdd=function(tid){ const i=document.getElementById('ck-'+tid); const x=(i&&i.value||'').trim(); if(!x) return; put('tasks/'+tid+'/ck/'+uid(),{x,ok:false}); i.value=''; };

/* ---- חניכים: קשר אחרון, התרעות ---- */
const myStudents=()=>{ const gs=stuGroups(); return students().filter(s=>gs.includes(s.g)); };
const logTs=l=>l.on?new Date(l.on+'T12:00:00').getTime():l.at;
function contactMap(){ const m={}; list(M.logs).forEach(l=>{ if(l.k==='note'||!l.stu) return; const t=logTs(l); if(!m[l.stu]||m[l.stu].t<t) m[l.stu]={t,l}; }); return m; }
const daysAgo=ts=>Math.max(0,Math.round((new Date(todayIso()+'T12:00:00')-new Date(isoOf(new Date(ts))+'T12:00:00'))/864e5));
const openAlerts=()=>list(M.logs).filter(l=>l.k==='alert'&&!l.res);
const agoTxt=n=>n===0?'היום':n===1?'אתמול':`לפני ${n} ימים`;
function vStudents(){
  const f=M.sF, q=f.q.trim(), cm=contactMap(), al=openAlerts(), wk=Date.now()-7*864e5, gs=stuGroups();
  const all=myStudents().map(s=>{ const c=cm[s.n], d=c?daysAgo(c.t):null;
    return {s,c,d,rot:d==null||d>=ROT,al:al.filter(a=>a.stu===s.n),tk:list(M.tasks).filter(t=>t.stu===s.n&&t.st!=='done').length}; });
  let A=all.filter(r=>(!f.g||r.s.g===f.g)&&(!q||r.s.n.includes(q)));
  if(f.w==='rot') A=A.filter(r=>r.rot); else if(f.w==='alert') A=A.filter(r=>r.al.length);
  A.sort((a,b)=>(b.al.length-a.al.length)||((b.d==null?1e4:b.d)-(a.d==null?1e4:a.d))||a.s.n.localeCompare(b.s.n,'he'));
  const tile=(n,l,c,w)=>`<div class="m-tile m-click" style="--c:${c}" onclick="msgSF('w','${w}')"><b>${n}</b><small>${l}</small></div>`;
  const nWeek=list(M.logs).filter(l=>l.k!=='note'&&l.at>wk&&myStudents().some(s=>s.n===l.stu)).length;
  return `<div class="m-tiles">${tile(all.filter(r=>r.al.length).length,'עם התרעת דאגה פתוחה','#b91c1c','alert')}${tile(all.filter(r=>r.rot).length,`בלי קשר מעל ${ROT} יום`,'#c2410c','rot')}${tile(nWeek,'מגעים שתועדו השבוע','#047857','all')}${tile(all.length,'חניכים','#8E033C','all')}</div>
    <div class="m-bar" style="margin-top:12px">
      ${[['rot',`🕰️ בלי קשר ${ROT}+ יום`],['alert','⚠️ עם התרעה'],['all','כולם']].map(([k,l])=>`<button class="m-f${f.w===k?' on':''}" onclick="msgSF('w','${k}')">${l}</button>`).join('')}
      ${gs.length>1?`<select onchange="msgSF('g',this.value)"><option value="">כל הקבוצות</option>${gs.map(g=>`<option ${f.g===g?'selected':''}>${E(g)}</option>`).join('')}</select>`:''}
      <input class="m-q" placeholder="🔍 שם חניך/ה" value="${E(f.q)}" onchange="msgSF('q',this.value)">
      ${canTask()?'<button class="m-btn" onclick="msgLog()">➕ תיעוד מגע</button>':''}</div>
    <div class="m-tblw"><table class="m-tbl"><thead><tr><th>חניך/ה</th><th>קבוצה</th><th>מגע אחרון</th><th>משימות פתוחות</th><th></th></tr></thead><tbody>
    ${A.map(r=>`<tr class="${r.al.length?'m-ral':r.rot?'m-rrot':''}"><td><a href="#" onclick="msgOpenStu('${jq(r.s.n)}');return false"><b>${E(r.s.n)}</b></a>${r.al.length?' <span class="m-urg">⚠️ התרעה</span>':''}</td><td>${E(r.s.g)}</td>
      <td>${r.c?`${KINDS[r.c.l.k]?KINDS[r.c.l.k].i:''} ${agoTxt(r.d)} <small>· ${E(uName(r.c.l.by))}</small>`:'<span class="m-sub">עוד לא תועד קשר</span>'}</td>
      <td>${r.tk||''}</td><td>${canTask()?`<button class="m-btn2 sm" onclick="msgLog('${jq(r.s.n)}')">➕ תיעוד</button>`:''}</td></tr>`).join('')||`<tr><td colspan="5" class="m-empty">${f.w==='rot'?'כל החניכים בקשר שוטף 👏':'אין חניכים להצגה'}</td></tr>`}
    </tbody></table></div>
    <div class="m-sub" style="margin-top:8px">חניך/ה מסומנים "בלי קשר" אם לא תועדה שיחה/פגישה/הודעה איתם או עם ההורים ב-${ROT} הימים האחרונים. הערה בלבד לא נחשבת קשר.</div>`;
}
window.msgSF=function(k,v){ M.sF[k]=v; msgRender(); };
window.msgOpenStu=function(name){ const sm=document.getElementById('student-modal'); if(sm) sm.style.display='none';
  M.open=null; M.form=null; M.lf=null; M.wa=null; M.stu=name; if(!active()) show('msg'); else msgRender(); };
window.msgLog=function(name){ if(!canTask()) return; const sm=document.getElementById('student-modal'); if(sm) sm.style.display='none';
  M.lf={stu:name||M.stu||'',k:'stu',on:todayIso(),x:'',nx:'',nd:'',nw:me().id}; if(!active()) show('msg'); else msgRender(); };
window.msgLogK=function(k){ logRead(); M.lf.k=k; msgRender(); };
function logRead(){ const g=k=>document.getElementById('lf-'+k), f=M.lf; ['stu','on','x','nx','nd','nw'].forEach(k=>{ if(g(k)) f[k]=g(k).value; }); return f; }
window.msgSaveLog=function(){
  const f=logRead(), stu=f.stu.trim(), x=f.x.trim();
  if(stuIdx(stu)<0){ msgToast('בחרו חניך/ה מהרשימה'); return; }
  if(!x){ msgToast('כתבו בקצרה מה היה'); return; }
  const id=uid(); put('logs/'+id,{stu,k:f.k,x,on:f.on||todayIso(),by:me().id,at:Date.now()});
  const nx=f.nx.trim();
  if(nx){ put('tasks/'+uid(),{t:nx,d:'בעקבות '+(KINDS[f.k]||KINDS.note).l+': '+x.slice(0,200),area:f.k==='par'?'משפחות':f.k==='alert'?'רווחה ורמזור':'',who:[f.nw||me().id],due:f.nd||'',pri:f.k==='alert'?'high':'low',stu,st:'open',by:me().id,at:Date.now(),upd:Date.now(),from:id}); }
  M.lf=null; msgToast(nx?'✅ המגע תועד ונפתחה משימה לצעד הבא':'✅ המגע תועד'); msgRender();
};
window.msgAlertRes=function(id){ if(!canTask()) return; patch('logs/'+id,{res:Date.now(),resBy:me().id}); msgToast('✓ ההתרעה סומנה כטופלה'); };
window.msgLogDel=function(id){ const l=M.logs[id]; if(!l||!(isAdmin()||l.by===me().id)) return; if(confirm('למחוק את התיעוד?')) del('logs/'+id); };
function logForm(){
  const f=M.lf, L=myStudents().length?myStudents():students();
  return `<div class="m-modal" onclick="if(event.target===this)msgClose()"><div class="m-dlg">
    <div class="m-dlg-h"><b>📝 תיעוד מגע עם חניך/ה</b><button class="m-x" onclick="msgClose()">✕</button></div>
    <label>חניך/ה<input id="lf-stu" list="lf-stul" value="${E(f.stu)}" placeholder="התחילו להקליד שם…"><datalist id="lf-stul">${L.map(s=>`<option value="${E(s.n)}">${E(s.g)}</option>`).join('')}</datalist></label>
    <div class="m-lbl">סוג המגע</div><div class="m-pick">${Object.entries(KINDS).map(([k,v])=>`<label><input type="radio" name="lf-k" ${f.k===k?'checked':''} onchange="msgLogK('${k}')"> ${v.i} ${v.l}</label>`).join('')}</div>
    ${f.k==='alert'?'<div class="m-sub" style="color:#b91c1c">⚠️ התרעה נשארת פתוחה ומסומנת אצל כל הצוות עד שמישהו לוחץ "טופל".</div>':''}
    <div class="m-g3"><label>מתי<input type="date" id="lf-on" value="${E(f.on)}"></label></div>
    <label>מה היה? <textarea id="lf-x" placeholder="בקצרה: על מה דיברנו, מה עלה, איך החניך/ה">${E(f.x)}</textarea></label>
    <div class="m-next"><div class="m-lbl">➡️ צעד הבא <small>(לא חובה — הופך למשימה עם תאריך)</small></div>
      <input id="lf-nx" value="${E(f.nx)}" placeholder="למשל: לחזור להורים ביום ראשון / לבדוק עם המורה למתמטיקה">
      <div class="m-g3"><label>עד מתי<input type="date" id="lf-nd" value="${E(f.nd)}"></label>
        <label>מי אחראי/ת<select id="lf-nw">${staff().map(u=>`<option value="${u.id}" ${f.nw===u.id?'selected':''}>${E(u.n)}</option>`).join('')}</select></label></div></div>
    <div class="m-dlg-f"><button class="m-btn" onclick="msgSaveLog()">שמירה</button><button class="m-btn2" onclick="msgClose()">ביטול</button></div></div></div>`;
}
function stuModal(){
  const n=M.stu, s=students().find(x=>x.n===n)||{n,g:''}, cm=contactMap()[n], d=cm?daysAgo(cm.t):null;
  const logs=list(M.logs).filter(l=>l.stu===n), al=logs.filter(l=>l.k==='alert'&&!l.res);
  const tks=list(M.tasks).filter(t=>t.stu===n), open=sortTasks(tks.filter(t=>t.st!=='done'));
  const ev=[];
  logs.forEach(l=>{ const k=KINDS[l.k]||KINDS.note; ev.push({ts:logTs(l),h:`<div class="m-ev${l.k==='alert'?' al':''}"><span class="m-evi">${k.i}</span><div style="flex:1;min-width:0"><b>${k.l}</b> <small>· ${E(uName(l.by))} · ${fmtAt(logTs(l)).replace(/ \d\d:\d\d$/,'')}</small>
      ${l.k==='alert'?(l.res?`<span class="m-acked"> · ✓ טופל (${E(uName(l.resBy))})</span>`:' <span class="m-urg">פתוחה</span>'):''}<div>${E(l.x).replace(/\n/g,'<br>')}</div></div>${(isAdmin()||l.by===me().id)?`<button class="m-x" title="מחיקה" onclick="msgLogDel('${l.id}')">🗑️</button>`:''}</div>`}); });
  tks.forEach(t=>{ ev.push({ts:t.at,h:`<div class="m-ev tk" onclick="msgOpenTask('${t.id}')"><span class="m-evi">✅</span><div><b>משימה נפתחה:</b> ${E(t.t)} <small>· ${E(uName(t.by))} ← ${E((t.who||[]).map(uName).join(', '))} · ${fmtAt(t.at).replace(/ \d\d:\d\d$/,'')}</small></div></div>`});
    if(t.st==='done'&&t.doneAt) ev.push({ts:t.doneAt,h:`<div class="m-ev tk" onclick="msgOpenTask('${t.id}')"><span class="m-evi">✔️</span><div><b>משימה הושלמה:</b> ${E(t.t)} <small>· ${E(uName(t.doneBy))} · ${fmtAt(t.doneAt).replace(/ \d\d:\d\d$/,'')}</small></div></div>`}); });
  ev.sort((a,b)=>b.ts-a.ts);
  return `<div class="m-modal" onclick="if(event.target===this)msgClose()"><div class="m-dlg">
    <div class="m-dlg-h"><b>🧑‍🎓 ${E(n)} <small class="m-sub">${E(s.g||'')}${s.cls?' · '+E(s.cls):''}</small></b><button class="m-x" onclick="msgClose()">✕</button></div>
    <div class="m-tiles m-tiles-s"><div class="m-tile" style="--c:${d==null||d>=ROT?'#c2410c':'#047857'}"><b>${d==null?'—':d}</b><small>${d==null?'עוד לא תועד קשר':'ימים מהמגע האחרון'}</small></div>
      <div class="m-tile" style="--c:#8E033C"><b>${open.length}</b><small>משימות פתוחות</small></div>
      <div class="m-tile" style="--c:#b91c1c"><b>${al.length}</b><small>התרעות פתוחות</small></div></div>
    <div class="m-dlg-f" style="flex-wrap:wrap">${canTask()?`<button class="m-btn" onclick="msgLog('${jq(n)}')">📝 תיעוד מגע</button><button class="m-btn2" onclick="msgNewTask({stu:'${jq(n)}'})">✅ משימה חדשה</button>`:''}
      ${stuIdx(n)>=0?`<button class="m-btn2" onclick="msgStu('${jq(n)}')">🪪 כרטיס חניך/ה</button>`:''}</div>
    ${al.length?`<div class="m-lbl" style="color:#b91c1c">⚠️ התרעות דאגה פתוחות</div>${al.map(a=>`<div class="m-alert"><div style="flex:1">${E(a.x)} <small class="m-sub">· ${E(uName(a.by))} · ${fmtAt(logTs(a)).replace(/ \d\d:\d\d$/,'')}</small></div>${canTask()?`<button class="m-btn2 sm" onclick="msgAlertRes('${a.id}')">✓ טופל</button>`:''}</div>`).join('')}`:''}
    ${open.length?`<div class="m-lbl">✅ משימות פתוחות</div>${open.map(taskCard).join('')}`:''}
    <div class="m-lbl">🕓 ציר זמן</div><div class="m-tl">${ev.map(e=>e.h).join('')||'<div class="m-sys">עוד אין תיעוד. לחצו "תיעוד מגע" כדי להתחיל.</div>'}</div></div></div>`;
}
/* תוספת לכרטיס החניך/ה הרגיל בפורטל: מגע אחרון + כפתורים */
const prevSSD=window.showStudentDetails;
if(prevSSD) window.showStudentDetails=function(idx){ prevSSD(idx);
  try{ const s=(idx<STUDENTS_DATA.length)?STUDENTS_DATA[idx]:(typeof ACAD_STUDENTS!=='undefined'?ACAD_STUDENTS[idx-STUDENTS_DATA.length]:null);
    const b=document.getElementById('student-modal-body'); if(!s||!b||!me()||me().lcOnly||!M.ok) return;
    const c=contactMap()[s.n], d=c?daysAgo(c.t):null, al=openAlerts().filter(a=>a.stu===s.n).length, tk=list(M.tasks).filter(t=>t.stu===s.n&&t.st!=='done').length;
    const box=document.createElement('div'); box.className='m-ssd';
    box.innerHTML=`<div><b>📇 קשר ומעקב</b> · ${c?`מגע אחרון ${agoTxt(d)} (${E(KINDS[c.l.k]?KINDS[c.l.k].l:'')}, ${E(uName(c.l.by))})`:'עוד לא תועד קשר'}${tk?` · ${tk} משימות פתוחות`:''}${al?` · <b style="color:#b91c1c">⚠️ ${al} התרעות</b>`:''}</div>
      <div class="m-ssd-b"><button onclick="msgOpenStu('${jq(s.n)}')">🕓 ציר זמן מלא</button>${canTask()?`<button onclick="msgLog('${jq(s.n)}')">📝 תיעוד מגע</button>`:''}</div>`;
    b.appendChild(box); }catch(e){ console.warn(e); } };

/* ---------- חיבור לפורטל ---------- */
window.msgMount=function(){
  if(!me()||me().lcOnly){ const b=document.getElementById('tab-msg'); if(b) b.remove(); return; }
  if(!document.getElementById('sec-msg')){
    const s=document.createElement('div'); s.className='sec'; s.id='sec-msg';
    s.innerHTML=`<div class="info-box"><div class="icon">💬</div><div><b>קשר ומעקב — הצוות והחניכים במקום אחד</b><br>משימות עם אחראי ותאריך יעד, הודעות לצוות עם אישור קריאה, ותיעוד הקשר עם כל חניך/ה (ציר זמן, התרעות דאגה, ומי לא דיברו איתו מזמן). הכל נשמר בענן ומתעדכן אצל כולם מיד.</div></div><div id="msgBody"></div>`;
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
.m-wa-txt{background:#dcf8c6;border-radius:10px;padding:10px 12px;font-size:14px;margin-top:8px}
.m-wa-list{max-height:46vh;overflow:auto;border:1px solid #F3C2B0;border-radius:10px}
.m-wa-r{display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid #f6e3dc}.m-wa-r:first-child{border-top:0}
.m-wa-b{background:#25D366;color:#fff;border-radius:999px;padding:5px 12px;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap}
.m-wa-b.sent{background:#9ca3af}.m-wa-b.sent::after{content:' ✓'}
.m-wa-in{width:130px!important;padding:5px 8px!important}
.m-wa-grp{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin:10px 0;display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.m-wa-b.big{font-size:15px;padding:9px 18px}
.m-wa-one summary{cursor:pointer;font-weight:700;color:#7A6A66;margin:6px 0}
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
.m-click{cursor:pointer}.m-click:hover{box-shadow:0 4px 14px rgba(142,3,60,.12)}
.m-qh{font:800 14px Heebo,sans-serif;color:#52637a;margin:12px 2px 6px}.m-qh b{background:#FFF1EB;border-radius:999px;padding:0 8px;color:#8E033C}
.m-tbl tr.m-rrot td:first-child{border-right:4px solid #c2410c}.m-tbl tr.m-ral td:first-child{border-right:4px solid #b91c1c}.m-tbl tr.m-ral{background:#fff7f7}
.m-tbl a{color:#0f1e2e;text-decoration:none}.m-tbl a:hover{text-decoration:underline}
.m-tiles-s .m-tile{padding:8px}.m-tiles-s .m-tile b{font-size:22px}
.m-tl{display:flex;flex-direction:column;gap:6px;border-right:3px solid #F3C2B0;padding-right:10px;max-height:46vh;overflow:auto}
.m-ev{display:flex;gap:8px;align-items:flex-start;background:#FBF6F3;border-radius:10px;padding:8px 10px;font-size:13.5px;line-height:1.5}.m-ev small{color:#8496ab}
.m-ev.al{background:#fff1f1;border:1px solid #fecaca}.m-ev.tk{background:#fff;border:1px dashed #F3C2B0;cursor:pointer}.m-evi{font-size:17px;flex:none}
.m-alert{display:flex;gap:8px;align-items:center;background:#fff1f1;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;font-size:13.5px}
.m-next{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:7px}
.m-ck{display:flex;flex-direction:column;gap:4px}.m-ck>label{display:flex;gap:7px;align-items:center;font-size:14px;padding:4px 6px;border-radius:8px}.m-ck>label:hover{background:#FBF6F3}
.m-ck>label span{flex:1}.m-ck>label.ok span{text-decoration:line-through;color:#8496ab}.m-ck input[type=checkbox]{width:auto!important}
.m-ssd{margin-top:12px;background:#FFF1EB;border:1px solid #F3C2B0;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.6}
.m-ssd-b{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}.m-ssd-b button{border:1px solid #F3C2B0;background:#fff;color:#8E033C;border-radius:9px;padding:6px 12px;font:700 13px Heebo,sans-serif;cursor:pointer}
`;
document.head.appendChild(css);
})();
