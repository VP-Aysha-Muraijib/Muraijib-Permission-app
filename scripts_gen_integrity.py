# -*- coding: utf-8 -*-
import html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
MOE=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
SCHOOL="مدرسة مريجب — حلقة ثانية"; YEAR="2026 / 2027"
def e(x): return _h.escape(str(x) if x is not None else "")
def ul(items): return '<ul>'+''.join(f'<li>{e(i)}</li>' for i in items)+'</ul>'

BEFORE=["الاستعداد الجيد والتحضير المبكر للاختبار، والمحافظة على فهمٍ عالٍ لنواتج التعلّم للمواد الدراسية.",
        "الحصول على قسطٍ كافٍ من النوم ليلة الاختبار ليكون الطالب في حالةٍ ذهنيةٍ مناسبة.",
        "تحضير جميع الأدوات المسموح بها مسبقاً (أقلام، ممحاة، آلة حاسبة… حسب المادة).",
        "الاطلاع على قواعد الاختبار بعناية والتأكد من فهمها، واتباع الإرشادات بدقّة."]
DURING=["الالتزام بالجلوس في المقعد المخصّص للطالب.",
        "تجنّب مناقشة المواد الاختبارية عند دخول القاعة وأثناء الاختبار.",
        "الامتناع عن الإشارة أو الإيماء أو التحدّث مع الطلبة الآخرين.",
        "عدم إدخال أو استخدام الأجهزة الإلكترونية غير المسموح بها.",
        "عدم إحضار أي مواد أو مصادر غير مصرّح بها (كتب، أوراق، محتوى رقمي) إلى القاعة."]
AFTER=["الامتناع عن تبادل أسئلة الاختبار «جزءاً أو كلّاً» عبر وسائل التواصل لأي هدفٍ كان.",
       "الامتناع عن الغشّ بكل أشكاله التقليدية وغير التقليدية (القصاصات أو أي وسيلة لتبادل المعلومات).",
       "الامتناع عن أي جدال أو إساءة لفظية أو اعتداء على الزملاء أو العاملين، قبل الاختبار وأثناءه وبعده."]
VIOL=["إثارة الفوضى في قاعة الاختبار وخارجها.",
      "إتلاف الورقة الاختبارية بطريقة متعمَّدة.",
      "الغشّ أو مساعدة الآخرين أثناء الاختبار بأي شكلٍ من الأشكال.",
      "تسريب أسئلة الاختبارات أو المشاركة في تسريبها بأي شكل.",
      "انتحال صفة الغير في المعاملات المدرسية أو خلال الاختبارات، أو تزوير الوثائق الخاصة بالمدرسة."]
FIRST=["حسم 12 درجة من درجة السلوك.",
       "رصد درجة «صفر» في المادة الدراسية عند الغشّ أو مشاركة الآخرين عليه أو إتلاف الورقة عمداً، مع الحرمان من دخول الاختبار التعويضي.",
       "استدعاء فوري لولي الأمر وتوقيعه على الإنذار والقرار."]
REPEAT=["حسم 12 درجة من درجة السلوك.",
        "رصد درجة «صفر» في جميع المواد الدراسية، مع الحرمان من دخول الاختبارات التعويضية.",
        "استدعاء فوري لولي الأمر وتوقيعه على الإنذار والقرار.",
        "إحالة الطالب لبرامج «تقويم السلوك» بالتعاون مع الجهات المختصة وفق الحالة."]

# شريط ضبط الوثيقة
ctl=('<table class="ctl"><tr>'
     '<th>الفئة المستهدفة</th><th>المرجع</th><th>الإصدار</th></tr>'
     '<tr><td>الطلبة وأولياء الأمور</td>'
     '<td>دليل مكافحة الغشّ والإخلال بنظام الاختبارات — وزارة التربية والتعليم</td>'
     '<td>الأول (2024–2025)</td></tr></table>')

