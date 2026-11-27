/* ═══════════════════════════════════════════════════════════════
   שריון מתחמים — סנכרון בין הפורטל לגיליון של פז ("שריון מתחמים 🏘️")
   רץ בגיטהאב יחד עם שרת ההתראות (.github/workflows/push.yml).
   1. קורא מהגיליון את לשוניות השבוע הנוכחי ו-3 השבועות הבאים, ומעתיק לפורטל:
      portal/bogeret/secure/rooms/w/<תאריך יום ראשון> = {tab, sp:[מתחמים], c:{"<יום>_<שעה>_<עמודה>": טקסט}, at}
   2. שריונים חדשים מהפורטל (portal/bogeret/secure/rooms/req/<id>) נכתבים למשבצות הריקות בגיליון.
      משבצת תפוסה לא נדרסת — הבקשה מסומנת "busy". ביטול מוחק רק את מה שהפורטל עצמו כתב.
   הגיליון משותף עם חשבון השרת (firebase-adminsdk-fbsvc@yudbet-almog.iam.gserviceaccount.com) כעורך.
   ═══════════════════════════════════════════════════════════════ */
import admin from 'firebase-admin';
import { JWT } from 'google-auth-library';

const SHEET = '17g_UWjBBaSHq0mQ-5ZhvlgTLnZ0hyqxt4jaW5oajWkk';
const ROOT = 'portal/bogeret/secure/rooms';
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DRY = process.argv.includes('--dry');

if (!process.env.FIREBASE_SA) { console.log('no FIREBASE_SA'); process.exit(0); }
const SA = JSON.parse(process.env.FIREBASE_SA);
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(SA), databaseURL: 'https://yudbet-almog-default-rtdb.europe-west1.firebasedatabase.app' });
const db = admin.database();
const jwt = new JWT({ email: SA.client_email, key: SA.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
async function api(path, opt = {}) {
  const { token } = await jwt.getAccessToken();
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET}${path}`, { ...opt, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`sheets ${r.status}: ${(j.error && j.error.message) || ''}`.slice(0, 200));
  return j;
}
const q = t => `'${t.replace(/'/g, "''")}'`;
const iso = d => d.toISOString().slice(0, 10);
const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

/* תאריך יום ראשון של השבוע הנוכחי בשעון ישראל */
const IL = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type, p.value]));
const today = new Date(Date.UTC(+IL.year, +IL.month - 1, +IL.day));
const sun0 = new Date(today); sun0.setUTCDate(today.getUTCDate() - today.getUTCDay());
const WEEKS = [0, 1, 2, 3].map(i => { const d = new Date(sun0); d.setUTCDate(sun0.getUTCDate() + 7 * i); return iso(d); });

/* שם לשונית → תאריך יום ראשון. למשל "22-28/11", "-29.11-5.12", "06-12.12", "27.12-02.1", "03-9.1" */
function tabSunday(title) {
  const n = (title.match(/\d+/g) || []).map(Number);
  let sd, sm, ed, em;
  if (n.length === 4) [sd, sm, ed, em] = n;
  else if (n.length === 3) { [sd, ed, em] = n; sm = sd <= ed ? em : (em === 1 ? 12 : em - 1); }
  else return null;
  if (!(sm >= 1 && sm <= 12 && em >= 1 && em <= 12 && sd >= 1 && sd <= 31)) return null;
  let best = null;
  for (const y of [+IL.year - 1, +IL.year, +IL.year + 1]) {
    const s = new Date(Date.UTC(y, sm - 1, sd));
    if (s.getUTCMonth() !== sm - 1 || s.getUTCDay() !== 0) continue;
    const e = new Date(s); e.setUTCDate(s.getUTCDate() + 6);
    if (e.getUTCDate() !== ed || e.getUTCMonth() !== em - 1) continue;
    if (!best || Math.abs(s - today) < Math.abs(best - today)) best = s;
  }
  return best && iso(best);
}

const meta = await api('?fields=sheets.properties(title,index)');
const byWeek = {};
for (const s of meta.sheets.map(x => x.properties).sort((a, b) => a.index - b.index)) {
  const w = tabSunday(s.title); if (w && WEEKS.includes(w)) byWeek[w] = s.title;   /* הלשונית המאוחרת יותר בסדר הלשוניות גוברת */
}

