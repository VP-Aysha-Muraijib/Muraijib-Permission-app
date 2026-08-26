"""
استخراج جداول المعلمات من ملف aSc Timetables بالإحداثيات لا بترتيب النص.

    python3 tools/extract-asc.py teachers.pdf > raw-extract.json

المخرجات وسيطة ومقصودة للمراجعة قبل التحويل إلى لقطة جدول.
التفاصيل ومزالق الاستخراج في tools/asc-pdf-import.md
"""
import sys
import json, re, warnings
from collections import defaultdict
import pdfplumber
warnings.filterwarnings('ignore')

AR_DAYS = {  # النص في الملف معكوس بصريًا، فيُطابَق كما هو
    'نينثﻹا': 'الإثنين', 'ءاثﻼثلا': 'الثلاثاء', 'ءاعبرﻷا': 'الأربعاء',
    'سيمخلا': 'الخميس', 'ةعمجلا': 'الجمعة',
}
DAY_ORDER = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
CLASS_RE = re.compile(r'^G\d{1,2}-[A-Za-z0-9]{1,2}$')

def page_columns(page):
    """أعمدة الشبكة من صفّي التوقيت: البداية والنهاية وموضع كل عمود."""
    ws = [w for w in page.extract_words(extra_attrs=['upright', 'size'])
          if w['upright'] and re.fullmatch(r'\d{1,2}:\d{2}', w['text'])]
    rows = defaultdict(list)
    for w in ws:
        rows[round(w['top'])].append(w)
    if len(rows) < 2:
        return []
    tops = sorted(rows)
    starts, ends = rows[tops[0]], rows[tops[1]]
    starts.sort(key=lambda w: w['x0'])
    ends.sort(key=lambda w: w['x0'])
    cols = []
    for s, e in zip(starts, ends):
        def mins(t):
            h, m = t.split(':')
            return int(h) * 60 + int(m)
        cols.append({
            'center': (s['x0'] + s['x1']) / 2,
            'start': s['text'], 'end': e['text'],
            'minutes': mins(e['text']) - mins(s['text']),
        })
    # الترتيب من اليمين لليسار: العمود الأيمن هو الحصة الأولى
    cols.sort(key=lambda c: -c['center'])
    lesson_no = 0
    for c in cols:
        if c['minutes'] >= 30:
            lesson_no += 1
            c['kind'], c['index'] = 'lesson', lesson_no
        else:
            c['kind'], c['index'] = 'break', None
    return cols

def page_rows(page):
    """نطاقات الأيام من الخطوط الأفقية تحت رأس الجدول."""
    ys = sorted({round(e['top']) for e in page.horizontal_edges})
    ys = [y for y in ys if y > 110]
    return [(ys[i], ys[i + 1]) for i in range(len(ys) - 1)]

def extract_page(page, number):
    words = page.extract_words(extra_attrs=['upright', 'size'])
    title = ' '.join(w['text'] for w in
                     sorted((w for w in words if w['size'] > 25 and w['top'] < 60),
                            key=lambda w: w['x0']))
    cols, bands = page_columns(page), page_rows(page)

    # اسم اليوم يقع في العمود الأقصى يمينًا خارج الشبكة
    day_of = {}
    for w in words:
        if w['x0'] > 740 and w['text'] in AR_DAYS:
            for lo, hi in bands:
                if lo <= w['top'] < hi:
                    day_of[(lo, hi)] = AR_DAYS[w['text']]

    cells = defaultdict(list)
    for w in words:
        if w['top'] < 118 or w['x0'] > 740:
            continue
        band = next(((lo, hi) for lo, hi in bands if lo <= w['top'] < hi), None)
        if not band or not cols:
            continue
        cx = (w['x0'] + w['x1']) / 2
        col = min(cols, key=lambda c: abs(c['center'] - cx))
        if abs(col['center'] - cx) > 45:
            continue
        cells[(band, col['center'])].append(w)

    out = []
    for (band, center), ws in cells.items():
        col = next(c for c in cols if c['center'] == center)
        lines = defaultdict(list)
        for w in ws:
            lines[round(w['top'] / 6)].append(w)
        text_lines = [' '.join(x['text'] for x in sorted(v, key=lambda w: w['x0']))
                      for _, v in sorted(lines.items())]
        classes = [t for t in text_lines if CLASS_RE.fullmatch(t)]
        labels = [t for t in text_lines if not CLASS_RE.fullmatch(t)]
        out.append({
            'day': day_of.get(band, '?'),
            'periodKind': col['kind'], 'period': col['index'],
            'start': col['start'], 'end': col['end'],
            'label': ' '.join(labels).strip(),
            'classes': classes,
            'raw': text_lines,
        })
    out.sort(key=lambda c: (DAY_ORDER.index(c['day']) if c['day'] in DAY_ORDER else 9,
                            c['period'] or 99))
    return {'page': number, 'title': title, 'columns': cols, 'cells': out}

SOURCE = sys.argv[1] if len(sys.argv) > 1 else 'teachers.pdf'

with pdfplumber.open(SOURCE) as pdf:
    pages = [extract_page(p, i + 1) for i, p in enumerate(pdf.pages)]

json.dump(pages, sys.stdout, ensure_ascii=False, indent=1)
print(f'\nاستُخرجت {len(pages)} صفحة من {SOURCE}', file=sys.stderr)
