# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; form=ns['form']; hdr4=ns['hdr4']; th=ns['th']; note=ns['note']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

# (المرحلة، الكمية المعتمدة)
STAGES=[("الصف الخامس","7 قاعات"),("الصف السادس","8 قاعات"),
        ("الصف السابع","8 قاعات"),("الصف الثامن","7 قاعات"),
        ("التربية الخاصة","5 لجان")]
# جدول اختبارات الصفوف 5-8 (المادة، اليوم، التاريخ)
EXAMS=[("الرياضيات","الأربعاء","25 / 11 / 2026"),
       ("اللغة الإنجليزية","الخميس","26 / 11 / 2026"),
       ("العلوم","الاثنين","07 / 12 / 2026"),
       ("اللغة العربية","الثلاثاء","08 / 12 / 2026"),
       ("التربية الإسلامية","الأربعاء","09 / 12 / 2026"),
       ("الدراسات الاجتماعية","الخميس","10 / 12 / 2026")]

def fx(t): return f'<td class="fx">{t}</td>'   # ثابت إلكتروني
def mn():  return '<td class="mn"></td>'        # يدوي فارغ

def stage_sheet(stage,qty):
    band=f'<div class="stbar"><span>المرحلة: <b>{stage}</b></span><span>عدد القاعات / اللجان: <b>{qty}</b></span></div>'
    hd=('<tr>'+th("م","wn")+th("اليوم والتاريخ")+th("المادة")+th("الكمية","w2")
        +th("وقت الاستلام","w2")+th("اسم المستلِم / التوقيع")+th("وقت الإعادة","w2")+th("اسم المستلِم النهائي / التوقيع")+'</tr>')
    rows=""
    for i,(subj,day,date) in enumerate(EXAMS,1):
        rows+=f'<tr><td class="cm">{i}</td>{fx(day+" "+date)}{fx(subj)}{fx(qty)}{mn()}{mn()}{mn()}{mn()}</tr>'
    main=f'<table class="t hand">{hd}{rows}</table>'
    foot=('<table class="t"><tr>'+th("اسم المشرف المكلّف (1)")+th("التوقيع")+th("اسم المشرف المكلّف (2)")+th("التوقيع")+'</tr>'
          f'<tr>{fx("عائشة النعيمي")}{mn()}{mn()}{mn()}</tr>'
          '<tr>'+th("اعتماد رئيس المركز / مديرة المدرسة")+th("التاريخ")+th("التوقيع")+th("")+'</tr>'
          f'<tr><td class="fx">د. اليازية نخيرة الظاهري</td>{mn()}{mn()}<td class="fx"></td></tr></table>')
    body=(hdr4()+band+main
          +note("ضوابط العهدة: يُستلَم وتُسلَّم المواد الاختبارية والتذاكر عبر مشرفَين مكلّفَين وباعتماد رئيس المركز، "
                "مع التحقق من بيانات صندوق الأسئلة والمغلفات حسب اليوم والتاريخ والمادة وبيانات المدرسة وعدد الطلبة، "
                "وحصر المواد غير المستخدمة يومياً. تُعبّأ الحقول اليدوية (أوقات الاستلام/الإعادة والأسماء والتوقيعات) خطّياً.")
          +foot)
    sec=form("F-04","استلام وتسليم المواد والتذاكر",f"ورقة المرحلة: {stage} — جميع أيام الاختبارات",body)
    i=sec.index('<div class="sheet">'); return sec[i:].rsplit('</section>',1)[0].rstrip()

sheets="".join(f'<div class="pg">{stage_sheet(st,q)}</div>' for st,q in STAGES)
EXTRA="""
@page{size:A4 landscape;margin:6mm}
html,body{background:#fff}body{margin:0;padding:0}
.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0}
[contenteditable]{outline:none}.no-print{display:none!important}
td.fx{background:#F7FAF8;font-weight:700;color:#2E4A3C;text-align:center;vertical-align:middle;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet .note{margin:7px 0;padding:7px 12px;font-size:11px}
.sheet .rfoot{margin-top:6px}
.stbar{display:flex;justify-content:space-between;align-items:center;background:var(--beige);border:1px solid var(--line);border-radius:7px;padding:6px 16px;margin:6px 0 2px;font-family:'Cairo','Tajawal',sans-serif;font-size:14px;color:var(--green-d);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.stbar b{font-weight:800}
table.hand td.cm{font-weight:700}
table.hand td{height:36px;vertical-align:middle}
table.hand th{padding:7px 6px;font-size:12.5px}
table.hand td.mn{background:#fff;vertical-align:top;padding-top:5px;background-image:repeating-linear-gradient(transparent 0 19px,#ECEAE4 19px 20px);background-position:0 4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
"""
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{EXTRA}</style></head><body>{sheets}</body></html>'
open(BASE+'/f04_bystage.html','w',encoding='utf-8').write(doc)
print('ok stages',len(STAGES),'exam-rows',len(EXAMS))
