# -*- coding: utf-8 -*-
import html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; SCHOOL_EN="Muraijib School — Cycle 2"
YEAR="2026 / 2027"
def e(x): return _h.escape(str(x) if x is not None else "")

# (الحالة عربي، الحالة إنجليزي، الإجراء عربي، الإجراء إنجليزي، الجهة عربي، الجهة إنجليزي)
SECTIONS=[
("الحالات الصحية والإسعافية","Health & First Aid",[
 ("إغماء إحدى الطالبات أثناء الاختبار","A student faints during the exam",
  "استدعاء الممرضة المدرسية وتقديم الإسعافات الأولية فوراً.","Call the school nurse and provide first aid immediately.",
  "الممرضة المدرسية","School Nurse"),
 ("شعور طالبة بتعب أو دوخة","A student feels tired or dizzy",
  "نقلها إلى العيادة المدرسية لتقييم حالتها الصحية.","Move her to the school clinic to assess her condition.",
  "الممرضة المدرسية","School Nurse"),
 ("حساسية شديدة أو ضيق في التنفس","Severe allergy or shortness of breath",
  "طلب المساعدة الطبية الطارئة فوراً واتباع خطة الاستجابة الصحية.","Request emergency medical help at once and follow the health response plan.",
  "الممرضة + الأمن والسلامة","Nurse + Safety Officer"),
 ("إصابة طالبة (سقوط على الدرج أو أثناء الاستراحة)","A student is injured (fall on stairs or during the break)",
  "تقديم الإسعافات الأولية والتأكد من سلامتها وإبلاغ الإدارة وولي الأمر عند الحاجة.","Give first aid, ensure her safety, and notify administration and parent if needed.",
  "الممرضة + الإدارة المدرسية","Nurse + Administration"),
 ("نوبة خوف أو بكاء شديد","A panic attack or severe crying",
  "تهدئتها وتقديم الدعم النفسي المناسب قبل استكمال الاختبار.","Calm her and provide suitable psychological support before resuming the exam.",
  "الأخصائي الاجتماعي","Social Counselor"),
 ("إجهاد حراري أثناء الانتظار خارج القاعات","Heat stress while waiting outside the halls",
  "نقلها إلى مكان مظلّل أو مكيّف وتوفير الماء والرعاية اللازمة.","Move her to a shaded/air-conditioned area and provide water and care.",
  "الممرضة + الأمن والسلامة","Nurse + Safety Officer"),
]),
("السلامة والإخلاء","Safety & Evacuation",[
 ("حريق أو انطلاق إنذار الحريق","Fire or fire alarm activation",
  "إخلاء الطالبات إلى نقطة التجمع الآمنة وفق خطة الإخلاء المعتمدة.","Evacuate students to the safe assembly point per the approved evacuation plan.",
  "فريق الإخلاء والطوارئ","Evacuation & Emergency Team"),
 ("رائحة احتراق أو دخان داخل القاعة","Burning smell or smoke inside the hall",
  "إبلاغ فريق الطوارئ وإخلاء المكان فور وجود خطر.","Notify the emergency team and evacuate once any danger is present.",
  "فريق الإخلاء والطوارئ","Evacuation & Emergency Team"),
 ("تسرب مياه داخل قاعة الاختبار","Water leak inside the exam hall",
  "إبعاد الطالبات عن مصدر الخطر ونقلهنّ إلى قاعة آمنة بديلة.","Keep students away from the hazard and move them to a safe alternate hall.",
  "إشراف الدور + الصيانة","Duty Supervision + Maintenance"),
 ("إغلاق أحد مخارج الطوارئ أو تعذّر استخدامه","An emergency exit is blocked or unusable",
  "توجيه الطالبات إلى مخرج آمن بديل وإبلاغ مسؤول الأمن والسلامة.","Direct students to a safe alternate exit and inform the safety officer.",
  "مسؤول الأمن والسلامة","Health & Safety Officer"),
 ("عاصفة أو أمطار غزيرة أثناء الاختبارات","A storm or heavy rain during exams",
  "إبقاء الطالبات في أماكن آمنة واتباع تعليمات الجهات المختصة.","Keep students in safe areas and follow the competent authorities' instructions.",
  "الأمن والسلامة + الإدارة","Safety Officer + Administration"),
]),
("المرافق والبنية التحتية","Facilities & Infrastructure",[
 ("انقطاع الكهرباء أثناء الاختبار","Power outage during the exam",
  "توفير الإضاءة البديلة والتواصل مع فريق الصيانة فوراً.","Provide backup lighting and contact the maintenance team immediately.",
  "فريق الصيانة","Maintenance Team"),
 ("تعطل التكييف داخل قاعة الاختبار","Air-conditioning failure inside the hall",
  "التواصل مع الصيانة ونقل الطالبات إلى قاعة بديلة عند الحاجة.","Contact maintenance and move students to an alternate hall if needed.",
  "الصيانة + إشراف الدور","Maintenance + Duty Supervision"),
 ("مشكلة في دورات المياه (تسرب أو انسداد)","A restroom problem (leak or blockage)",
  "إغلاق المنطقة المتضررة مؤقتاً وتوجيه الطالبات إلى مرافق بديلة.","Temporarily close the affected area and direct students to alternate facilities.",
  "فريق الصيانة","Maintenance Team"),
 ("انقطاع مفاجئ في مياه الشرب","Sudden interruption of drinking water",
  "توفير بدائل مياه الشرب فوراً وإبلاغ الإدارة.","Provide drinking-water alternatives immediately and inform administration.",
  "الإدارة + الصيانة","Administration + Maintenance"),
]),
("الاختبارات الإلكترونية وأوراق الاختبار","E-Exams & Exam Materials",[
 ("عطل في أجهزة الحاسوب أثناء الاختبار الإلكتروني","Computer failure during an e-exam",
  "التواصل مع الدعم الفني وتوفير جهاز بديل للطالبة.","Contact technical support and provide the student with a backup device.",
  "اللجنة التقنية","Technical & E-Exams Committee"),
 ("انقطاع الإنترنت أثناء الاختبار الإلكتروني","Internet outage during an e-exam",
  "إبلاغ الدعم الفني ولجنة الاختبارات واتباع الإجراءات المعتمدة.","Inform technical support and the exams committee and follow approved procedures.",
  "اللجنة التقنية + اللجنة الرئيسية","Technical + Main Committee"),
 ("نقص في أوراق الاختبارات","Shortage of exam papers",
  "إبلاغ لجنة الاختبارات لتوفير النسخ المطلوبة فوراً.","Inform the exams committee to provide the required copies at once.",
  "اللجنة الرئيسية للاختبارات","Main Exams Committee"),
]),
("التنظيم والانضباط","Organization & Conduct",[
 ("تأخر طالبة عن موعد الاختبار","A student is late for the exam",
  "إبلاغ لجنة الاختبارات والتواصل مع ولي الأمر حسب الحاجة.","Inform the exams committee and contact the parent as needed.",
  "لجنة الحضور والغياب","Attendance Committee"),
 ("غياب إحدى المراقبات","An invigilator is absent",
  "تكليف مراقِبة احتياط فوراً لضمان استمرار الاختبار.","Assign a reserve invigilator immediately to keep the exam running.",
  "إشراف الدور","Duty Supervision"),
 ("ازدحام الممرات عند الدخول أو الخروج","Crowded corridors during entry or exit",
  "تنظيم حركة الطالبات وتوزيع المشرفات على الممرات.","Organize student movement and distribute supervisors along corridors.",
  "إشراف الدور + الأمن والسلامة","Duty Supervision + Safety"),
 ("شجار بين الطالبات قبل الاختبار أو بعده","A dispute between students before or after the exam",
  "التدخل لفضّه بطريقة آمنة وإبلاغ الإدارة المدرسية.","Intervene to resolve it safely and notify the school administration.",
  "الإدارة المدرسية","School Administration"),
 ("دخول شخص غير مصرّح له إلى منطقة الاختبارات","An unauthorized person enters the exam area",
  "منعه من الدخول وإبلاغ مسؤول الأمن والسلامة والإدارة فوراً.","Prevent entry and inform the safety officer and administration immediately.",
  "مسؤول الأمن والسلامة","Health & Safety Officer"),
 ("عدم حضور ولي الأمر لاستلام الطالبة بعد الاختبار","A parent does not arrive to collect the student",
  "إبقاؤها في مكان آمن تحت الإشراف والتواصل مع ولي الأمر.","Keep her in a safe, supervised place and contact the parent.",
  "لجنة الحضور والغياب","Attendance Committee"),
]),
]

