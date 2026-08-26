/* export-data.js — يستخرج التوزيع الحالي من data.js إلى JSON لمولّد الصفحة */
global.window = {}; global.TextEncoder = require('util').TextEncoder;
global.document = { querySelector: () => null, querySelectorAll: () => [] };
global.localStorage = { getItem: () => null, setItem: () => {} };
require(__dirname + '/../src/data.js');
require(__dirname + '/../src/xlsx.js');
require(__dirname + '/../src/app.js');
const A = global.window.APP, I = A._internal;
I.setDist(JSON.parse(JSON.stringify(A.DISTRIBUTION)));
const out = { school: A.SCHOOL, subjects: [] };
let tReq = 0, tT = 0;
A.SUBJECTS.forEach(s => {
  const a = I.analyze(s);
  const rows = a.rows.map(r => ({
    teacher: r.teacher, role: r.role, isNew: r.isNew, load: r.load,
    grades: [...new Set(r.sections.map(x => +x.split('/')[0]))].sort((x, y) => x - y),
    classes: I.formatSections(s, r.sections)
  }));
  const loads = rows.filter(r => r.load > 0).map(r => r.load);
  tReq += a.totalRequired; tT += rows.length;
  out.subjects.push({
    id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, lang: s.lang || 'ar',
    perGen: s.periods.general, perAdv: s.periods.advanced,
    grades: s.grades || [5, 6, 7, 8], classes: a.sectionsCount,
    required: a.totalRequired, assigned: a.assigned, teachers: rows.length,
    minLoad: Math.min(...loads), maxLoad: Math.max(...loads),
    coordinator: a.coordinator, coordinatorTitle: a.coordinatorTitle, note: a.note, rows
  });
});
out.totals = { required: tReq, teachers: tT, classes: A.SECTIONS.length, subjects: A.SUBJECTS.length };
process.stdout.write(JSON.stringify(out, null, 1));
