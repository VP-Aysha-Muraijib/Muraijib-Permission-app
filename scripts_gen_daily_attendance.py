# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; CORNER=ns['CORNER']; SCHOOL=ns['SCHOOL']; YEAR=ns['YEAR']; TERM=ns['TERM']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

STAGES=["الخامس","السادس","السابع","الثامن"]

def stage_block(stg):
    nums=(f'<table class="t cnt"><tr>'
          f'<th>الحضور الكامل</th><th>عدد الغائبات</th>'
          f'<th class="abs">الطالبات الغائبات (الاسم / الشعبة)</th></tr>'
          f'<tr><td class="wbox num"></td><td class="wbox num"></td>'
          f'<td class="wbox abs"></td></tr></table>')
    return f'<div class="block"><div class="band">الصف {stg}</div>{nums}</div>'

info=(f'<table class="t info"><tr>'
      f'<th>المدرسة</th><th>اليوم</th><th>التاريخ</th><th>العام الدراسي</th></tr>'
      f'<tr><td>{SCHOOL}</td><td class="wbox"></td><td class="wbox"></td><td>{YEAR}</td></tr></table>')

blocks="".join(stage_block(s) for s in STAGES)

foot=('<table class="t sign"><tr><th>اسم مُعِدّة الحصر</th><th>التوقيع</th>'
      '<th>مراجعة / اعتماد (الإدارة)</th><th>التوقيع</th></tr>'
      '<tr><td class="wbox"></td><td class="wbox"></td><td class="wbox"></td><td class="wbox"></td></tr></table>')

sheet=(f'<div class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead">الحصر اليومي لحضور وغياب الطالبات</div>'
       f'<div class="frule"></div>'
       f'<div class="formsub">يُعبّأ يومياً بقلم السبورة — نموذج مُغلّف حرارياً · حلقة ثانية</div>'
       f'{info}{blocks}{foot}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · الحصر اليومي</div></div>')

PRINT="""
@page{size:A4 portrait;margin:9mm}
*{box-sizing:border-box}
html,body{background:#fff}
body{margin:0;padding:0}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0;width:100%;min-height:calc(297mm - 18mm);display:flex;flex-direction:column}
.fhead{font-size:22px}
.formsub{font-size:12.5px}
table.t{font-size:13px;margin:0}
table.t.info{margin:8px 0 4px}
table.t.info th{background:var(--beige);font-size:12.5px;padding:6px}
table.t.info td{padding:7px 8px;font-weight:700}
.block{flex:1 1 auto;display:flex;flex-direction:column;margin-top:10px}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:16px;padding:7px 14px;border-radius:7px 7px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t.cnt{flex:1 1 auto;height:100%}
table.t.cnt th{background:var(--beige);font-size:13px;padding:7px 6px}
table.t.cnt th.abs{width:56%}
.wbox{background:#fff}
.wbox.num{width:22%}
.wbox.abs{background:#fff}
table.t.sign{flex:0 0 auto;margin-top:12px}
table.t.sign th{background:var(--beige);font-size:12.5px;padding:7px}
table.t.sign td{height:40px}
.rfoot{flex:0 0 auto}
"""

doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{PRINT}</style></head><body>{sheet}</body></html>'
open(BASE+'/daily_attendance.html','w',encoding='utf-8').write(doc)
print('ok', len(STAGES),'stages')
