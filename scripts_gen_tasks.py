# -*- coding: utf-8 -*-
import html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; SCHOOL_EN="Muraijib School — Cycle 2"
YEAR="2026 / 2027"
def e(x): return _h.escape(str(x) if x is not None else "")

# (المهمة عربي، المهمة إنجليزي)
SECTIONS=[
("أولاً: تهيئة القاعات والأجنحة","I. Preparation of Halls & Wings",[
 ("توزيع اللوحات وبيانات الصفوف على مربيات الفصول من قِبَل مراقبة الدور المسؤولة.",
  "Distribute the boards and class information to the class supervisors through the assigned floor monitor."),
 ("ترتيب بورد الجناح.",
  "Organize the wing bulletin board."),
 ("التأكد من جاهزية الفصول للاختبارات بعد انتهاء مربيات الفصول: إزالة أعمال الطالبات من البوردات الداخلية، وترتيب الطاولات مع وضع أسماء الطالبات عليها، وتحديث بيانات السبورة، وإعداد لوحة الصف.",
  "Ensure classrooms are exam-ready after class supervisors finish: remove students' work from internal boards, arrange desks with students' name labels, update whiteboard information, and prepare the class display board."),
 ("الإشراف على وضع الملصقات الإرشادية وكشوف اللجان خارج القاعات.",
  "Supervise the placement of guidance posters and committee lists outside the halls."),
 ("التأكد من نظافة القاعات وإزالة أي مواد جدارية تتعلق باختبارات سابقة، وضمان وجود ساعة حائط داخل كل قاعة.",
  "Ensure hall cleanliness, remove any wall materials from previous exams, and confirm a wall clock is available in each hall."),
]),
("ثانياً: قبل بدء الجلسة","II. Before the Session",[
 ("التواجد قبل الاختبار بربع ساعة لاستلام أوراق الاختبارات الورقية.",
  "Be present 15 minutes before the exam to receive the printed exam papers."),
 ("التأكد من توفّر كودات الطلبة مع الملاحِظات يومياً.",
  "Ensure student codes are provided to the invigilators daily."),
 ("متابعة توقيع المعلمات على جدول الملاحظة اليومية.",
  "Follow up on teachers' signatures on the daily invigilation schedule."),
 ("استقبال الطلبة في الأجنحة المخصصة وتوجيههم إلى قاعات الاختبار.",
  "Receive students in the designated wings and direct them to their exam rooms."),
 ("التأكد من التزام الطلبة بالزي المدرسي.",
  "Ensure students comply with the school uniform policy."),
]),
("ثالثاً: أثناء الجلسة","III. During the Session",[
 ("منع استخدام الهاتف داخل اللجان الاختبارية.",
  "Prohibit the use of mobile phones inside the exam halls."),
 ("التواصل مع الاختصاصي الاجتماعي في حال تأخر أو غياب الطلبة.",
  "Communicate with the social worker in cases of student lateness or absence."),
 ("التواصل مع فريق الدعم التقني عند الحاجة.",
  "Contact the technical support team when needed."),
 ("عدم السماح لأي طالبة بمغادرة القاعة قبل انتهاء الوقت المخصص.",
  "Do not allow any student to leave the hall before the allocated time ends."),
 ("التأكيد على الطالبات بكتابة بياناتهنّ الشخصية كاملة على الورقة الامتحانية وفق نظام المنهل.",
  "Remind students to write their full personal information on the exam paper per the Al Manhal system."),
 ("منع كتابة أي عبارات خارجة عن موضوع الامتحان على الورقة الامتحانية.",
  "Prevent any irrelevant or inappropriate statements on the exam paper."),
 ("التأكد من عدد الأسئلة وصفحات الأوراق الامتحانية.",
  "Verify the number of questions and exam paper pages."),
]),
("رابعاً: تسليم أوراق الإجابة وضبطها","IV. Answer Sheets & Submission Control",[
 ("توقيع الطالبات على كشف تسليم أوراق الإجابة قبل مغادرة القاعة.",
  "Have students sign the answer-sheet submission log before leaving the hall."),
 ("عدم تمرير كشف تسليم أوراق الإجابة بين الطالبات قبل انتهاء الامتحان.",
  "Do not pass the answer-sheet submission log among students before the exam ends."),
 ("تسجيل ملاحظة في كشف التوقيع إذا كانت الطالبة تؤدي الامتحان عن بُعد.",
  "Record a note on the signature sheet if a student is taking the exam remotely."),
 ("التأكد من استكمال الطالبة كتابة جميع بياناتها قبل غلق الورقة الامتحانية.",
  "Ensure the student completes all personal information before sealing the exam paper."),
 ("تسليم أوراق الاختبارات الورقية وأوراق التوقيع إلى لجنة الكنترول.",
  "Submit the exam papers and signature sheets to the Control Committee."),
]),
]

def th(ar,en): return f'<th><span class="ar">{ar}</span><span class="en">{en}</span></th>'
def bc(ar,en): return f'<span class="ar">{e(ar)}</span><span class="en">{e(en)}</span>'

info=(f'<table class="t sess"><tr>'+th("العام الدراسي","Academic Year")+th("المدرسة","School")+
      th("الفترة","Period")+th("المرجع","Reference")+'</tr>'
      f'<tr><td>{YEAR}</td><td>{bc(SCHOOL,SCHOOL_EN)}</td>'
      f'<td>{bc("اختبارات نهاية الفصل الأول","End of Term 1 Exams")}</td>'
      f'<td>{bc("لجنة تنظيم القاعات والمراقبة والملاحظة","Halls, Invigilation & Observation Committee")}</td></tr></table>')

