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

  function periodsOf(subject, sectionId) {
    const sec = sectionById[sectionId];
    if (!sec) return 0;
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
    const rows = (d.rows || []).map(r => {
      const secs = (r.sections || []).filter(id => sectionById[id]);
      const load = secs.reduce((s, id) => s + periodsOf(subject, id), 0);
      return { teacher: r.teacher, note: r.note || '', isNew: !!r.isNew, sections: secs, load: load };
    });

    const totalRequired = A.SECTIONS.reduce((s, sec) => s + periodsOf(subject, sec.id), 0);
    const assigned = rows.reduce((s, r) => s + r.load, 0);
    const withLoad = rows.filter(r => r.load > 0);
    const avg = withLoad.length ? assigned / withLoad.length : 0;
    const loads = withLoad.map(r => r.load);
    const max = loads.length ? Math.max.apply(null, loads) : 0;
    const min = loads.length ? Math.min.apply(null, loads) : 0;

    rows.forEach(r => {
      r.fairness = (avg > 0 && r.load > 0)
        ? Math.max(0, 1 - Math.abs(r.load - avg) / avg) * 100
        : null;
    });

    const deptFairness = (avg > 0 && loads.length > 1)
      ? Math.max(0, 1 - (max - min) / avg) * 100
      : (loads.length === 1 ? 100 : null);

    /* الشعب غير المسندة + المكرّرة */
    const seen = {}, dup = [];
    rows.forEach(r => r.sections.forEach(id => {
      if (seen[id]) dup.push(id); else seen[id] = r.teacher;
    }));
    const uncovered = A.SECTIONS.filter(s => !seen[s.id]).map(s => s.id);

    return {
      subject, rows, totalRequired, assigned,
      avg, max, min, deptFairness, uncovered, duplicates: dup,
      coordinator: d.coordinator || '', note: d.note || '',
      sectionsCount: A.SECTIONS.length
    };
  }

  const pct = v => v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1) + '%';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function fairClass(v) {
    if (v == null) return '';
    if (v >= 95) return 'f-ok';
    if (v >= 85) return 'f-mid';
    return 'f-low';
  }

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
          '<td class="c-name">' + esc(r.teacher) +
            (r.isNew ? '<span class="tag-new">جديدة</span>' : '') +
            (r.note ? '<span class="row-note">' + esc(r.note) + '</span>' : '') + '</td>' +
          '<td class="c-grade">' + esc(gradeNames(r.sections) || '—') + '</td>' +
          '<td class="c-sec">' + (formatSections(r.sections).map(esc).join('<br>') || '—') + '</td>' +
          '<td class="c-load">' + r.load + '</td>' +
          '<td class="c-fair ' + fairClass(r.fairness) + '">' + pct(r.fairness) + '</td>' +
          '<td class="c-sign"></td>' +
          '</tr>').join('')
      : '<tr class="empty-row"><td colspan="7">لم تُزوَّد بيانات هذا القسم بعد — ' +
        'اضغطي «تعديل» لإضافة المعلمات وتوزيع الشعب.</td></tr>';

    const totals = a.rows.length
      ? '<tr class="tr-total">' +
        '<td colspan="4">المجموع — ' + a.rows.filter(r => r.load > 0).length + ' معلمة</td>' +
        '<td class="c-load">' + a.assigned + '</td>' +
        '<td class="c-fair ' + fairClass(a.deptFairness) + '">' + pct(a.deptFairness) + '</td>' +
        '<td></td></tr>'
      : '';

    const warn = [];
    if (a.uncovered.length)
      warn.push('<div class="warn"><b>شعب غير مسندة (' + a.uncovered.length + '):</b> ' +
        esc(sectionLabels(a.uncovered)) + ' — بعجز قدره ' +
        a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0) + ' حصة.</div>');
    if (a.duplicates.length)
      warn.push('<div class="warn"><b>شعب مكرّرة:</b> ' + esc(sectionLabels(a.duplicates)) + '</div>');
    if (a.note) warn.push('<div class="note-box">' + esc(a.note) + '</div>');

    return '' +
