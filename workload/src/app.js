/* ============================================================================
   app.js — بناء جداول التوزيع لكل مادة + التصدير (Excel / PDF / CSV)
   يدعم صفحات عربية (RTL) وصفحات إنجليزية كاملة (LTR) للمواد الأجنبية.
   ========================================================================== */
window.APP = window.APP || {};
(function (A) {
  'use strict';

  const STORE_KEY = 'muraijib_workload_v1';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

  /* ── نصوص الواجهة باللغتين ─────────────────────────────────────────── */
  const STR = {
    ar: {
      dir:'rtl',
      title:  s => 'توزيع المراحل الدراسية على معلمات ' + s,
      year:   y => 'للعام الدراسيّ ' + y,
      school: () => A.SCHOOL.nameAr,
      h:['م','اسم المعلمة','المرحلة','الشعب','النصاب','التوقيع'],
      periodsPerClass:'حصص الشعبة', advanced:'المتقدّم', grades:'الصفوف',
      classCount:'عدد الشعب', required:'إجمالي الحصص المطلوبة', allocated:'الموزّع',
      avgLoad:'متوسط النصاب', rotation:'التوزيع', rotationVal:'تبادلي أسبوعي',
      allGrades:'الصفوف 5 - 8',
      total: n => 'المجموع — ' + n + ' معلمة', vacancyTotal: p => 'شاغر (*): ' + p + ' حصة',
      empty:'لم تُزوَّد بيانات هذا القسم بعد — اضغطي «تعديل» لإضافة المعلمات وتوزيع الشعب.',
      tagNew:'جديدة', coordTag:'منسّقة القسم',
      wUncovered:'شعب غير مسندة', wDeficit: p => ' — بعجز قدره ' + p + ' حصة.',
      wDup:'شعب مكرّرة',
      wOver:'نصاب مرتفع جداً', wOverTail:(std,n,p)=>'  (المعيار '+std+' حصة). القسم يحتاج تقريباً '+n+' معلمة لتغطية '+p+' حصة.',
      wUnder:'نصاب منخفض', wUnderTail:std=>'  (المعيار '+std+' حصة) — يُستكمل بشعب إضافية أو بمهام مدرسية أخرى.',
      period:'حصة',
      signCoord:'منسّقة القسم', signDeputy:'نائب مدير أكاديمي', signPrincipal:'مديرة المدرسة',
      maxLoad:'أعلى نصاب', minLoad:'أقل نصاب', deficit:'العجز بالحصص',
      sep:'، ', gradeSep:' + ', adv:'متقدّم'
    },
    en: {
      dir:'ltr',
      title:  s => s + ' — Teaching Load Distribution',
      year:   y => 'Academic Year ' + y,
      school: () => A.SCHOOL.nameEn,
      h:['#','Teacher','Grade','Classes','Load','Signature'],
      periodsPerClass:'Periods per class', advanced:'Advanced', grades:'Grades',
      classCount:'Classes', required:'Total periods required', allocated:'Allocated',
      avgLoad:'Average load', rotation:'Distribution', rotationVal:'Weekly rotation',
      allGrades:'Grades 5 - 8',
      total: n => 'Total — ' + n + ' teachers', vacancyTotal: p => 'Vacancy (*): ' + p + ' periods',
      empty:'No data provided for this department yet — click “Edit” to add teachers and assign classes.',
      tagNew:'New', coordTag:'Subject Coordinator',
      wUncovered:'Unassigned classes', wDeficit: p => ' — a shortfall of ' + p + ' periods.',
      wDup:'Duplicate classes',
      wOver:'Excessive load', wOverTail:(std,n,p)=>'  (standard '+std+' periods). The department needs about '+n+' teachers to cover '+p+' periods.',
      wUnder:'Low load', wUnderTail:std=>'  (standard '+std+' periods) — to be topped up with more classes or other school duties.',
      period:'periods',
      signCoord:'Subject Coordinator', signDeputy:'Academic Deputy Principal', signPrincipal:'Principal',
      maxLoad:'Highest load', minLoad:'Lowest load', deficit:'Shortfall (periods)',
      sep:', ', gradeSep:' + ', adv:'Advanced'
    }
  };
  const isEn = subject => subject && subject.lang === 'en';
  const deputyName    = en => (en && A.SCHOOL.deputyEn)    ? A.SCHOOL.deputyEn    : (A.SCHOOL.deputy || '');
  const principalName = en => (en && A.SCHOOL.principalEn) ? A.SCHOOL.principalEn : (A.SCHOOL.principal || '');
  const L    = subject => STR[isEn(subject) ? 'en' : 'ar'];

  /* ── الحالة ─────────────────────────────────────────────────────────── */
  let DIST = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { DIST = JSON.parse(raw); return; }
    } catch (e) { /* تجاهل */ }
    DIST = JSON.parse(JSON.stringify(A.DISTRIBUTION));
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DIST)); } catch (e) { /* تجاهل */ }
  }
  function resetState() {
    DIST = JSON.parse(JSON.stringify(A.DISTRIBUTION));
    saveState(); render();
  }

  /* ── حسابات ─────────────────────────────────────────────────────────── */
  const sectionById = {};
  A.SECTIONS.forEach(s => sectionById[s.id] = s);

  function appliesTo(subject, sec) {
    return !subject.grades || subject.grades.indexOf(sec.grade) >= 0;
  }
  function applicableSections(subject) {
    return A.SECTIONS.filter(sec => appliesTo(subject, sec));
  }
  function periodsOf(subject, sectionId) {
    const sec = sectionById[sectionId];
    if (!sec || !appliesTo(subject, sec)) return 0;
    return sec.track === 'advanced' ? subject.periods.advanced : subject.periods.general;
  }

  function gradeName(subject, g) {
    return isEn(subject) ? A.GRADE_NAME_EN[g] : A.GRADE_NAME[g];
  }
  function formatSections(subject, ids) {
    const t = L(subject), byGrade = {};
    ids.slice().sort(cmpSection).forEach(id => {
      const sec = sectionById[id]; if (!sec) return;
      (byGrade[sec.grade] = byGrade[sec.grade] || []).push(sec.label === 'ADV' ? t.adv : sec.label);
    });
    return Object.keys(byGrade).map(Number).sort((a, b) => a - b)
      .map(g => gradeName(subject, g) + ': ' + byGrade[g].join(t.sep));
  }
  function gradeNames(subject, ids) {
    const gs = {};
    ids.forEach(id => { const s = sectionById[id]; if (s) gs[s.grade] = 1; });
    return Object.keys(gs).map(Number).sort((a, b) => a - b)
      .map(g => gradeName(subject, g)).join(L(subject).gradeSep);
  }
  function sectionLabels(subject, ids) {
    const t = L(subject);
    return ids.slice().sort(cmpSection).map(id => {
      const s = sectionById[id]; if (!s) return id;
      return s.grade + '/' + (s.label === 'ADV' ? t.adv : s.label);
    }).join(t.sep);
  }
  function cmpSection(a, b) {
    const x = sectionById[a], y = sectionById[b];
    if (!x || !y) return String(a).localeCompare(String(b));
    if (x.grade !== y.grade) return x.grade - y.grade;
    if (x.label === 'ADV') return 1;
    if (y.label === 'ADV') return -1;
    return Number(x.label) - Number(y.label);
  }

  /* التحليل الكامل لمادة واحدة */
  function analyze(subject) {
    const d = DIST[subject.id] || { rows: [] };
    const en = isEn(subject);
    const rotating = !!subject.rotating;

    const coordinator = (en && d.coordinatorEn) ? d.coordinatorEn : (d.coordinator || '');

    const rows = (d.rows || []).map(r => ({
      teacher: (en && r.teacherEn) ? r.teacherEn : r.teacher,
      note: (en && r.noteEn) ? r.noteEn : (r.note || ''),
      role: (en && r.roleEn) ? r.roleEn : (r.role || ''),
      isNew: !!r.isNew, vacancy: !!r.vacancy,
      loadOverride: (r.loadOverride != null) ? r.loadOverride : null,
      sections: (r.sections || []).filter(id => sectionById[id])
    }));
    const hasOverride = rows.some(r => r.loadOverride != null);

    /* في المواد التبادلية تُتقاسَم حصص الشعبة بين معلمات التخصّصات */
    const share = {};
    rows.forEach(r => r.sections.forEach(id => { share[id] = (share[id] || 0) + 1; }));
    rows.forEach(r => {
      r.load = r.sections.reduce((s, id) =>
        s + periodsOf(subject, id) / (rotating ? (share[id] || 1) : 1), 0);
    });

    /* تقريب حصص التناوب إلى أعداد صحيحة يبقى مجموعها مطابقاً للمطلوب */
    if (rotating && !hasOverride) {
      const exactTotal = Object.keys(share)
        .reduce((s, id) => s + periodsOf(subject, id), 0);
      const floors = rows.map(r => Math.floor(r.load));
      let rem = exactTotal - floors.reduce((x, y) => x + y, 0);
      const byFrac = rows.map((r, i) => ({ i: i, f: r.load - Math.floor(r.load) }))
        .sort((x, y) => y.f - x.f);
      const out = floors.slice();
      for (let k = 0; k < byFrac.length && rem > 0; k++) { out[byFrac[k].i]++; rem--; }
      rows.forEach((r, i) => { r.exactLoad = r.load; r.load = out[i]; });
    }
    rows.forEach(r => { if (r.loadOverride != null) r.load = r.loadOverride; });

    /* وسم صفّ المنسّقة */
    rows.forEach(r => { r.isCoord = !!coordinator && r.teacher === coordinator; });

    const applicable = applicableSections(subject);
    const totalRequired = applicable.reduce((s, sec) => s + periodsOf(subject, sec.id), 0);
    const assigned = rows.reduce((s, r) => s + (r.vacancy ? 0 : r.load), 0);
    const withLoad = rows.filter(r => r.load > 0 && !r.vacancy);
    const avg = withLoad.length ? assigned / withLoad.length : 0;
    const loads = withLoad.map(r => r.load);
    const max = loads.length ? Math.max.apply(null, loads) : 0;
    const min = loads.length ? Math.min.apply(null, loads) : 0;

    /* الشعب غير المسندة + المكرّرة */
    const seen = {}, covered = {}, dup = [];
    rows.forEach(r => r.sections.forEach(id => {
      if (seen[id] && !rotating) dup.push(id); else seen[id] = r.teacher;
      if (!r.vacancy) covered[id] = r.teacher;
    }));
    const uncovered = applicable.filter(s => !covered[s.id]).map(s => s.id);
    const vacancyPeriods = rows.filter(r => r.vacancy).reduce((s, r) => s + r.load, 0);

    return {
      subject, rows, totalRequired, assigned, rotating, en,
      avg, max, min, uncovered, duplicates: dup, vacancyPeriods,
      coordinator: coordinator,
      coordinatorTitle: d.coordinatorTitle || L(subject).signCoord,
      note: (en && d.noteEn) ? d.noteEn : (d.note || ''),
      sectionsCount: applicable.length,
      gradesLabel: subject.grades
        ? subject.grades.map(g => gradeName(subject, g)).join(' · ')
        : L(subject).allGrades
    };
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ══ العرض ═══════════════════════════════════════════════════════════ */
  function render() {
    $('#pages').innerHTML = A.SUBJECTS.map(renderPage).join('');
    renderNav();
    bindPageActions();
  }

  function renderNav() {
    $('#nav').innerHTML = A.SUBJECTS.map(s => {
      const a = analyze(s);
      const state = a.rows.length === 0 ? 'wait' : (a.uncovered.length ? 'gap' : 'ok');
      return '<a href="#p-' + s.id + '" class="nav-item ' + state + '">' +
        '<span>' + esc(s.nameAr) + '</span>' +
        '<span class="nav-badge">' + (a.rows.length ? a.rows.length + ' معلمة' : 'بانتظار البيانات') + '</span>' +
        '</a>';
    }).join('');
  }

  function renderPage(subject) {
    const a = analyze(subject), t = L(subject);
    const name = a.en ? subject.nameEn : subject.nameAr;
    const perGen = subject.periods.general, perAdv = subject.periods.advanced;

    const body = a.rows.length
      ? a.rows.map((r, i) =>
          '<tr>' +
          '<td class="c-num">' + (i + 1) + '</td>' +
          '<td class="c-name' + (r.vacancy ? ' is-vac' : '') + '">' + esc(r.teacher) +
            (r.isNew ? '<span class="tag-new">' + t.tagNew + '</span>' : '') +
            (r.isCoord ? '<span class="row-role">' + esc(a.coordinatorTitle) + '</span>' : '') +
            (r.role ? '<span class="row-role">' + esc(r.role) + '</span>' : '') +
            (r.note ? '<span class="row-note">' + esc(r.note) + '</span>' : '') + '</td>' +
          '<td class="c-grade">' + esc(gradeNames(subject, r.sections) || '—') + '</td>' +
          '<td class="c-sec">' + (formatSections(subject, r.sections).map(esc).join('<br>') || '—') + '</td>' +
          '<td class="c-load' + (r.vacancy ? ' is-vac' : '') + '">' + r.load + '</td>' +
          '<td class="c-sign"></td>' +
          '</tr>').join('')
      : '<tr class="empty-row"><td colspan="6">' + t.empty + '</td></tr>';

    const totals = a.rows.length
      ? '<tr class="tr-total">' +
        '<td colspan="4">' + t.total(a.rows.filter(r => r.load > 0 && !r.vacancy).length) +
          (a.vacancyPeriods ? ' &nbsp;·&nbsp; ' + t.vacancyTotal(a.vacancyPeriods) : '') + '</td>' +
        '<td class="c-load">' + a.assigned + '</td><td></td></tr>'
      : '';

    const warn = [];
    if (a.uncovered.length)
      warn.push('<div class="warn"><b>' + t.wUncovered + ' (' + a.uncovered.length + '):</b> ' +
        esc(sectionLabels(subject, a.uncovered)) +
        t.wDeficit(a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0)) + '</div>');
    if (a.duplicates.length)
      warn.push('<div class="warn"><b>' + t.wDup + ':</b> ' + esc(sectionLabels(subject, a.duplicates)) + '</div>');
    const std = A.SCHOOL.standardLoad || 24;
    const over = a.rows.filter(r => !r.vacancy && r.load > (A.SCHOOL.overloadThreshold || 30));
    if (over.length)
      warn.push('<div class="warn"><b>' + t.wOver + ':</b> ' +
        over.map(r => esc(r.teacher) + ' — ' + r.load + ' ' + t.period).join(' · ') +
        t.wOverTail(std, Math.ceil(a.assigned / std), a.assigned) + '</div>');
    const under = a.rows.filter(r => !r.vacancy && r.load > 0 && r.load < std / 2);
    if (under.length)
      warn.push('<div class="note-box"><b>' + t.wUnder + ':</b> ' +
        under.map(r => esc(r.teacher) + ' — ' + r.load + ' ' + t.period).join(' · ') +
        t.wUnderTail(std) + '</div>');
    if (a.note) warn.push('<div class="note-box">' + esc(a.note) + '</div>');

    return '' +
'<section class="page" id="p-' + subject.id + '" dir="' + t.dir + '" data-subject="' + subject.id + '">' +
  '<div class="page-tools no-print" dir="rtl">' +
    '<button class="btn sm" data-act="edit" data-s="' + subject.id + '">تعديل</button>' +
    '<button class="btn sm" data-act="xlsx-one" data-s="' + subject.id + '">Excel لهذه المادة</button>' +
    '<button class="btn sm" data-act="csv-one" data-s="' + subject.id + '">CSV</button>' +
  '</div>' +
  '<header class="sheet-head">' +
    '<div class="letterhead-img" role="img" aria-label="' + esc(t.school()) + '"></div>' +
    '<div class="rule-double"></div>' +
  '</header>' +
  '<div class="doc-title">' +
    '<h2>' + esc(t.title(name)) + '</h2>' +
    '<div class="doc-year">' + esc(t.year(A.SCHOOL.year)) + '</div>' +
    '<div class="doc-rule"></div>' +
  '</div>' +
  '<div class="meta-strip">' +
    '<span><b>' + t.periodsPerClass + ':</b> ' + perGen +
      (perAdv !== perGen ? ' (' + t.advanced + ' ' + perAdv + ')' : '') + '</span>' +
    '<span><b>' + t.grades + ':</b> ' + esc(a.gradesLabel) + '</span>' +
    '<span><b>' + t.classCount + ':</b> ' + a.sectionsCount + '</span>' +
    '<span><b>' + t.required + ':</b> ' + a.totalRequired + '</span>' +
    '<span><b>' + t.allocated + ':</b> ' + a.assigned + '</span>' +
    '<span><b>' + t.avgLoad + ':</b> ' + (a.avg ? (Math.round(a.avg * 10) / 10) : '—') + '</span>' +
    (a.rotating ? '<span><b>' + t.rotation + ':</b> ' + t.rotationVal + '</span>' : '') +
  '</div>' +
  '<table class="grid">' +
    '<thead><tr>' +
      '<th class="c-num">' + t.h[0] + '</th><th class="c-name">' + t.h[1] + '</th>' +
      '<th class="c-grade">' + t.h[2] + '</th><th class="c-sec">' + t.h[3] + '</th>' +
      '<th class="c-load">' + t.h[4] + '</th><th class="c-sign">' + t.h[5] + '</th>' +
    '</tr></thead>' +
    '<tbody>' + body + totals + '</tbody>' +
  '</table>' +
  warn.join('') +
  '<footer class="sheet-foot">' +
    '<div class="sign"><span class="sign-role">' + esc(a.coordinatorTitle) + '</span>' +
      '<span class="sign-name">' + esc(a.coordinator) + '</span><span class="sign-line"></span></div>' +
    '<div class="sign"><span class="sign-role">' + t.signDeputy + '</span>' +
      '<span class="sign-name">' + esc(deputyName(a.en)) + '</span><span class="sign-line"></span></div>' +
    '<div class="sign"><span class="sign-role">' + t.signPrincipal + '</span>' +
      '<span class="sign-name">' + esc(principalName(a.en)) + '</span><span class="sign-line"></span></div>' +
  '</footer>' +
'</section>';
  }

  /* ══ التعديل ═════════════════════════════════════════════════════════ */
  function openEditor(subjectId) {
    const subject = A.SUBJECTS.filter(s => s.id === subjectId)[0];
    const d = DIST[subjectId] = DIST[subjectId] || { coordinator: '', rows: [] };
    const dlg = $('#editor');

    function taken(exceptIdx) {
      const map = {};
      d.rows.forEach((r, i) => { if (i !== exceptIdx) (r.sections || []).forEach(s => map[s] = r.teacher || '—'); });
      return map;
    }

    function draw() {
      $('#ed-title').textContent = 'تعديل توزيع — ' + subject.nameAr;
      $('#ed-body').innerHTML = d.rows.map((r, i) => {
        const t = taken(i);
        const grid = applicableSections(subject).map(sec => {
          const on = (r.sections || []).indexOf(sec.id) >= 0;
          const busy = !on && t[sec.id] && !subject.rotating;
          return '<label class="chip' + (on ? ' on' : '') + (busy ? ' busy' : '') + '"' +
            (busy ? ' title="مسندة إلى ' + esc(t[sec.id]) + '"' : '') + '>' +
            '<input type="checkbox" data-row="' + i + '" data-sec="' + sec.id + '"' +
            (on ? ' checked' : '') + (busy ? ' disabled' : '') + '>' +
            (sec.grade + '/' + (sec.label === 'ADV' ? 'م' : sec.label)) + '</label>';
        }).join('');
        const load = (r.sections || []).reduce((s, id) => s + periodsOf(subject, id), 0);
        return '<div class="ed-row">' +
          '<div class="ed-row-top">' +
            '<input class="ed-name" data-row="' + i + '" value="' + esc(r.teacher || '') + '" placeholder="اسم المعلمة">' +
            '<label class="ed-new"><input type="checkbox" class="ed-isnew" data-row="' + i + '"' +
              (r.isNew ? ' checked' : '') + '> جديدة</label>' +
            '<label class="ed-new"><input type="checkbox" class="ed-isvac" data-row="' + i + '"' +
              (r.vacancy ? ' checked' : '') + '> شاغر (*)</label>' +
            '<span class="ed-load">النصاب: <b>' + load + '</b></span>' +
            '<button class="btn sm danger" data-del="' + i + '">حذف</button>' +
          '</div>' +
          '<div class="chips">' + grid + '</div>' +
          '</div>';
      }).join('') || '<p class="muted">لا توجد صفوف — اضغطي «إضافة معلمة».</p>';
      $('#ed-coord').value = d.coordinator || '';
    }

    $('#ed-body').onclick = function (e) {
      const del = e.target.getAttribute && e.target.getAttribute('data-del');
      if (del != null) { d.rows.splice(Number(del), 1); draw(); }
    };
    $('#ed-body').onchange = function (e) {
      const el = e.target;
      if (el.type === 'checkbox' && el.hasAttribute('data-sec')) {
        const i = Number(el.getAttribute('data-row')), sec = el.getAttribute('data-sec');
        const arr = d.rows[i].sections = d.rows[i].sections || [];
        const at = arr.indexOf(sec);
        if (el.checked && at < 0) arr.push(sec);
        if (!el.checked && at >= 0) arr.splice(at, 1);
        arr.sort(cmpSection);
        draw();
      } else if (el.classList.contains('ed-isvac')) {
        d.rows[Number(el.getAttribute('data-row'))].vacancy = el.checked;
      } else if (el.classList.contains('ed-isnew')) {
        d.rows[Number(el.getAttribute('data-row'))].isNew = el.checked;
      } else if (el.classList.contains('ed-name')) {
        d.rows[Number(el.getAttribute('data-row'))].teacher = el.value;
      }
    };
    $('#ed-add').onclick = function () { d.rows.push({ teacher: '', sections: [] }); draw(); };
    $('#ed-save').onclick = function () {
      d.coordinator = $('#ed-coord').value;
      d.rows = d.rows.filter(r => (r.teacher || '').trim() || (r.sections || []).length);
      saveState(); dlg.close(); render();
    };
    $('#ed-cancel').onclick = function () { loadState(); dlg.close(); render(); };

    draw();
    dlg.showModal();
  }

  /* ══ التصدير ═════════════════════════════════════════════════════════ */
  function sheetFor(subject) {
    const a = analyze(subject), t = L(subject);
    const name = a.en ? subject.nameEn : subject.nameAr;
    const H = v => ({ v: v, style: 'head' });
    const rows = [];
    rows.push([{ v: t.title(name) + ' — ' + A.SCHOOL.year, style: 'title' }, '', '', '', '', '']);
    rows.push([{ v: A.SCHOOL.nameAr + ' · ' + A.SCHOOL.nameEn, style: 'title' }, '', '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push([H(t.h[0]), H(t.h[1]), H(t.h[2]), H(t.h[3]), H(t.h[4]), H(t.h[5])]);
    a.rows.forEach((r, i) => rows.push([
      i + 1,
      r.teacher + (r.isCoord ? ' — ' + a.coordinatorTitle : '') + (r.role ? ' — ' + r.role : '') +
        (r.isNew ? ' (' + t.tagNew + ')' : '') + (r.vacancy ? ' — ' + t.wUncovered : ''),
      gradeNames(subject, r.sections), formatSections(subject, r.sections).join(' · '),
      { v: r.load, style: 'num' }, ''
    ]));
    rows.push([
      { v: t.total(a.rows.filter(r => r.load > 0 && !r.vacancy).length), style: 'total' },
      { v: '', style: 'total' }, { v: '', style: 'total' }, { v: '', style: 'total' },
      { v: a.assigned, style: 'total' }, { v: '', style: 'total' }
    ]);
    rows.push(['', '', '', '', '', '']);
    rows.push([t.periodsPerClass, subject.periods.general +
      (subject.periods.advanced !== subject.periods.general ? ' (' + t.advanced + ' ' + subject.periods.advanced + ')' : ''),
      t.required, a.totalRequired, t.allocated, a.assigned]);
    rows.push([t.avgLoad, Math.round(a.avg * 10) / 10, t.maxLoad, a.max, t.minLoad, a.min]);
    if (a.uncovered.length)
      rows.push([{ v: t.wUncovered, style: 'warn' },
        { v: sectionLabels(subject, a.uncovered), style: 'warn' },
        { v: t.deficit, style: 'warn' },
        { v: a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0), style: 'warn' },
        { v: '', style: 'warn' }, { v: '', style: 'warn' }]);
    rows.push(['', '', '', '', '', '']);
    rows.push([a.coordinatorTitle, a.coordinator, t.signDeputy, deputyName(a.en),
               t.signPrincipal, principalName(a.en)]);

    return {
      name: subject.nameAr, rtl: !a.en, landscape: true,
      cols: [5, 28, 22, 46, 10, 16],
      merges: ['A1:F1', 'A2:F2'],
      rows: rows
    };
  }

  function summarySheet() {
    const H = v => ({ v: v, style: 'head' });
    const rows = [];
    rows.push([{ v: 'ملخّص توزيع الأنصبة — ' + A.SCHOOL.nameAr + ' · ' + A.SCHOOL.year, style: 'title' }, '', '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push([H('المادة'), H('حصص الشعبة'), H('المطلوب'), H('الموزّع'), H('غير موزّع'), H('عدد المعلمات')]);
    let tReq = 0, tAsg = 0, tT = 0;
    A.SUBJECTS.forEach(s => {
      const a = analyze(s);
      const n = a.rows.filter(r => r.load > 0 && !r.vacancy).length;
      tReq += a.totalRequired; tAsg += a.assigned; tT += n;
      const gap = a.totalRequired - a.assigned;
      rows.push([s.nameAr, s.periods.general, { v: a.totalRequired, style: 'num' },
        { v: a.assigned, style: 'num' },
        gap ? { v: gap, style: 'warn' } : { v: 0, style: 'num' },
        { v: n, style: 'num' }]);
    });
    rows.push([{ v: 'الإجمالي', style: 'total' }, { v: '', style: 'total' },
      { v: tReq, style: 'total' }, { v: tAsg, style: 'total' },
      { v: tReq - tAsg, style: 'total' }, { v: tT, style: 'total' }]);
    return { name: 'الملخّص', rtl: true, cols: [34, 12, 12, 12, 12, 14], merges: ['A1:F1'], rows: rows };
  }

  function exportXlsx(only) {
    const list = only ? A.SUBJECTS.filter(s => s.id === only) : A.SUBJECTS;
    const sheets = only ? [sheetFor(list[0])] : [summarySheet()].concat(list.map(sheetFor));
    const bytes = A.buildXlsx(sheets);
    const name = only
      ? 'توزيع-' + list[0].nameAr.replace(/[\/\\?%*:|"<>]/g, '') + '-' + A.SCHOOL.year + '.xlsx'
      : 'توزيع-أنصبة-مريجب-ح2-' + A.SCHOOL.year + '.xlsx';
    A.downloadBlob(bytes, name,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  function exportCsv(only) {
    const list = only ? A.SUBJECTS.filter(s => s.id === only) : A.SUBJECTS;
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = ['﻿' + ['المادة', 'م', 'اسم المعلمة', 'المرحلة', 'الشعب', 'النصاب'].map(q).join(',')];
    list.forEach(s => {
      const a = analyze(s), t = L(s);
      a.rows.forEach((r, i) => lines.push([s.nameAr, i + 1,
        r.teacher + (r.isCoord ? ' — ' + a.coordinatorTitle : '') + (r.role ? ' — ' + r.role : '') +
          (r.isNew ? ' (' + t.tagNew + ')' : '') + (r.vacancy ? ' — *' : ''),
        gradeNames(s, r.sections), formatSections(s, r.sections).join(' · '), r.load].map(q).join(',')));
      lines.push([s.nameAr, '', 'المجموع', '', '', a.assigned].map(q).join(','));
    });
    const bytes = new TextEncoder().encode(lines.join('\r\n'));
    A.downloadBlob(bytes, (only ? 'توزيع-' + list[0].nameAr : 'توزيع-أنصبة-مريجب') + '.csv', 'text/csv;charset=utf-8');
  }

  /* ══ الربط ═══════════════════════════════════════════════════════════ */
  function bindPageActions() {
    $$('.page-tools .btn').forEach(b => b.onclick = function () {
      const act = b.getAttribute('data-act'), s = b.getAttribute('data-s');
      if (act === 'edit') openEditor(s);
      if (act === 'xlsx-one') exportXlsx(s);
      if (act === 'csv-one') exportCsv(s);
    });
  }

  function boot() {
    loadState();
    render();
    $('#btn-print').onclick = () => window.print();
    $('#btn-xlsx').onclick  = () => exportXlsx(null);
    $('#btn-csv').onclick   = () => exportCsv(null);
    $('#btn-reset').onclick = () => {
      if (confirm('استعادة التوزيع الأصلي كما ورد في مستندات المدرسة؟ سيُلغى كل تعديل محفوظ.')) resetState();
    };
    $('#year').textContent = A.SCHOOL.year;
    $('#school').textContent = A.SCHOOL.nameAr;
  }

  A._internal = { analyze, formatSections, gradeNames, sectionLabels, periodsOf, applicableSections,
                  sheetFor, summarySheet, setDist: d => { DIST = d; }, getDist: () => DIST };
  A.boot = boot;
})(window.APP);