def th(ar,en): return f'<th><span class="ar">{ar}</span><span class="en">{en}</span></th>'
def bc(ar,en): return f'<span class="ar">{e(ar)}</span><span class="en">{e(en)}</span>'

info=(f'<table class="t sess"><tr>'+th("العام الدراسي","Academic Year")+th("المدرسة","School")+
      th("الفترة","Period")+th("إعداد الخطة","Prepared by")+'</tr>'
      f'<tr><td>{YEAR}</td><td>{bc(SCHOOL,SCHOOL_EN)}</td>'
      f'<td>{bc("اختبارات نهاية الفصل الأول","End of Term 1 Exams")}</td>'
      f'<td>{bc("لجنة الأمن والسلامة والطوارئ","Safety & Emergency Committee")}</td></tr></table>')

n=0; blocks=""
for title_ar,title_en,items in SECTIONS:
    band=f'<div class="band"><span class="ar">{title_ar}</span><span class="ben">{title_en}</span></div>'
    rows=""
    for sit_ar,sit_en,act_ar,act_en,r_ar,r_en in items:
        n+=1
        rows+=(f'<tr><td class="cm">{n}</td>'
               f'<td class="sit">{bc("إذا "+sit_ar,"If "+sit_en[0].lower()+sit_en[1:])}</td>'
               f'<td class="act">{bc(act_ar,act_en)}</td>'
               f'<td class="res">{bc(r_ar,r_en)}</td></tr>')
    heads=(th("م","No.")+th("الحالة الطارئة","Emergency Situation")+
           th("الإجراء المتخذ","Action Taken")+th("الجهة المسؤولة","Responsible Party"))
    heads=heads.replace('<th>','<th class="wn">',1)
    blocks+=f'<div class="sec">{band}<table class="t gtbl"><tr>{heads}</tr>{rows}</table></div>'

