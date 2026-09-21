# -*- coding: utf-8 -*-
import base64, os, html
from data import DATA

HERE = os.path.dirname(os.path.abspath(__file__))
FDIR = os.path.join(HERE, '..', 'fonts')

def b64(p):
    with open(p, 'rb') as f:
        return base64.b64encode(f.read()).decode()

AR = b64(os.path.join(FDIR, 'cairo-1.woff2'))
LA = b64(os.path.join(FDIR, 'cairo-2.woff2'))
LX = b64(os.path.join(FDIR, 'cairo-3.woff2'))

FONTS = f"""
@font-face{{font-family:'Cairo';font-style:normal;font-weight:200 1000;font-display:block;
src:url(data:font/woff2;base64,{AR}) format('woff2');
unicode-range:U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC;}}
@font-face{{font-family:'Cairo';font-style:normal;font-weight:200 1000;font-display:block;
src:url(data:font/woff2;base64,{LX}) format('woff2');
unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}}
@font-face{{font-family:'Cairo';font-style:normal;font-weight:200 1000;font-display:block;
src:url(data:font/woff2;base64,{LA}) format('woff2');
unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}}
"""

BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{
 --gold:#A8862E; --gold-soft:#C9AE6A; --gold-bg:#F6F1E4;
 --navy:#14395E; --navy-soft:#2C5C8A;
 --ink:#1C2430; --muted:#5B6672;
 --line:#D6CFBE; --line-soft:#E8E3D6;
}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;direction:rtl;color:var(--ink);
 font-size:8.3pt;line-height:1.5;font-variant-numeric:lining-nums;}
