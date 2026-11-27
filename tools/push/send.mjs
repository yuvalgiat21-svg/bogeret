/* ═══════════════════════════════════════════════════════════════
   שרת ההתראות של פורטל בוגרת — רץ בגיטהאב כל כמה דקות (.github/workflows/push.yml)
   קורא מהאזור המוגן משימות והודעות חדשות ב-CRM, ושולח התראה לטלפונים
   של מי שהן מיועדות לו (מכשירים שנרשמו בפורטל בכפתור "הפעלת התראות לטלפון").
   • כל התראה נשלחת פעם אחת בלבד (נרשם ב-secure/push_sent).
   • משימה שהאחראי/ת כבר פתח/ה, או הודעה שכבר אושרה — לא נשלחת.
   • בבוקר (07:00–09:00): תזכורת על משימות להיום ובאיחור.
   • חניכים: פתיחת חשבון מקוד אישי, בדיקת נוכחות 08:00/20:00 (+תזכורת אחרי שעה), עדכונים על בקשות יציאה.
     מדריכים: התראה כשהורה אישר/ה יציאה של חניך/ה מהקבוצה.
   המפתח לשרת נשמר כסוד בגיטהאב (FIREBASE_SA) ולא בקוד.
   ═══════════════════════════════════════════════════════════════ */
import admin from 'firebase-admin';
import { createHash } from 'node:crypto';

const BASE = 'https://yuvalgiat21-svg.github.io/bogeret/';
const ROOT = 'portal/bogeret/secure';
const FRESH = 3 * 864e5;                       /* לא שולחים על דברים ישנים מ-3 ימים */
const DRY = process.argv.includes('--dry');

if (!process.env.FIREBASE_SA) { console.log('FIREBASE_SA secret is not set yet — nothing to do'); process.exit(0); }
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)),
  databaseURL: 'https://yudbet-almog-default-rtdb.europe-west1.firebasedatabase.app',
});
const db = admin.database();
const get = async p => (await db.ref(`${ROOT}/${p}`).get()).val() || {};

const now = Date.now();
const sha = x => createHash('sha256').update(x).digest('hex');

/* ── קודי כניסה של חניכים → חשבונות (מזהה קבוע st_<k>, הקוד הוא הסיסמה) ── */
const codes = await get('st_codes');
for (const [k, c] of Object.entries(codes)) {
  if (!c || !c.c || !/^[0-9a-f]{12}$/.test(k)) continue;
  const h = sha('ok:' + c.c).slice(0, 16);
  if (c.ok === h) continue;
  const uid = `st_${k}`, email = sha('st:' + c.c).slice(0, 20) + '@st.bogeret.app';
  if (DRY) { console.log('DRY account', uid); continue; }
  try {
    try { await admin.auth().updateUser(uid, { email, password: c.c, disabled: false }); }
    catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      try { await admin.auth().createUser({ uid, email, password: c.c }); }
      catch (e2) {
        if (e2.code !== 'auth/email-already-exists') throw e2;
        const other = await admin.auth().getUserByEmail(email); await admin.auth().deleteUser(other.uid);
        await admin.auth().createUser({ uid, email, password: c.c });
      }
    }
    await db.ref(`${ROOT}/stu/${k}/p`).set({ n: c.n || '', g: c.g || '', l: c.l || '' });
    await db.ref(`${ROOT}/st_codes/${k}`).update({ ok: h, err: null });
    console.log('account ready', uid);
  } catch (e) { console.warn('account failed', uid, e.code || e.message); await db.ref(`${ROOT}/st_codes/${k}/err`).set(String(e.code || e.message).slice(0, 80)); }
}

const [tasks, posts, push, sent, stu, par, cfg] = await Promise.all(['msg/tasks', 'msg/posts', 'push', 'push_sent', 'stu', 'par', 'chk_cfg'].map(get));
/* בהפעלה הראשונה: מתחילים מעכשיו, בלי לשלוח על כל מה שכבר קיים */
const START = sent._start || now;
if (!sent._start && !DRY) await db.ref(`${ROOT}/push_sent/_start`).set(now);

const devs = id => Object.entries(push[id] || {}).filter(([, d]) => d && d.t);
const info = id => (devs(id)[0] || [, {}])[1];
const nameOf = id => info(id).n || id;
const fresh = at => at && at >= START && now - at < FRESH;
/* שעון ישראל (כולל שעון קיץ) */
const IL = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  .formatToParts(new Date(now)).map(p => [p.type, p.value]));
const ilHour = +IL.hour, ilMin = +IL.minute, ilMins = ilHour * 60 + ilMin;
const today = `${IL.year}-${IL.month}-${IL.day}`;
const ME_URL = BASE + 'me.html';

