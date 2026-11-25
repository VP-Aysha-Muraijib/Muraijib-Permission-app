# -*- coding: utf-8 -*-
import json
BASE='/tmp/claude-0/-home-user-Muraijib-Permission-app/8f6a88b6-523b-54a7-a25d-16b0f2fb94db/scratchpad'
HALLS=json.load(open(BASE+'/halls.json',encoding='utf-8'))
TEACHERS=json.load(open(BASE+'/teachers.json',encoding='utf-8'))
CORNER=open(BASE+'/corner_uri.txt',encoding='utf-8').read().strip()
FONT=open(BASE+'/gf_embedded.css',encoding='utf-8').read()

# إضافة بلقيس (مساعد صف تربية خاصة) للقائمة لتثبيتها على تكييف سابع
TEACHERS=TEACHERS+[{"n":"بلقيس علي الحارثي","t":"مساعد صف (تربية خاصة)"}]
# إضافة رحمة (معلمة احتياط) لتدخل التوزيع كمراقبة
TEACHERS=TEACHERS+[{"n":"رحمة (احتياط)","t":"معلمة (احتياط)"}]

# لجان خاصة (مراقِبة واحدة لكل منها)
HALLS=HALLS+[{"hall":"غرفة الممرضة (الحالات الصحية)","grade":"لجنة","section":"ممرضة","count":""},
             {"hall":"مختبر الحاسوب (الدعم التقني)","grade":"لجنة","section":"حاسوب","count":""}]

DAYS=[{"subject":"الرياضيات","date":"الأربعاء 2026/11/25"},
      {"subject":"اللغة الإنجليزية","date":"الخميس 2026/11/26"},
      {"subject":"العلوم","date":"الاثنين 2026/12/07"},
      {"subject":"اللغة العربية","date":"الثلاثاء 2026/12/08"},
      {"subject":"التربية الإسلامية","date":"الأربعاء 2026/12/09"},
      {"subject":"الدراسات الاجتماعية","date":"الخميس 2026/12/10"}]

# ===== الاستثناءات =====
GEXCL=["سندس حمادي القلعي","جهان سلمان أبو عسلى","مها عبدالله مراد","أمامة فؤاد الفيالي","الهن علي العفاري","موزة سيف آل عبدالسلام"]
GRADE_EXCL={"هيبة حبيب غابري":["خامس"],
            "صبرين محمد حمدي":["سادس"],
            "صالحة مهير السبوسي":["سادس"],
            "ثمنة سالم المحرمي":["سابع"],
            "حصة ناصر الأحبابي":["ثامن"]}
SUBJMAP={"الرياضيات":["رياضيات"],"اللغة الإنجليزية":["إنجليزية"],
         "العلوم":["علوم","كيمياء"],"اللغة العربية":["عربية"],
         "التربية الإسلامية":["إسلامية"],"الدراسات الاجتماعية":["اجتماعية"]}
# لجان مثبّتة طوال الاختبارات (اسم القاعة -> المعلمة)
PINNED={"التعديل":"أماني جميل الجعيدي",
        "تكييف خامس":"العنود عبدربه البريكي",
        "تكييف سادس":"حمدة سيف الظاهري",
        "تكييف سابع":"بلقيس علي الحارثي"}
# دعم تقني: مستبعَدات من المراقبة في كل الأيام عدا هذه المواد
TECH=["دعاء مصطفى عبدالمنعم","حصة سعيد السبوسي","حصة ناصر الأحبابي","سهيلة سعيد الكتبي"]
TECH_OK=["التربية الإسلامية","الدراسات الاجتماعية"]
# إشراف الدور — لا يراقبن داخل القاعات
SUP=["رقية صالح الصوافي","مريم هلال الدرمكي"]
# استثناءات خاصة بيوم محدّد (رقم اليوم -> أسماء) — غياب/تفريغ للتصحيح…
# اليوم 1 = اللغة الإنجليزية: غياب مها النعيمي، وتفريغ كنة/نمارق/شيجا/سامية للتصحيح
DAY_EXCL={1:["مها محمد النعيمي","كنة مبارك الشامسي","نمارق عبدالله أحمد","Sheejamol Babu","سامية يحيى حسن"]}

