# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; CORNER=ns['CORNER']; SCHOOL=ns['SCHOOL']; YEAR=ns['YEAR']; TERM=ns['TERM']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

GROUPS=["الهيئة الإدارية والفنية","الهيئة التعليمية"]

def group_block(g):
    nums=('<table class="t cnt"><tr>'
          '<th>الحضور الكامل</th><th>عدد الغائبين/ات</th></tr>'
          '<tr><td class="wbox"></td><td class="wbox"></td></tr></table>')
    return (f'<div class="block"><div class="band">{g}</div>'
            f'{nums}'
            f'<div class="abslabel">الغائبون/ات (الاسم / المسمى الوظيفي)</div>'
            f'<div class="absbox"></div></div>')

info=(f'<table class="t info"><tr>'
      f'<th>المدرسة</th><th>اليوم</th><th>التاريخ</th><th>العام الدراسي</th></tr>'
      f'<tr><td>{SCHOOL}</td><td class="wbox"></td><td class="wbox"></td><td>{YEAR}</td></tr></table>')

blocks="".join(group_block(g) for g in GROUPS)

foot=('<table class="t sign"><tr><th>اسم مُعِدّة الحصر</th><th>التوقيع</th>'
      '<th>مراجعة / اعتماد (الإدارة)</th><th>التوقيع</th></tr>'
      '<tr><td class="wbox"></td><td class="wbox"></td><td class="wbox"></td><td class="wbox"></td></tr></table>')

sheet=(f'<div class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead">الحصر اليومي لحضور وغياب الهيئة الإدارية والفنية والتعليمية</div>'
       f'<div class="frule"></div>'
       f'<div class="formsub">{SCHOOL}</div>'
       f'{info}{blocks}{foot}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · الحصر اليومي</div></div>')

PRINT="""
@page{size:A3 portrait;margin:9mm}
*{box-sizing:border-box}
html,body{background:#fff}
body{margin:0;padding:0}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0;width:100%;height:402mm;display:flex;flex-direction:column}
.fcorner{flex:0 0 auto}
.fhead{font-size:25px}
.frule{flex:0 0 auto}
.formsub{font-size:14.5px}
table.t{font-size:15px;margin:0}
table.t.info{flex:0 0 auto;margin:7px 0 2px}
table.t.info th{background:var(--beige);font-size:14px;padding:8px}
table.t.info td{padding:12px;font-weight:700}
table.t.info td.wbox{min-width:60px}
.block{flex:1 1 auto;display:flex;flex-direction:column;margin-top:10px;min-height:0}
.band{flex:0 0 auto;font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:21px;padding:10px 16px;border-radius:7px 7px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t.cnt{flex:0 0 auto}
table.t.cnt th{background:var(--beige);font-size:15px;padding:8px 6px;width:50%}
table.t.cnt td.wbox{height:50px;background:#fff}
.abslabel{flex:0 0 auto;background:#F4F8F5;border:1px solid var(--line);border-top:none;font-weight:700;font-size:14px;color:var(--green-d);padding:8px 12px}
.absbox{flex:1 1 auto;min-height:60mm;border:1px solid var(--line);border-top:none;background:#fff;
        background-image:repeating-linear-gradient(#fff 0 33px, #E6E3DC 33px 34px);background-position:0 10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t.sign{flex:0 0 auto;margin-top:12px}
table.t.sign th{background:var(--beige);font-size:14px;padding:9px}
table.t.sign td{height:52px}
.rfoot{flex:0 0 auto;margin-top:6px}
"""

doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{PRINT}</style></head><body>{sheet}</body></html>'
open(BASE+'/staff_attendance.html','w',encoding='utf-8').write(doc)
print('ok')