sheet=(
 '<section class="sheet">'
 # ترويسة رسمية: الشعار يساراً، واسم المدرسة والنطاق والسنة يميناً
 '<div class="letterhead">'
 f'<div class="lh-text"><div class="lh-school">{SCHOOL}</div>'
 f'<div class="lh-meta">النطاق التعليمي: AD 2.6 &nbsp;·&nbsp; العام الدراسي {YEAR}</div></div>'
 '<img class="lh-logo" src="'+MOE+'"></div>'
 '<div class="frule"></div>'
 '<div class="doctitle">النزاهة في الاختبارات</div>'
 '<div class="docsub">دليل الطالب وولي الأمر — مستخلَص من دليل وزارة التربية والتعليم لمكافحة الغشّ والإخلال بنظام الاختبارات</div>'
 f'{ctl}'
 # مقدمة
 '<div class="intro">النزاهة في الاختبارات أمانةٌ ومسؤوليةٌ مشتركة بين الطالب وأسرته والمدرسة. '
 'تُلخّص هذه الوثيقة أهمّ ما يخصّ الطالب من دليل الوزارة، تعزيزاً لبيئةٍ اختباريةٍ عادلةٍ تُكافئ الاجتهاد الحقيقي، '
 'وتُعمَّم للاطّلاع والالتزام.</div>'
 # إرشادات الطالب
 '<div class="sechead">أولاً: إرشادات الطالب</div>'
 '<div class="cards">'
 f'<div class="card"><div class="ch">قبل الاختبار</div>{ul(BEFORE)}</div>'
 f'<div class="card"><div class="ch">أثناء الاختبار</div>{ul(DURING)}</div>'
 f'<div class="card"><div class="ch">بعد الاختبار وبوجهٍ عام</div>{ul(AFTER)}</div>'
 '</div>'
 # المخالفات
 '<div class="sechead warn">ثانياً: ما يُعدّ إخلالاً بنظام الاختبارات</div>'
 f'<div class="violbox">{ul(VIOL)}'
 '<div class="vnote">تُعدّ هذه الأفعال مخالفةً سواء ارتُكبت قبل الاختبار أو أثناءه أو بعده، داخل القاعة أو خارجها.</div></div>'
 # الإجراءات
 '<div class="sechead">ثالثاً: الإجراءات المترتّبة على الطالب (وفق لائحة سلوك الطلبة)</div>'
 '<div class="cards two">'
 f'<div class="card"><div class="ch">عند ارتكاب المخالفة</div>{ul(FIRST)}</div>'
 f'<div class="card"><div class="ch">عند تكرار المخالفة</div>{ul(REPEAT)}</div>'
 '</div>'
 # تذييل: للعلم والتعميم
 '<div class="notice">هذه الوثيقة للعلم والتعميم على الطلبة وأولياء الأمور، تعزيزاً للوعي بنزاهة الاختبارات والالتزام بضوابطها.</div>'
 '<div class="src">المصدر: دليل مكافحة الغشّ والإخلال بنظام الاختبارات — وزارة التربية والتعليم، الإصدار الأول 2024–2025 · '
 f'www.moe.gov.ae — صادرة عن {SCHOOL} للتعميم.</div>'
 '</section>')

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--red:#B5533A;--gold:#B8902F}
@page{size:A4 portrait;margin:7mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
ul{list-style:none;margin:0;padding:0}
li{position:relative;padding:2.7px 16px 2.7px 0;font-size:11px;line-height:1.45}
li::before{content:"";position:absolute;right:0;top:8px;width:6px;height:6px;border-radius:50%;background:var(--green);-webkit-print-color-adjust:exact;print-color-adjust:exact}
/* ترويسة رسمية */
.letterhead{display:flex;justify-content:space-between;align-items:center;padding:0 2px 7px}
.lh-text{text-align:right}
.lh-school{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:16px;color:var(--green-d)}
.lh-meta{font-size:10.5px;color:var(--mut);font-weight:700;margin-top:2px}
.lh-logo{height:44px;width:auto}
.frule{height:2px;background:var(--green);margin:0 0 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.doctitle{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:19px;color:var(--green-d);text-align:center}
.docsub{text-align:center;font-size:10px;color:var(--mut);margin:2px 0 7px;line-height:1.45}
/* ضبط الوثيقة */
table.ctl{width:100%;border-collapse:collapse;font-size:9.3px;margin-bottom:8px}
table.ctl th,table.ctl td{border:1px solid var(--line);padding:5px 6px;text-align:center;vertical-align:middle}
table.ctl th{background:var(--green);color:#fff;font-weight:700;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ctl td{font-weight:600}
.intro{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:6px;padding:8px 14px;margin:0 0 7px;font-size:11px;line-height:1.55;text-align:justify;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sechead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:13.5px;color:#fff;background:var(--green-d);border-radius:6px 6px 0 0;padding:6px 13px;margin:8px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sechead.warn{background:var(--red)}
.cards{display:flex;gap:8px;border:1px solid var(--line);border-top:none;border-radius:0 0 8px 8px;padding:7px;background:#FCFBF9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cards.two .card{flex:1}
.card{flex:1;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff;page-break-inside:avoid}
.ch{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:12.5px;color:var(--green-d);background:var(--beige);padding:7px 12px;border-bottom:2px solid var(--green);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.card ul{padding:6px 11px 7px}
.violbox{border:1px solid var(--line);border-top:none;border-radius:0 0 8px 8px;background:#FBF3EF;padding:8px 15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.violbox li::before{background:var(--red)}
.violbox li{font-size:11.5px}
.vnote{margin-top:6px;border-top:1px dashed #E6C6BC;padding-top:6px;font-size:10.6px;color:var(--red);font-weight:700}
.notice{text-align:center;background:var(--green-d);color:#fff;font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:12px;border-radius:8px;padding:9px 14px;margin:8px 0 0;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ack{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:0;border:1px solid var(--line);border-top:none}
table.ack th,table.ack td{border:1px solid var(--line);padding:5.5px 7px;text-align:center}
table.ack th{background:var(--beige);font-weight:700;font-size:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ack td:first-child{font-weight:700;background:#FbF8F3;width:150px;text-align:right}
table.ack th:first-child{text-align:right}
.src{text-align:center;font-size:8.6px;color:var(--mut);border-top:1.5px solid var(--green);padding-top:5px;margin-top:7px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__',' ')
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/integrity.html','w',encoding='utf-8').write(doc)
print('ok')