'<section class="page" id="p-' + subject.id + '" data-subject="' + subject.id + '">' +
  '<div class="page-tools no-print">' +
    '<button class="btn sm" data-act="edit" data-s="' + subject.id + '">تعديل</button>' +
    '<button class="btn sm" data-act="xlsx-one" data-s="' + subject.id + '">Excel لهذه المادة</button>' +
    '<button class="btn sm" data-act="csv-one" data-s="' + subject.id + '">CSV</button>' +
  '</div>' +
  '<header class="sheet-head">' +
    '<div class="sh-side">' +
      '<div class="sh-school">' + esc(A.SCHOOL.nameAr) + '</div>' +
      '<div class="sh-school en">' + esc(A.SCHOOL.nameEn) + '</div>' +
    '</div>' +
    '<div class="sh-crest">وزارة التربية والتعليم<br><span>United Arab Emirates</span></div>' +
  '</header>' +
  '<h2 class="sheet-title">توزيع المراحل الدراسية على معلمات ' + esc(subject.nameAr) +
    '<br><span>للعام الدراسي ' + esc(A.SCHOOL.year) + '</span></h2>' +
  '<div class="meta-strip">' +
    '<span><b>حصص الشعبة:</b> ' + perGen + (perAdv !== perGen ? ' (المتقدّم ' + perAdv + ')' : '') + '</span>' +
    '<span><b>عدد الشعب:</b> ' + a.sectionsCount + '</span>' +
    '<span><b>إجمالي الحصص المطلوبة:</b> ' + a.totalRequired + '</span>' +
    '<span><b>الموزّع:</b> ' + a.assigned + '</span>' +
    '<span><b>متوسط النصاب:</b> ' + (a.avg ? (Math.round(a.avg * 10) / 10) : '—') + '</span>' +
    '<span><b>عدالة القسم:</b> ' + pct(a.deptFairness) + '</span>' +
  '</div>' +
  '<table class="grid">' +
    '<thead><tr>' +
      '<th class="c-num">م</th><th class="c-name">اسم المعلمة</th><th class="c-grade">المرحلة</th>' +
      '<th class="c-sec">الشعب</th><th class="c-load">النصاب</th>' +
      '<th class="c-fair">نسبة العدالة</th><th class="c-sign">التوقيع</th>' +
    '</tr></thead>' +
    '<tbody>' + body + totals + '</tbody>' +
  '</table>' +
  warn.join('') +
  '<footer class="sheet-foot">' +
    '<div>منسّقة القسم: ' + esc(a.coordinator || '..............................') + '</div>' +
    '<div>مديرة المدرسة: ' + esc(A.SCHOOL.principal) + '</div>' +
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
        const grid = A.SECTIONS.map(sec => {
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
    rows.push([{ v: 'توزيع المراحل الدراسية على معلمات ' + subject.nameAr + ' — ' + A.SCHOOL.year, style: 'title' }, '', '', '', '', '', '']);
    rows.push([{ v: A.SCHOOL.nameAr + ' · ' + A.SCHOOL.nameEn, style: 'title' }, '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push([H('م'), H('اسم المعلمة'), H('المرحلة'), H('الشعب'), H('النصاب'), H('نسبة العدالة'), H('التوقيع')]);
    a.rows.forEach((r, i) => rows.push([
      i + 1, r.teacher + (r.isNew ? ' (معلمة جديدة)' : ''), gradeNames(r.sections), formatSections(r.sections).join(' · '),
      { v: r.load, style: 'num' },
      { v: r.fairness == null ? '—' : Math.round(r.fairness * 10) / 10 + '%', style: 'num' },
      ''
    ]));
    rows.push([
      { v: 'المجموع', style: 'total' }, { v: '', style: 'total' }, { v: '', style: 'total' },
      { v: '', style: 'total' }, { v: a.assigned, style: 'total' },
      { v: a.deptFairness == null ? '—' : Math.round(a.deptFairness * 10) / 10 + '%', style: 'total' },
      { v: '', style: 'total' }
    ]);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['حصص الشعبة', subject.periods.general +
      (subject.periods.advanced !== subject.periods.general ? ' (متقدّم ' + subject.periods.advanced + ')' : ''),
      'إجمالي الحصص المطلوبة', a.totalRequired, 'الموزّع', a.assigned, '']);
    rows.push(['متوسط النصاب', Math.round(a.avg * 10) / 10, 'أعلى نصاب', a.max, 'أقل نصاب', a.min, '']);
    if (a.uncovered.length)
      rows.push([{ v: 'شعب غير مسندة', style: 'warn' },
        { v: sectionLabels(a.uncovered), style: 'warn' },
        { v: 'العجز بالحصص', style: 'warn' },
        { v: a.uncovered.reduce((s, id) => s + periodsOf(subject, id), 0), style: 'warn' },
        { v: '', style: 'warn' }, { v: '', style: 'warn' }, { v: '', style: 'warn' }]);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['منسّقة القسم', a.coordinator || '', '', 'مديرة المدرسة', A.SCHOOL.principal, '', '']);

    return {
      name: subject.nameAr, rtl: true, landscape: true,
      cols: [5, 26, 22, 44, 10, 14, 16],
      merges: ['A1:G1', 'A2:G2'],
      rows: rows
    };
  }

  function summarySheet() {
    const H = v => ({ v: v, style: 'head' });
    const rows = [];
    rows.push([{ v: 'ملخّص توزيع الأنصبة — ' + A.SCHOOL.nameAr + ' · ' + A.SCHOOL.year, style: 'title' }, '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push([H('المادة'), H('حصص الشعبة'), H('المطلوب'), H('الموزّع'), H('غير موزّع'), H('عدد المعلمات'), H('عدالة القسم')]);
    let tReq = 0, tAsg = 0, tT = 0;
    A.SUBJECTS.forEach(s => {
      const a = analyze(s);
      tReq += a.totalRequired; tAsg += a.assigned; tT += a.rows.filter(r => r.load > 0).length;
      const gap = a.totalRequired - a.assigned;
      rows.push([s.nameAr, s.periods.general, { v: a.totalRequired, style: 'num' },
        { v: a.assigned, style: 'num' },
        gap ? { v: gap, style: 'warn' } : { v: 0, style: 'num' },
        { v: a.rows.filter(r => r.load > 0).length, style: 'num' },
        { v: a.deptFairness == null ? '—' : Math.round(a.deptFairness * 10) / 10 + '%', style: 'num' }]);
    });
    rows.push([{ v: 'الإجمالي', style: 'total' }, { v: '', style: 'total' },
      { v: tReq, style: 'total' }, { v: tAsg, style: 'total' },
      { v: tReq - tAsg, style: 'total' }, { v: tT, style: 'total' }, { v: '', style: 'total' }]);
    return { name: 'الملخّص', rtl: true, cols: [30, 12, 12, 12, 12, 14, 14], merges: ['A1:G1'], rows: rows };
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
    const lines = ['﻿' + ['المادة', 'م', 'اسم المعلمة', 'المرحلة', 'الشعب', 'النصاب', 'نسبة العدالة'].map(q).join(',')];
    list.forEach(s => {
      const a = analyze(s);
      a.rows.forEach((r, i) => lines.push([s.nameAr, i + 1, r.teacher + (r.isNew ? ' (معلمة جديدة)' : ''), gradeNames(r.sections),
        formatSections(r.sections).join(' · '), r.load,
        r.fairness == null ? '' : Math.round(r.fairness * 10) / 10 + '%'].map(q).join(',')));
      lines.push([s.nameAr, '', 'المجموع', '', '', a.assigned,
        a.deptFairness == null ? '' : Math.round(a.deptFairness * 10) / 10 + '%'].map(q).join(','));
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

  A._internal = { analyze, formatSections, gradeNames, sectionLabels, periodsOf,
                  sheetFor, summarySheet, setDist: d => { DIST = d; }, getDist: () => DIST };
  A.boot = boot;
})(window.APP);
