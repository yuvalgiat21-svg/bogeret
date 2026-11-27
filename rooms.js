/* ═══════════════════════════════════════════════════════════════
   🏘️ שריון מתחמים — דשבורד בפורטל שמחובר לגיליון של פז
   • מה שבגיליון מגיע לכאן מהשרת (tools/push/rooms.mjs) כל כמה דקות: secure/rooms/w/<יום ראשון>
   • שריון חדש נשמר כבקשה (secure/rooms/req/<id>, st:'p'), והשרת כותב אותו למשבצות הריקות בגיליון.
     משבצת תפוסה לא נדרסת — הבקשה חוזרת כ"תפוס". ביטול מוחק מהגיליון רק את מה שנכתב מכאן.
   ═══════════════════════════════════════════════════════════════ */
(function(){
const ROOT='portal/bogeret/secure/rooms';
const SHEET_URL='https://docs.google.com/spreadsheets/d/17g_UWjBBaSHq0mQ-5ZhvlgTLnZ0hyqxt4jaW5oajWkk/edit';
const DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'], DS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const HOURS=[...Array(16)].map((_,i)=>i+8);
const ICON={'חדר ישיבות':'🗂️','קפיטריה':'☕','אוכלים מה שמבשלים':'🍳','אולם פנימייה':'🏟️','כלוב':'🏀','ביאנלה מרפסת':'🌅','דשא בית מראני':'🌳','מגרש מסדרים':'🚩','צדפות התבוננות':'🐚','רחבה ליד האוכלים':'🍽️','פרגולה ליד חרוב':'🌿','סוכת יואב':'⛺','רחבה אולם תרבות':'🎭','סטודיו למחול':'💃','ביאנלה מרחב מנהיגות':'🧭','fire pit':'🔥','כדורעף חופים':'🏐','מועדון הדס':'🎶','סינטטי':'⚽','כיתות ימאות':'⚓'};
const PAL=['#FC5028','#8E033C','#2C6FD1','#15803d','#8A4FD6','#D98E04','#0E7490','#BE185D','#4D7C0F','#7C2D12'];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>window.msgToast?msgToast(m):alert(m);
const hh=h=>String(h).padStart(2,'0')+':00';
const icon=n=>{const k=Object.keys(ICON).find(x=>String(n).startsWith(x));return k?ICON[k]:'📍'};
const short=n=>String(n).replace(/\s*\(.*?\)\s*/g,' ').replace(/- יש לציין.*$/,'').trim();
const colorOf=t=>{let h=0;for(const c of String(t))h=(h*31+c.charCodeAt(0))>>>0;return PAL[h%PAL.length]};
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return isoD(d)};
const fmt=s=>{const p=s.split('-');return (+p[2])+'.'+(+p[1])};
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?'עכשיו':m<60?`לפני ${m} דק׳`:`לפני ${Math.round(m/60)} שע׳`};

