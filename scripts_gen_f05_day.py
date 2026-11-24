# -*- coding: utf-8 -*-
import json, html as _h, sys
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
SRC=sys.argv[1] if len(sys.argv)>1 else BASE+'/day0.json'
OUT=sys.argv[2] if len(sys.argv)>2 else BASE+'/f05_day0.html'
d=json.load(open(SRC,encoding='utf-8'))
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; SCHOOL_EN="Muraijib School — Cycle 2"
YEAR="2026 / 2027"
# إشراف/مراقبة الدور لكل مرحلة — من لجنة تنظيم القاعات والمراقبة والملاحظة (وثيقة التشكيل 2026/11/16)
SUP_BY_GRADE={"خامس":["علياء الشامسي","شماء الكتبي"],
              "سادس":["اليازية الخييلي","مريم خلفان الظاهري"],
              "سابع":["هبة الكمالي","مريم هلال الدرمكي"],
              "ثامن":["هدى الكعبي","مريم راشد الدرمكي"],
              "تربية خاصة":["رقية الصوافي"],
              "لجنة":["رقية الصوافي"]}
# الدعم التقني لكل مرحلة — من اللجنة التقنية والاختبارات الإلكترونية (وثيقة التشكيل 2026/11/16)
TECH_BY_GRADE={"خامس":["دعاء مصطفى"],"سادس":["سهيلة الكتبي"],
               "سابع":["حصة الأحبابي"],"ثامن":["حصة السبوسي"],
               "تربية خاصة":[],"لجنة":[]}
day=d['day']; halls=d['halls']; assign=d['assign']; reserve=d.get('reserve',[])

def e(x): return _h.escape(str(x) if x is not None else "")

# ترتيب المراحل وأسماء العرض (عربي/إنجليزي)
ORDER=["خامس","سادس","سابع","ثامن","تربية خاصة","لجنة"]
GNAME={"خامس":"الصف الخامس","سادس":"الصف السادس","سابع":"الصف السابع",
       "ثامن":"الصف الثامن","تربية خاصة":"التربية الخاصة (التكييف والتعديل)",
       "لجنة":"اللجان المساندة"}
GEN={"خامس":"Grade 5","سادس":"Grade 6","سابع":"Grade 7","ثامن":"Grade 8",
     "تربية خاصة":"Special Education (Accommodation & Modification)",
     "لجنة":"Support Committees"}
SUBJ_EN={"الرياضيات":"Mathematics","اللغة الإنجليزية":"English Language","العلوم":"Science",
         "اللغة العربية":"Arabic Language","التربية الإسلامية":"Islamic Education",
         "الدراسات الاجتماعية":"Social Studies"}
subj_en=SUBJ_EN.get(day["subject"],"")

# تجميع القاعات حسب المرحلة
groups={}
for i,h in enumerate(halls):
    groups.setdefault(h.get('grade'),[]).append((h,assign[i]))
ordered=[g for g in ORDER if g in groups]+[g for g in groups if g not in ORDER]

def th(ar,en): return f'<th><span class="ar">{ar}</span><span class="en">{en}</span></th>'

def sess_tbl():
    heads=(th("العام الدراسي","Academic Year")+th("المدرسة","School")+
           th("اليوم والتاريخ","Day & Date")+th("المادة","Subject")+th("الجلسة","Session"))
    return (f'<table class="t sess"><tr>{heads}</tr>'
            f'<tr><td>{YEAR}</td><td><span class="ar">{SCHOOL}</span><span class="en">{SCHOOL_EN}</span></td>'
            f'<td>{e(day["date"])}</td>'
            f'<td><span class="ar">{e(day["subject"])}</span><span class="en">{e(subj_en)}</span></td>'
            f'<td><span class="ar">صباحية</span><span class="en">Morning</span></td></tr></table>')

def hall_tbl(items):
    rows=""
    for n,(h,mon) in enumerate(items,1):
        cmt = h.get('grade')=='لجنة'
        rows+=(f'<tr class="{ "cmt" if cmt else "" }"><td class="cm">{n}</td>'
               f'<td class="rh">{e(h["hall"])}</td><td>{e(h.get("count") or "—")}</td>'
               f'<td class="nm">{e(mon)}</td><td></td>'
               f'<td></td><td></td></tr>')
    heads=(th("م","No.")+th("القاعة / الشعبة","Hall / Section")+th("عدد الطالبات","Students")+
           th("المراقِبة (الملاحِظة)","Invigilator (Observer)")+th("التوقيع","Signature")+
           th("البديل","Substitute")+th("التوقيع","Signature"))
    heads=heads.replace('<th>','<th class="wn">',1)  # first col narrow
    return f'<table class="t htbl"><tr>{heads}</tr>{rows}</table>'

def reserve_box(g):
    chips="".join(f'<span class="rchip">{e(n)}</span>' for n in reserve) or '<span class="none">لا يوجد — None</span>'
    sup="، ".join(e(n) for n in SUP_BY_GRADE.get(g,[])) or "—"
    tech=SUP=TECH_BY_GRADE.get(g,[])
    tech_row=""
    if tech:
        tech_txt="، ".join(e(n) for n in tech)
        tech_row=(f'<div class="xrow"><span class="xlbl">الدعم التقني للمرحلة<b>Grade Technical Support</b></span>'
                  f'<span class="xval">{tech_txt}</span></div>')
    return (f'<div class="xbox"><div class="xrow"><span class="xlbl">مراقبات الاحتياط<b>Reserve Invigilators</b></span>'
            f'<span class="xval">{chips}</span></div>'
            f'<div class="xrow"><span class="xlbl">إشراف الدور للمرحلة<b>Grade Duty Supervision</b></span>'
            f'<span class="xval">{sup}</span></div>'
            f'{tech_row}</div>')

