# -*- coding: utf-8 -*-
import html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; SCHOOL_EN="Muraijib School — Cycle 2"
YEAR="2026 / 2027"
def e(x): return _h.escape(str(x) if x is not None else "")

# (الموقف عربي، الموقف إنجليزي، الإجراء عربي، الإجراء إنجليزي، الجهة عربي، الجهة إنجليزي)
SECTIONS=[
("أولاً: الحالات الصحية والإسعافية","I. Health & First Aid",[
 ("إعياء أو دوخة أو إغماء مفاجئ لإحدى الطالبات","Sudden faintness, dizziness, or collapse of a student",
  "نقل الطالبة إلى العيادة المدرسية واستدعاء الممرضة وتقديم الإسعافات الأولية فوراً.",
  "Move the student to the clinic, summon the nurse, and administer first aid immediately.",
  "الممرضة المدرسية","School Nurse"),
 ("أزمة صحية حادة (حساسية شديدة أو ضيق في التنفس)","Acute medical emergency (severe allergy or shortness of breath)",
  "طلب المساعدة الطبية الطارئة فوراً وتطبيق خطة الاستجابة الصحية المعتمدة.",
  "Request emergency medical assistance at once and apply the approved health response plan.",
  "الممرضة + مسؤول الأمن والسلامة","Nurse + Safety Officer"),
 ("إصابة جسدية نتيجة سقوط أو تعثّر","Physical injury resulting from a fall or trip",
  "تقديم الإسعافات الأولية والتأكد من سلامة الطالبة وإبلاغ الإدارة وولي الأمر عند الحاجة.",
  "Provide first aid, verify the student's safety, and notify administration and the parent if required.",
  "الممرضة + الإدارة المدرسية","Nurse + Administration"),
 ("حالة قلق أو اضطراب نفسي أثناء الاختبار","Anxiety or psychological distress during the exam",
  "احتواء الطالبة وتقديم الدعم النفسي المناسب قبل استكمال الاختبار.",
  "Reassure the student and provide suitable psychological support before resuming the exam.",
  "الأخصائي الاجتماعي","Social Counselor"),
 ("إجهاد حراري أثناء الانتظار خارج القاعات","Heat stress while waiting outside the halls",
  "نقل الطالبة إلى مكان مظلّل أو مكيّف وتوفير المياه والرعاية اللازمة.",
  "Move the student to a shaded or air-conditioned area and provide water and necessary care.",
  "الممرضة + مسؤول الأمن والسلامة","Nurse + Safety Officer"),
]),
("ثانياً: السلامة والإخلاء","II. Safety & Evacuation",[
 ("نشوب حريق أو وجود دخان أو رائحة احتراق","Fire, smoke, or a burning smell",
  "تفعيل إنذار الإخلاء ونقل الطالبات إلى نقطة التجمع الآمنة وفق خطة الإخلاء المعتمدة.",
  "Activate the evacuation alarm and move students to the safe assembly point per the approved evacuation plan.",
  "فريق الإخلاء والطوارئ","Evacuation & Emergency Team"),
 ("تسرب مياه داخل قاعة الاختبار","Water leak inside the exam hall",
  "إبعاد الطالبات عن مصدر الخطر ونقلهنّ إلى قاعة آمنة بديلة.",
  "Keep students clear of the hazard and relocate them to a safe alternate hall.",
  "إشراف الدور + فريق الصيانة","Duty Supervision + Maintenance"),
 ("تعذّر استخدام أحد مخارج الطوارئ","An emergency exit is obstructed or unusable",
  "توجيه الطالبات إلى مخرج آمن بديل وإبلاغ مسؤول الأمن والسلامة فوراً.",
  "Direct students to a safe alternate exit and promptly inform the safety officer.",
  "مسؤول الأمن والسلامة","Health & Safety Officer"),
 ("تقلبات جوية حادة (عاصفة أو أمطار غزيرة)","Severe weather conditions (storm or heavy rain)",
  "إبقاء الطالبات في أماكن آمنة والالتزام بتعليمات الجهات المختصة.",
  "Keep students in safe areas and comply with the competent authorities' instructions.",
  "مسؤول الأمن والسلامة + الإدارة","Safety Officer + Administration"),
]),
("ثالثاً: المرافق والبنية التحتية","III. Facilities & Infrastructure",[
 ("انقطاع التيار الكهربائي أثناء الاختبار","Power outage during the exam",
  "توفير الإضاءة البديلة والتواصل الفوري مع فريق الصيانة.",
  "Provide backup lighting and contact the maintenance team immediately.",
  "فريق الصيانة","Maintenance Team"),
 ("تعطّل التكييف داخل قاعة الاختبار","Air-conditioning failure inside the hall",
  "التواصل مع الصيانة ونقل الطالبات إلى قاعة بديلة عند الحاجة.",
  "Contact maintenance and relocate students to an alternate hall if needed.",
  "فريق الصيانة + إشراف الدور","Maintenance + Duty Supervision"),
 ("خلل في المرافق الصحية أو انقطاع مياه الشرب","Restroom malfunction or interruption of drinking water",
  "إغلاق المنطقة المتضررة مؤقتاً وتوفير بدائل مناسبة وإبلاغ الإدارة.",
  "Temporarily close the affected area, provide suitable alternatives, and inform administration.",
  "فريق الصيانة + الإدارة","Maintenance + Administration"),
]),
("رابعاً: الاختبارات الإلكترونية وأوراق الاختبار","IV. E-Exams & Exam Materials",[
 ("تعطّل الأجهزة أو انقطاع الإنترنت أثناء الاختبار الإلكتروني","Device failure or internet outage during an e-exam",
  "إبلاغ الدعم الفني وتوفير بديل مناسب وإشعار لجنة الاختبارات واتباع الإجراءات المعتمدة.",
  "Notify technical support, provide a suitable alternative, inform the exams committee, and follow approved procedures.",
  "اللجنة التقنية + اللجنة الرئيسية","Technical + Main Committee"),
 ("نقص في أوراق الاختبار","Shortage of exam papers",
  "إبلاغ لجنة الاختبارات لتوفير النسخ المطلوبة فوراً.",
  "Inform the exams committee to provide the required copies immediately.",
  "اللجنة الرئيسية للاختبارات","Main Exams Committee"),
]),
("خامساً: التنظيم والانضباط","V. Organization & Conduct",[
 ("تأخر طالبة عن موعد الاختبار","A student arrives late for the exam",
  "إبلاغ لجنة الاختبارات والتواصل مع ولي الأمر وفق التعليمات المعتمدة.",
  "Inform the exams committee and contact the parent in line with approved instructions.",
  "لجنة الحضور والغياب","Attendance Committee"),
 ("غياب إحدى المراقبات","Absence of an invigilator",
  "تكليف مراقِبة احتياط فوراً لضمان استمرار سير الاختبار.",
  "Assign a reserve invigilator immediately to ensure exam continuity.",
  "إشراف الدور","Duty Supervision"),
 ("ازدحام الممرات عند الدخول أو الخروج","Congestion in corridors during entry or exit",
  "تنظيم حركة الطالبات وتوزيع المشرفات على الممرات والمخارج.",
  "Regulate student movement and deploy supervisors along corridors and exits.",
  "إشراف الدور + الأمن والسلامة","Duty Supervision + Safety"),
 ("نشوب خلاف بين الطالبات","A dispute arises between students",
  "التدخل لاحتوائه بطريقة آمنة وإبلاغ الإدارة المدرسية.",
  "Intervene to contain it safely and notify the school administration.",
  "الإدارة المدرسية","School Administration"),
 ("دخول شخص غير مصرّح له إلى منطقة الاختبارات","Entry of an unauthorized person into the exam area",
  "منعه من الدخول وإبلاغ مسؤول الأمن والسلامة والإدارة فوراً.",
  "Deny entry and immediately inform the safety officer and administration.",
  "مسؤول الأمن والسلامة","Health & Safety Officer"),
 ("تأخر ولي الأمر في استلام الطالبة بعد الاختبار","Delay of a parent in collecting the student after the exam",
  "إبقاء الطالبة في مكان آمن تحت الإشراف واستمرار التواصل مع ولي الأمر.",
  "Keep the student in a safe, supervised place and maintain contact with the parent.",
  "لجنة الحضور والغياب","Attendance Committee"),
]),
]