/* קריאת שבוע: מפת שורות לפי יום+שעה, ועמודות לפי שם המתחם */
async function readWeek(tab) {
  const r = await api(`/values/${encodeURIComponent(q(tab) + '!A1:AC140')}`);
  const v = r.values || [];
  const head = (v[0] || []).map(x => String(x || '').trim());
  if (head[1] !== 'שעה' || !head.includes('חדר ישיבות')) return null;
  const sp = head.slice(2).filter(Boolean);
  const rows = {}; let d = -1;
  for (let i = 1; i < v.length; i++) {
    const day = String(v[i][0] || '').trim(), hr = String(v[i][1] || '').trim();
    if (day) d = DAYS.indexOf(day);
    const h = parseInt(hr, 10);
    if (d >= 0 && /^\d{1,2}:\d\d$/.test(hr)) rows[`${d}_${h}`] = i;
  }
  const cells = {};
  for (const [k, i] of Object.entries(rows)) sp.forEach((name, j) => { const t = String((v[i] || [])[j + 2] || '').trim(); if (t) cells[`${k}_${j}`] = t; });
  return { tab, sp, rows, cells };
}
const W = {};
for (const w of WEEKS) if (byWeek[w]) { try { W[w] = await readWeek(byWeek[w]); } catch (e) { console.warn('read', w, e.message); } }

/* ── שריונים וביטולים מהפורטל ── */
const reqs = (await db.ref(`${ROOT}/req`).get()).val() || {};
const upd = {}, writes = [];
const now = Date.now();
for (const [id, r] of Object.entries(reqs)) {
  if (!r || typeof r !== 'object') continue;
  if (now - (r.at || 0) > 90 * 864e5) { upd[`req/${id}`] = null; continue; }
  const wk = W[r.w];
  const want = r.st === 'p' ? 'book' : (r.st === 'ok' && r.cx) ? 'cancel' : null;
  if (!want) continue;
  if (!wk) { if (want === 'book') { upd[`req/${id}/st`] = 'noweek'; upd[`req/${id}/msg`] = 'הלשונית של השבוע הזה עוד לא נפתחה בגיליון'; } continue; }
  const j = wk.sp.indexOf(r.sp);
  if (j < 0) { upd[`req/${id}/st`] = 'err'; upd[`req/${id}/msg`] = 'המתחם לא נמצא בגיליון'; continue; }
  const hours = []; for (let h = +r.f; h < +r.t; h++) hours.push(h);
  const keys = hours.map(h => `${r.d}_${h}`);
  if (keys.some(k => wk.rows[k] == null)) { upd[`req/${id}/st`] = 'err'; upd[`req/${id}/msg`] = 'השעות לא קיימות בגיליון'; continue; }
  const txt = String(r.txt || '').slice(0, 80) + (r.by ? ` · ${String(r.by).split(' ')[0]}` : '');
  if (want === 'book') {
    const busy = keys.filter(k => wk.cells[`${k}_${j}`]);
    if (busy.length) { upd[`req/${id}/st`] = 'busy'; upd[`req/${id}/msg`] = busy.map(k => `${k.split('_')[1]}:00 — ${wk.cells[`${k}_${j}`]}`).join(' · ').slice(0, 300); continue; }
    keys.forEach(k => { writes.push({ range: `${q(wk.tab)}!${colL(j + 2)}${wk.rows[k] + 1}`, values: [[txt]] }); wk.cells[`${k}_${j}`] = txt; });
    upd[`req/${id}/st`] = 'ok'; upd[`req/${id}/wt`] = txt; upd[`req/${id}/done`] = now;
  } else {
    const mine = r.wt || txt;
    keys.forEach(k => { if (wk.cells[`${k}_${j}`] === mine) { writes.push({ range: `${q(wk.tab)}!${colL(j + 2)}${wk.rows[k] + 1}`, values: [['']] }); delete wk.cells[`${k}_${j}`]; } });
    upd[`req/${id}/st`] = 'cx'; upd[`req/${id}/done`] = now;
  }
}
if (writes.length && !DRY) await api('/values:batchUpdate', { method: 'POST', body: JSON.stringify({ valueInputOption: 'RAW', data: writes }) });

/* ── העתק לפורטל ── */
for (const w of WEEKS) upd[`w/${w}`] = W[w] ? { tab: W[w].tab, sp: W[w].sp, c: W[w].cells, at: now } : { missing: 1, at: now };
upd['meta'] = { at: now, weeks: WEEKS };
if (!DRY) await db.ref(ROOT).update(upd);
console.log(`rooms: weeks=${Object.keys(W).length}/${WEEKS.length} writes=${writes.length} reqs=${Object.keys(reqs).length}`);
process.exit(0);