def foot():
    heads=(th("اسم رئيس المركز / مديرة المدرسة","Center Head / School Principal")+
           th("التاريخ","Date")+th("التوقيع","Signature"))
    return (f'<table class="t"><tr>{heads}</tr>'
            '<tr><td>د. اليازية نخيرة الظاهري</td><td></td><td></td></tr></table>')

note=('<div class="note"><span class="ar">يُمنع إدخال الهواتف والأجهزة الإلكترونية إلى قاعات الاختبار طوال الجلسة. '
      'يُترك حقل «البديل» فارغاً ويُعبَّأ عند الحاجة من مراقبات الاحتياط قبل بدء الجلسة أو أثناءها بعلم إشراف الدور.</span>'
      '<span class="en">Mobile phones and electronic devices are prohibited in exam halls throughout the session. '
      'The “Substitute” field is left blank and filled when needed from the reserve invigilators, before or during '
      'the session with the knowledge of the session supervision.</span></div>')

def page(g,items):
    return (f'<section class="sheet"><div class="fcorner"></div>'
            f'<div class="fhead"><span class="fcode">F-05</span> توزيع المراقبين والملاحظين'
            f'<span class="hen">Invigilators &amp; Observers Distribution</span></div><div class="frule"></div>'
            f'<div class="formsub"><span class="ar">جلسة اختبار {e(day["subject"])} — نهاية الفصل الدراسي الأول · {GNAME.get(g,g)}</span>'
            f'<span class="en">{e(subj_en)} Exam Session — End of Term 1 · {GEN.get(g,g)}</span></div>'
            f'{sess_tbl()}'
            f'<div class="band"><span class="ar">{GNAME.get(g,g)}</span><span class="ben">{GEN.get(g,g)}</span></div>'
            f'{hall_tbl(items)}'
            f'{reserve_box(g)}'
            f'{note}'
            f'{foot()}'
            f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · F-05 · {GNAME.get(g,g)} '
            f'— School Exams Management Guide · {GEN.get(g,g)}</div></section>')

pages="".join(page(g,groups[g]) for g in ordered)

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:9mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0;page-break-after:always}
.sheet:last-child{page-break-after:auto}
.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:19px;text-align:right;line-height:1.25}
.fhead .hen{display:block;font-size:12px;font-weight:700;color:var(--mut);direction:ltr}
.fcode{color:var(--green);font-weight:900}
.frule{height:2px;background:var(--green);margin:8px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:11.5px;margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:6px;line-height:1.4}
.formsub .en{display:block;font-size:10px;direction:ltr}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:15px;padding:6px 14px;border-radius:7px 7px 0 0;margin-top:10px;display:flex;justify-content:space-between;align-items:baseline;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.band .ben{font-size:11.5px;font-weight:700;opacity:.92;direction:ltr}
table.t{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 6px}
table.t.sess{margin:6px 0 0}
table.t th,table.t td{border:1px solid var(--line);padding:6px 6px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t th .ar{display:block;font-size:11px}
table.t th .en{display:block;font-size:8.6px;font-weight:600;color:var(--green-d);direction:ltr;letter-spacing:.1px;margin-top:1px}
td .ar{display:block;font-size:11.5px}
td .en{display:block;font-size:8.6px;color:var(--mut);direction:ltr}
td.rh{text-align:right;font-weight:700}
td.nm{font-weight:700}
tr.cmt td.rh,tr.cmt td.nm{background:#EEF5F0;color:var(--green-d)}
.wn{width:26px}.w2{width:72px}
table.htbl th:nth-child(3),table.htbl th:nth-child(5),table.htbl th:nth-child(7){width:72px}
.xbox{border:1px solid var(--line);border-radius:7px;padding:8px 10px;margin:8px 0}
.xrow{display:flex;align-items:center;gap:8px;padding:3px 0}
.xrow+.xrow{border-top:1px dashed var(--line);margin-top:2px;padding-top:6px}
.xlbl{flex:0 0 150px;font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:11.5px;color:var(--green-d)}
.xlbl b{display:block;font-size:8.6px;font-weight:700;color:var(--mut);direction:ltr}
.xval{flex:1;font-size:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rchip{background:var(--beige);border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:11.5px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.none{color:var(--mut);font-size:11px}
.note{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:7px 11px;font-size:10px;line-height:1.55;margin:8px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.note .en{display:block;direction:ltr;color:var(--mut);font-size:9px;margin-top:3px;border-top:1px dashed #D7E7DD;padding-top:3px}
.rfoot{text-align:center;font-size:8.3px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{pages}</body></html>'
open(OUT,'w',encoding='utf-8').write(doc)
print('ok | grades',len(ordered),'| pages',len(ordered),'| halls',len(halls),'| reserve',len(reserve))