.doc-head{border:1px solid var(--line);border-top:3px solid var(--gold);
 padding:7mm 6mm 5mm;margin-bottom:4mm;background:linear-gradient(180deg,#FCFAF5 0%,#fff 70%)}
.eyebrow{font-size:7.6pt;color:var(--gold);font-weight:700;letter-spacing:.06em;margin-bottom:2mm}
h1{font-size:15pt;font-weight:700;color:var(--navy);line-height:1.35}
.sub{font-size:8.6pt;color:var(--muted);margin-top:1.5mm}
.rule{height:1px;background:var(--line-soft);margin:4mm 0 3.5mm}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm 5mm}
.meta .f{font-size:7.8pt}
.meta .f b{display:block;color:var(--navy);font-weight:600;margin-bottom:1.2mm}
.meta .f i{display:block;border-bottom:1px dotted #B9B09A;height:5.2mm}
.legend{display:flex;gap:6mm;align-items:center;flex-wrap:wrap;
 margin-top:4mm;padding-top:3mm;border-top:1px solid var(--line-soft);font-size:7.8pt;color:var(--muted)}
.legend span{display:flex;align-items:center;gap:1.8mm}
.bx{display:inline-block;width:3.1mm;height:3.1mm;border:1px solid #9AA2AC;border-radius:.6mm;background:#fff;flex:none}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead{display:table-header-group}
tr{page-break-inside:avoid;break-inside:avoid}
th{background:var(--navy);color:#fff;font-weight:600;font-size:7.9pt;
 padding:2mm 1.6mm;text-align:center;border:.4pt solid var(--navy)}
th.r{text-align:right}
td{border:.4pt solid var(--line-soft);padding:1.7mm 1.8mm;vertical-align:middle}
td.code{font-size:7.4pt;color:var(--navy);font-weight:600;text-align:center;
 letter-spacing:.01em;background:#FBFAF6;white-space:nowrap}
td.chk{text-align:center;background:#fff}
td.note{background:#FCFCFA}
tbody tr:nth-child(even) td.txt{background:#FAFAF7}
.band td{background:var(--gold-bg);border-top:.9pt solid var(--gold);border-bottom:.4pt solid var(--gold-soft);
 padding:1.9mm 2mm;font-weight:700;font-size:8.6pt;color:#6E5410}
.band .n{color:var(--gold);font-weight:700;margin-left:2mm}
.band .cnt{float:left;font-weight:600;font-size:7.5pt;color:#8A6E22}
.sec td{background:#EDF1F6;border-top:.5pt solid #C3D2E0;border-bottom:.4pt solid #C3D2E0;
 padding:1.6mm 2mm;font-weight:600;font-size:8.1pt;color:var(--navy)}
.sec .n{color:var(--navy-soft);margin-left:1.8mm}
.sec .cnt{float:left;font-weight:500;font-size:7.4pt;color:#5A7594}
.domain{page-break-before:always;break-before:page}
.domain.first{page-break-before:auto;break-before:auto}
.tail{margin-top:5mm;border:1px solid var(--line);border-top:2.5pt solid var(--navy);padding:4mm 5mm;
 page-break-inside:avoid}
.tail h3{font-size:9.4pt;color:var(--navy);margin-bottom:3mm;font-weight:700}
.sig{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-top:4mm}
.sig .f{font-size:7.8pt}
.sig .f b{display:block;color:var(--navy);font-weight:600;margin-bottom:6mm}
.sig .f i{display:block;border-bottom:1px solid #B9B09A}
"""

def esc(s):
    return html.escape(s, quote=False)

def counts(subs):
    return sum(len(i) for _, _, i in subs)

def page_css(mode):
    return "@page{size:A4 portrait;margin:11mm 9mm 13mm;}"

def head(title, mode):
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>{esc(title)}</title><style>{FONTS}{page_css(mode)}{BASE_CSS}</style></head><body>"""

def doc_header(title, subtitle, note):
    return f"""<div class="doc-head">
<div class="eyebrow">استمارة الرقابة المدرسية · جمع البيانات الميدانية</div>
<h1>{esc(title)}</h1>
<div class="sub">{esc(subtitle)}</div>
<div class="rule"></div>
<div class="meta">
 <div class="f"><b>اسم المدرسة</b><i></i></div>
 <div class="f"><b>المنطقة / الإمارة</b><i></i></div>
 <div class="f"><b>تاريخ الزيارة</b><i></i></div>
 <div class="f"><b>اسم المدقّق</b><i></i></div>
</div>
<div class="legend">
 <span><i class="bx"></i> مُطبَّق</span>
 <span><i class="bx"></i> غير مُطبَّق</span>
 <span><i class="bx"></i> لا ينطبق</span>
 <span style="margin-right:auto;color:#8A7A52">{esc(note)}</span>
</div></div>"""

TAIL = """<div class="tail"><h3>الاعتماد والتوقيعات</h3>
<div class="sig">
 <div class="f"><b>المدقّق / فريق الرقابة</b><i></i></div>
 <div class="f"><b>مدير المدرسة</b><i></i></div>
 <div class="f"><b>الختم الرسمي والتاريخ</b><i></i></div>
</div></div></body></html>"""

# ---------------- detailed ----------------
def build_detailed():
    total = sum(counts(s) for _, _, s in DATA)
    out = [head("قائمة تحقق الرقابة المدرسية — النسخة التفصيلية", "detail")]
    out.append(doc_header(
        "قائمة تحقق الرقابة المدرسية — النسخة التفصيلية",
        f"المجالات 689.0 – 692.0 · {len(DATA)} مجالات رئيسية · "
        f"{sum(len(s) for _,_,s in DATA)} مجالًا فرعيًا · {total} بند رقابة",
        "يُعبّأ حكم واحد لكل بند مع توثيق الشاهد / المرفق"))
    for di, (mc, mn, subs) in enumerate(DATA):
        out.append(f'<div class="domain{" first" if di==0 else ""}"><table>')
        out.append("""<thead><tr>
<th style="width:15mm">الرمز</th><th class="r">بند الرقابة</th>
<th style="width:11mm">مُطبَّق</th><th style="width:13mm">غير مُطبَّق</th>
<th style="width:12mm">لا ينطبق</th><th class="r" style="width:42mm">الشاهد / الملاحظات</th>
</tr></thead><tbody>""")
        out.append(f'<tr class="band"><td colspan="6">'
                   f'<span class="cnt">{counts(subs)} بندًا</span>'
                   f'<span class="n">{mc}</span>{esc(mn)}</td></tr>')
        for sc, sn, items in subs:
            out.append(f'<tr class="sec"><td colspan="6">'
                       f'<span class="cnt">{len(items)} بندًا</span>'
                       f'<span class="n">{sc}</span>{esc(sn)}</td></tr>')
            for code, text in items:
                out.append(
                    f'<tr><td class="code">{esc(code)}</td><td class="txt">{esc(text)}</td>'
                    f'<td class="chk"><i class="bx"></i></td><td class="chk"><i class="bx"></i></td>'
                    f'<td class="chk"><i class="bx"></i></td><td class="note"></td></tr>')
        out.append('</tbody></table></div>')
    out.append(TAIL)
    return "\n".join(out)

# ---------------- summary ----------------
def build_summary():
    total = sum(counts(s) for _, _, s in DATA)
    out = [head("قائمة تحقق الرقابة المدرسية — النسخة المختصرة", "sum")]
    out.append("<style>body{font-size:8.6pt}.doc-head{padding:6mm 6mm 4.5mm;margin-bottom:3.5mm}"
               "h1{font-size:14pt}td{padding:1.5mm 1.8mm}</style>")
    out.append(doc_header(
        "قائمة تحقق الرقابة المدرسية — النسخة المختصرة",
        f"ملخّص على مستوى المجالات الفرعية · {total} بند رقابة موزعة على "
        f"{sum(len(s) for _,_,s in DATA)} مجالًا فرعيًا",
        "يُرصد عدد البنود في كل حالة ثم تُحتسب نسبة الامتثال"))
    out.append('<table><thead><tr>'
               '<th style="width:14mm">الرمز</th><th class="r">المجال الفرعي</th>'
               '<th style="width:12mm">عدد البنود</th><th style="width:13mm">مُطبَّق</th>'
               '<th style="width:14mm">غير مُطبَّق</th><th style="width:13mm">لا ينطبق</th>'
               '<th style="width:16mm">الامتثال %</th><th class="r" style="width:34mm">ملاحظات</th>'
               '</tr></thead><tbody>')
    for mc, mn, subs in DATA:
        out.append(f'<tr class="band"><td colspan="8">'
                   f'<span class="cnt">{counts(subs)} بندًا · {len(subs)} مجالات فرعية</span>'
                   f'<span class="n">{mc}</span>{esc(mn)}</td></tr>')
        for sc, sn, items in subs:
            out.append(
                f'<tr><td class="code">{esc(sc)}</td><td class="txt">{esc(sn)}</td>'
                f'<td class="chk" style="font-weight:600;color:#14395E">{len(items)}</td>'
                f'<td class="chk"></td><td class="chk"></td><td class="chk"></td>'
                f'<td class="chk"></td><td class="note"></td></tr>')
    out.append(f'<tr class="sec"><td class="code" style="background:#EDF1F6">—</td>'
               f'<td style="font-weight:700">الإجمالي العام</td>'
               f'<td class="chk" style="font-weight:700">{total}</td>'
               f'<td class="chk"></td><td class="chk"></td><td class="chk"></td>'
               f'<td class="chk"></td><td></td></tr>')
    out.append('</tbody></table>')
    out.append(TAIL)
    return "\n".join(out)

open(os.path.join(HERE, 'detailed.html'), 'w', encoding='utf-8').write(build_detailed())
open(os.path.join(HERE, 'summary.html'), 'w', encoding='utf-8').write(build_summary())
print("html written")
