# -*- coding: utf-8 -*-
import json, html as _h, sys
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
SRC=sys.argv[1] if len(sys.argv)>1 else BASE+'/day0.json'
OUT=sys.argv[2] if len(sys.argv)>2 else BASE+'/f05_day0.html'
d=json.load(open(SRC,encoding='utf-8'))
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; YEAR="2026 / 2027"
SUP=["رقية صالح الصوافي","مريم هلال الدرمكي"]
day=d['day']; halls=d['halls']; assign=d['assign']; reserve=d.get('reserve',[])

def e(x): return _h.escape(str(x) if x is not None else "")

# ترتيب المراحل وأسماء العرض
ORDER=["خامس","سادس","سابع","ثامن","تربية خاصة","لجنة"]
GNAME={"خامس":"الصف الخامس","سادس":"الصف السادس","سابع":"الصف السابع",
       "ثامن":"الصف الثامن","تربية خاصة":"التربية الخاصة (التكييف والتعديل)",
       "لجنة":"اللجان المساندة"}

# تجميع القاعات حسب المرحلة
groups={}
for i,h in enumerate(halls):
    groups.setdefault(h.get('grade'),[]).append((h,assign[i]))
ordered=[g for g in ORDER if g in groups]+[g for g in groups if g not in ORDER]

def sess_tbl():
    return (f'<table class="t sess"><tr><th>العام الدراسي</th><th>المدرسة</th><th>اليوم والتاريخ</th>'
            f'<th>المادة</th><th>الجلسة</th></tr>'
            f'<tr><td>{YEAR}</td><td>{SCHOOL}</td><td>{e(day["date"])}</td><td>{e(day["subject"])}</td>'
            f'<td>صباحية</td></tr></table>')

def hall_tbl(items):
    rows=""
    for n,(h,mon) in enumerate(items,1):
        cmt = h.get('grade')=='لجنة'
        rows+=(f'<tr class="{ "cmt" if cmt else "" }"><td class="cm">{n}</td>'
               f'<td class="rh">{e(h["hall"])}</td><td>{e(h.get("count") or "—")}</td>'
               f'<td class="nm">{e(mon)}</td><td></td>'
               f'<td></td><td></td></tr>')
    return (f'<table class="t"><tr><th class="wn">م</th><th>القاعة / الشعبة</th><th class="w2">عدد الطالبات</th>'
            f'<th>المراقِبة (الملاحِظة)</th><th class="w2">التوقيع</th><th>البديل</th><th class="w2">التوقيع</th></tr>{rows}</table>')

def reserve_box():
    chips="".join(f'<span class="rchip">{e(n)}</span>' for n in reserve) or '<span class="none">لا يوجد احتياط لهذا اليوم</span>'
    sup="، ".join(e(n) for n in SUP)
    return (f'<div class="xbox"><div class="xrow"><span class="xlbl">مراقبات الاحتياط</span>'
            f'<span class="xval">{chips}</span></div>'
            f'<div class="xrow"><span class="xlbl">إشراف الدور</span>'
            f'<span class="xval">{sup}</span></div></div>')

def foot():
    return ('<table class="t"><tr><th>اسم رئيس المركز / مديرة المدرسة</th><th>التاريخ</th><th>التوقيع</th></tr>'
            '<tr><td>د. اليازية نخيرة الظاهري</td><td></td><td></td></tr></table>')

note=('<div class="note">يُمنع إدخال الهواتف والأجهزة الإلكترونية إلى قاعات الاختبار طوال الجلسة. '
      'يُترك حقل «البديل» فارغاً ويُعبَّأ عند الحاجة من مراقبات الاحتياط قبل بدء الجلسة أو أثناءها بعلم إشراف الدور.')

def page(g,items):
    return (f'<section class="sheet"><div class="fcorner"></div>'
            f'<div class="fhead"><span class="fcode">F-05</span> توزيع المراقبين والملاحظين</div><div class="frule"></div>'
            f'<div class="formsub">جلسة اختبار {e(day["subject"])} — نهاية الفصل الدراسي الأول · {GNAME.get(g,g)}</div>'
            f'{sess_tbl()}'
            f'<div class="band">{GNAME.get(g,g)}</div>'
            f'{hall_tbl(items)}'
            f'{reserve_box()}'
            f'<div class="note">{note}</div>'
            f'{foot()}'
            f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · F-05 · {GNAME.get(g,g)}</div></section>')

pages="".join(page(g,groups[g]) for g in ordered)

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:9mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0;page-break-after:always}
.sheet:last-child{page-break-after:auto}
.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:19px;text-align:right}
.fcode{color:var(--green);font-weight:900}
.frule{height:2px;background:var(--green);margin:8px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:12px;margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:6px}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:15px;padding:7px 14px;border-radius:7px 7px 0 0;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 6px}
table.t.sess{margin:6px 0 0}
table.t th,table.t td{border:1px solid var(--line);padding:7px 6px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
td.rh{text-align:right;font-weight:700}
td.nm{font-weight:700}
tr.cmt td.rh,tr.cmt td.nm{background:#EEF5F0;color:var(--green-d)}
.wn{width:28px}.w2{width:72px}
.xbox{border:1px solid var(--line);border-radius:7px;padding:8px 10px;margin:8px 0}
.xrow{display:flex;align-items:center;gap:8px;padding:3px 0}
.xrow+.xrow{border-top:1px dashed var(--line);margin-top:2px;padding-top:6px}
.xlbl{flex:0 0 120px;font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:11.5px;color:var(--green-d)}
.xval{flex:1;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rchip{background:var(--beige);border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:11.5px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.none{color:var(--mut);font-size:11px}
.note{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:7px 11px;font-size:10.5px;line-height:1.6;margin:8px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rfoot{text-align:center;font-size:9px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{pages}</body></html>'
open(OUT,'w',encoding='utf-8').write(doc)
print('ok | grades',len(ordered),'| pages',len(ordered),'| halls',len(halls),'| reserve',len(reserve))
