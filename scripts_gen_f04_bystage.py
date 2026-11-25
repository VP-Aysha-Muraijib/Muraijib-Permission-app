# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; form=ns['form']; hdr4=ns['hdr4']; th=ns['th']; ce=ns['ce']; note=ns['note']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

STAGES=[("الصف الخامس","7 قاعات"),("الصف السادس","8 قاعات"),
        ("الصف السابع","8 قاعات"),("الصف الثامن","7 قاعات"),
        ("التربية الخاصة","5 لجان")]
EXAMS=[("الرياضيات","الأربعاء","25 / 11 / 2026"),
       ("اللغة الإنجليزية","الخميس","26 / 11 / 2026"),
       ("العلوم","الاثنين","07 / 12 / 2026"),
       ("اللغة العربية","الثلاثاء","08 / 12 / 2026"),
       ("التربية الإسلامية","الأربعاء","09 / 12 / 2026"),
       ("الدراسات الاجتماعية","الخميس","10 / 12 / 2026")]

def fx(t): return f'<td class="fx">{t}</td>'

def stage_sheet(stage,qty):
    srows=""
    for subj,day,date in EXAMS:
        srows+=f'<tr>{fx(day)}{fx(date)}{fx(subj)}{fx(stage+" ("+qty+")")}{fx("صباحية")}</tr>'
    sess=(f'<table class="t"><tr>{th("اليوم")}{th("التاريخ")}{th("المادة")}{th("الصف")}{th("الجلسة / الوقت")}</tr>{srows}</table>')
    main=(f'<table class="t"><tr>{th("م","wn")}{th("نوع المادة/التذكرة")}{th("الكمية")}{th("وقت الاستلام")}'
          f'{th("اسم المستلم/توقيع")}{th("وقت الإعادة")}{th("اسم المستلم النهائي/توقيع")}</tr>'
          + "".join(f'<tr><td class="cm">{i}</td>{ce()}{ce()}{ce()}{ce()}{ce()}{ce()}</tr>' for i in range(1,4))
          + '</table>')
    foot=(f'<table class="t"><tr>{th("اسم المشرف")}{th("التوقيع")}{th("رئيس المركز/مدير المدرسة")}{th("التوقيع")}</tr>'
          f'<tr><td class="rh">عائشة النعيمي</td>{ce()}<td class="rh" rowspan="2">د. اليازية نخيرة الظاهري</td>'
          f'<td class="e" rowspan="2" contenteditable="true"></td></tr>'
          f'<tr><td class="cm">2</td>{ce()}</tr></table>')
    body=(hdr4()+sess+main
          +note("يتم استلام وتسليم المواد الاختبارية والتذاكر من خلال عدد (2) من المشرفين المكلفين، وباعتماد رئيس اللجنة، "
                "مع التحقق من بيانات صندوق الأسئلة والمغلفات وفق اليوم والتاريخ والمادة وبيانات المدرسة وعدد الطلبة والتعليمات المرفقة، "
                "وحصر المواد غير المستخدمة يومياً، وعدم تداول التذاكر أو المواد الاختبارية عبر أي وسائل أو قنوات غير معتمدة.")
          +foot)
    sec=form("F-04","استلام وتسليم المواد والتذاكر",f"ورقة المرحلة: {stage}",body)
    i=sec.index('<div class="sheet">'); return sec[i:].rsplit('</section>',1)[0].rstrip()

sheets="".join(f'<div class="pg">{stage_sheet(st,q)}</div>' for st,q in STAGES)
EXTRA="""
@page{size:A4 portrait;margin:8mm}
html,body{background:#fff}body{margin:0;padding:0}
.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0}
[contenteditable]{outline:none}.no-print{display:none!important}
td.fx{background:#F7FAF8;font-weight:700;color:#2E4A3C;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
"""
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{EXTRA}</style></head><body>{sheets}</body></html>'
open(BASE+'/f04_bystage.html','w',encoding='utf-8').write(doc)
print('ok stages',len(STAGES))
