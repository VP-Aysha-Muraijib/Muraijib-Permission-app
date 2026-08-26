/* build-artifact.js — يولّد صفحة الأنصبة القابلة للمشاركة من بيانات data.js
   الاستخدام: node tools/export-data.js > artifact-data.json && node tools/build-artifact.js
   المخرج: muraijib-workload.html (صفحة واحدة مكتفية بذاتها) */
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(process.argv[2] || 'artifact-data.json','utf8'));
const LOGO = fs.readFileSync(__dirname + '/../assets/letterhead.png').toString('base64');

const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const GA = {5:'الخامس',6:'السادس',7:'السابع',8:'الثامن'};
const GE = {5:'5',6:'6',7:'7',8:'8'};

const T = {
  ar:{ th:['المعلمة','المرحلة','الشعب','النصاب'], per:'حصة', coordTag:'منسّقة القسم',
       newTag:'جديدة', perClass:'حصتان للشعبة', teachers:'معلمة', classes:'شعبة',
       total:'مجموع النصاب', span:'الصفوف' },
  en:{ th:['Teacher','Grade','Classes','Load'], per:'periods', coordTag:'Coordinator',
       newTag:'New', perClass:'periods per class', teachers:'teachers', classes:'classes',
       total:'Total load', span:'Grades' }
};

function perClassLabel(s){
  const t = s.lang==='en' ? T.en : T.ar;
  if (s.lang==='en') return s.perAdv!==s.perGen
    ? `${s.perGen} periods per class · ${s.perAdv} advanced`
    : `${s.perGen} periods per class`;
  const w = n => n===1?'حصة واحدة':n===2?'حصتان':`${n} حصص`;
  return s.perAdv!==s.perGen ? `${w(s.perGen)} للشعبة · ${w(s.perAdv)} للمتقدّم` : `${w(s.perGen)} لكل شعبة`;
}

function gradeChips(s){
  return [5,6,7,8].map(g=>{
    const on = s.grades.indexOf(g)>=0;
    return `<span class="gchip${on?' on':''}" aria-label="${on?'تُدرَّس في':'لا تُدرَّس في'} الصف ${GA[g]}">${GE[g]}</span>`;
  }).join('');
}

function subjectSection(s, i){
  const en = s.lang==='en', t = en?T.en:T.ar;
  const name = en ? s.nameEn : s.nameAr;
  const rows = s.rows.map(r=>{
    const gr = en ? r.grades.map(g=>'Grade '+g).join(' + ') : r.grades.map(g=>'الصف '+GA[g]).join(' + ');
    return `<tr>
      <th scope="row" class="c-t">${esc(r.teacher)}${
        r.isNew?`<span class="tag tag-new">${t.newTag}</span>`:''}${
        r.role?`<span class="sub">${esc(r.role)}</span>`:''}${
        (s.coordinator && r.teacher===s.coordinator)?`<span class="sub coord">${esc(s.coordinatorTitle)}</span>`:''}</th>
      <td class="c-g">${esc(gr)}</td>
      <td class="c-c">${r.classes.map(esc).join('<br>')}</td>
      <td class="c-l"><span class="load">${r.load}</span></td>
    </tr>`;
  }).join('');

  return `<section class="rec" id="s-${s.id}" dir="${en?'ltr':'rtl'}" aria-labelledby="h-${s.id}">
  <header class="rec-h">
    <div class="rec-id">
      <h2 id="h-${s.id}">${esc(name)}</h2>
      <p class="rec-meta">${esc(perClassLabel(s))}</p>
    </div>
    <dl class="rec-stats">
      <div><dt>${t.classes}</dt><dd>${s.classes}</dd></div>
      <div><dt>${t.teachers}</dt><dd>${s.teachers}</dd></div>
      <div><dt>${t.total}</dt><dd>${s.assigned}</dd></div>
    </dl>
    <div class="gchips" role="group" aria-label="${t.span}">${gradeChips(s)}</div>
  </header>
  <div class="tw"><table>
    <thead><tr><th scope="col">${t.th[0]}</th><th scope="col">${t.th[1]}</th><th scope="col">${t.th[2]}</th><th scope="col" class="c-l">${t.th[3]}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  ${s.note?`<p class="rec-note">${esc(s.note)}</p>`:''}
</section>`;
}

const nav = D.subjects.map(s=>
  `<a href="#s-${s.id}"><span>${esc(s.nameAr)}</span><b>${s.teachers}</b></a>`).join('');

