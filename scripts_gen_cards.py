# -*- coding: utf-8 -*-
import html as _html, json, sys, math
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()

SCHOOL="مدرسة مريجب — حلقة ثانية"
EXAM="اختبارات نهاية الفصل الدراسي الأول 2026/2027"
PERPAGE=16

def esc(s): return _html.escape(s or "")

def titlecase_en(s):
    s=(s or "").strip()
    if not s: return ""
    small={"bin","bint","al","el","abdul","abdel"}
    out=[]
    for w in s.split():
        lw=w.lower()
        out.append(lw if (lw in small and out) else lw.capitalize())
    return " ".join(out)

def grade_disp(g):
    if g=="تربية خاصة": return g
    return g if g.startswith("ال") else "ال"+g

_CONN={'بن','بنت','بنته','ابن','بنْت','bin','Bin','BIN','bint','Bint','BINT','ben','Ben'}
_PART_AR={'آل','ال'}; _PART_EN={'al','el'}
def shorten_name(name):
    toks=[t for t in (name or "").split() if t not in _CONN]
    if len(toks)<=4: return " ".join(toks)
    pen=toks[-2]
    tail=toks[-2:] if (pen in _PART_AR or pen.lower() in _PART_EN) else [toks[-1]]
    return " ".join(toks[:3]+tail)

def card(st, grade, section):
    if grade=="تربية خاصة":
        meta=f"{EXAM} · التربية الخاصة — {section}"
    elif str(section).startswith("شعبة"):
        meta=f"{EXAM} · الصف {grade_disp(grade)} — شعبة اضافية"
    else:
        meta=f"{EXAM} · الصف {grade_disp(grade)} — الشعبة {section}"
    ar=shorten_name(st["ar"])
    en=titlecase_en(shorten_name(st.get("en","")))
    en_html=f'<div class="en">{esc(en)}</div>' if en else ''
    origin=st.get("origin","")
    orig_html=f'<div class="orig">الشعبة الأصلية: <b>{esc(origin)}</b></div>' if origin else ''
    return (f'<div class="card">'
            f'<div class="chd"><img class="clogo" src="{CORNER}">'
            f'<div class="ctx"><div class="c1">{SCHOOL}</div>'
            f'<div class="c2">{meta}</div></div></div>'
            f'<div class="cbody">'
            f'<div class="seq"><div class="snum">{st["seq"]}</div><div class="slbl">الترتيب</div></div>'
            f'<div class="body">'
            f'<div class="names"><div class="ar">{esc(ar)}</div>{en_html}</div>'
            f'<div class="rule"></div>'
            f'<div class="sid"><span class="lbl">رقم الطالب</span><span class="num">{esc(str(st["id"]))}</span></div>'
            f'{orig_html}'
            f'</div></div></div>')

def page(students, grade, section):
    cells="".join(card(s, grade, section) for s in students)
    cells+='<div class="card empty"></div>'*(PERPAGE-len(students))
    return f'<section class="sheet"><div class="grid">{cells}</div></section>'