const R={meta:null,W:{},req:{},wk:'',view:'day',day:new Date().getDay(),sp:'',unsub:[],modal:null};
function weekList(){ const ws=(R.meta&&R.meta.weeks)||[]; return ws.length?ws:[isoD(new Date(Date.now()-new Date().getDay()*864e5))]; }
async function listen(){
  R.unsub.forEach(f=>{try{f()}catch(e){}}); R.unsub=[];
  const {dbm,rdb}=await secureDb();
  const on=(p,f)=>R.unsub.push(dbm.onValue(dbm.ref(rdb,`${ROOT}/${p}`),s=>{f(s.val());paint();},e=>console.warn('rooms',p,e)));
  on('meta',v=>R.meta=v||{}); on('w',v=>R.W=v||{}); on('req',v=>R.req=v||{});
}
/* מה תפוס: מהגיליון + בקשות מהפורטל שעוד לא נכנסו */
function cellsOf(w){
  const W=R.W[w]||{}, sp=W.sp||[], c={};
  Object.entries(W.c||{}).forEach(([k,t])=>{c[k]={t,src:'sheet'}});
  Object.entries(R.req).forEach(([id,r])=>{ if(!r||r.w!==w||r.st!=='p') return; const j=sp.indexOf(r.sp); if(j<0) return;
    for(let h=+r.f;h<+r.t;h++){ const k=`${r.d}_${h}_${j}`; if(!c[k]) c[k]={t:r.txt+' · '+String(r.by||'').split(' ')[0],src:'pend',id}; } });
  return {sp,c,W};
}
function paint(){
  const el=document.getElementById('roomsdash'); if(!el||!ME) return;
  if(R.meta==null){ el.innerHTML='<div class="panel"><div class="panel-b ad-mut">טוען את שריון המתחמים…</div></div>'; return; }
  const ws=weekList(); if(!R.wk||!ws.includes(R.wk)) R.wk=ws[0];
  const {sp,c,W}=cellsOf(R.wk);
  if(!R.sp||!sp.includes(R.sp)) R.sp=sp[0]||'';
  const head=`<div class="info-box" style="border-right:5px solid #FC5028"><div class="icon">🏘️</div><div style="flex:1"><b>שריון מתחמים</b><br>
    <span style="font-size:13px">מחובר לגיליון של פז. לוחצים על משבצת פנויה ומשריינים — השריון נכנס לגיליון תוך כמה דקות. ${R.meta.at?`<span class="ad-mut">עודכן מהגיליון ${ago(R.meta.at)}</span>`:'<b style="color:#b45309">עוד לא התקבל עדכון מהגיליון</b>'}</span></div>
    <div class="ad-btns"><button class="btn" data-new style="background:#FC5028;color:#fff;border-color:#FC5028">➕ שריון חדש</button><a class="btn" href="${SHEET_URL}" target="_blank" rel="noopener">📄 הגיליון של פז</a></div></div>`;
  const wkBar=`<div class="rm-bar">${ws.map((w,i)=>`<button class="rm-chip ${w===R.wk?'on':''}" data-wk="${w}">${i===0?'השבוע':i===1?'שבוע הבא':'בעוד '+i+' שבועות'}<small>${fmt(w)}–${fmt(addD(w,6))}</small></button>`).join('')}
    <span style="flex:1"></span><span class="rm-seg"><button class="${R.view==='day'?'on':''}" data-view="day">📅 לפי יום</button><button class="${R.view==='sp'?'on':''}" data-view="sp">📍 לפי מתחם</button></span></div>`;
  let body;
  if(W.missing||!sp.length) body=`<div class="panel"><div class="panel-b" style="text-align:center;padding:30px"><div style="font-size:34px">🗓️</div><b>פז עוד לא פתחה בגיליון את השבוע הזה</b><div class="ad-mut">כשהלשונית תיפתח בגיליון היא תופיע כאן אוטומטית.</div></div></div>`;
  else if(R.view==='day') body=dayView(sp,c);
  else body=spView(sp,c);
  el.innerHTML=head+wkBar+body+mine()+(R.modal?modalHtml(sp):'');
  bind(el);
}
function cellHtml(x,d,h,j,label){
  if(!x) return `<td class="rm-free" data-cell="${d}_${h}_${j}" title="פנוי — לחצו לשריון"></td>`;
  const pend=x.src==='pend', col=colorOf(x.t);
  return `<td class="rm-busy ${pend?'rm-pend':''}" style="--k:${col}" title="${esc((label?label+' · ':'')+hh(h)+' — '+x.t+(pend?' (ממתין לגיליון)':''))}"><span>${pend?'⏳ ':''}${esc(x.t)}</span></td>`;
}
function dayView(sp,c){
  const dates=[...Array(7)].map((_,i)=>addD(R.wk,i));
  const days=`<div class="rm-bar">${dates.map((dt,i)=>{const n=Object.keys(c).filter(k=>k.startsWith(i+'_')).length;return `<button class="rm-chip ${i===R.day?'on':''}" data-day="${i}">${DAYS[i]}<small>${fmt(dt)}${n?` · ${n} תפוסות`:''}</small></button>`}).join('')}</div>`;
  const rows=sp.map((s,j)=>`<tr><th class="rm-rh">${icon(s)} ${esc(short(s))}</th>${HOURS.map(h=>cellHtml(c[`${R.day}_${h}_${j}`],R.day,h,j,short(s))).join('')}</tr>`).join('');
  return days+`<div class="panel"><div class="rm-wrap"><table class="rm-t"><thead><tr><th class="rm-rh">${DAYS[R.day]} ${fmt(addD(R.wk,R.day))}</th>${HOURS.map(h=>`<th>${hh(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function spView(sp,c){
  const j=sp.indexOf(R.sp);
  const chips=`<div class="rm-bar rm-sps">${sp.map(s=>`<button class="rm-chip ${s===R.sp?'on':''}" data-sp="${esc(s)}">${icon(s)} ${esc(short(s))}</button>`).join('')}</div>`;
  const rows=HOURS.map(h=>`<tr><th class="rm-rh">${hh(h)}</th>${[...Array(7)].map((_,d)=>cellHtml(c[`${d}_${h}_${j}`],d,h,j,DAYS[d])).join('')}</tr>`).join('');
  return chips+`<div class="panel"><div class="rm-wrap"><table class="rm-t rm-tsp"><thead><tr><th class="rm-rh">${icon(R.sp)} ${esc(short(R.sp))}</th>${[...Array(7)].map((_,d)=>`<th>${DAYS[d]}<br><small>${fmt(addD(R.wk,d))}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
const ST={p:['⏳','ממתין לכניסה לגיליון (עד כמה דקות)','#b45309'],ok:['✓','נכנס לגיליון','#15803d'],busy:['✕','לא נכנס — המשבצת תפוסה','#b91c1c'],noweek:['✕','השבוע עוד לא נפתח בגיליון','#b91c1c'],err:['✕','שגיאה','#b91c1c'],cx:['🗑️','בוטל','#7A6A66']};
function mine(){
  const L=Object.entries(R.req).filter(([,r])=>r&&r.uid===ME.id&&!(r.st==='cx'&&Date.now()-r.at>3*864e5)).sort((a,b)=>b[1].at-a[1].at).slice(0,20);
  if(!L.length) return '';
  return `<div class="panel"><div class="panel-h"><h2>🧾 השריונים שלי</h2></div><div class="panel-b">${L.map(([id,r])=>{const s=ST[r.st]||ST.err;
    return `<div class="rm-my"><span style="font-size:20px">${icon(r.sp)}</span><div style="flex:1"><b>${esc(short(r.sp))}</b> · ${DAYS[r.d]} ${fmt(addD(r.w,+r.d))} · ${hh(r.f)}–${hh(r.t)}<div style="font-size:12.5px">${esc(r.txt)}</div>
      <div style="font-size:12.5px;color:${s[2]};font-weight:700">${s[0]} ${r.cx&&r.st==='ok'?'ממתין לביטול בגיליון':s[1]}${r.msg?` — <span style="font-weight:400">${esc(r.msg)}</span>`:''}</div></div>
      ${r.st==='p'?`<button class="btn" data-rm="${id}">ביטול</button>`:r.st==='ok'&&!r.cx?`<button class="btn" data-cx="${id}">ביטול השריון</button>`:r.st!=='ok'?`<button class="btn" data-rm="${id}" title="הסרה מהרשימה">✕</button>`:''}</div>`}).join('')}</div></div>`;
}
/* חלון שריון */
function modalHtml(sp){
  const m=R.modal, {c}=cellsOf(R.wk), j=sp.indexOf(m.sp);
  const busy=[]; for(let h=+m.f;h<+m.t;h++){const x=c[`${m.d}_${h}_${j}`];if(x)busy.push(`${hh(h)} — ${x.t}`)}
  return `<div class="rm-ov" data-ov><div class="rm-mod"><div style="display:flex;align-items:center"><h3 style="margin:0;flex:1">➕ שריון מתחם</h3><button class="btn" data-close>✕</button></div>
   <label>מתחם</label><select class="ad-sel" id="rm_sp">${sp.map(s=>`<option ${s===m.sp?'selected':''} value="${esc(s)}">${icon(s)} ${esc(short(s))}</option>`).join('')}</select>
   <div class="rm-2"><div><label>יום</label><select class="ad-sel" id="rm_d">${DAYS.map((d,i)=>`<option value="${i}" ${i==m.d?'selected':''}>${d} ${fmt(addD(R.wk,i))}</option>`).join('')}</select></div>
     <div><label>משעה</label><select class="ad-sel" id="rm_f">${HOURS.map(h=>`<option value="${h}" ${h==m.f?'selected':''}>${hh(h)}</option>`).join('')}</select></div>
     <div><label>עד שעה</label><select class="ad-sel" id="rm_t">${HOURS.map(h=>h+1).map(h=>`<option value="${h}" ${h==m.t?'selected':''}>${hh(h===24?24:h)}</option>`).join('')}</select></div></div>
   <label>מה הפעילות / מי משתמש</label><input class="ad-sel" id="rm_x" maxlength="70" value="${esc(m.x||'')}" placeholder="למשל: שלדג — ערב קבוצה 20:30-22:00">
   ${busy.length?`<div class="rm-warn">⚠️ תפוס בחלק מהשעות:<br>${busy.map(esc).join('<br>')}</div>`:`<div class="rm-ok">✓ פנוי בכל השעות שבחרתם</div>`}
   <div class="ad-mut" style="font-size:12px;margin-top:6px">בגיליון ייכתב: "${esc(m.x||'…')} · ${esc(String(ME.n||'').split(' ')[0])}" בכל שעה שבחרתם.</div>
   <button class="btn" data-book style="width:100%;margin-top:10px;background:#FC5028;color:#fff;border-color:#FC5028" ${busy.length?'disabled':''}>שריון</button></div></div>`;
}
async function book(){
  const m=R.modal, x=(m.x||'').trim();
  if(!x) return alert('כתבו מה הפעילות');
  if(+m.t<=+m.f) return alert('שעת הסיום צריכה להיות אחרי שעת ההתחלה');
  const {dbm,rdb}=await secureDb(), id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  try{ await dbm.set(dbm.ref(rdb,`${ROOT}/req/${id}`),{w:R.wk,d:+m.d,f:+m.f,t:+m.t,sp:m.sp,txt:x,by:ME.n||'',uid:ME.id,at:Date.now(),st:'p'});
    R.modal=null; toast('⏳ השריון נשלח — ייכנס לגיליון של פז תוך כמה דקות'); paint(); }
  catch(e){ alert('השמירה נכשלה: '+(e.message||e)); }
}
function bind(el){
  const q=s=>el.querySelector(s), qa=s=>el.querySelectorAll(s);
  qa('[data-wk]').forEach(b=>b.onclick=()=>{R.wk=b.dataset.wk;paint();});
  qa('[data-view]').forEach(b=>b.onclick=()=>{R.view=b.dataset.view;paint();});
  qa('[data-day]').forEach(b=>b.onclick=()=>{R.day=+b.dataset.day;paint();});
  qa('[data-sp]').forEach(b=>b.onclick=()=>{R.sp=b.dataset.sp;paint();});
  const sp=(R.W[R.wk]||{}).sp||[];
  qa('[data-cell]').forEach(td=>td.onclick=()=>{const [d,h,j]=td.dataset.cell.split('_').map(Number);R.modal={sp:sp[j],d,f:h,t:h+1,x:''};paint();});
  const nw=q('[data-new]'); if(nw) nw.onclick=()=>{R.modal={sp:R.sp||sp[0],d:R.day,f:16,t:17,x:''};paint();};
  const ov=q('[data-ov]'); if(ov){ ov.onclick=e=>{if(e.target===ov){R.modal=null;paint();}};
    q('[data-close]').onclick=()=>{R.modal=null;paint();};
    const sync=()=>{R.modal={sp:q('#rm_sp').value,d:+q('#rm_d').value,f:+q('#rm_f').value,t:+q('#rm_t').value,x:q('#rm_x').value};};
    ['#rm_sp','#rm_d','#rm_f','#rm_t'].forEach(s=>q(s).onchange=()=>{sync();if(R.modal.t<=R.modal.f)R.modal.t=R.modal.f+1;paint();setTimeout(()=>{const i=document.getElementById('rm_x');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},0);});
    q('#rm_x').oninput=()=>{R.modal.x=q('#rm_x').value;};
    q('[data-book]').onclick=()=>{sync();book();};
    setTimeout(()=>{const i=q('#rm_x');if(i)i.focus();},0); }
  qa('[data-rm]').forEach(b=>b.onclick=async()=>{const {dbm,rdb}=await secureDb();await dbm.remove(dbm.ref(rdb,`${ROOT}/req/${b.dataset.rm}`));});
  qa('[data-cx]').forEach(b=>b.onclick=async()=>{if(!confirm('לבטל את השריון? הוא יימחק מהגיליון של פז תוך כמה דקות.'))return;const {dbm,rdb}=await secureDb();await dbm.update(dbm.ref(rdb,`${ROOT}/req/${b.dataset.cx}`),{cx:1});toast('הביטול נשלח');});
}
/* עיצוב */
const css=document.createElement('style');
css.textContent=`.rm-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 10px}
.rm-chip{border:1px solid #F3C2B0;background:#fff;border-radius:12px;padding:6px 12px;font:700 13px Heebo,sans-serif;cursor:pointer;color:#2b1d1a;text-align:center;line-height:1.2}
.rm-chip small{display:block;font-weight:500;font-size:11px;color:#7A6A66}.rm-chip.on{background:#8E033C;color:#fff;border-color:#8E033C}.rm-chip.on small{color:#fde2e8}
.rm-seg{display:inline-flex;border:1px solid #F3C2B0;border-radius:12px;overflow:hidden}.rm-seg button{border:0;background:#fff;padding:7px 12px;font:700 13px Heebo,sans-serif;cursor:pointer}.rm-seg button.on{background:#FC5028;color:#fff}
.rm-wrap{overflow:auto;max-height:70vh;border-radius:12px}
.rm-t{border-collapse:separate;border-spacing:2px;width:100%;font-size:12px}
.rm-t th{position:sticky;top:0;background:#FFF1EB;font:700 11.5px Heebo,sans-serif;padding:5px 3px;z-index:1;white-space:nowrap}
.rm-t .rm-rh{position:sticky;right:0;background:#fff;text-align:right;white-space:nowrap;padding:4px 8px;z-index:2;font:700 12.5px Heebo,sans-serif;border-left:2px solid #F3C2B0}
.rm-t thead .rm-rh{z-index:3;background:#FFF1EB}
.rm-t td{height:34px;min-width:62px;border-radius:7px}
.rm-tsp td{min-width:96px}
.rm-free{background:#f7f3f1;cursor:pointer;transition:background .1s}.rm-free:hover{background:#ffe3d8;box-shadow:inset 0 0 0 2px #FC5028}
.rm-busy{background:color-mix(in srgb,var(--k) 16%,#fff);border-right:3px solid var(--k);padding:2px 5px;vertical-align:middle}
.rm-busy span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;line-height:1.25;color:#2b1d1a}
.rm-pend{background:repeating-linear-gradient(45deg,#fff7ed,#fff7ed 6px,#ffedd5 6px,#ffedd5 12px);border-right:3px dashed #D98E04}
.rm-my{display:flex;gap:10px;align-items:center;border-top:1px solid #f1e4df;padding:8px 0}.rm-my:first-child{border-top:0}
.rm-ov{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1100;display:flex;align-items:center;justify-content:center;padding:14px}
.rm-mod{background:#fff;border-radius:18px;padding:18px;width:min(460px,100%);max-height:92vh;overflow:auto}
.rm-mod label{display:block;font-weight:700;font-size:13px;margin:10px 0 4px}.rm-mod .ad-sel{width:100%}
.rm-2{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:8px}
.rm-mod [data-book]:disabled{opacity:.4;cursor:not-allowed}
.rm-warn{background:#fee2e2;color:#991b1b;border-radius:10px;padding:8px;margin-top:10px;font-size:13px}.rm-ok{background:#dcfce7;color:#166534;border-radius:10px;padding:8px;margin-top:10px;font-size:13px;font-weight:700}`;
document.head.appendChild(css);
window.roomsRender=function(){ if(!ME||!document.getElementById('roomsdash')) return; paint(); listen().catch(e=>console.warn('rooms listen',e)); };
})();