def th(ar,en): return f'<th><span class="ar">{ar}</span><span class="en">{en}</span></th>'
def bc(ar,en): return f'<span class="ar">{e(ar)}</span><span class="en">{e(en)}</span>'

info=(f'<table class="t sess"><tr>'+th("العام الدراسي","Academic Year")+th("المدرسة","School")+
      th("الفترة","Period")+th("رقم الإصدار","Version")+th("إعداد الخطة","Prepared by")+'</tr>'
      f'<tr><td>{YEAR}</td><td>{bc(SCHOOL,SCHOOL_EN)}</td>'
      f'<td>{bc("اختبارات نهاية الفصل الأول","End of Term 1 Exams")}</td>'
      f'<td>1</td>'
      f'<td>{bc("لجنة الأمن والسلامة والطوارئ","Safety & Emergency Committee")}</td></tr></table>')

n=0; blocks=""
for title_ar,title_en,items in SECTIONS:
    band=f'<div class="band"><span class="ar">{title_ar}</span><span class="ben">{title_en}</span></div>'
    rows=""
    for sit_ar,sit_en,act_ar,act_en,r_ar,r_en in items:
        n+=1
        rows+=(f'<tr><td class="cm">{n}</td>'
               f'<td class="sit">{bc(sit_ar,sit_en)}</td>'
               f'<td class="act">{bc(act_ar,act_en)}</td>'
               f'<td class="res">{bc(r_ar,r_en)}</td></tr>')
    heads=(th("م","No.")+th("الموقف الطارئ","Emergency Situation")+
           th("الإجراء المُعتمَد","Approved Action")+th("الجهة المسؤولة","Responsible Party"))
    heads=heads.replace('<th>','<th class="wn">',1)
    blocks+=f'<div class="sec">{band}<table class="t gtbl"><tr>{heads}</tr>{rows}</table></div>'