n=0; blocks=""
for title_ar,title_en,items in SECTIONS:
    band=f'<div class="band"><span class="ar">{title_ar}</span><span class="ben">{title_en}</span></div>'
    rows=""
    for t_ar,t_en in items:
        n+=1
        rows+=(f'<tr><td class="cm">{n}</td>'
               f'<td class="tsk">{bc(t_ar,t_en)}</td></tr>')
    heads=(th("م","No.")+th("المهمة","Task"))
    heads=heads.replace('<th>','<th class="wn">',1)
    blocks+=f'<div class="sec">{band}<table class="t gtbl"><tr>{heads}</tr>{rows}</table></div>'

note=('<div class="note"><span class="ar"><b>تنويه:</b> هذا التكليف مرجعٌ مُلزِم لكل مُلاحِظة طوال فترة الاختبارات، '
      'ويُراعى الالتزام بالتعليمات المعتمدة والتنسيق مع لجنة تنظيم القاعات ولجنة الكنترول عند الحاجة.</span>'
      '<span class="en"><b>Note:</b> This assignment is a binding reference for every invigilator throughout the exam period; '
      'approved instructions must be followed, coordinating with the Halls Committee and the Control Committee when needed.</span></div>')

sign=('<table class="t sign"><tr>'
      +th("اسم المُلاحِظة (المكلّفة)","Invigilator (Assignee)")+th("التوقيع (اطّلاع والتزام)","Signature (Acknowledged)")
      +th("اعتماد / مديرة المدرسة","Approved / School Principal")+th("التوقيع","Signature")+'</tr>'
      '<tr><td></td><td></td><td>د. اليازية نخيرة الظاهري</td><td></td></tr></table>')

sheet=(f'<section class="sheet"><div class="fcorner"></div>'
       f'<div class="fhead">تكليف مهام المُلاحِظات لاختبارات نهاية الفصل الدراسي الأول'
       f'<span class="hen">Invigilators\' Assignment — End-of-Term 1 Examinations</span></div><div class="frule"></div>'
       f'<div class="formsub"><span class="ar">يحدِّد هذا النموذج المهام الموكلة إلى المُلاحِظات خلال فترة اختبارات نهاية الفصل الدراسي الأول، '
       f'منذ تهيئة القاعات وحتى تسليم أوراق الإجابة، بما يضمن انتظام سير الاختبار ودقّة الإجراءات.</span>'
       f'<span class="en">This form defines the duties assigned to invigilators during the end-of-term 1 examinations — from hall preparation '
       f'to answer-sheet submission — ensuring the orderly conduct and procedural accuracy of the exams.</span></div>'
       f'{info}{blocks}{note}{sign}'
       f'<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · العام الدراسي 2026/2027 · مهام المُلاحِظات — School Exams Management Guide · Invigilators\' Duties</div></section>')

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:9mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.fhead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:18.5px;text-align:right;line-height:1.25}
.fhead .hen{display:block;font-size:11.5px;font-weight:700;color:var(--mut);direction:ltr}
.frule{height:2px;background:var(--green);margin:8px 0 5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.formsub{color:var(--mut);font-size:10.5px;margin-bottom:8px;border-bottom:1px solid var(--line);padding-bottom:6px;line-height:1.5;text-align:justify}
.formsub{font-size:11px}
.formsub .en{display:block;font-size:10px;direction:ltr;margin-top:2px}
.band{font-family:'Cairo','Tajawal',sans-serif;background:var(--green);color:#fff;font-weight:800;font-size:13.5px;padding:5px 13px;border-radius:7px 7px 0 0;display:flex;justify-content:space-between;align-items:baseline;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:avoid}
.band .ben{font-size:11.5px;font-weight:700;opacity:.95;direction:ltr}
.sec{page-break-inside:avoid;margin-top:9px}
.sec .band{margin-top:0}
table.t{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 4px}
table.t.sess{margin:6px 0 0}
table.t th,table.t td{border:1px solid var(--line);padding:5px 7px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.t th .ar{display:block;font-size:11px}
table.t th .en{display:block;font-size:9.8px;font-weight:600;color:var(--green-d);direction:ltr;margin-top:1px}
td .ar{display:block;font-size:11.5px;line-height:1.45}
td .en{display:block;font-size:10.3px;color:#6B665D;direction:ltr;line-height:1.4;margin-top:2px}
tr{page-break-inside:avoid}
.wn{width:26px}
table.gtbl td.tsk{text-align:right;font-weight:600}
table.gtbl td.chk{width:56px}
.box{display:inline-block;width:15px;height:15px;border:1.6px solid var(--green-d);border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.note{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:7px 12px;font-size:10.5px;line-height:1.5;margin:10px 0 7px;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid}
.note .en{display:block;direction:ltr;color:#6B665D;font-size:10px;margin-top:3px;border-top:1px dashed #D7E7DD;padding-top:3px}
table.sign{page-break-inside:avoid;margin-top:4px}
table.sign td{height:40px}
.rfoot{text-align:center;font-size:8.3px;color:#B3AC9F;border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/tasks.html','w',encoding='utf-8').write(doc)
print('ok | sections',len(SECTIONS),'| tasks',n)