CSS=f"""
{FONT}
*{{box-sizing:border-box;margin:0;padding:0}}
@page{{size:A4 portrait;margin:0}}
html,body{{background:#fff;font-family:'Tajawal','Noto Kufi Arabic',Arial,sans-serif}}
.sheet{{width:210mm;height:297mm;padding:6mm;page-break-after:always}}
.sheet:last-child{{page-break-after:auto}}
.grid{{height:100%;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:3mm;direction:rtl}}
.card{{border:2px solid #000;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;background:#fff}}
.card.empty{{border:1.4px dashed #bbb}}
.chd{{display:flex;align-items:center;gap:7px;background:#fff;border-bottom:1.4px solid #000;padding:2px 10px}}
.clogo{{height:14px;filter:grayscale(1) contrast(1.2)}}
.ctx{{flex:1;text-align:center;line-height:1.3}}
.c1{{font-family:'Cairo','Tajawal',sans-serif;font-weight:700;font-size:9px;color:#000}}
.c2{{font-size:7.3px;color:#000;font-weight:500}}
.cbody{{flex:1;display:flex;align-items:stretch;min-height:0}}
.seq{{flex:0 0 64px;background:#fff;color:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border-left:1.6px solid #000}}
.snum{{font-family:'Cairo','Tajawal',sans-serif;font-weight:900;font-size:44px;line-height:.95}}
.slbl{{font-family:'Cairo','Tajawal',sans-serif;font-weight:700;font-size:8.5px;letter-spacing:1px;color:#000}}
.body{{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:4px 11px 6px;gap:0;min-width:0;overflow:hidden}}
.names{{display:flex;flex-direction:column;align-items:center;gap:5px}}
.ar{{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:16.5px;color:#000;line-height:1.15}}
.en{{font-weight:600;font-size:12px;color:#000;line-height:1.15;direction:ltr;letter-spacing:.3px}}
.rule{{width:54%;height:1px;background:#000;margin:3px 0}}
.sid{{display:flex;align-items:baseline;gap:7px;justify-content:center}}
.sid .lbl{{font-weight:600;font-size:10px;color:#000}}
.sid .num{{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:15.5px;color:#000;letter-spacing:1px}}
.orig{{margin-top:2px;font-size:9.5px;font-weight:600;color:#000;border:1px solid #000;border-radius:5px;padding:0 6px}}
.orig b{{font-weight:800}}
"""

def build(sections_subset, out_html):
    pages=[]
    for sec in sections_subset:
        st=sec["students"]; ptot=math.ceil(len(st)/PERPAGE)
        for p in range(ptot):
            pages.append(page(st[p*PERPAGE:(p+1)*PERPAGE], sec["grade"], sec["section"]))
    doc=f'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'
    open(out_html,'w',encoding='utf-8').write(doc)
    return len(pages)

if __name__=="__main__":
    sample=[
     {"seq":1,"ar":"آمنه مروان يوسف عبدالله الشحي","en":"Amna Marwan Yousef Abdulla Alshehhi","id":"20200021454"},
     {"seq":2,"ar":"الدماني عمر اسماعيل مبارك البلوشي","en":"Aldmani Omar Ismail Alblooshi","id":"20200012656"},
     {"seq":3,"ar":"الريم مبارك أحمد سعيد الحوته","en":"Alreem Mubarak Ahmed Saeed Alhouta","id":"20200010762"},
     {"seq":4,"ar":"اليازية شاه جول فايز محمد البلوشي","en":"AlYazia Shah Gul Fayez Muhammad Al Balushi","id":"20220020409"},
     {"seq":5,"ar":"بشرى يوسف مزار مراد بهادر","en":"Bushra Youssef Mazar Murad Bahader","id":"20220021860"},
     {"seq":6,"ar":"جميله عوض مبارك بالكيله العامري","en":"Jamila Awad Mubarak Balkaila Alameri","id":"20200023851"},
     {"seq":7,"ar":"جود وليد عبيد خلفان النعيمي","en":"Joud Waleed Obaid Khalfan Al Nuaimi","id":"20260090431"},
     {"seq":8,"ar":"رزان هلال محمد علي الطوبي","en":"Razan Hilal Mohammed Ali Al Tubi","id":"1038847"},
     {"seq":9,"ar":"ريما حسين عايض القحطاني","en":"Reema Hussain A Alqahtani","id":"20200040859"},
     {"seq":10,"ar":"ساره سيف سالم ناصر النعيمي","en":"Sara Saif Salim Nasser Al Nuaimi","id":"20260091531"},
     {"seq":11,"ar":"سلامه عزان عوض سعيد التميمي","en":"Slama Azan Awadh Said Altamimi","id":"20220012875"},
     {"seq":12,"ar":"شيخه حمد مسفر مانع الأحبابي","en":"Shaikha Hamad Mesfer Manea Al Ahbabi","id":"20200013500"},
    ]
    build([{"grade":"الخامس","section":1,"students":sample}], BASE+"/sample_cards.html")
    print("sample built")