note=('<div class="note"><span class="ar"><b>مبدأ الأولوية:</b> عند وجود خطر على سلامة الطالبات تكون الأولوية المطلقة '
      'للاستجابة للطوارئ وحماية الأرواح، ثم يُستكمل إجراء الاختبار وفق التعليمات المعتمدة.</span>'
      '<span class="en"><b>Priority principle:</b> When students\' safety is at risk, emergency response and the protection of '
      'life take absolute priority; exam procedures are then completed in accordance with approved instructions.</span></div>')

sign=('<table class="t sign"><tr>'
      +th("إعداد الخطة","Prepared by")+th("مراجعة / مسؤول الأمن والسلامة","Reviewed / Safety Officer")
      +th("اعتماد / مديرة المدرسة","Approved / School Principal")+'</tr>'
      '<tr><td>'+bc("لجنة الأمن والسلامة والطوارئ","Safety & Emergency Committee")+'</td>'
      '<td>'+bc("مسؤول الأمن والسلامة","Health & Safety Officer")+'</td>'
      '<td>د. اليازية نخيرة الظاهري</td></tr>'
      '<tr class="sg"><td>'+bc("التوقيع والتاريخ","Signature & Date")+'</td>'
      '<td>'+bc("التوقيع والتاريخ","Signature & Date")+'</td>'
      '<td>'+bc("التوقيع والتاريخ","Signature & Date")+'</td></tr></table>')

sheet=(f'<section class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead"><span class="fcode">F-12</span> خطة الاستجابة للطوارئ أثناء فترة الاختبارات'
       f'<span class="hen">Emergency Response Plan — Examination Period</span></div><div class="frule"></div>'
       f'<div class="formsub"><span class="ar">تُحدِّد هذه الخطة الإجراءات المُعتمَدة للتعامل مع الحالات الطارئة المحتملة خلال فترة الاختبارات، بما يكفل سلامة الطالبات وانتظام سير الاختبار، ويُعمَّم مضمونها على جميع لجان المدرسة.</span>'
       f'<span class="en">This plan defines the approved procedures for handling potential emergencies throughout the examination period, safeguarding students and preserving the orderly conduct of exams; it is circulated to all school committees.</span></div>'
       f'{info}{blocks}{note}{sign}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · F-12 · خطة الاستجابة للطوارئ — School Exams Management Guide · Emergency Response Plan</div></section>')

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:9mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:18.5px;text-align:right;line-height:1.25}
.fhead .hen{display:block;font-size:11.5px;font-weight:700;color:var(--mut);direction:ltr}
.fcode{color:var(--green);font-weight:900}
.frule{height:2px;background:var(--green);margin:8px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:10.5px;margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:6px;line-height:1.5;text-align:justify}
.formsub .en{display:block;font-size:9px;direction:ltr;margin-top:2px}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:13.5px;padding:5px 13px;border-radius:7px 7px 0 0;display:flex;justify-content:space-between;align-items:baseline;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:avoid}
.band .ben{font-size:10.5px;font-weight:700;opacity:.92;direction:ltr}
.sec{page-break-inside:avoid;margin-top:9px}
.sec .band{margin-top:0}
table.t{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 4px}
table.t.sess{margin:6px 0 0}
table.t th,table.t td{border:1px solid var(--line);padding:4.5px 7px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t th .ar{display:block;font-size:11px}
table.t th .en{display:block;font-size:8.2px;font-weight:600;color:var(--green-d);direction:ltr;margin-top:1px}
td .ar{display:block;font-size:11px;line-height:1.4}
td .en{display:block;font-size:8.2px;color:var(--mut);direction:ltr;line-height:1.35;margin-top:1px}
tr{page-break-inside:avoid}
.wn{width:26px}
table.gtbl td.sit{width:28%;text-align:right;font-weight:700}
table.gtbl td.act{width:42%;text-align:right}
table.gtbl td.res{width:21%;font-weight:700;color:var(--green-d)}
table.gtbl td.res .en{color:var(--green-d);opacity:.8}
.note{background:#FBF3EF;border:1px solid #E8C9BC;border-right:4px solid #C0633F;border-radius:6px;padding:7px 12px;font-size:10.5px;line-height:1.5;margin:10px 0 7px;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid}
.note .en{display:block;direction:ltr;color:var(--mut);font-size:9px;margin-top:3px;border-top:1px dashed #E8C9BC;padding-top:3px}
table.sign{page-break-inside:avoid;margin-top:4px}
table.sign td{padding:7px}
table.sign tr.sg td{color:var(--mut);height:30px;vertical-align:top;font-size:9px}
.rfoot{text-align:center;font-size:8.3px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/emergency.html','w',encoding='utf-8').write(doc)
print('ok | sections',len(SECTIONS),'| scenarios',n)
