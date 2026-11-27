/* ═══════════════════════════════════════════════════════════════
   אזור ההורים — הצד של הצוות (לשונית "👪 הורים")
   • לכל חניך/ה יש קישור הורים קבוע ואישי: parent.html?f=<קוד>. בלי כניסה ובלי סיסמה.
   • הצוות מפרסם: 📰 סיכום שבוע · 🚌 אישור הורים לטיול/פעילות · 📋 סקר — לקבוצה אחת או יותר.
   • כל פרסום מועתק לתיבה של כל משפחה בקבוצות שנבחרו, וההורים עונים פעם אחת.
   נתיבים (באזור המוגן):
     fam_ix/<מזהה חניך>          = {t:קוד המשפחה, n, g}         — רשימת הקישורים (צוות)
     fam/<קוד>                    = {k, n, g, in:{פרסומים}, ans:{תשובות}} — מה שההורה רואה
     famit/<מזהה פרסום>           = הפרסום המקורי (צוות)
   ═══════════════════════════════════════════════════════════════ */
(function(){
const ROOT='portal/bogeret/secure';
const TYPES={week:['📰','סיכום שבוע'],trip:['🚌','אישור הורים לטיול / פעילות'],survey:['📋','סקר להורים']};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kOf=n=>sha256hex('stu:'+n).slice(0,12);
const toast=m=>window.msgToast?msgToast(m):alert(m);
const dt=t=>t?new Date(t).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+' '+new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'';
const fmtD=s=>s?s.split('-').reverse().slice(0,2).map(Number).join('.'):'';
const rnd=n=>{const A='abcdefghijkmnpqrstuvwxyz23456789',a=new Uint32Array(n);crypto.getRandomValues(a);return [...a].map(x=>A[x%A.length]).join('')};
const BASEURL=()=>location.origin+location.pathname.replace(/[^/]*$/,'');
const famLink=t=>BASEURL()+'parent.html?f='+t;

const F={ix:null, items:null, fam:null, grp:'', view:'list', open:{}, unsub:[]};
function students(){ return [...(typeof STUDENTS_DATA!=='undefined'?STUDENTS_DATA:[]), ...(typeof ACAD_STUDENTS!=='undefined'?ACAD_STUDENTS:[])].filter(s=>s&&s.n); }
const grade=s=>String(s.l||'').replace(/['׳"]/g,'');
function allGroups(){ return [...new Set(students().map(s=>s.g).filter(Boolean))].sort(); }
function myGroups(){
  const all=allGroups(); if(!ME) return [];
  if(ME.mode==='admin'||ME.scope==='all') return all;
  const named=all.filter(g=>String(ME.r||'').includes(g)); if(named.length) return named;
  if(ME.scope==='academy') return all.filter(g=>g==='אקדמיה');
  if(ME.scope==='ya') return all.filter(g=>students().some(s=>s.g===g&&grade(s)==='יא'));
  if(ME.scope==='yb') return all.filter(g=>students().some(s=>s.g===g&&grade(s)==='יב'));
  return all;
}
const canEdit=()=>ME&&ME.mode!=='view';
async function listen(){
  F.unsub.forEach(f=>{try{f()}catch(e){}}); F.unsub=[];
  const {dbm,rdb}=await secureDb();
  const on=(p,k)=>F.unsub.push(dbm.onValue(dbm.ref(rdb,`${ROOT}/${p}`),s=>{F[k]=s.val()||{};paint();},e=>{console.warn('fam',p,e);F[k]=F[k]||{};paint();}));
  on('fam_ix','ix'); on('famit','items'); on('fam','fam');
}

/* ── תצוגה ── */
function paint(){
  const el=document.getElementById('famdash'); if(!el||!ME) return;
  const gs=myGroups();
  if(F.ix==null||F.items==null||F.fam==null){ el.innerHTML='<div class="panel"><div class="panel-b ad-mut">טוען את אזור ההורים…</div></div>'; return; }
  const head=`<div class="info-box" style="border-right:5px solid #8E033C"><div class="icon">👪</div><div style="flex:1"><b>אזור ההורים</b><br>
    <span style="font-size:13px">לכל משפחה קישור אישי קבוע (בלי סיסמה). מה שמפרסמים כאן מופיע אצל ההורים של הקבוצות שבחרתם, וההורים עונים בלחיצה.
    כשמפרסמים משהו חדש — שולחים לקבוצת ההורים בוואטסאפ הודעה קצרה (יש כפתור שמכין אותה).</span></div>
    <div class="ad-btns">${canEdit()?`<button class="btn" data-v="new" style="background:#FC5028;color:#fff;border-color:#FC5028">➕ פרסום חדש</button>`:''}<button class="btn" data-v="list">📬 הפרסומים</button><button class="btn" data-v="links">🔗 קישורי הורים</button></div></div>`;
  el.innerHTML=head+(F.view==='new'?newHtml(gs):F.view==='links'?linksHtml(gs):listHtml(gs));
  bind(el);
}
/* הפרסומים */
function famsOf(g){ return students().filter(s=>s.g===g).map(s=>({s,ix:F.ix[kOf(s.n)]})); }
function listHtml(gs){
  const its=Object.entries(F.items).filter(([,it])=>it&&(it.groups||[]).some(g=>gs.includes(g))).sort((a,b)=>b[1].at-a[1].at);
  if(!its.length) return `<div class="panel"><div class="panel-b ad-mut">עוד לא פורסם כלום להורים${canEdit()?' — לחצו "פרסום חדש".':'.'}</div></div>`;
  return its.map(([id,it])=>{
    const targets=students().filter(s=>(it.groups||[]).includes(s.g)&&gs.includes(s.g));
    const rows=targets.map(s=>{const ix=F.ix[kOf(s.n)],f=ix&&F.fam[ix.t],a=f&&f.ans&&f.ans[id],got=f&&f.in&&f.in[id];return {s,ix,a,got}});
    const ans=rows.filter(r=>r.a), yes=ans.filter(r=>r.a.ok===true).length, no=ans.filter(r=>r.a.ok===false).length, need=it.type!=='week';
    const open=F.open[id];
    return `<div class="panel" style="margin-bottom:12px"><div class="panel-h" style="cursor:pointer" data-open="${id}"><h2>${TYPES[it.type][0]} ${esc(it.title)}</h2>
      <span class="ad-mut" style="font-size:12.5px">${esc((it.groups||[]).join(', '))} · ${dt(it.at)} · ${esc(it.by||'')}${need?` · <b>ענו ${ans.length}/${rows.length}</b>${it.type==='trip'?` (✓${yes} ✕${no})`:''}`:` · נשלח ל-${rows.filter(r=>r.got).length} משפחות`} ${open?'▾':'◂'}</span></div>
      ${open?`<div class="panel-b">${it.date?`<div><b>מתי:</b> ${fmtD(it.date)}${it.place?' · '+esc(it.place):''}</div>`:''}${it.due?`<div><b>לאשר עד:</b> ${fmtD(it.due)}</div>`:''}
        <div style="white-space:pre-wrap;margin:6px 0 10px">${esc(it.body||'')}</div>
        ${it.type==='survey'?surveyResults(it,rows):''}
        ${need?`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>חניך/ה</th><th>תשובת ההורים</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.s.n)} <small class="ad-mut">${esc(r.s.g)}</small></td>
          <td>${!r.ix?'<span class="ad-mut">אין קישור הורים</span>':!r.a?'<span class="ad-mut">— עוד לא ענו</span>':
            `${it.type==='trip'?(r.a.ok?'<b style="color:#15803d">✓ מאשרים</b>':'<b style="color:#b91c1c">✕ לא מאשרים</b>'):'<b style="color:#15803d">✓ ענו</b>'} <small class="ad-mut">${esc(r.a.pn||'')} · ${dt(r.a.at)}</small>${r.a.note?`<div style="font-size:12.5px">${esc(r.a.note)}</div>`:''}`}</td>
          <td>${r.ix&&!r.a?`<a class="btn" target="_blank" href="https://wa.me/?text=${encodeURIComponent(`שלום, מחכה לתשובתכם באזור ההורים של ${String(r.s.n).split(' ')[0]}: "${it.title}"\n${famLink(r.ix.t)}`)}">📲 תזכורת</a>`:''}</td></tr>`).join('')}</tbody></table></div>`:''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" data-wa="${id}">📋 הודעה לקבוצת ההורים בוואטסאפ</button>
        ${canEdit()?`<button class="btn" data-del="${id}" style="color:#b91c1c">🗑️ מחיקה</button>`:''}</div></div>`:''}</div>`;
  }).join('');
}
function surveyResults(it,rows){
  return (it.qs||[]).map((q,i)=>{
    const vals=rows.map(r=>r.a&&r.a.a&&r.a.a[i]).filter(v=>v!=null&&v!=='');
    if(q.o&&q.o.length){ const c={}; vals.forEach(v=>c[v]=(c[v]||0)+1);
      return `<div style="margin:8px 0"><b>${i+1}. ${esc(q.q)}</b>${q.o.map(o=>{const n=c[o]||0,p=vals.length?Math.round(n*100/vals.length):0;return `<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span style="min-width:110px">${esc(o)}</span><span style="flex:1;background:#FFF1EB;border-radius:6px;height:12px"><span style="display:block;height:12px;border-radius:6px;background:#FC5028;width:${p}%"></span></span><span>${n}</span></div>`}).join('')}</div>`; }
    return `<div style="margin:8px 0"><b>${i+1}. ${esc(q.q)}</b>${vals.map(v=>`<div style="font-size:13px;border-right:3px solid #F3C2B0;padding-right:6px;margin:3px 0">${esc(v)}</div>`).join('')||'<div class="ad-mut">אין עדיין תשובות</div>'}</div>`;
  }).join('');
}
/* פרסום חדש */
function newHtml(gs){
  return `<div class="panel"><div class="panel-h"><h2>➕ פרסום חדש להורים</h2></div><div class="panel-b">
   <div class="ad-filt">${Object.entries(TYPES).map(([k,[ic,l]])=>`<label style="display:flex;gap:4px;align-items:center"><input type="radio" name="fty" value="${k}" ${k==='week'?'checked':''}> ${ic} ${l}</label>`).join('')}</div>
   <div style="margin:8px 0"><b>לאילו קבוצות:</b> ${gs.map(g=>`<label style="margin-inline-end:10px"><input type="checkbox" data-g value="${esc(g)}" ${gs.length===1?'checked':''}> ${esc(g)}</label>`).join('')}</div>
   <input class="ad-sel" id="f_title" placeholder="כותרת — למשל: סיכום שבוע 23–27.11 / טיול שנתי לגליל / סקר שביעות רצון" style="width:100%;margin-bottom:8px">
   <textarea class="ad-sel" id="f_body" rows="6" placeholder="התוכן להורים" style="width:100%"></textarea>
   <div id="f_trip" style="display:none;margin-top:8px" class="ad-filt"><label>תאריך הטיול <input type="date" class="ad-sel" id="f_date"></label><label>מקום <input class="ad-sel" id="f_place" placeholder="לאן"></label><label>לאשר עד <input type="date" class="ad-sel" id="f_due"></label></div>
   <div id="f_survey" style="display:none;margin-top:8px"><b>השאלות</b> <span class="ad-mut" style="font-size:12.5px">— שאלה בכל שורה. לשאלה עם אפשרויות בחירה: כותבים את השאלה ואחריה את האפשרויות מופרדות בקו |</span>
     <textarea class="ad-sel" id="f_qs" rows="5" style="width:100%" placeholder="איך החניך/ה מרגיש/ה בפנימייה? | מצוין | טוב | בינוני | לא טוב&#10;מה הייתם רוצים שנחזק?"></textarea></div>
   <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-pub style="background:#FC5028;color:#fff;border-color:#FC5028">📤 פרסום להורים</button><button class="btn" data-v="list">ביטול</button></div>
  </div></div>`;
}
/* קישורי הורים */
function linksHtml(gs){
  if(!F.grp||!gs.includes(F.grp)) F.grp=gs[0]||'';
  const list=famsOf(F.grp), miss=list.filter(r=>!r.ix).length, admin=ME.mode==='admin';
  return `<div class="panel"><div class="panel-h"><h2>🔗 קישורי הורים</h2></div><div class="panel-b">
   <div class="ad-mut" style="font-size:12.5px;margin-bottom:8px">כל קישור אישי למשפחה אחת: מי שמחזיק/ה בו רואה את הפרסומים של הקבוצה ואת שם החניך/ה בלבד. שולחים אותו להורה פעם אחת בוואטסאפ פרטי.</div>
   <div class="ad-filt"><select class="ad-sel" data-lg>${gs.map(g=>`<option ${F.grp===g?'selected':''}>${esc(g)}</option>`).join('')}</select>
    ${admin&&miss?`<button class="btn" data-gen>➕ יצירת קישורים ל-${miss} משפחות</button>`:''}<button class="btn" data-cp>📋 העתקת כל הקישורים של הקבוצה</button></div>
   <table class="tbl"><thead><tr><th>חניך/ה</th><th>קישור</th><th></th></tr></thead><tbody>
   ${list.map(r=>`<tr><td>${esc(r.s.n)}</td><td>${r.ix?`<span dir="ltr" style="font-size:12px">…${esc(r.ix.t.slice(-6))}</span>`:'<span class="ad-mut">אין עדיין</span>'}</td>
     <td>${r.ix?`<a class="btn" target="_blank" href="https://wa.me/?text=${encodeURIComponent(`שלום! זה הקישור האישי שלכם לאזור ההורים של ${String(r.s.n).split(' ')[0]} בשכבה הבוגרת במבואות ים — סיכומי שבוע, אישורים לטיולים וסקרים:\n${famLink(r.ix.t)}\n(הקישור אישי — לא להעביר הלאה)`)}">📲 שליחה להורה</a>`:''}
     ${r.ix&&admin?` <button class="btn" data-reset="${kOf(r.s.n)}" title="הקישור הישן יפסיק לעבוד">🔄</button>`:''}</td></tr>`).join('')}
   </tbody></table></div></div>`;
}

/* ── פעולות ── */
async function genLinks(list){
  const {dbm,rdb}=await secureDb(), up={}, now=Date.now();
  const active=Object.entries(F.items).filter(([,it])=>it&&now-it.at<60*864e5);
  for(const s of list){
    const k=kOf(s.n), old=F.ix[k], t=rnd(24);
    if(old) up[`fam/${old.t}`]=null;
    const inb={}; active.forEach(([id,it])=>{ if((it.groups||[]).includes(s.g)) inb[id]=copyOf(it); });
    up[`fam/${t}`]=Object.assign({k,n:s.n,g:s.g||'',at:now},Object.keys(inb).length?{in:inb}:{});
    up[`fam_ix/${k}`]={t,n:s.n,g:s.g||''};
  }
  await dbm.update(dbm.ref(rdb,ROOT),up);
}
function copyOf(it){ const c={type:it.type,title:it.title,body:it.body||'',at:it.at,by:it.by||''}; ['date','place','due'].forEach(x=>{if(it[x])c[x]=it[x]}); if(it.qs)c.qs=it.qs; return c; }
async function publish(el){
  const type=el.querySelector('input[name=fty]:checked').value, groups=[...el.querySelectorAll('[data-g]:checked')].map(x=>x.value);
  const title=el.querySelector('#f_title').value.trim(), body=el.querySelector('#f_body').value.trim();
  if(!groups.length) return alert('בחרו לפחות קבוצה אחת');
  if(!title) return alert('כתבו כותרת');
  const it={type,title,body,groups,by:ME.n,at:Date.now()};
  if(type==='trip'){ it.date=el.querySelector('#f_date').value; it.place=el.querySelector('#f_place').value.trim(); it.due=el.querySelector('#f_due').value; if(!it.date) return alert('בחרו את תאריך הטיול'); }
  if(type==='survey'){ it.qs=el.querySelector('#f_qs').value.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const p=l.split('|').map(x=>x.trim()).filter(Boolean);return p.length>1?{q:p[0],o:p.slice(1)}:{q:p[0]}}); if(!it.qs.length) return alert('כתבו לפחות שאלה אחת'); }
  const targets=students().filter(s=>groups.includes(s.g)), noLink=targets.filter(s=>!F.ix[kOf(s.n)]);
  if(noLink.length&&!confirm(`ל-${noLink.length} משפחות בקבוצות האלה אין עדיין קישור הורים, והן לא יראו את הפרסום עד שייווצר להן קישור. לפרסם בכל זאת?`)) return;
  const id=Date.now().toString(36)+rnd(4), up={[`famit/${id}`]:it}, c=copyOf(it);
  targets.forEach(s=>{const ix=F.ix[kOf(s.n)]; if(ix) up[`fam/${ix.t}/in/${id}`]=c;});
  const {dbm,rdb}=await secureDb();
  try{ await dbm.update(dbm.ref(rdb,ROOT),up); F.view='list'; F.open={[id]:1}; toast(`📤 פורסם ל-${targets.length-noLink.length} משפחות`); paint(); }
  catch(e){ alert('הפרסום נכשל: '+(e.message||e)); }
}
function bind(el){
  const q=s=>el.querySelector(s), qa=s=>el.querySelectorAll(s);
  qa('[data-v]').forEach(b=>b.onclick=()=>{F.view=b.dataset.v;paint();});
  qa('[data-open]').forEach(b=>b.onclick=()=>{const id=b.dataset.open;F.open[id]=!F.open[id];paint();});
  qa('input[name=fty]').forEach(r=>r.onchange=()=>{const v=q('input[name=fty]:checked').value;q('#f_trip').style.display=v==='trip'?'flex':'none';q('#f_survey').style.display=v==='survey'?'block':'none';});
  const pb=q('[data-pub]'); if(pb) pb.onclick=()=>publish(el);
  qa('[data-wa]').forEach(b=>b.onclick=()=>{const it=F.items[b.dataset.wa];
    const txt=`הורים יקרים, ${it.type==='week'?'פורסם סיכום השבוע':it.type==='trip'?'מחכה לאישורכם: '+it.title:'נשמח שתענו על סקר קצר'} באזור ההורים${it.type==='week'?': '+it.title:''}.\nנכנסים דרך הקישור האישי שקיבלתם מאיתנו 🙏`;
    window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');});
  qa('[data-del]').forEach(b=>b.onclick=async()=>{const id=b.dataset.del;if(!confirm('למחוק את הפרסום? הוא ייעלם גם אצל ההורים, יחד עם התשובות.'))return;
    const up={[`famit/${id}`]:null}; Object.entries(F.fam).forEach(([t,f])=>{if(f&&f.in&&f.in[id])up[`fam/${t}/in/${id}`]=null;if(f&&f.ans&&f.ans[id])up[`fam/${t}/ans/${id}`]=null;});
    const {dbm,rdb}=await secureDb(); await dbm.update(dbm.ref(rdb,ROOT),up); toast('נמחק');});
  const lg=q('[data-lg]'); if(lg) lg.onchange=()=>{F.grp=lg.value;paint();};
  const gn=q('[data-gen]'); if(gn) gn.onclick=async()=>{const list=famsOf(F.grp).filter(r=>!r.ix).map(r=>r.s);if(!confirm(`ליצור קישורי הורים ל-${list.length} משפחות ב${F.grp}?`))return;
    try{await genLinks(list);toast('🔗 הקישורים נוצרו');}catch(e){alert('נכשל: '+(e.message||e));}};
  qa('[data-reset]').forEach(b=>b.onclick=async()=>{const s=students().find(x=>kOf(x.n)===b.dataset.reset);if(!confirm(`ליצור ל${s.n} קישור הורים חדש? הקישור הקודם יפסיק לעבוד.`))return;await genLinks([s]);toast('נוצר קישור חדש');});
  const cp=q('[data-cp]'); if(cp) cp.onclick=()=>{const L=famsOf(F.grp).filter(r=>r.ix);if(!L.length)return toast('אין עדיין קישורים בקבוצה');
    const txt=L.map(r=>`${r.s.n}: ${famLink(r.ix.t)}`).join('\n');navigator.clipboard.writeText(txt).then(()=>toast(`📋 הועתקו ${L.length} קישורים`),()=>prompt('העתיקו:',txt));};
}
window.famRender=function(){ if(!ME) return; if(!document.getElementById('famdash')) return; paint(); listen().catch(e=>console.warn('fam listen',e)); };
})();
