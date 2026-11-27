/* ═══════════════════════════════════════════════════════════════
   התראות לטלפון גם כשהפורטל סגור (Firebase Cloud Messaging)
   • המשתמש לוחץ "הפעלת התראות לטלפון" פעם אחת בכל מכשיר.
   • המכשיר נרשם באזור המוגן: portal/bogeret/secure/push/<מזהה משתמש>/<מכשיר>
   • השליחה עצמה נעשית בשרת קטן שרץ בגיטהאב כל כמה דקות (tools/push/send.mjs).
   באייפון: עובד רק אחרי "הוספה למסך הבית" של הפורטל.
   ═══════════════════════════════════════════════════════════════ */
(function(){
const VAPID='BOQ6aLW_3pNxIj8JwWTH76OIv-uTAx68RxDsLx9oav1I0NOXJVF4W3oNuuyWcnMdggFj1kNSPk8AC9d96_o7Zk4';           /* מפתח ההתראות הציבורי של הפרויקט (Firebase ← Cloud Messaging) */
const PUSH_PATH='portal/bogeret/secure/push';
const me=()=>(typeof ME!=='undefined'&&ME)||null;
const ready=()=>VAPID.indexOf('__')!==0;
const supported=()=>'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let MSG=null;
async function messaging(){
  if(MSG) return MSG;
  const appMod=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const mm=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
  const app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(FB_CONFIG);
  if(!(await mm.isSupported())) throw new Error('unsupported');
  MSG={mm, m:mm.getMessaging(app)}; return MSG;
}
async function devKey(tok){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(tok));
  return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function register(){
  const reg=await navigator.serviceWorker.register('firebase-messaging-sw.js',{scope:'./'});
  await navigator.serviceWorker.ready;
  const {mm,m}=await messaging();
  const tok=await mm.getToken(m,{vapidKey:VAPID, serviceWorkerRegistration:reg});
  if(!tok) throw new Error('no token');
  const u=me(); const {dbm,rdb}=await secureDb();
  await dbm.set(dbm.ref(rdb,`${PUSH_PATH}/${u.id}/${await devKey(tok)}`),
    {t:tok, at:Date.now(), n:u.n||'', r:u.r||'', scope:u.scope||'', mode:u.mode||'', ua:(navigator.userAgent||'').slice(0,120)});
  try{ localStorage.setItem('bogeret_push_on','1'); }catch(e){}
  /* הודעה כשהפורטל פתוח — מוצגת בתוך הפורטל */
  mm.onMessage(m,p=>{ const n=(p&&p.notification)||{}; if(window.msgToast) msgToast((n.title||'')+(n.body?' — '+n.body:'')); });
  return true;
}
/* כפתור ההפעלה */
window.pushEnable=async function(){
  if(!ready()) return alert('ההתראות לטלפון עוד בהקמה.');
  if(!supported()){
    return alert(isIOS()&&!standalone()
      ? 'באייפון: פתחו את הפורטל בספארי ← כפתור השיתוף ← "הוספה למסך הבית". אחר כך פתחו את הפורטל מהאייקון ולחצו שוב על הכפתור.'
      : 'הדפדפן הזה לא תומך בהתראות. נסו בכרום.');
  }
  try{
    const r=await Notification.requestPermission();
    if(r!=='granted') return alert('ההתראות לא אושרו. אפשר לאשר בהגדרות האתר בדפדפן ולנסות שוב.');
    await register();
    window.msgToast ? msgToast('🔔 ההתראות לטלפון הופעלו במכשיר הזה') : alert('ההתראות הופעלו');
    pushUi();
  }catch(e){ console.warn('push',e); alert('ההפעלה נכשלה: '+(e&&e.message||e)); }
};
window.pushState=function(){
  if(!ready()) return 'off';
  if(!supported()) return isIOS()&&!standalone()?'ios':'nosupport';
  if(Notification.permission==='granted'){ try{ if(localStorage.getItem('bogeret_push_on')) return 'on'; }catch(e){} return 'grant'; }
  return Notification.permission==='denied'?'denied':'ask';
};
/* כפתור קטן ליד שם המשתמש בראש הפורטל */
function pushUi(){
  const host=document.getElementById('whoami'); if(!host||!me()||!ready()) return;
  let b=document.getElementById('pushBtn');
  if(!b){ b=document.createElement('button'); b.id='pushBtn'; b.onclick=()=>pushEnable();
    b.style.cssText='margin-inline-start:8px;border:1px solid #F3C2B0;background:#fff;border-radius:999px;padding:3px 10px;font:700 12px Heebo,sans-serif;color:#8E033C;cursor:pointer;';
    host.appendChild(b); }
  const s=pushState();
  b.textContent= s==='on'?'🔔 התראות פעילות': s==='denied'?'🔕 התראות חסומות':'🔔 הפעלת התראות לטלפון';
  b.title= s==='on'?'המכשיר הזה יקבל התראות גם כשהפורטל סגור':'';
}
window.pushUi=pushUi;
/* אחרי הכניסה: אם כבר אושר — מרעננים את הרישום בשקט */
window.pushAfterLogin=function(){
  pushUi();
  /* פתיחה מתוך התראה: ?open=task:<id> · post:<id> · att: (בדיקת נוכחות) · exits: (אישורי יציאה) */
  try{ const o=new URLSearchParams(location.search).get('open')||'';
    if(o){ const [k,id]=o.split(':');
      if(k==='att'||k==='exits'){ show('attendance');
        setTimeout(()=>{ if(k==='exits'){ const b=[...document.querySelectorAll('#atSubnav button')].find(x=>x.textContent.includes('יציאה')); if(b) b.click(); }
          else if(window.chkRender){ const t=document.querySelector('#chkdash [data-tg]'); if(t&&!document.querySelector('#chkdash [data-approve]')) t.click(); } },1200); }
      else { show('msg');
      setTimeout(()=>{ if(k==='task'&&window.msgOpenTask) msgOpenTask(id); else if(k==='post'&&window.msgView) msgView('posts'); },1500); }
      history.replaceState(null,'',location.pathname); } }catch(e){}
  if(ready()&&supported()&&Notification.permission==='granted') register().then(pushUi).catch(e=>console.warn('push refresh',e));
};
})();