const queue = [];
const add = (uid, key, title, body, link) => { if (!sent[key] && devs(uid).length) queue.push({ uid, key, title, body, link }); };

/* משימות חדשות */
for (const [id, t] of Object.entries(tasks)) {
  if (!t || typeof t !== 'object' || !fresh(t.at)) continue;
  for (const u of t.who || []) {
    if (u === t.by || (t.seen || {})[u] || t.st === 'done') continue;
    add(u, `t_${id}_${u}`, `📋 משימה חדשה מ${nameOf(t.by)}`, String(t.t || '').slice(0, 120), `${BASE}?open=task:${id}`);
  }
}
/* הודעות לצוות */
const inAud = (p, u, d) => {
  if (Array.isArray(p.to)) return p.to.includes(u);
  if (!p.to || p.to === 'all') return true;
  return d.scope === 'all' || d.mode === 'admin' || d.scope === p.to;
};
for (const [id, p] of Object.entries(posts)) {
  if (!p || typeof p !== 'object' || !fresh(p.at)) continue;
  for (const u of Object.keys(push).filter(u => !u.startsWith('st_'))) {   /* הודעות צוות — לא לחניכים */
    if (u === p.by || (p.acks || {})[u] || !inAud(p, u, info(u))) continue;
    add(u, `p_${id}_${u}`, `📢 ${p.urgent ? 'דחוף — ' : ''}הודעה מ${nameOf(p.by)}`, String(p.title || '').slice(0, 120), `${BASE}?open=post:${id}`);
  }
}
/* תזכורת בוקר: משימות להיום ובאיחור */
if (ilHour >= 7 && ilHour < 9) {
  const due = {};
  for (const [id, t] of Object.entries(tasks)) {
    if (!t || t.st === 'done' || !t.due || t.due > today) continue;
    for (const u of t.who || []) (due[u] = due[u] || []).push(t);
  }
  for (const [u, L] of Object.entries(due)) {
    const late = L.filter(t => t.due < today).length;
    add(u, `d_${u}_${today}`, '⏰ המשימות שלך להיום',
      `${L.length} משימות פתוחות${late ? ` (${late} באיחור)` : ''}: ${L.slice(0, 3).map(t => t.t).join(' · ')}`.slice(0, 160), `${BASE}?open=mine:`);
  }
}

/* ── בדיקת נוכחות 08:00 / 20:00 לחניכים (רק כשהמנהל הפעיל) ──
   מי שנמצא/ת ביציאה מאושרת בשעת הבדיקה — לא מקבל/ת הודעה */
function awayOnExit(u, t0) {
  const h = t0 / 60;
  return Object.entries(u.x || {}).some(([rid, x]) => {
    if (!x || ((u.xs || {})[rid] || {}).st !== 'approved') return false;
    const end = x.rdate && x.rdate > x.date ? x.rdate : x.date;
    if (today < x.date || today > end) return false;
    const lo = today === x.date ? +x.from : 0, hi = today === end ? +x.to : 24;
    return h >= lo && h < hi;
  });
}
const stuDevs = k => push[`st_${k}`] ? Object.keys(push[`st_${k}`]).length : 0;
const first = n => String(n || '').split(' ')[0];
if (cfg.on) {
  const SL = [['m', 8 * 60, 'בדיקת בוקר'], ['e', 20 * 60, 'בדיקת ערב']];
  for (const [sl, t0, label] of SL) {
    const first_ = ilMins >= t0 && ilMins < t0 + 45, remind = ilMins >= t0 + 60 && ilMins < t0 + 90;
    if (!first_ && !remind) continue;
    const c = `${today}_${sl}`, ans = (await db.ref(`${ROOT}/chk/${c}`).get()).val() || {};
    for (const [k, u] of Object.entries(stu)) {
      if (!u || !u.p || ans[k] || !stuDevs(k) || awayOnExit(u, t0)) continue;
      if (first_) add(`st_${k}`, `c_${c}_${k}`, `📍 ${label} — ${first(u.p.n)}, איפה את/ה?`, 'לחיצה אחת: בכפר / לא בכפר', ME_URL);
      else add(`st_${k}`, `cr_${c}_${k}`, '⏰ עוד לא ענית על בדיקת הנוכחות', 'זה לוקח שנייה — בכפר / לא בכפר', ME_URL);
    }
  }
}

