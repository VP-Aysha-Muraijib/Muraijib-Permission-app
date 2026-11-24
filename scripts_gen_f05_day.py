# -*- coding: utf-8 -*-
import json, html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
d=json.load(open(BASE+'/day0.json',encoding='utf-8'))
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; YEAR="2026 / 2027"
day=d['day']; halls=d['halls']; assign=d['assign']; backup=d['backup']
def e(x): return _h.escape(str(x) if x is not None else "")
rows=""
for i,h in enumerate(halls):
    cmt = h.get('grade')=='لجنة'
    rows+=(f'<tr class="{ "cmt" if cmt else "" }"><td class="cm">{i+1}</td>'
           f'<td class="rh">{e(h["hall"])}</td><td>{e(h.get("count") or "—")}</td>'
           f'<td class="nm">{e(assign[i])}</td><td></td>'
           f'<td>{e(backup[i] or "")}</td><td></td></tr>')
sess=(f'<table class="t"><tr><th>العام الدراسي</th><th>المدرسة</th><th>اليوم والتاريخ</th>'
      f'<th>المادة</th><th>الصفوف</th><th>الجلسة</th></tr>'
      f'<tr><td>{YEAR}</td><td>{SCHOOL}</td><td>{e(day["date"])}</td><td>{e(day["subject"])}</td>'
      f'<td>الخامس–الثامن</td><td>صباحية</td></tr></table>')
main=(f'<table class="t"><tr><th class="wn">م</th><th>القاعة / الشعبة</th><th class="w2">عدد الطالبات</th>'
      f'<th>المراقبة (الملاحِظة)</th><th class="w2">التوقيع</th><th>البديل</th><th class="w2">التوقيع</th></tr>{rows}</table>')
foot=('<table class="t"><tr><th>اسم رئيس المركز / مديرة المدرسة</th><th>التاريخ</th><th>التوقيع</th></tr>'
      '<tr><td>د. اليازية نخيرة الظاهري</td><td></td><td></td></tr></table>')
note=('<div class="note">يُمنع إدخال الهواتف والأجهزة الإلكترونية إلى قاعات الاختبار طوال الجلسة، '
      'ويتم تحديث التوزيع وإبلاغ البدلاء المعتمدين قبل بدء الجلسة. لجنتا غرفة الممرضة ومختبر الحاسوب للحالات الطارئة.</div>')
sheet=(f'<div class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead"><span class="fcode">F-05</span> توزيع المراقبين والملاحظين</div><div class="frule"></div>'
       f'<div class="formsub">جلسة اختبار الرياضيات — نهاية الفصل الدراسي الأول · {SCHOOL}</div>'
       f'{sess}{main}{note}{foot}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · F-05</div></div>')
CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:8mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
.fcorner{height:32px;background:var(--corner) top right/auto 32px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:17px;text-align:right}
.fcode{color:var(--green);font-weight:900}
.frule{height:2px;background:var(--green);margin:7px 0 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:11px;margin-bottom:6px;border-bottom:1px solid var(--line);padding-bottom:5px}
table.t{width:100%;border-collapse:collapse;font-size:9.3px;margin:5px 0}
table.t th,table.t td{border:1px solid var(--line);padding:3px 4px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
td.rh{text-align:right;font-weight:700}
td.nm{font-weight:700}
tr.cmt td.rh,tr.cmt td.nm{background:#EEF5F0;color:var(--green-d)}
.wn{width:24px}.w2{width:52px}
.note{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:6px 10px;font-size:9px;line-height:1.5;margin:7px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rfoot{text-align:center;font-size:8px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/f05_day0.html','w',encoding='utf-8').write(doc); print('ok rows',len(halls))
