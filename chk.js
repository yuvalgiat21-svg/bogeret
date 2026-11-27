/* ═══════════════════════════════════════════════════════════════
   בדיקת נוכחות מהטלפון (08:00 / 20:00) — הצד של הצוות בלשונית "נוכחות"
   • כל חניך/ה עונה בטלפון (me.html): בכפר / לא בכפר + סיבה + פירוט.
     התשובות נשמרות ב- portal/bogeret/secure/chk/<תאריך>_<m|e>/<מזהה חניך>
   • המדריך/ה רואה את רשימת הקבוצה, מתקן/ת אם צריך ולוחץ/ת "אישור הרשימה".
     הרשימה המאושרת נשמרת ב- portal/bogeret/secure/chkv/<תאריך>_<m|e>/<מזהה חניך>
   • למנהל: הפעלה/כיבוי של הבדיקה היומית, וקודי כניסה אישיים לחניכים
     (portal/bogeret/secure/st_codes — השרת בגיטהאב פותח מהם חשבונות).
   מזהה חניך = 12 התווים הראשונים של SHA-256 של "stu:"+השם (אין שמות בנתיבים).
   ═══════════════════════════════════════════════════════════════ */
(function(){
const ROOT='portal/bogeret/secure';
const REASONS=['בבית / חופשה','מחלה','סיבה אישית / משפחתית','יציאה מאושרת','פעילות מחוץ לכפר','אחר'];
const SLOT_L={m:'בוקר · 08:00',e:'ערב · 20:00'};
const ALPH='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kOf=n=>sha256hex('stu:'+n).slice(0,12);
window.stuKey=kOf;
const isoToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const hm=t=>t?new Date(t).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}):'';
const toast=m=>window.msgToast?msgToast(m):alert(m);

const C={date:isoToday(), slot:new Date().getHours()<14?'m':'e', grp:'', ans:{}, ver:{}, cfg:null, codes:null, edits:{}, open:false, codesOpen:false, unsub:[]};