const summaryRows = D.subjects.map(s=>`<tr>
  <th scope="row">${esc(s.nameAr)}</th>
  <td>${s.perGen}${s.perAdv!==s.perGen?` <small>(${s.perAdv})</small>`:''}</td>
  <td>${s.classes}</td>
  <td>${s.required}</td>
  <td>${s.teachers}</td>
  <td>${s.minLoad}–${s.maxLoad}</td>
</tr>`).join('');

const html = `<title>أنصبة مريجب ح٢</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
<style>
:root{
  --ink:#241C15; --ink-2:#5A4B3D; --ink-3:#8B7A68;
  --ground:#FBF9F5; --surface:#FFFFFF; --sand:#F1EADE; --line:#DFD4C3; --hair:#EBE3D6;
  --bronze:#8A6A3C; --bronze-deep:#5C4526; --gold:#C9A227;
  --ok:#2E6B4F; --ok-bg:#E7F1EA; --warn:#8A5E17;
  --shadow:0 1px 2px rgba(36,28,21,.05),0 8px 24px -12px rgba(36,28,21,.18);
  --serif:'Amiri',Georgia,'Times New Roman',serif;
  --naskh:'Noto Naskh Arabic','Amiri',Georgia,serif;
  --sans:'IBM Plex Sans Arabic',ui-sans-serif,system-ui,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ink:#F0E7DA; --ink-2:#BCAB96; --ink-3:#8D7C68;
  --ground:#16120E; --surface:#1F1913; --sand:#2A2219; --line:#3D3225; --hair:#2E2619;
  --bronze:#C9A46A; --bronze-deep:#E0C99E; --gold:#D8B44A;
  --ok:#7FC7A0; --ok-bg:#1D3229; --warn:#D8A94E;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 28px -14px rgba(0,0,0,.7);
}}
:root[data-theme="dark"]{
  --ink:#F0E7DA; --ink-2:#BCAB96; --ink-3:#8D7C68;
  --ground:#16120E; --surface:#1F1913; --sand:#2A2219; --line:#3D3225; --hair:#2E2619;
  --bronze:#C9A46A; --bronze-deep:#E0C99E; --gold:#D8B44A;
  --ok:#7FC7A0; --ok-bg:#1D3229; --warn:#D8A94E;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 28px -14px rgba(0,0,0,.7);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:1.5rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:var(--naskh); font-size:16px; line-height:1.7;
  font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased;
}
:focus-visible{outline:2px solid var(--bronze);outline-offset:2px;border-radius:2px}

/* ─ masthead ─ */
.mast{border-bottom:1px solid var(--line);background:var(--surface)}
.mast-in{max-width:1180px;margin:0 auto;padding:26px 28px 20px}
.crest{width:100%;max-width:820px;height:74px;margin:0 auto;
  background:url(data:image/png;base64,${LOGO}) center/contain no-repeat}
:root[data-theme="dark"] .crest,
:root:not([data-theme="light"]) .crest{}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .crest{
  background-color:#F6F2EA;border-radius:3px;padding:6px 0}}
:root[data-theme="dark"] .crest{background-color:#F6F2EA;border-radius:3px;padding:6px 0}
.rule{height:0;border-top:2px solid var(--bronze-deep);border-bottom:1px solid var(--bronze-deep);
  margin:16px 0 0;opacity:.85}
.doc-h{max-width:1180px;margin:0 auto;padding:30px 28px 6px;text-align:center}
.eyebrow{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.16em;
  color:var(--bronze);text-transform:uppercase;margin:0 0 10px}
h1{font-family:var(--serif);font-weight:700;font-size:clamp(28px,4.6vw,44px);line-height:1.25;
  margin:0;text-wrap:balance;letter-spacing:.01em}
.doc-sub{font-family:var(--serif);font-size:clamp(15px,2vw,19px);color:var(--ink-2);margin:8px 0 0}
.diamond{width:180px;margin:20px auto 0;border-top:1px solid var(--gold);position:relative}
.diamond::after{content:"◆";position:absolute;inset-inline-start:50%;transform:translateX(50%);
  top:-13px;color:var(--gold);font-size:11px;background:var(--ground);padding:0 8px}

/* ─ kpi band ─ */
.kpis-wrap{max-width:1180px;margin:34px auto 0;padding:0 28px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:3px;overflow:hidden;margin:0}
.kpi{background:var(--surface);padding:18px 20px}
.kpi dt{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.05em;color:var(--ink-3);margin:0}
.kpi dd{margin:6px 0 0;font-family:var(--sans);font-size:30px;font-weight:600;line-height:1;color:var(--bronze-deep)}
.kpi dd small{font-size:14px;font-weight:400;color:var(--ink-3);margin-inline-start:4px}
.kpi.full dd{color:var(--ok)}

/* ─ layout ─ */
.wrap{max-width:1180px;margin:0 auto;padding:34px 28px 60px;
  display:grid;grid-template-columns:210px minmax(0,1fr);gap:34px;align-items:start}
nav.rail{position:sticky;top:20px;border:1px solid var(--line);border-radius:3px;
  background:var(--surface);padding:6px;display:flex;flex-direction:column}
nav.rail a{display:flex;justify-content:space-between;align-items:center;gap:10px;
  padding:8px 11px;text-decoration:none;color:var(--ink);font-size:13.5px;border-radius:2px;
  border-inline-start:2px solid transparent}
nav.rail a:hover{background:var(--sand);border-inline-start-color:var(--bronze)}
nav.rail a b{font-family:var(--sans);font-size:12px;font-weight:500;color:var(--ink-3)}
main{display:flex;flex-direction:column;gap:26px;min-width:0}

/* ─ record card ─ */
.rec{background:var(--surface);border:1px solid var(--line);border-radius:3px;
  box-shadow:var(--shadow);overflow:hidden}
.rec-h{padding:20px 24px 16px;border-bottom:1px solid var(--line);background:var(--sand);
  display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px 22px;align-items:start}
.rec-id{min-width:0}
.rec h2{font-family:var(--serif);font-weight:700;font-size:clamp(20px,2.6vw,26px);margin:0;
  line-height:1.3;text-wrap:balance;color:var(--bronze-deep)}
.rec-meta{font-family:var(--sans);font-size:13px;color:var(--ink-2);margin:5px 0 0}
.rec-stats{display:flex;gap:22px;margin:0;justify-self:end}
.rec-stats div{text-align:center}
.rec-stats dt{font-family:var(--sans);font-size:11px;letter-spacing:.04em;color:var(--ink-3);margin:0}
.rec-stats dd{margin:2px 0 0;font-family:var(--sans);font-size:20px;font-weight:600;color:var(--ink)}
.gchips{grid-column:1/-1;display:flex;gap:5px}
.gchip{font-family:var(--sans);font-size:12px;font-weight:500;width:26px;height:26px;
  display:grid;place-items:center;border:1px solid var(--line);border-radius:2px;
  color:var(--ink-3);background:var(--surface)}
.gchip.on{background:var(--bronze-deep);border-color:var(--bronze-deep);color:#FBF9F5}
:root[data-theme="dark"] .gchip.on{color:#16120E}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .gchip.on{color:#16120E}}

.tw{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14.5px}
thead th{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--ink-3);text-align:start;
  padding:11px 24px;border-bottom:1px solid var(--line);white-space:nowrap}
tbody th,tbody td{padding:13px 24px;border-bottom:1px solid var(--hair);vertical-align:top;text-align:start}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:none}
tbody tr:hover th,tbody tr:hover td{background:var(--sand)}
.c-t{font-weight:700;font-size:15.5px;width:23%;color:var(--ink)}
.c-t .sub{display:block;font-weight:400;font-size:12.5px;color:var(--ink-3);margin-top:2px}
.c-t .sub.coord{color:var(--bronze)}
.c-g{width:17%;color:var(--ink-2);font-size:13.5px}
.c-c{line-height:1.85;font-size:13.5px;color:var(--ink-2)}
.c-l{width:74px;text-align:center!important}
thead th.c-l{text-align:center}
.load{font-family:var(--sans);font-size:19px;font-weight:600;color:var(--bronze-deep)}
.tag{display:inline-block;font-family:var(--sans);font-size:10.5px;font-weight:500;
  padding:1px 7px;border-radius:2px;margin-inline-start:7px;vertical-align:2px}
.tag-new{background:var(--ok-bg);color:var(--ok);border:1px solid currentColor}
.rec-note{margin:0;padding:13px 24px;border-top:1px solid var(--hair);background:var(--sand);
  font-size:13px;color:var(--ink-2);line-height:1.75}

/* ─ summary + sign ─ */
.panel{background:var(--surface);border:1px solid var(--line);border-radius:3px;
  box-shadow:var(--shadow);overflow:hidden}
.panel > h2{font-family:var(--serif);font-size:22px;margin:0;padding:18px 24px 14px;
  color:var(--bronze-deep);border-bottom:1px solid var(--line);background:var(--sand)}
.panel table td,.panel table th{padding:11px 24px}
.panel table td{font-family:var(--sans);font-size:14px;color:var(--ink-2);text-align:center}
.panel table th[scope="row"]{font-weight:500;font-size:14.5px;text-align:start;width:34%}
.panel table thead th{text-align:center}
.panel table thead th:first-child{text-align:start}
.panel table tfoot th,.panel table tfoot td{border-top:2px solid var(--bronze-deep);
  font-weight:700;font-family:var(--sans);background:var(--sand);color:var(--ink)}

.sign{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:26px;
  padding:30px 24px 26px}
.sign div{text-align:center}
.sign .role{font-family:var(--serif);font-weight:700;font-size:15px;color:var(--bronze-deep);display:block}
.sign .who{font-size:14px;color:var(--ink-2);display:block;margin-top:3px;min-height:22px}
.sign .line{display:block;border-top:1px solid var(--ink-3);margin:10px 22px 0}

footer{max-width:1180px;margin:0 auto;padding:0 28px 50px;text-align:center;
  font-family:var(--sans);font-size:12.5px;color:var(--ink-3);line-height:1.9}

@media (max-width:900px){
  .wrap{grid-template-columns:1fr;gap:20px;padding:26px 16px 46px}
  nav.rail{position:static;flex-direction:row;flex-wrap:wrap}
  nav.rail a{flex:1 1 42%}
  .mast-in,.doc-h,.kpis-wrap,footer{padding-inline:16px}
  .rec-h{grid-template-columns:1fr}
  .rec-stats{justify-self:start;gap:18px}
  thead th,tbody th,tbody td,.rec-note,.panel table td,.panel table th{padding-inline:16px}
  .crest{height:56px}
}
@media print{
  body{background:#fff}
  nav.rail{display:none}
  .wrap{display:block;padding:0}
  main{gap:0}
  .rec,.panel{break-inside:avoid;box-shadow:none;margin-bottom:14px}
  .kpis{break-inside:avoid}
}
</style>

<header class="mast">
  <div class="mast-in">
    <div class="crest" role="img" aria-label="وزارة التربية والتعليم — دولة الإمارات العربية المتحدة · مدرسة مريجب للتعليم الأساسي ح2"></div>
    <div class="rule"></div>
  </div>
</header>

<div class="doc-h">
  <p class="eyebrow">وثيقة توزيع رسمية</p>
  <h1>توزيع الأنصبة التدريسية على الكادر</h1>
  <p class="doc-sub">${esc(D.school.nameAr)} · العام الدراسيّ ${esc(D.school.year)}</p>
  <div class="diamond"></div>
</div>

<div class="kpis-wrap"><dl class="kpis">
  <div class="kpi"><dt>المواد الدراسيّة</dt><dd>${D.totals.subjects}</dd></div>
  <div class="kpi"><dt>الشُّعب</dt><dd>${D.totals.classes}</dd></div>
  <div class="kpi"><dt>المعلمات</dt><dd>${D.totals.teachers}</dd></div>
  <div class="kpi"><dt>الحصص أسبوعيّاً</dt><dd>${D.totals.required}</dd></div>
  <div class="kpi full"><dt>تغطية الشُّعب</dt><dd>100<small>%</small></dd></div>
</dl></div>

<div class="wrap">
  <nav class="rail" aria-label="المواد">${nav}</nav>
  <main>
    ${D.subjects.map(subjectSection).join('\n')}

    <section class="panel" aria-labelledby="sum-h">
      <h2 id="sum-h">ملخّص الأنصبة حسب المادة</h2>
      <div class="tw"><table>
        <thead><tr><th scope="col">المادة</th><th scope="col">حصص الشعبة</th><th scope="col">الشُّعب</th>
          <th scope="col">الحصص</th><th scope="col">المعلمات</th><th scope="col">مدى النصاب</th></tr></thead>
        <tbody>${summaryRows}</tbody>
        <tfoot><tr><th scope="row">الإجمالي</th><td>36</td><td>${D.totals.classes}</td>
          <td>${D.totals.required}</td><td>${D.totals.teachers}</td><td>—</td></tr></tfoot>
      </table></div>
    </section>

    <section class="panel" aria-label="الاعتماد">
      <div class="sign">
        <div><span class="role">نائب مدير أكاديمي</span><span class="who">${esc(D.school.deputy)}</span><span class="line"></span></div>
        <div><span class="role">مديرة المدرسة</span><span class="who">${esc(D.school.principal)}</span><span class="line"></span></div>
      </div>
    </section>
  </main>
</div>

<footer>
  أُعدَّت وفق الخطة الدراسيّة المعتمدة من وزارة التربية والتعليم للعام ${esc(D.school.year)} — الحلقة الثانية، مسار اللغة الثالثة.<br>
  مجموع حصص كل شعبة 36 حصة أسبوعيّاً · ${D.totals.classes} شعبة · ${D.totals.required} حصة.
</footer>
`;
fs.writeFileSync('muraijib-workload.html', html);
console.log('كُتب الملف:', (html.length/1024).toFixed(0), 'KB');
