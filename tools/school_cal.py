# -*- coding: utf-8 -*-
"""ממיר את יומני בית הספר רמות ים (יומני גוגל ציבוריים) לקובץ school_cal.json שהפורטל קורא.
רץ אוטומטית כל בוקר ב-GitHub (‎.github/workflows/school-cal.yml‎). אפשר גם להריץ ידנית: python tools/school_cal.py"""
import json, re, urllib.request, datetime, os

CALS = [  # (מזהה, שכבת מידע בפורטל)
    ('c_b45b96d871515dfc4a2813418f61739ef45fd653b787cc7644d3d7c44eae035b', 'sch_ya'),
    ('c_ddadc024a99384b8d0e26589842657b8abf5d772612b7663b2947ab2c00041ec', 'sch_yb'),
    ('c_5011d541e1f6da13b45fd660228b31dcd5663a99d09225b80612fa4120fdde47', 'sch_all'),
]
FROM, TO = '2026-08-01', '2027-08-31'
PAR = {}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'school_cal.json')


def unfold(txt):
    return re.sub(r'\r?\n[ \t]', '', txt).splitlines()


def unesc(s):
    return s.replace('\\n', ' ').replace('\\,', ',').replace('\\;', ';').replace('\\\\', '\\').strip()


def parse_dt(v):
    """מחזיר (תאריך ISO, שעה או None) בשעון ישראל."""
    v = v.strip()
    if len(v) == 8:
        return f'{v[:4]}-{v[4:6]}-{v[6:8]}', None
    d = datetime.datetime.strptime(v[:15], '%Y%m%dT%H%M%S')
    if v.endswith('Z'):  # UTC → ישראל (קיץ +3 / חורף +2, קירוב לפי החודשים)
        d += datetime.timedelta(hours=3 if 4 <= d.month <= 10 else 2)
    return d.strftime('%Y-%m-%d'), d.strftime('%H:%M')


def events(cal_id, layer):
    url = f'https://calendar.google.com/calendar/ical/{cal_id}%40group.calendar.google.com/public/basic.ics'
    txt = urllib.request.urlopen(url, timeout=60).read().decode('utf-8')
    out, cur = [], None
    for line in unfold(txt):
        if line == 'BEGIN:VEVENT':
            cur = {}
        elif line == 'END:VEVENT' and cur is not None:
            if 'DTSTART' in cur and cur.get('SUMMARY'):
                s, t = parse_dt(cur['DTSTART'])
                e, et = parse_dt(cur.get('DTEND', cur['DTSTART']))
                if t is None and e > s:  # תאריך סיום ביומן גוגל הוא היום שאחרי
                    e = (datetime.date.fromisoformat(e) - datetime.timedelta(days=1)).isoformat()
                if e < s:
                    e = s
                if e >= FROM and s <= TO and cur.get('STATUS') != 'CANCELLED':
                    o = {'s': s, 'e': e, 't': unesc(cur['SUMMARY'])[:140], 'l': layer}
                    if t: o['tm'] = t
                    if t and et and e == s and et != t: o['et'] = et
                    if cur.get('LOCATION'): o['p'] = unesc(cur['LOCATION'])[:80]
                    out.append(o)
            cur = None
        elif cur is not None and ':' in line:
            k, v = line.split(':', 1)
            cur[k.split(';')[0]] = v
    return out


def holidays():
    """חגים ומועדים (לוח ישראל) מ-Hebcal."""
    url = (f'https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&ss=on&s=on&i=on&lg=he'
           f'&start={FROM}&end={TO}')
    req = urllib.request.Request(url, headers={'User-Agent': 'bogeret-portal'})
    items = json.loads(urllib.request.urlopen(req, timeout=60).read().decode('utf-8')).get('items', [])
    out = []
    for it in items:
        if it.get('category') == 'parashat':
            PAR[it['date'][:10]] = it.get('hebrew') or it.get('title')
            continue
        if it.get('category') not in ('holiday', 'roshchodesh'):
            continue
        d = it['date'][:10]
        out.append({'s': d, 'e': d, 't': it.get('hebrew') or it.get('title'), 'l': 'heb'})
    return out


def main():
    all_ev = []
    for cid, layer in CALS:
        all_ev += events(cid, layer)
    all_ev += holidays()
    all_ev.sort(key=lambda x: (x['s'], x.get('tm', ''), x['t']))
    data = {'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), 'ev': all_ev, 'par': PAR}
    old = None
    if os.path.exists(OUT):
        try: old = json.load(open(OUT, encoding='utf-8'))
        except Exception: pass
    if old and old.get('ev') == all_ev and old.get('par') == PAR:
        print('ללא שינוי', len(all_ev)); return
    json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('נשמר', len(all_ev), 'אירועים')


if __name__ == '__main__':
    main()
