# -*- coding: utf-8 -*-
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
ns={}; exec(compile(open(BASE+'/build_platform.py',encoding='utf-8').read(),'bp','exec'),ns)
CSS=ns['CSS']; form=ns['form']; hdr4=ns['hdr4']; th=ns['th']; note=ns['note']
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

# أسماء المراقبين/الملاحظين — ثابتة كما في النموذج (الصف الثاني عشر — العام)
# (رقم القاعة، المراقب، الملاحظ/المشرف)
MON=[("1","ناعمة الكعبي","علياء الحميري"),
     ("1","شما الساعدي","حصة المزروعي"),
     ("1","سكينة الأحبابي",""),
     ("1","بسمة خالد",""),
     ("1","سندس",""),]
NROWS=10   # إجمالي صفوف الجدول كما في النموذج

# جدول اختبارات الصف الثاني عشر — المسار العام (التواقيت الرسمية)
# (المادة، اليوم، التاريخ، الجلسة، التوقيت)
EXAMS=[("الرياضيات","الأربعاء","2026/11/25","الثانية (مسائية)","ورقي 12:00–01:30 · إلكتروني 01:30–02:30 مساءً"),
       ("اللغة الإنجليزية","الخميس","2026/11/26","الثانية (مسائية)","إلكتروني: كتابي 12:00–01:30 · قراءة 01:30–02:30 مساءً"),
       ("الكيمياء","الجمعة","2026/11/27","الأولى (صباحية)","إلكتروني 09:00–11:00 صباحاً"),
       ("الفيزياء","الاثنين","2026/12/07","الثانية (مسائية)","ورقي 12:00–01:30 · إلكتروني 01:30–02:30 مساءً"),
       ("اللغة العربية","الثلاثاء","2026/12/08","الثانية (مسائية)","ورقي كتابي 12:00–01:30 · إلكتروني قراءة 01:30–02:30 مساءً"),
       ("التربية الإسلامية","الأربعاء","2026/12/09","الثانية (مسائية)","إلكتروني 12:00–02:00 مساءً"),
       ("الدراسات الاجتماعية","الخميس","2026/12/10","الثانية (مسائية)","إلكتروني 12:00–02:00 مساءً"),
       ("الأحياء","الجمعة","2026/12/11","الأولى (صباحية)","إلكتروني 09:00–11:00 صباحاً"),]

def fx(t): return f'<td class="fx">{t}</td>'   # ثابت إلكتروني
def mn():  return '<td class="mn"></td>'        # يدوي فارغ

def sheet(subj,day,date,sess,time):
    s=('<table class="t"><tr>'+th("اليوم")+th("التاريخ")+th("المادة")+th("الصف / المسار")+th("الجلسة")+th("التوقيت")+'</tr>'
       f'<tr>{fx(day)}{fx(date)}{fx(subj)}{fx("الثاني عشر — العام")}{fx(sess)}{fx(time)}</tr></table>')
    hd=('<tr>'+th("م","wn")+th("رقم القاعة","w2")+th("المراقِب")+th("التوقيع","w2")
        +th("الملاحِظ / المشرف")+th("التوقيع","w2")+th("البديل","w2")+'</tr>')
    rows=""
    for i in range(1,NROWS+1):
        if i<=len(MON):
            hall,mon,obs=MON[i-1]
            obc=fx(obs) if obs else mn()
            rows+=f'<tr><td class="cm">{i}</td>{fx(hall)}{fx(mon)}{mn()}{obc}{mn()}{mn()}</tr>'
        else:
            rows+=f'<tr><td class="cm">{i}</td>{mn()}{mn()}{mn()}{mn()}{mn()}{mn()}</tr>'
    main=f'<table class="t dist">{hd}{rows}</table>'
    foot=('<table class="t"><tr>'+th("اسم رئيس المركز / مديرة المدرسة")+th("التاريخ")+th("التوقيع")+'</tr>'
          f'<tr><td class="fx">د. اليازية نخيرة الظاهري</td>{mn()}{mn()}</tr></table>')
    body=(hdr4()+s+main
          +note("يُمنع دخول الهواتف المحمولة والأجهزة الإلكترونية للمراقبين والملاحظين داخل القاعات طوال فترة الاختبار، "
                "ويتم تحديث التوزيع قبل بدء الجلسة وإبلاغ البدلاء المعتمدين.")
          +foot)
    sec=form("F-05","توزيع المراقبين والملاحظين",f"الصف الثاني عشر — المسار العام · جلسة {subj} — {day} {date}",body)
    i=sec.index('<div class="sheet">'); return sec[i:].rsplit('</section>',1)[0].rstrip()

sheets="".join(f'<div class="pg">{sheet(*e)}</div>' for e in EXAMS)
EXTRA="""
@page{size:A4 portrait;margin:8mm}
html,body{background:#fff}body{margin:0;padding:0}
.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
.sheet{box-shadow:none;border-radius:0;padding:0;margin:0}
[contenteditable]{outline:none}.no-print{display:none!important}
td.fx{background:#F7FAF8;font-weight:700;color:#2E4A3C;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.dist td{height:30px}
table.dist td.mn{background:#fff}
"""
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}\n{EXTRA}</style></head><body>{sheets}</body></html>'
open(BASE+'/f05_g12.html','w',encoding='utf-8').write(doc)
print('ok exams',len(EXAMS))
