# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; CORNER=ns['CORNER']; SCHOOL=ns['SCHOOL']; YEAR=ns['YEAR']; TERM=ns['TERM']
FONT2=open(BASE+'/noto_embedded.css',encoding='utf-8').read()

# ترتيب المواد حسب جدول اختبارات نهاية الفصل الأول للصفوف 5–8
SUBJECTS=[("الرياضيات","الأربعاء 25 / 11"),
          ("اللغة الإنجليزية","الخميس 26 / 11"),
          ("العلوم","الاثنين 7 / 12"),
          ("اللغة العربية","الثلاثاء 8 / 12"),
          ("التربية الإسلامية","الأربعاء 9 / 12"),
          ("الدراسات الاجتماعية","الخميس 10 / 12")]
STAGES=["الخامس","السادس","السابع","الثامن"]
TASKS=["التصحيح","التدقيق","الرصد"]

def hdr4():
    return (f'<table class="t hdr"><tr>'
            f'<th>العام الدراسي</th><th>المدرسة</th><th>الفرع / النطاق</th><th>الفصل / الفترة</th></tr>'
            f'<tr><td>{YEAR}</td><td>{SCHOOL}</td><td>AD 2.6</td><td>{TERM}</td></tr></table>')

def tcell():
    return ('<td class="tcell"><div class="sq"></div>'
            '<div class="dwrap"><span class="dcap">التاريخ</span>'
            '<span class="dline">____ / ____ / ______</span></div></td>')

# header rows
h1='<tr><th class="subj" rowspan="2">المادة / الاختبار</th>'+ "".join(f'<th colspan="3" class="stg">الصف {s}</th>' for s in STAGES)+'</tr>'
h2='<tr>'+ "".join("".join(f'<th class="tk">{t}</th>' for t in TASKS) for _ in STAGES)+'</tr>'
body=""
for name,date in SUBJECTS:
    cell=f'<td class="subj rh"><div class="sname">{name}</div><div class="sdate">{date}</div></td>'
    body+=f'<tr>{cell}'+ "".join(tcell() for _ in STAGES for _ in TASKS)+'</tr>'
table=f'<table class="t grid">{h1}{h2}{body}</table>'

legend=('<div class="legend">آلية التعبئة: تضع الإدارية المسؤولة علامة (✓) في المربع عند إنجاز كل مرحلة '
        '(التصحيح ثم التدقيق ثم الرصد) لكل مادة ولكل صف، وتدوّن تاريخ الإنجاز في المربع أسفل علامة الصح.</div>')

foot=('<table class="t sign"><tr>'
      '<th>الإدارية المسؤولة عن المتابعة</th><th>التوقيع</th>'
      '<th>منسّق التقدير والرصد</th><th>التوقيع</th>'
      '<th>مديرة المدرسة</th><th>التوقيع</th></tr>'
      '<tr><td></td><td></td><td></td><td></td><td class="rh2">د. اليازية نخيرة الظاهري</td><td></td></tr></table>')

sheet=(f'<div class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead">نموذج متابعة إنجاز التصحيح والتدقيق والرصد</div>'
       f'<div class="frule"></div>'
       f'<div class="formsub">متابعة إنجاز أعمال نهاية الفصل الدراسي الأول لكل مادة ولكل صف — صفحة واحدة</div>'
       f'{hdr4()}{legend}{table}{foot}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · متابعة الإنجاز</div></div>')

PRINT="""
@page{size:A3 landscape;margin:9mm}
html,body{background:#fff}
body{margin:0;padding:0}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0;width:auto}
.sheet, .sheet *{font-family:'Noto Sans Arabic','Tajawal',sans-serif!important}
.fhead{font-size:25px;font-weight:800}
.formsub{font-size:14px}
table.t{font-size:13px}
table.t.grid th{padding:5px 4px}
table.t.grid td.tcell{padding:5px 4px;height:48px;vertical-align:middle}
table.t.hdr td,table.t.hdr th{padding:7px 8px;font-size:13px}
.subj{min-width:150px;text-align:right!important;font-weight:800;font-size:15px}
.sname{font-weight:800;font-size:15px;color:#000}
.sdate{font-weight:600;font-size:10.5px;color:var(--green-d);margin-top:2px}
table.t.grid th.stg{background:var(--green)!important;color:#fff!important;font-size:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t.grid th.tk{background:var(--beige)!important;color:var(--ink);font-size:12.5px;font-weight:700}
table.t.grid th.subj{background:var(--green-d)!important;color:#fff!important}
.sq{width:23px;height:23px;border:2px solid var(--green-d);border-radius:5px;margin:0 auto 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.dwrap{display:flex;flex-direction:column;align-items:center;gap:0;margin:0 2px}
.dcap{font-size:8px;color:var(--green-d);font-weight:700}
.dline{font-size:10px;color:#8A857C;letter-spacing:.2px;direction:ltr}
.legend{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:7px 14px;font-size:12px;color:#2E4438;margin:8px 0;text-align:justify}
table.sign{margin-top:12px}
table.sign th{background:var(--beige);font-size:13px}
table.sign td{height:36px}
.rh2{font-weight:700}
"""

doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT2}\n{CSS}\n{PRINT}</style></head><body>{sheet}</body></html>'
open(BASE+'/followup_a3.html','w',encoding='utf-8').write(doc)
print('ok', len(SUBJECTS),'subjects x',len(STAGES),'stages x',len(TASKS),'tasks')