/* ── יציאות של חניכים ── */
/* מי המדריכים של קבוצה: מי שבתפקיד שלו/ה מופיע שם הקבוצה; אחרת לפי השכבה; ואם אין — המנהל */
const staffIds = Object.keys(push).filter(u => !u.startsWith('st_'));
function counselors(g, l) {
  const gr = String(l || '').replace(/['׳"]/g, '');
  let ids = staffIds.filter(u => g && String(info(u).r || '').includes(g));
  if (!ids.length && g === 'אקדמיה') ids = staffIds.filter(u => info(u).scope === 'academy');
  if (!ids.length) ids = staffIds.filter(u => info(u).mode === 'edit' && info(u).scope === (gr === 'יא' ? 'ya' : gr === 'יב' ? 'yb' : '-'));
  if (!ids.length) ids = staffIds.filter(u => info(u).mode === 'admin');
  return ids;
}
for (const [k, u] of Object.entries(stu)) {
  if (!u || !u.p) continue;
  for (const [rid, x] of Object.entries(u.x || {})) {
    if (!x || !x.at || x.at < START || now - x.at > 30 * 864e5 || (x.rdate || x.date) < today) continue;
    const s = (u.xs || {})[rid] || {}, a = x.t && par[x.t] && par[x.t].ans, nm = first(u.p.n);
    const dd = d => d.split('-').reverse().slice(0, 2).map(Number).join('.'), hr = h => String(h).padStart(2, '0') + ':00';
    const when = x.rdate && x.rdate > x.date ? `${dd(x.date)} ${hr(x.from)} עד ${dd(x.rdate)} ${hr(x.to)}` : `${dd(x.date)} ${hr(x.from)}–${hr(x.to)}`;
    if (a && a.ok && !s.mad && s.st !== 'rejected' && s.st !== 'approved')
      for (const c of counselors(u.p.g, u.p.l)) add(c, `xp_${rid}_${c}`, `🚪 בקשת יציאה של ${u.p.n}`, `ההורים אישרו (${when}) — מחכה לאישורך`, `${BASE}?open=exits:`);
    if (a && !a.ok) add(`st_${k}`, `xpn_${rid}`, '✋ ההורה לא אישר/ה את היציאה', `${when} · ${x.reason || ''}`.slice(0, 120), ME_URL);
    if (s.st === 'approved') add(`st_${k}`, `xok_${rid}`, `✅ ${nm}, היציאה אושרה!`, `${when} — האישור לשער מחכה באפליקציה`, ME_URL);
    if (s.st === 'rejected' && !(a && !a.ok)) add(`st_${k}`, `xno_${rid}`, '✋ בקשת היציאה לא אושרה', `${when}${s.by ? ' · ' + s.by : ''}`, ME_URL);
  }
}

/* ── הודעות מהצוות לחניכים (stu/<k>/in) ── */
for (const [k, u] of Object.entries(stu)) {
  if (!u || !u.in) continue;
  for (const [id, m] of Object.entries(u.in)) {
    if (!m || !fresh(m.at) || (u.inr || {})[id]) continue;
    add(`st_${k}`, `sm_${id}_${k}`, `📩 הודעה מ${m.by || 'הצוות'}`, String(m.title || m.body || '').slice(0, 120), ME_URL);
  }
}

let ok = 0, bad = 0;
const upd = {};
for (const q of queue) {
  let delivered = false;
  for (const [dk, d] of devs(q.uid)) {
    const msg = { token: d.t, notification: { title: q.title, body: q.body },
      webpush: { notification: { dir: 'rtl', lang: 'he', icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/icon-192.png' },
                 fcmOptions: { link: q.link } } };
    if (DRY) { console.log('DRY', q.uid, q.title, '|', q.body); delivered = true; continue; }
    try { await admin.messaging().send(msg); delivered = true; ok++; }
    catch (e) {
      bad++; console.warn('send failed', q.uid, e.code);
      if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(e.code || '')) upd[`push/${q.uid}/${dk}`] = null;
    }
  }
  if (delivered) upd[`push_sent/${q.key}`] = now;
}
/* ניקוי סימונים ישנים */
for (const [k, v] of Object.entries(sent)) if (k !== '_start' && typeof v === 'number' && now - v > 14 * 864e5) upd[`push_sent/${k}`] = null;
if (!DRY && Object.keys(upd).length) await db.ref(ROOT).update(upd);
console.log(`queue=${queue.length} sent=${ok} failed=${bad} users=${Object.keys(push).length}`);
process.exit(0);
