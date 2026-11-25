# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; form=ns['form']; hdr4=ns['hdr4']; th=ns['th']; note=ns['note']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

# جدول الاختبارات المعتمد للصفوف 5-8 (نهاية الفصل الدراسي الأول)
EXAMS=[("الرياضيات","الأربعاء","25 / 11"),
       ("اللغة الإنجليزية","الخميس","26 / 11"),
       ("العلوم","الاثنين","07 / 12"),
       ("اللغة العربية","الثلاثاء","08 / 12"),
       ("التربية الإسلامية","الأربعاء","09 / 12"),
       ("الدراسات الاجتماعية","الخميس","10 / 12")]
# (المرحلة، الكمية المعتمدة، نص الجلسة)
STAGES=[("الصف الخامس","7 قاعات","صباحية"),
        ("الصف السادس","8 قاعات","صباحية"),
        ("الصف السابع","8 قاعات","صباحية"),
        ("الصف الثامن","7 قاعات","صباحية"),
        ("التربية الخاصة","5 لجان","صباحية + زمن إضافي")]

# ترويسة الجدول
head='<tr>'+th("المرحلة","w1")+th("عدد القاعات / اللجان","w2")
for subj,day,date in EXAMS:
    head+=f'<th>{subj}<span class="exd">{day} · {date}</span></th>'
head+='</tr>'
# صفوف المراحل
rows=""
for stage,qty,sess in STAGES:
    cells="".join(f'<td class="ses">{sess}</td>' for _ in EXAMS)
    rows+=f'<tr><td class="rh">{stage}</td><td class="num">{qty}</td>{cells}</tr>'
main=f'<table class="t sched">{head}{rows}</table>'

foot=(f'<table class="t"><tr>{th("مُعِدّ الجدول / منسق الاختبارات")}{th("التوقيع")}'
      f'{th("اعتماد / مديرة المدرسة")}{th("التوقيع")}</tr>'
      '<tr><td class="e" contenteditable="true"></td><td class="e" contenteditable="true"></td>'
      '<td class="rh">د. اليازية نخيرة الظاهري</td><td class="e" contenteditable="true"></td></tr></table>')

body=(hdr4()+main
      +note("جميع جلسات الاختبار صباحية وفق الجدول المعتمد. تُطبَّق على طلبة التربية الخاصة التيسيرات المعتمدة "
            "(زمن إضافي وتهيئة بيئة الاختبار). الأعداد الواردة تمثّل القاعات/اللجان المعتمدة لكل مرحلة.")
      +foot)

sec=form("F-04","جدول الاختبارات المعتمدة — نهاية الفصل الدراسي الأول","الصفوف من الخامس إلى الثامن + التربية الخاصة",body)
i=sec.index('<div class="sheet">'); sheet=sec[i:].rsplit('</section>',1)[0].rstrip()

EXTRA="""
@page{size:A4 landscape;margin:9mm}
html,body{background:#fff}body{margin:0;padding:0}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0}
[contenteditable]{outline:none}.no-print{display:none!important}
table.sched th .exd{display:block;font-weight:600;font-size:10px;color:var(--green-d);margin-top:2px}
table.sched th{font-size:12.5px;padding:8px 5px}
table.sched td{padding:10px 6px;font-size:12px;text-align:center}
table.sched td.rh{font-weight:800;font-size:13px;background:#FbF8F3;text-align:center}
table.sched td.num{font-weight:800;color:var(--green-d);font-size:13px;background:var(--beige)}
table.sched td.ses{color:#4A4640}
"""
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{EXTRA}</style></head><body>{sheet}</body></html>'
open(BASE+'/f04_schedule.html','w',encoding='utf-8').write(doc)
print('ok exams',len(EXAMS),'stages',len(STAGES))
