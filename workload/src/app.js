/* ============================================================================
   app.js — بناء جداول التوزيع لكل مادة + التصدير (Excel / PDF / CSV)
   ========================================================================== */
window.APP = window.APP || {};
(function (A) {
  'use strict';

  const STORE_KEY = 'muraijib_workload_v1';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

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

  /* الشعب التي تُدرَّس فيها المادة (بعض المواد لا تُدرَّس في كل الصفوف) */
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

  /* الصفوف والشعب بصيغة مقروءة: "الخامس: 1، 2، 3" */
  function formatSections(ids) {
    const byGrade = {};
    ids.slice().sort(cmpSection).forEach(id => {
      const sec = sectionById[id]; if (!sec) return;
      (byGrade[sec.grade] = byGrade[sec.grade] || []).push(sec.label === 'ADV' ? 'متقدّم' : sec.label);
    });
    return Object.keys(byGrade).map(Number).sort((a, b) => a - b)
      .map(g => A.GRADE_NAME[g] + ': ' + byGrade[g].join('، '));
  }
  function gradeNames(ids) {
    const gs = {};
    ids.forEach(id => { const s = sectionById[id]; if (s) gs[s.grade] = 1; });
    return Object.keys(gs).map(Number).sort((a, b) => a - b).map(g => A.GRADE_NAME[g]).join(' + ');
  }
  function sectionLabels(ids) {
    return ids.slice().sort(cmpSection).map(id => {
      const s = sectionById[id]; if (!s) return id;
      return s.grade + '/' + (s.label === 'ADV' ? 'متقدّم' : s.label);
    }).join('، ');
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
    const rotating = !!subject.rotating;

    const rows = (d.rows || []).map(r => ({
      teacher: r.teacher, note: r.note || '', role: r.role || '',
      isNew: !!r.isNew, vacancy: !!r.vacancy,
      sections: (r.sections || []).filter(id => sectionById[id])
    }));

    /* في المواد التبادلية تُتقاسَم حصص الشعبة بين معلمات التخصّصات */
    const share = {};
    rows.forEach(r => r.sections.forEach(id => { share[id] = (share[id] || 0) + 1; }));
    rows.forEach(r => {
      r.load = r.sections.reduce((s, id) =>
        s + periodsOf(subject, id) / (rotating ? (share[id] || 1) : 1), 0);
    });

    /* تقريب حصص التناوب إلى أعداد صحيحة يبقى مجموعها مطابقاً للمطلوب */
    if (rotating) {
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
    const vacancyPeriods = rows.filter(r => r.vacancy)
      .reduce((s, r) => s + r.load, 0);

    return {
      subject, rows, totalRequired, assigned, rotating,
      avg, max, min, uncovered, duplicates: dup, vacancyPeriods,
      coordinator: d.coordinator || '', note: d.note || '',
      sectionsCount: applicable.length,
      gradesLabel: subject.grades
        ? subject.grades.map(g => A.GRADE_NAME[g]).join(' · ')
        : 'الصفوف 5 - 8'
    };
  }

  const pct = v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1) + '%';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ══ العرض ═══════════════════════════════════════════════════════════ */
  function render() {
    const host = $('#pages');
    host.innerHTML = A.SUBJECTS.map(renderPage).join('');
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
    const a = analyze(subject);
    const perGen = subject.periods.general, perAdv = subject.periods.advanced;

    const body = a.rows.length
      ? a.rows.map((r, i) =>
          '<tr>' +
          '<td class="c-num">' + (i + 1) + '</td>' +
          '<td class="c-name' + (r.vacancy ? ' is-vac' : '') + '">' + esc(r.teacher) +
            (r.isNew ? '<span class="tag-new">جديدة</span>' : '') +
            (r.role ? '<span class="row-role">' + esc(r.role) + '</span>' : '') +
            (r.note ? '<span class="row-note">' + esc(r.note) + '</span>' : '') + '</td>' +
          '<td class="c-grade">' + esc(gradeNames(r.sections) || '—') + '</td>' +
          '<td class="c-sec">' + (formatSections(r.sections).map(esc).join('<br>') || '—') + '</td>' +
          '<td class="c-load' + (r.vacancy ? ' is-vac' : '') + '">' + r.load + '</td>' +
          '<td class="c-sign"></td>' +
          '</tr>').join('')
      : '<tr class="empty-row"><td colspan="6">لم تُزوَّد بيانات هذا القسم بعد — ' +
        'اضغطي «تعديل» لإضافة المعلمات وتوزيع الشعب.</td></tr>';

    const totals = a.rows.length
      ? '<tr class="tr-total">' +
        '<td colspan="4">المجموع — ' + a.rows.filter(r => r.load > 0 && !r.vacancy).length + ' معلمة' +
          (a.vacancyPeriods ? ' &nbsp;·&nbsp; شاغر (*): ' + a.vacancyPeriods + ' حصة' : '') + '</td>' +
        '<td class="c-load">' + a.assigned + '</td>' +
        '<td></td></tr>'
      : '';

    const warn = [];
    if (a.uncovered.length)
      warn.push('<div class="warn"><b>شعب غير مسندة (' + a.uncovered.length + '):</b> ' +
        esc(sectionLabels(a.uncovered)) + ' — بعجز قدره ' +
        a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0) + ' حصة.</div>');
    if (a.duplicates.length)
      warn.push('<div class="warn"><b>شعب مكرّرة:</b> ' + esc(sectionLabels(a.duplicates)) + '</div>');
    const std = A.SCHOOL.standardLoad || 24;
    const over = a.rows.filter(r => !r.vacancy && r.load > (A.SCHOOL.overloadThreshold || 30));
    if (over.length)
      warn.push('<div class="warn"><b>نصاب مرتفع جداً:</b> ' +
        over.map(r => esc(r.teacher) + ' — ' + r.load + ' حصة').join(' · ') +
        ' &nbsp;(المعيار ' + std + ' حصة). القسم يحتاج تقريباً ' +
        (Math.ceil(a.assigned / std)) + ' معلمة لتغطية ' + a.assigned + ' حصة.</div>');
    const under = a.rows.filter(r => !r.vacancy && r.load > 0 && r.load < std / 2);
    if (under.length)
      warn.push('<div class="note-box"><b>نصاب منخفض:</b> ' +
        under.map(r => esc(r.teacher) + ' — ' + r.load + ' حصة').join(' · ') +
        ' &nbsp;(المعيار ' + std + ' حصة) — يُستكمل بشعب إضافية أو بمهام مدرسية أخرى.</div>');
    if (a.note) warn.push('<div class="note-box">' + esc(a.note) + '</div>');

    return '' +
'<section class="page" id="p-' + subject.id + '" data-subject="' + subject.id + '">' +
  '<div class="page-tools no-print">' +
    '<button class="btn sm" data-act="edit" data-s="' + subject.id + '">تعديل</button>' +
    '<button class="btn sm" data-act="xlsx-one" data-s="' + subject.id + '">Excel لهذه المادة</button>' +
    '<button class="btn sm" data-act="csv-one" data-s="' + subject.id + '">CSV</button>' +
  '</div>' +
  '<header class="sheet-head">' +
    '<div class="letterhead-img" role="img" aria-label="وزارة التربية والتعليم — ' +
      esc(A.SCHOOL.nameAr) + '"></div>' +
    '<div class="rule-double"></div>' +
  '</header>' +
  '<div class="doc-title">' +
    '<h2>توزيع المراحل الدراسية على معلمات ' + esc(subject.nameAr) + '</h2>' +
    '<div class="doc-year">للعام الدراسيّ ' + esc(A.SCHOOL.year) + '</div>' +
    '<div class="doc-rule"></div>' +
  '</div>' +
  '<div class="meta-strip">' +
    '<span><b>حصص الشعبة:</b> ' + perGen + (perAdv !== perGen ? ' (المتقدّم ' + perAdv + ')' : '') + '</span>' +
    '<span><b>الصفوف:</b> ' + esc(a.gradesLabel) + '</span>' +
    '<span><b>عدد الشعب:</b> ' + a.sectionsCount + '</span>' +
    '<span><b>إجمالي الحصص المطلوبة:</b> ' + a.totalRequired + '</span>' +
    '<span><b>الموزّع:</b> ' + a.assigned + '</span>' +
    '<span><b>متوسط النصاب:</b> ' + (a.avg ? (Math.round(a.avg * 10) / 10) : '—') + '</span>' +
    (a.rotating ? '<span><b>التوزيع:</b> تبادلي أسبوعي</span>' : '') +
  '</div>' +
  '<table class="grid">' +
    '<thead><tr>' +
      '<th class="c-num">م</th><th class="c-name">اسم المعلمة</th><th class="c-grade">المرحلة</th>' +
      '<th class="c-sec">الشعب</th><th class="c-load">النصاب</th>' +
      '<th class="c-sign">التوقيع</th>' +
    '</tr></thead>' +
    '<tbody>' + body + totals + '</tbody>' +
  '</table>' +
  warn.join('') +
  '<footer class="sheet-foot">' +
    '<div class="sign"><span class="sign-role">منسّقة القسم</span>' +
      '<span class="sign-name">' + esc(a.coordinator || '') + '</span>' +
      '<span class="sign-line"></span></div>' +
    '<div class="sign"><span class="sign-role">نائب مدير أكاديمي</span>' +
      '<span class="sign-name">' + esc(A.SCHOOL.deputy || '') + '</span>' +
      '<span class="sign-line"></span></div>' +
    '<div class="sign"><span class="sign-role">مديرة المدرسة</span>' +
      '<span class="sign-name">' + esc(A.SCHOOL.principal) + '</span>' +
      '<span class="sign-line"></span></div>' +
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
          const busy = !on && t[sec.id];
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
      if (el.type === 'checkbox') {
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
    const a = analyze(subject);
    const H = v => ({ v: v, style: 'head' });
    const rows = [];
    rows.push([{ v: 'توزيع المراحل الدراسية على معلمات ' + subject.nameAr + ' — ' + A.SCHOOL.year, style: 'title' }, '', '', '', '', '']);
    rows.push([{ v: A.SCHOOL.nameAr + ' · ' + A.SCHOOL.nameEn, style: 'title' }, '', '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push([H('م'), H('اسم المعلمة'), H('المرحلة'), H('الشعب'), H('النصاب'), H('التوقيع')]);
    a.rows.forEach((r, i) => rows.push([
      i + 1, r.teacher + (r.role ? ' — ' + r.role : '') + (r.isNew ? ' (معلمة جديدة)' : '') + (r.vacancy ? ' — شاغر: الحاجة إلى معلمة إضافية' : ''),
      gradeNames(r.sections), formatSections(r.sections).join(' · '),
      { v: r.load, style: 'num' },
      ''
    ]));
    rows.push([
      { v: 'المجموع', style: 'total' }, { v: '', style: 'total' }, { v: '', style: 'total' },
      { v: '', style: 'total' }, { v: a.assigned, style: 'total' }, { v: '', style: 'total' }
    ]);
    rows.push(['', '', '', '', '', '']);
    rows.push(['حصص الشعبة', subject.periods.general +
      (subject.periods.advanced !== subject.periods.general ? ' (متقدّم ' + subject.periods.advanced + ')' : ''),
      'إجمالي الحصص المطلوبة', a.totalRequired, 'الموزّع', a.assigned]);
    rows.push(['متوسط النصاب', Math.round(a.avg * 10) / 10, 'أعلى نصاب', a.max, 'أقل نصاب', a.min]);
    if (a.uncovered.length)
      rows.push([{ v: 'شعب غير مسندة', style: 'warn' },
        { v: sectionLabels(a.uncovered), style: 'warn' },
        { v: 'العجز بالحصص', style: 'warn' },
        { v: a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0), style: 'warn' },
        { v: '', style: 'warn' }, { v: '', style: 'warn' }]);
    rows.push(['', '', '', '', '', '']);
    rows.push(['منسّقة القسم', a.coordinator || '', 'نائب مدير أكاديمي', A.SCHOOL.deputy || '', 'مديرة المدرسة', A.SCHOOL.principal]);

    return {
      name: subject.nameAr, rtl: true, landscape: true,
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
      tReq += a.totalRequired; tAsg += a.assigned; tT += a.rows.filter(r => r.load > 0).length;
      const gap = a.totalRequired - a.assigned;
      rows.push([s.nameAr, s.periods.general, { v: a.totalRequired, style: 'num' },
        { v: a.assigned, style: 'num' },
        gap ? { v: gap, style: 'warn' } : { v: 0, style: 'num' },
        { v: a.rows.filter(r => r.load > 0).length, style: 'num' }]);
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
      const a = analyze(s);
      a.rows.forEach((r, i) => lines.push([s.nameAr, i + 1, r.teacher + (r.role ? ' — ' + r.role : '') + (r.isNew ? ' (معلمة جديدة)' : '') + (r.vacancy ? ' — شاغر' : ''), gradeNames(r.sections),
        formatSections(r.sections).join(' · '), r.load].map(q).join(',')));
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