function students(){ return [...(typeof STUDENTS_DATA!=="undefined"?STUDENTS_DATA:[]), ...(typeof ACAD_STUDENTS!=="undefined"?ACAD_STUDENTS:[])].filter(s=>s&&s.n); }
function grade(s){ return String(s.l||'').replace(/['׳"]/g,''); }
function allGroups(){ return [...new Set(students().map(s=>s.g).filter(Boolean))].sort(); }
/* אילו קבוצות המשתמש/ת רואה — כמו במרכז הלמידה */
function myGroups(){
  const all=allGroups(); if(!ME) return [];
  if(ME.mode==='admin'||ME.scope==='all') return all;
  const named=all.filter(g=>String(ME.r||'').includes(g)); if(named.length) return named;
  if(ME.scope==='academy') return all.filter(g=>g==='אקדמיה');
  if(ME.scope==='ya') return all.filter(g=>students().some(s=>s.g===g&&grade(s)==='יא'));
  if(ME.scope==='yb') return all.filter(g=>students().some(s=>s.g===g&&grade(s)==='יב'));
  return all;
}
async function db(){ return await secureDb(); }
async function listen(){
  C.unsub.forEach(f=>{try{f()}catch(e){}}); C.unsub=[];
  const {dbm,rdb}=await db(), c=`${C.date}_${C.slot}`;
  C.unsub.push(dbm.onValue(dbm.ref(rdb,`${ROOT}/chk/${c}`),s=>{C.ans=s.val()||{};paint();},e=>console.warn('chk',e)));
  C.unsub.push(dbm.onValue(dbm.ref(rdb,`${ROOT}/chkv/${c}`),s=>{C.ver=s.val()||{};paint();},e=>console.warn('chkv',e)));
  if(C.cfg==null) dbm.get(dbm.ref(rdb,`${ROOT}/chk_cfg`)).then(s=>{C.cfg=s.val()||{};paint();}).catch(()=>{C.cfg={};});
  if(ME.mode==='admin'&&C.codes==null) C.unsub.push(dbm.onValue(dbm.ref(rdb,`${ROOT}/st_codes`),s=>{C.codes=s.val()||{};paint();},e=>console.warn('codes',e)));
}

/* מצב סופי של חניך/ה: תיקון המדריך/ה (לא נשמר עדיין) ← הרשימה המאושרת ← תשובת החניך/ה */
function finalOf(k){
  if(C.edits[k]) return C.edits[k];
  const v=C.ver[k]; if(v) return {h:v.h,r:v.r||'',d:v.d||''};
  const a=C.ans[k]; if(a) return {h:a.h,r:a.r||'',d:a.d||''};
  return null;
}
function ansCell(a){
  if(!a) return '<span class="ad-mut">— לא ענה/תה</span>';
  return a.h ? `<span style="color:#15803d;font-weight:700">✓ בכפר</span> <small class="ad-mut">${hm(a.at)}</small>`
             : `<span style="color:#b91c1c;font-weight:700">✕ לא בכפר</span> <small class="ad-mut">${hm(a.at)}</small><div style="font-size:12px">${esc(a.r||'')}${a.d?' — '+esc(a.d):''}</div>`;
}
function rowHtml(s){
  const k=kOf(s.n), a=C.ans[k], f=finalOf(k), ch=!!C.edits[k], code=C.codes&&C.codes[k];
  const st=f?(f.h?'1':'0'):'';
  return `<tr data-k="${k}"><td><b>${esc(s.n)}</b>${ME.mode==='admin'&&C.codes&&!code?'<div class="ad-mut" style="font-size:11px">אין קוד כניסה</div>':''}</td>
   <td>${ansCell(a)}</td>
   <td style="min-width:230px"><select data-h class="ad-sel" style="${ch?'border-color:#FC5028':''}"><option value="" ${st===''?'selected':''}>בחרו…</option><option value="1" ${st==='1'?'selected':''}>✓ בכפר</option><option value="0" ${st==='0'?'selected':''}>✕ לא בכפר</option></select>
     ${st==='0'?`<select data-r class="ad-sel">${REASONS.map(r=>`<option ${f&&f.r===r?'selected':''}>${r}</option>`).join('')}</select><input data-d class="ad-sel" placeholder="פירוט" value="${esc(f&&f.d||'')}" style="width:120px">`:''}</td></tr>`;
}
function paint(){
  const el=document.getElementById('chkdash'); if(!el||!ME) return;
  if(isLimited&&isLimited()&&!(ME.tabs||[]).includes('attendance')){ el.innerHTML=''; return; }
  const gs=myGroups(); if(!gs.length){ el.innerHTML=''; return; }
  if(!C.grp||!gs.includes(C.grp)) C.grp=gs[0];
  const list=students().filter(s=>s.g===C.grp).sort((a,b)=>a.n.localeCompare(b.n,'he'));
  const ks=list.map(s=>kOf(s.n)), ans=ks.filter(k=>C.ans[k]), away=ks.filter(k=>{const f=finalOf(k);return f&&!f.h}).length;
  const done=(C.ver._g||{})[C.grp], on=C.cfg&&C.cfg.on, admin=ME.mode==='admin', canEdit=ME.mode!=='view';
  const pend=ks.filter(k=>C.ans[k]&&!C.ver[k]).length;
  const head=`<div class="info-box" style="border-right:5px solid #8E033C;cursor:pointer" data-tg><div class="icon">📱</div><div style="flex:1">
    <b>בדיקת נוכחות מהטלפון — 08:00 ו-20:00</b> ${C.open?'▾':'◂'}<br>
    <span style="font-size:13px">${C.cfg==null?'טוען…':on?`הבדיקה פעילה · ${SLOT_L[C.slot]} ${C.date===isoToday()?'היום':C.date.split('-').reverse().join('.')}: ענו ${ans.length} מתוך ${ks.length} ב${esc(C.grp)}${done?` · ✓ הרשימה אושרה (${esc(done.by)} ${hm(done.at)})`:pend?` · <b style="color:#FC5028">${pend} תשובות מחכות לאישורך</b>`:''}`:'הבדיקה היומית <b>עדיין כבויה</b> — החניכים לא מקבלים הודעות.'+(admin?' אפשר להפעיל כאן למטה.':'')}</span></div></div>`;
  if(!C.open){ el.innerHTML=head; bind(el); return; }
  const ctrl=`<div class="ad-filt">
    <input type="date" class="ad-sel" data-date value="${C.date}" max="${isoToday()}">
    <span class="ad-seg">${['m','e'].map(s=>`<button class="${C.slot===s?'on':''}" data-slot="${s}">${SLOT_L[s]}</button>`).join('')}</span>
    ${gs.length>1?`<select class="ad-sel" data-grp>${gs.map(g=>`<option ${C.grp===g?'selected':''}>${esc(g)}</option>`).join('')}</select>`:`<b>${esc(C.grp)}</b>`}
    <small class="ad-mut">בכפר ${ks.length-away-ks.filter(k=>!finalOf(k)).length} · לא בכפר ${away} · בלי סטטוס ${ks.filter(k=>!finalOf(k)).length}</small></div>`;
  const tbl=`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>חניך/ה</th><th>מה ענה/תה בטלפון</th><th>הסטטוס הסופי (אפשר לתקן)</th></tr></thead><tbody>${list.map(rowHtml).join('')||'<tr><td colspan="3" class="ad-mut">אין חניכים בקבוצה</td></tr>'}</tbody></table></div>`;
  const foot=canEdit?`<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><button class="btn" data-approve style="background:#FC5028;color:#fff;border-color:#FC5028">✓ אישור הרשימה של ${esc(C.grp)}</button>
    <span class="ad-mut" style="font-size:12.5px">תשובה שלא תוקנה נשמרת כמו שהחניך/ה ענה/תה. מי שלא ענה/תה — צריך לבחור לו/ה סטטוס.</span></div>`:'';
  el.innerHTML=head+`<div class="panel" style="margin-bottom:16px"><div class="panel-b">${ctrl}${tbl}${foot}</div></div>`+(admin?adminHtml():'');
  bind(el);
}

/* ── מנהל: הפעלה וקודים ── */
function genCode(){ const a=new Uint32Array(8); crypto.getRandomValues(a); return [...a].map(x=>ALPH[x%ALPH.length]).join(''); }
const show=c=>c.slice(0,4)+'-'+c.slice(4);
function adminHtml(){
  const on=C.cfg&&C.cfg.on, cs=C.codes||{};
  const list=students().filter(s=>!C.cgrp||s.g===C.cgrp).sort((a,b)=>(a.g||'').localeCompare(b.g||'','he')||a.n.localeCompare(b.n,'he'));
  const st=k=>{const c=cs[k];if(!c||!c.c)return '<span class="ad-mut">אין קוד</span>';if(c.err)return `<span style="color:#b91c1c">שגיאה: ${esc(c.err)}</span>`;return c.ok?'<span style="color:#15803d">✓ פעיל</span>':'<span style="color:#b45309">⏳ נפתח תוך כמה דקות</span>'};
  const n=Object.values(cs).filter(c=>c&&c.c).length;
  return `<div class="panel" style="margin-bottom:16px"><div class="panel-h"><h2>⚙️ ניהול הבדיקה מהטלפון (רק לך)</h2></div><div class="panel-b">
   <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
     <b>הודעות יומיות לחניכים ב-08:00 וב-20:00:</b> ${on?'<span style="color:#15803d;font-weight:800">פעיל</span>':'<span style="color:#b91c1c;font-weight:800">כבוי</span>'}
     <button class="btn" data-cfg>${on?'⏸️ כיבוי':'▶️ הפעלה'}</button>
     <span class="ad-mut" style="font-size:12.5px">כשכבוי — אף חניך/ה לא מקבל/ת הודעה (למשל בחופשות). מומלץ להפעיל רק אחרי שחילקת קודים.</span></div>
   <div style="cursor:pointer;font-weight:800" data-ctg>🔑 קודי כניסה לחניכים (${n} מתוך ${students().length}) ${C.codesOpen?'▾':'◂'}</div>
   ${C.codesOpen?`<div class="ad-mut" style="font-size:12.5px;margin:6px 0">כל חניך/ה נכנס/ת לכתובת <b dir="ltr">${location.origin}${location.pathname.replace(/[^/]*$/,'')}me.html</b> עם הקוד האישי שלו/ה. קוד חדש מבטל את הקודם.</div>
   <div class="ad-filt"><select class="ad-sel" data-cgrp><option value="">כל הקבוצות</option>${allGroups().map(g=>`<option ${C.cgrp===g?'selected':''}>${esc(g)}</option>`).join('')}</select>
     <button class="btn" data-genall>➕ קוד לכל מי שאין לו${C.cgrp?' ב'+esc(C.cgrp):''}</button><button class="btn" data-copy>📋 העתקת הקודים</button><button class="btn" data-print>🖨️ כרטיסים להדפסה</button></div>
   <div style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>חניך/ה</th><th>קבוצה</th><th>קוד</th><th>מצב</th><th></th></tr></thead><tbody>
   ${list.map(s=>{const k=kOf(s.n),c=cs[k];return `<tr><td>${esc(s.n)}</td><td>${esc(s.g)}</td><td dir="ltr" style="font-family:monospace;font-weight:700">${c&&c.c?show(c.c):'—'}</td><td>${st(k)}</td><td><button class="btn" data-gen="${k}">${c&&c.c?'🔄 קוד חדש':'➕ קוד'}</button></td></tr>`}).join('')}
   </tbody></table></div>`:''}
  </div></div>`;
}
async function setCodes(arr){
  const {dbm,rdb}=await db(), up={};
  arr.forEach(s=>{ const k=kOf(s.n); up[k]={c:genCode(),n:s.n,g:s.g||'',l:s.l||'',at:Date.now()}; });
  for(const [k,v] of Object.entries(up)) await dbm.set(dbm.ref(rdb,`${ROOT}/st_codes/${k}`),v);
  toast(`🔑 נוצרו ${arr.length} קודים — החשבונות ייפתחו תוך כמה דקות`);
}
function codesText(){
  const cs=C.codes||{}, url=location.origin+location.pathname.replace(/[^/]*$/,'')+'me.html';
  const list=students().filter(s=>(!C.cgrp||s.g===C.cgrp)&&cs[kOf(s.n)]&&cs[kOf(s.n)].c);
  return {url,list,cs};
}

function bind(el){
  const q=s=>el.querySelector(s), qa=s=>el.querySelectorAll(s);
  const tg=q('[data-tg]'); if(tg) tg.onclick=()=>{C.open=!C.open;paint();};
  const d=q('[data-date]'); if(d) d.onchange=()=>{C.date=d.value||isoToday();C.edits={};listen();};
  qa('[data-slot]').forEach(b=>b.onclick=()=>{C.slot=b.dataset.slot;C.edits={};listen();});
  const g=q('[data-grp]'); if(g) g.onchange=()=>{C.grp=g.value;C.edits={};paint();};
  qa('tr[data-k]').forEach(tr=>{
    const k=tr.dataset.k, h=tr.querySelector('[data-h]'), r=tr.querySelector('[data-r]'), dd=tr.querySelector('[data-d]');
    const upd=()=>{ if(h.value===''){delete C.edits[k];} else C.edits[k]={h:h.value==='1'?1:0,r:h.value==='0'?(r?r.value:REASONS[0]):'',d:h.value==='0'&&dd?dd.value.trim():''}; };
    if(h) h.onchange=()=>{upd();paint();};
    if(r) r.onchange=upd; if(dd) dd.oninput=upd;
  });
  const ap=q('[data-approve]'); if(ap) ap.onclick=approve;
  const cf=q('[data-cfg]'); if(cf) cf.onclick=async()=>{
    const on=!(C.cfg&&C.cfg.on);
    if(on&&!confirm('להפעיל את הבדיקה היומית? מעכשיו כל חניך/ה עם קוד ועם התראות פעילות יקבל/ת הודעה ב-08:00 וב-20:00.')) return;
    const {dbm,rdb}=await db(); C.cfg=Object.assign({},C.cfg,{on,by:ME.n,at:Date.now()});
    await dbm.set(dbm.ref(rdb,`${ROOT}/chk_cfg`),C.cfg); paint(); toast(on?'▶️ הבדיקה היומית הופעלה':'⏸️ הבדיקה היומית כובתה');
  };
  const ct=q('[data-ctg]'); if(ct) ct.onclick=()=>{C.codesOpen=!C.codesOpen;paint();};
  const cg=q('[data-cgrp]'); if(cg) cg.onchange=()=>{C.cgrp=cg.value;paint();};
  qa('[data-gen]').forEach(b=>b.onclick=async()=>{
    const k=b.dataset.gen, s=students().find(x=>kOf(x.n)===k), had=C.codes&&C.codes[k]&&C.codes[k].c;
    if(had&&!confirm(`לתת ל${s.n} קוד חדש? הקוד הקודם יפסיק לעבוד.`)) return;
    try{ await setCodes([s]); }catch(e){ alert('השמירה נכשלה: '+(e.message||e)); }
  });
  const ga=q('[data-genall]'); if(ga) ga.onclick=async()=>{
    const cs=C.codes||{}, arr=students().filter(s=>(!C.cgrp||s.g===C.cgrp)&&!(cs[kOf(s.n)]&&cs[kOf(s.n)].c));
    if(!arr.length) return toast('לכולם כבר יש קוד');
    if(!confirm(`ליצור קוד אישי ל-${arr.length} חניכים?`)) return;
    try{ await setCodes(arr); }catch(e){ alert('השמירה נכשלה: '+(e.message||e)); }
  };
  const cp=q('[data-copy]'); if(cp) cp.onclick=()=>{
    const {url,list,cs}=codesText(); if(!list.length) return toast('אין עדיין קודים להעתקה');
    const txt=`כניסה לאפליקציית החניכים של בוגרת: ${url}\n\n`+list.map(s=>`${s.n} (${s.g}): ${show(cs[kOf(s.n)].c)}`).join('\n');
    navigator.clipboard.writeText(txt).then(()=>toast(`📋 הועתקו ${list.length} קודים`),()=>prompt('העתיקו:',txt));
  };
  const pr=q('[data-print]'); if(pr) pr.onclick=()=>{
    const {url,list,cs}=codesText(); if(!list.length) return toast('אין עדיין קודים להדפסה');
    const w=window.open('','_blank');
    w.document.write(`<html dir="rtl" lang="he"><head><meta charset="utf-8"><title>קודי כניסה</title><style>body{font-family:Heebo,Arial,sans-serif;margin:10mm}.c{display:inline-block;width:62mm;border:2px dashed #F3C2B0;border-radius:10px;padding:8px;margin:3px;vertical-align:top;page-break-inside:avoid}.n{font-weight:800;font-size:16px}.k{font:800 20px monospace;color:#8E033C;margin:4px 0;direction:ltr;text-align:center}.u{font-size:10px;color:#7A6A66;direction:ltr;text-align:center}</style></head><body>`+
      list.map(s=>`<div class="c"><div class="n">${esc(s.n)}</div><div style="font-size:12px;color:#7A6A66">${esc(s.g)} · הקוד האישי שלך לאפליקציית בוגרת</div><div class="k">${show(cs[kOf(s.n)].c)}</div><div class="u">${esc(url)}</div></div>`).join('')+
      `<script>onload=()=>print()<\/script></body></html>`); w.document.close();
  };
}
async function approve(){
  const list=students().filter(s=>s.g===C.grp), miss=list.filter(s=>!finalOf(kOf(s.n)));
  if(miss.length) return alert(`חסר סטטוס ל-${miss.length} חניכים: ${miss.slice(0,6).map(s=>s.n).join(', ')}${miss.length>6?'…':''}\nבחרו להם "בכפר" או "לא בכפר".`);
  const {dbm,rdb}=await db(), c=`${C.date}_${C.slot}`, up={}, now=Date.now();
  list.forEach(s=>{ const k=kOf(s.n), f=finalOf(k), a=C.ans[k];
    up[k]={h:f.h,r:f.r||'',d:f.d||'',by:ME.n,at:now,fix:(!a||a.h!==f.h||(a.r||'')!==(f.r||''))?1:0}; });
  up['_g/'+C.grp]={by:ME.n,at:now,n:list.length};
  try{ await dbm.update(dbm.ref(rdb,`${ROOT}/chkv/${c}`),up); C.edits={}; toast(`✓ רשימת ${C.grp} אושרה ונשמרה`); }
  catch(e){ alert('השמירה נכשלה: '+(e.message||e)); }
}
window.chkRender=function(){ if(!ME) return; const el=document.getElementById('chkdash'); if(!el) return; paint(); listen().catch(e=>console.warn('chk listen',e)); };
})();
