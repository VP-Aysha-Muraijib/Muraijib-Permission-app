# -*- coding: utf-8 -*-
import html as _h
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
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

sheet=(
 '<section class="sheet">'
 # الترويسة
 '<div class="hero"><div class="hlogo"></div>'
 '<div class="htext"><div class="h1">ميثاق النزاهة في الاختبارات</div>'
 '<div class="h2">دليل الطالب وولي الأمر</div></div></div>'
 f'<div class="subbar"><span>{SCHOOL}</span><span>العام الدراسي {YEAR}</span></div>'
 # مقدمة
 '<div class="intro">النزاهة في الاختبارات أمانةٌ ومسؤوليةٌ مشتركة بين الطالب وأسرته والمدرسة. '
 'هذه النشرة تلخّص أهمّ ما يخصّ الطالب من دليل وزارة التربية والتعليم لمكافحة الغشّ والإخلال بنظام الاختبارات، '
 'لنحافظ معاً على بيئةٍ اختباريةٍ عادلةٍ تُكافئ الاجتهاد الحقيقي.</div>'
 # إرشادات الطالب — ثلاث بطاقات
 '<div class="sechead"><span class="ic">📘</span> إرشادات الطالب</div>'
 '<div class="cards">'
 f'<div class="card c-before"><div class="ch">قبل الاختبار</div>{ul(BEFORE)}</div>'
 f'<div class="card c-during"><div class="ch">أثناء الاختبار</div>{ul(DURING)}</div>'
 f'<div class="card c-after"><div class="ch">بعد الاختبار وبوجهٍ عام</div>{ul(AFTER)}</div>'
 '</div>'
 # المخالفات
 '<div class="sechead warn"><span class="ic">⚠️</span> ما يُعدّ إخلالاً بنظام الاختبارات</div>'
 f'<div class="violbox">{ul(VIOL)}'
 '<div class="vnote">تُعدّ هذه الأفعال مخالفةً سواء ارتُكبت قبل الاختبار أو أثناءه أو بعده، داخل القاعة أو خارجها.</div></div>'
 # الإجراءات
 '<div class="sechead act"><span class="ic">⚖️</span> الإجراءات المترتّبة على الطالب (وفق لائحة سلوك الطلبة)</div>'
 '<div class="cards two">'
 f'<div class="card c-first"><div class="ch">عند ارتكاب المخالفة</div>{ul(FIRST)}</div>'
 f'<div class="card c-repeat"><div class="ch">عند تكرار المخالفة</div>{ul(REPEAT)}</div>'
 '</div>'
 # شعار ختامي
 '<div class="pledge">«الاختبار أمانة… والنزاهة قيمة.» — نجاحك الحقيقي يبدأ من التزامك.</div>'
 # إقرار
 '<table class="ack"><tr><th>اطّلعتُ على مضمون هذه النشرة والتزمتُ بها</th><th>الاسم</th><th>التوقيع</th><th>التاريخ</th></tr>'
 '<tr><td>الطالب/ة</td><td></td><td></td><td></td></tr>'
 '<tr><td>ولي الأمر</td><td></td><td></td><td></td></tr></table>'
 '<div class="src">المصدر: دليل مكافحة الغشّ والإخلال بنظام الاختبارات — وزارة التربية والتعليم، الإصدار 1. '
 f'إعداد وتعميم: {SCHOOL}.</div>'
 '</section>')

CSS="""
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;
--amber:#C8902F;--red:#B5533A;--corner:url('__CORNER__')}
@page{size:A4 portrait;margin:6.5mm}
html,body{background:#fff;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',sans-serif}
.sheet{padding:0}
ul{list-style:none;margin:0;padding:0}
li{position:relative;padding:2.5px 16px 2.5px 0;font-size:10.7px;line-height:1.45}
li::before{content:"";position:absolute;right:0;top:8px;width:6px;height:6px;border-radius:50%;background:var(--green)}
/* الترويسة */
.hero{background:var(--green);border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:16px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hlogo{flex:0 0 118px;height:46px;background:#fff;border-radius:8px;background-image:var(--corner);background-size:86px auto;background-position:center;background-repeat:no-repeat;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.htext{flex:1;text-align:right;color:#fff}
.h1{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:23px;line-height:1.2}
.h2{font-size:12.5px;font-weight:600;opacity:.95;margin-top:3px}
.subbar{display:flex;justify-content:space-between;background:var(--beige);border:1px solid var(--line);border-radius:8px;padding:5px 14px;margin-top:7px;font-size:11px;font-weight:700;color:var(--green-d);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.intro{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid var(--green);border-radius:8px;padding:8px 13px;margin:8px 0;font-size:11px;line-height:1.55;text-align:justify;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sechead{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:14.5px;color:var(--green-d);margin:9px 0 6px;display:flex;align-items:center;gap:7px;border-bottom:2px solid var(--green);padding-bottom:4px}
.sechead .ic{font-size:16px}
.sechead.warn{color:var(--red);border-color:var(--red)}
.sechead.act{color:var(--amber);border-color:var(--amber)}
.cards{display:flex;gap:9px}
.cards.two .card{flex:1}
.card{flex:1;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;page-break-inside:avoid}
.ch{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:12.5px;color:#fff;padding:7px 12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.card ul{padding:6px 11px 7px}
.c-before .ch{background:#5E9A78}.c-during .ch{background:#3E7A5E}.c-after .ch{background:#6B8E9A}
.c-before li::before{background:#5E9A78}.c-during li::before{background:#3E7A5E}.c-after li::before{background:#6B8E9A}
.violbox{border:1px solid #E6C6BC;border-radius:10px;background:#FBF3EF;padding:8px 14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.violbox li::before{background:var(--red)}
.violbox li{font-size:11.5px}
.vnote{margin-top:6px;border-top:1px dashed #E6C6BC;padding-top:6px;font-size:10.5px;color:var(--red);font-weight:700}
.c-first .ch{background:var(--amber)}.c-repeat .ch{background:#9A6B2F}
.c-first li::before{background:var(--amber)}.c-repeat li::before{background:#9A6B2F}
.pledge{background:var(--green-d);color:#fff;text-align:center;font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:13.5px;border-radius:10px;padding:9px;margin:9px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ack{width:100%;border-collapse:collapse;font-size:11px;margin-top:2px}
table.ack th,table.ack td{border:1px solid var(--line);padding:7px;text-align:center}
table.ack th{background:var(--beige);font-weight:700;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ack td:first-child{font-weight:700;background:#FbF8F3;width:120px}
table.ack th:first-child{width:auto;text-align:right}
.src{text-align:center;font-size:9px;color:var(--mut);border-top:1.5px solid var(--green);padding-top:6px;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
""".replace('__CORNER__',CORNER)
doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{FONT}\n{CSS}</style></head><body>{sheet}</body></html>'
open(BASE+'/integrity.html','w',encoding='utf-8').write(doc)
print('ok')