SCHOOL="مدرسة مريجب — حلقة ثانية"; YEAR="2026 / 2027"

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{--green:#5E9A78;--green-d:#3E7A5E;--beige:#F5EFE8;--line:#D9D2C7;--ink:#33302B;--mut:#8A857C;--band:#EFE7DB}
html,body{background:#EFECE4;color:var(--ink);font-family:'Tajawal','Noto Kufi Arabic',Arial,sans-serif;line-height:1.5}
.top{background:#fff;border-bottom:3px solid var(--green);padding:12px 20px;display:flex;align-items:center;gap:14px;position:sticky;top:0;z-index:40}
.top .logo{height:40px;background:var(--corner) center/contain no-repeat;width:120px}
.bt1{font-family:'Cairo','Tajawal',sans-serif;font-weight:800;font-size:17px;color:var(--green-d)}
.bt2{font-size:12px;color:var(--mut);font-weight:600}
.wrap{max-width:1200px;margin:16px auto;padding:0 16px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.tab{background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 14px;cursor:pointer;font-family:inherit;text-align:center;min-width:120px}
.tab b{display:block;font-family:'Cairo',sans-serif;font-size:14px;color:var(--ink)}
.tab span{display:block;font-size:11px;color:var(--mut)}
.tab.active{background:var(--green);border-color:var(--green)}
.tab.active b,.tab.active span{color:#fff}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.btn{background:var(--green-d);color:#fff;border:0;border-radius:9px;padding:9px 15px;font-family:inherit;font-weight:700;font-size:13px;cursor:pointer}
.btn.alt{background:#fff;color:var(--green-d);border:1px solid var(--green)}
.btn:hover{opacity:.92}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:14px}
.card h3{font-family:'Cairo',sans-serif;font-size:15px;color:var(--green-d);margin-bottom:8px}
table.t{width:100%;border-collapse:collapse;font-size:12.5px}
table.t th,table.t td{border:1px solid var(--line);padding:6px 8px;text-align:center;vertical-align:middle}
table.t th{background:var(--beige);font-weight:700;font-size:11.5px}
table.t td.rh{text-align:right;font-weight:700;background:#FbF8F3}
tr.cmt td.rh{background:#EEF5F0;color:var(--green-d)}
table.t select{font-family:inherit;font-size:12px;border:1px solid var(--line);border-radius:6px;padding:4px 6px;max-width:200px;background:#fff}
.sess{background:var(--band);color:var(--green-d);font-weight:800;font-family:'Cairo',sans-serif;border-radius:8px;padding:8px 12px;margin-bottom:10px;text-align:center}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{background:var(--beige);border:1px solid var(--line);border-radius:999px;padding:4px 11px;font-size:12px}
.excl .chip{cursor:pointer}
.excl .chip.on{background:#F7D9D4;border-color:#E0A89F;color:#8A2F22}
.chip.day{background:#FBEFD6;border-color:#E6CF9E;color:#7A5A1E}
.stat{font-size:11.5px;color:var(--mut)}
.warn{color:#B3402E;font-weight:700;margin-bottom:8px}
.hint{font-size:12px;color:var(--mut);margin-bottom:10px}
@media print{.no-print{display:none!important}}
"""

JS = r"""
const TEACHERS=__TEACHERS__, HALLS=__HALLS__, DAYS=__DAYS__;
const GEXCL=__GEXCL__, GRADE_EXCL=__GRADE_EXCL__, SUBJMAP=__SUBJMAP__;
const PINNED=__PINNED__, TECH=__TECH__, TECH_OK=__TECH_OK__, SUP=__SUP__, DAY_EXCL=__DAY_EXCL__;
const SCHOOL=__SCHOOL__, YEAR=__YEAR__;
let EXCL=new Set(GEXCL), FIXED={}, assign=[], backup=[], dexcl=[], reserve=[], load={}, curDay=0, seed=11;
function H(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0);}
function pool(){return TEACHERS.map(t=>t.n).filter(n=>!EXCL.has(n)&&SUP.indexOf(n)<0);}
function tSubj(n){const t=TEACHERS.find(x=>x.n===n);return t?t.t:'';}
function gradeOK(n,grade){const g=GRADE_EXCL[n];return !(g&&g.indexOf(grade)>=0);}
function dayExcluded(d){
  const ex=new Set();
  [d].forEach(x=>{ if(x>=0){ const keys=SUBJMAP[DAYS[x].subject]||[]; TEACHERS.forEach(t=>{ if(keys.some(k=>t.t.indexOf(k)>=0)) ex.add(t.n); }); } });
  if(TECH_OK.indexOf(DAYS[d].subject)<0){ TECH.forEach(n=>ex.add(n)); }   // دعم تقني إلا الإسلامية/الاجتماعية
  (DAY_EXCL[d]||[]).forEach(n=>ex.add(n));   // غياب/تفريغ خاص باليوم
  return ex;
}
function pinHallName(n){ return PINNED.hasOwnProperty(n); }
function distribute(){
  load={}; pool().forEach(n=>load[n]=0);
  assign=DAYS.map(()=>Array(HALLS.length).fill(null));
  backup=DAYS.map(()=>Array(HALLS.length).fill(null));
  reserve=DAYS.map(()=>[]); dexcl=DAYS.map(()=>[]);
  for(let d=0;d<DAYS.length;d++){
    const dex=dayExcluded(d); dexcl[d]=[...dex].filter(n=>!EXCL.has(n));
    for(let h=0;h<HALLS.length;h++){ const pn=PINNED[HALLS[h].hall]; if(pn&&!EXCL.has(pn)) assign[d][h]=pn; }
    for(let h=0;h<HALLS.length;h++){ const k=d+'|'+h; if(FIXED[k]&&!EXCL.has(FIXED[k])) assign[d][h]=FIXED[k]; }
    const used=new Set();
    for(let h=0;h<HALLS.length;h++){ const n=assign[d][h]; if(n){ used.add(n); load[n]++; } }
    const avail=pool().filter(n=>!dex.has(n));
    function cands(h){return avail.filter(n=>gradeOK(n,HALLS[h].grade));}
    // most-constrained halls first
    const order=HALLS.map((h,i)=>i).filter(i=>!assign[d][i]);
    order.sort((a,b)=>cands(a).length-cands(b).length);
    for(const h of order){
      let c=avail.filter(n=>!used.has(n)&&gradeOK(n,HALLS[h].grade));
      c.sort((a,b)=>(load[a]-load[b])||(H(a+'#'+seed)-H(b+'#'+seed)));
      const t=c[0]||null; if(t){assign[d][h]=t;used.add(t);load[t]++;}
    }
    reserve[d]=avail.filter(n=>!used.has(n));
    for(let h=0;h<HALLS.length;h++){ const rb=reserve[d].filter(n=>gradeOK(n,HALLS[h].grade)); backup[d][h]=rb.length?rb[h%rb.length]:''; }
  }
}
function optList(sel){ let o='<option value=""></option>'; TEACHERS.forEach(t=>{o+=`<option ${t.n===sel?'selected':''} value="${t.n}">${t.n}</option>`;}); return o; }
function render(){
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',i===curDay));
  const d=curDay, day=DAYS[d];
  let rows='';
  HALLS.forEach((hall,h)=>{
    const a=assign[d][h]||''; const cmt=hall.grade==='لجنة';
    rows+=`<tr class="${cmt?'cmt':''}"><td>${h+1}</td><td class="rh">${hall.hall}</td><td>${hall.count||'—'}</td>`+
      `<td><select onchange="setA(${h},this.value)">${optList(a)}</select></td>`+
      `<td></td><td></td></tr>`;
  });
  const shortage=assign[d].filter(x=>!x).length;
  const resv=reserve[d].map(n=>`<span class="chip">${n}</span>`).join('')||'<span class="stat">لا يوجد احتياط</span>';
  const dex=dexcl[d].map(n=>`<span class="chip day">${n}</span>`).join('')||'<span class="stat">لا يوجد</span>';
  document.getElementById('view').innerHTML =
    `<div class="sess">الجلسة: ${day.subject} — ${day.date} · الصفوف 5–8 · ${SCHOOL}</div>`+
    (shortage?`<div class="warn no-print">تنبيه: ${shortage} قاعة بدون مراقبة (نقص بعد تطبيق الاستثناءات).</div>`:'')+
    `<div class="card"><h3>توزيع المراقبة — ${day.subject}</h3>`+
    `<table class="t"><tr><th style="width:36px">م</th><th>القاعة / الشعبة</th><th style="width:70px">عدد الطالبات</th><th>المراقبة (الملاحِظة)</th><th>البديل</th><th style="width:90px">التوقيع</th></tr>${rows}</table></div>`+
    `<div class="card no-print"><h3>مستبعَدات اليوم: معلمات مادة اليوم</h3><div class="chips">${dex}</div></div>`+
    `<div class="card"><h3>مراقبات الاحتياط لهذا اليوم (${reserve[d].length})</h3><div class="chips">${resv}</div></div>`+
    `<div class="card"><h3>إشراف الدور</h3><div class="chips">${SUP.map(n=>'<span class="chip">'+n+'</span>').join('')}</div></div>`;
  renderStats();
}
function renderStats(){
  const items=pool().map(n=>{let c=0;for(let d=0;d<DAYS.length;d++)c+=assign[d].filter(x=>x===n).length;return {n,c};});
  items.sort((a,b)=>b.c-a.c);
  document.getElementById('stats').innerHTML='<h3>إجمالي التكليفات لكل معلمة (عبر الأيام الستة)</h3><div class="chips">'+
    items.map(x=>`<span class="chip">${x.n}: <b>${x.c}</b></span>`).join('')+'</div>';
}
function setA(h,val){ const k=curDay+'|'+h; if(val){FIXED[k]=val;}else{delete FIXED[k];} distribute(); render(); }
function reshuffle(){ seed=Math.floor(Math.random()*1e6)+1; distribute(); render(); }
function show(d){ curDay=d; render(); }
function renderExcl(){
  document.getElementById('excl').innerHTML=TEACHERS.map(t=>`<span class="chip ${EXCL.has(t.n)?'on':''}" onclick="toggleExcl('${t.n.replace(/'/g,"")}')">${t.n}</span>`).join('');
}
function toggleExcl(n){ if(EXCL.has(n))EXCL.delete(n); else EXCL.add(n); distribute(); render(); renderExcl(); }
function printF05(){
  const d=curDay, day=DAYS[d];
  let rows='';
  HALLS.forEach((hall,h)=>{ rows+=`<tr><td>${h+1}</td><td style="text-align:right">${hall.hall}</td><td>${hall.count||'—'}</td><td>${assign[d][h]||''}</td><td></td><td></td><td></td></tr>`; });
  const sheet=`<div class="sheet"><div class="fcorner"></div>`+
    `<div class="fhead"><span class="fcode">F-05</span> توزيع المراقبين والملاحظين</div><div class="frule"></div>`+
    `<table class="p"><tr><th>العام الدراسي</th><th>المدرسة</th><th>اليوم والتاريخ</th><th>المادة</th><th>الصفوف</th><th>الجلسة</th></tr>`+
    `<tr><td>${YEAR}</td><td>${SCHOOL}</td><td>${day.date}</td><td>${day.subject}</td><td>الخامس–الثامن</td><td>صباحية</td></tr></table>`+
    `<table class="p"><tr><th>م</th><th>القاعة / الشعبة</th><th>عدد الطالبات</th><th>المراقبة (الملاحِظة)</th><th>التوقيع</th><th>البديل</th><th>التوقيع</th></tr>${rows}</table>`+
    `<div class="note">يُمنع إدخال الهواتف والأجهزة الإلكترونية لقاعات الاختبار طوال الجلسة، ويُبلَّغ البدلاء المعتمدون قبل بدء الجلسة.</div>`+
    `<table class="p"><tr><th>اسم رئيس المركز / مديرة المدرسة</th><th>التاريخ</th><th>التوقيع</th></tr><tr><td>د. اليازية نخيرة الظاهري</td><td></td><td></td></tr></table>`+
    `<div class="rfoot">دليل تنظيم وإدارة الاختبارات المدرسية · 2026/2027 · F-05</div></div>`;
  const pcss=`@page{size:A4 portrait;margin:8mm}body{font-family:'Tajawal',sans-serif;color:#33302B}.fcorner{height:34px;background:var(--corner) top right/auto 34px no-repeat;margin:2px 0 18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.fhead{font-family:'Cairo',sans-serif;font-weight:800;font-size:18px;text-align:right}.fcode{color:#5E9A78;font-weight:900}.frule{height:2px;background:#5E9A78;margin:8px 0}table.p{width:100%;border-collapse:collapse;font-size:10px;margin:6px 0}table.p th,table.p td{border:1px solid #D9D2C7;padding:4px 4px;text-align:center}table.p th{background:#F5EFE8}.note{background:#F4F8F5;border:1px solid #D7E7DD;border-right:4px solid #5E9A78;border-radius:6px;padding:7px 10px;font-size:10px;margin:8px 0}.rfoot{text-align:center;font-size:8px;color:#B3AC9F;border-top:1.5px solid #5E9A78;padding-top:6px;margin-top:12px}`;
  const styles=[...document.querySelectorAll('style')].map(s=>s.textContent).join('');
  const html='<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>'+styles+pcss+'</style></head><body>'+sheet+'</body></html>';
  const ifr=document.createElement('iframe');ifr.style.cssText='position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';document.body.appendChild(ifr);
  const dd=ifr.contentWindow.document;dd.open();dd.write(html);dd.close();
  setTimeout(()=>{try{ifr.contentWindow.focus();ifr.contentWindow.print();}catch(e){}setTimeout(()=>ifr.remove(),1500);},500);
}
function init(){
  document.getElementById('tabs').innerHTML=DAYS.map((x,i)=>`<div class="tab" onclick="show(${i})"><b>${x.subject}</b><span>${x.date}</span></div>`).join('');
  renderExcl(); distribute(); render();
}
window.addEventListener('DOMContentLoaded',init);
"""

JS = (JS.replace('__TEACHERS__', json.dumps(TEACHERS, ensure_ascii=False))
        .replace('__HALLS__', json.dumps(HALLS, ensure_ascii=False))
        .replace('__DAYS__', json.dumps(DAYS, ensure_ascii=False))
        .replace('__GEXCL__', json.dumps(GEXCL, ensure_ascii=False))
        .replace('__GRADE_EXCL__', json.dumps(GRADE_EXCL, ensure_ascii=False))
        .replace('__SUBJMAP__', json.dumps(SUBJMAP, ensure_ascii=False))
        .replace('__PINNED__', json.dumps(PINNED, ensure_ascii=False))
        .replace('__TECH__', json.dumps(TECH, ensure_ascii=False))
        .replace('__TECH_OK__', json.dumps(TECH_OK, ensure_ascii=False))
        .replace('__SUP__', json.dumps(SUP, ensure_ascii=False))
        .replace('__DAY_EXCL__', json.dumps(DAY_EXCL, ensure_ascii=False))
        .replace('__SCHOOL__', json.dumps(SCHOOL, ensure_ascii=False))
        .replace('__YEAR__', json.dumps(YEAR, ensure_ascii=False)))

HTML = ('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">'
 '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
 '<title>منصة أمين — توزيع المراقبة · مريجب 2026/2027</title>'
 '<style>'+FONT+'\n:root{--corner:url("'+CORNER+'")}\n'+CSS+'</style></head><body>'
 '<header class="top no-print"><div class="logo"></div>'
 '<div><div class="bt1">منصة أمين — التوزيع الذكي لمراقبة الاختبارات</div>'
 '<div class="bt2">مدرسة مريجب — حلقة ثانية · العام الدراسي 2026/2027 · نموذج F-05</div></div></header>'
 '<div class="wrap">'
 '<div class="hint no-print">توزيع تلقائي متوازن مع تطبيق الاستثناءات: معلمات المادة لا يراقبن يوم مادتهنّ، والمستبعَدات كلياً، وقيود المراحل، ولجنتا الممرضة والحاسوب. عدّلي أي خانة يدوياً، ثم اطبعي F-05 لليوم.</div>'
 '<div class="tabs no-print" id="tabs"></div>'
 '<div class="toolbar no-print">'
 '<button class="btn" onclick="printF05()">🖨 طباعة F-05 لليوم المحدد</button>'
 '<button class="btn alt" onclick="reshuffle()">🔄 إعادة التوزيع</button>'
 '</div>'
 '<div id="view"></div>'
 '<div class="card no-print excl"><h3>المستبعَدات كلياً — اضغطي على الاسم للاستبعاد/الإلغاء (المستبعَدات حالياً مميّزة بالأحمر)</h3><div class="chips" id="excl"></div></div>'
 '<div class="card no-print" id="stats"></div>'
 '</div>'
 '<script>'+JS+'</script></body></html>')

open('/home/user/Muraijib-Permission-app/منصة-أمين-توزيع-المراقبة.html','w',encoding='utf-8').write(HTML)
print('built', len(HTML), 'bytes | halls',len(HALLS),'(incl 2 committees) | global-excl',len(GEXCL))
