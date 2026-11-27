/* ═══════════════════════════════════════════════════════════════
   שרת ההתראות של פורטל בוגרת — רץ בגיטהאב כל כמה דקות (.github/workflows/push.yml)
   קורא מהאזור המוגן משימות והודעות חדשות ב-CRM, ושולח התראה לטלפונים
   של מי שהן מיועדות לו (מכשירים שנרשמו בפורטל בכפתור "הפעלת התראות לטלפון").
   • כל התראה נשלחת פעם אחת בלבד (נרשם ב-secure/push_sent).
   • משימה שהאחראי/ת כבר פתח/ה, או הודעה שכבר אושרה — לא נשלחת.
   • בבוקר (07:00–09:00): תזכורת על משימות להיום ובאיחור.
   המפתח לשרת נשמר כסוד בגיטהאב (FIREBASE_SA) ולא בקוד.
   ═══════════════════════════════════════════════════════════════ */
import admin from 'firebase-admin';

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

const [tasks, posts, push, sent] = await Promise.all(['msg/tasks', 'msg/posts', 'push', 'push_sent'].map(get));
const now = Date.now();
/* בהפעלה הראשונה: מתחילים מעכשיו, בלי לשלוח על כל מה שכבר קיים */
const START = sent._start || now;
if (!sent._start && !DRY) await db.ref(`${ROOT}/push_sent/_start`).set(now);

const devs = id => Object.entries(push[id] || {}).filter(([, d]) => d && d.t);
const info = id => (devs(id)[0] || [, {}])[1];
const nameOf = id => info(id).n || id;
const fresh = at => at && at >= START && now - at < FRESH;
const ilNow = new Date(now + 2 * 3600e3);       /* שעון ישראל (חורף). בקיץ +3 — הפרש של שעה בתזכורת הבוקר בלבד */
const ilHour = ilNow.getUTCHours();
const today = ilNow.toISOString().slice(0, 10);

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
  for (const u of Object.keys(push)) {
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