note=('<div class="note"><span class="ar"><b>ملاحظة مهمة:</b> عند وجود خطر على سلامة الطالبات، تكون الأولوية للاستجابة '
      'للطوارئ وحماية الأرواح، ثم استكمال إجراءات الاختبار وفق التعليمات المعتمدة.</span>'
      '<span class="en"><b>Important:</b> When students\' safety is at risk, emergency response and saving lives take priority, '
      'then exam procedures are completed per the approved instructions.</span></div>')

foot=(f'<table class="t"><tr>'+th("مسؤول الأمن والسلامة","Health & Safety Officer")+th("التوقيع","Signature")+
      th("اعتماد / مديرة المدرسة","Approved / School Principal")+th("التوقيع","Signature")+'</tr>'
      f'<tr><td></td><td></td><td>د. اليازية نخيرة الظاهري</td><td></td></tr></table>')

sheet=(f'<section class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead"><span class="fcode">F-12</span> خطة الطوارئ والاستجابة أثناء الاختبارات'
       f'<span class="hen">Exam Emergency &amp; Response Plan</span></div><div class="frule"></div>'
       f'<div class="formsub"><span class="ar">تحدّد هذه الخطة الإجراءات المعتمدة للتعامل مع الحالات الطارئة المحتملة أثناء فترة الاختبارات بما يضمن سلامة الطالبات واستمرار سير الاختبار.</span>'
       f'<span class="en">This plan sets the approved procedures for handling potential emergencies during the exam period, ensuring students\' safety and exam continuity.</span></div>'
       f'{info}{blocks}{note}{foot}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · F-12 · خطة الطوارئ — School Exams Management Guide · Emergency Plan</div></section>')

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:9mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:19px;text-align:right;line-height:1.25}
.fhead .hen{display:block;font-size:12px;font-weight:700;color:var(--mut);direction:ltr}
.fcode{color:var(--green);font-weight:900}
.frule{height:2px;background:var(--green);margin:8px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:11px;margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:6px;line-height:1.45}
.formsub .en{display:block;font-size:9.5px;direction:ltr;margin-top:2px}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:14px;padding:6px 13px;border-radius:7px 7px 0 0;margin-top:12px;display:flex;justify-content:space-between;align-items:baseline;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:avoid}
.band .ben{font-size:11px;font-weight:700;opacity:.92;direction:ltr}
.sec{page-break-inside:avoid;margin-top:9px}
.sec .band{margin-top:0}
table.t{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 4px}
table.t.sess{margin:6px 0 0}
table.t th,table.t td{border:1px solid var(--line);padding:4.5px 7px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t th .ar{display:block;font-size:11px}
table.t th .en{display:block;font-size:8.4px;font-weight:600;color:var(--green-d);direction:ltr;margin-top:1px}
td .ar{display:block;font-size:11px;line-height:1.4}
td .en{display:block;font-size:8.4px;color:var(--mut);direction:ltr;line-height:1.35;margin-top:1px}
tr{page-break-inside:avoid}
.wn{width:26px}
table.gtbl td.sit{width:27%;text-align:right;font-weight:700}
table.gtbl td.act{width:42%;text-align:right}
table.gtbl td.res{width:22%;font-weight:700;color:var(--green-d)}
table.gtbl td.res .en{color:var(--green-d);opacity:.8}
.note{background:#FBF3EF;border:1px solid #E8C9BC;border-right:4px solid #C0633F;border-radius:6px;padding:7px 12px;font-size:10.5px;line-height:1.5;margin:9px 0 6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid}
.note .en{display:block;direction:ltr;color:var(--mut);font-size:9px;margin-top:3px;border-top:1px dashed #E8C9BC;padding-top:3px}
.rfoot{text-align:center;font-size:8.3px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/emergency.html','w',encoding='utf-8').write(doc)
print('ok | sections',len(SECTIONS),'| scenarios',n)
