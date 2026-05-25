// ═══════════════════════════════════════════════════════════════
// Google Apps Script — منظومة الاستئذان الذكية — مدرسة مريجب
// النسخة 2 — تشمل جميع حقول الاستبانة المحدّثة
// خطوات النشر:
//   1. افتحي script.google.com واربطيه بـ Google Sheet
//   2. انسخي هذا الكود في Code.gs
//   3. Deploy → New deployment → Web app
//      Execute as: Me | Who has access: Anyone
//   4. انسخي رابط Web App وضعيه في SHEETS_URL في الملفين
// ═══════════════════════════════════════════════════════════════

// أعمدة الجدول
const HEADERS = [
  'التاريخ والوقت',
  'الاسم',
  'المسمى الوظيفي',
  'القسم',
  'التصنيف',          // شخصي / رسمي
  'نوع الاستئذان',
  'تاريخ الاستئذان',
  'وقت الخروج',
  'وقت العودة',
  'المدة',
  'السبب',
  'رقم الطلب',
  'الحالة',           // يُحدَّث لاحقاً من الإدارة
];

// ── استقبال البيانات من التطبيق (POST) ─────────────────────────
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // إنشاء ترويسة تلقائياً في أول صف إن لم تكن موجودة
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const h = sheet.getRange(1, 1, 1, HEADERS.length);
      h.setFontWeight('bold')
       .setBackground('#8B6B6B')
       .setFontColor('#FFFFFF')
       .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
      sheet.setRightToLeft(true);
    }

    // استخرج البيانات الواردة
    let d;
    if (e.postData && e.postData.contents) {
      d = JSON.parse(e.postData.contents);
    } else {
      d = e.parameter;
    }

    // أضف الصف الجديد
    sheet.appendRow([
      new Date(),
      d.name     || '—',
      d.job      || '—',
      d.dept     || '—',
      d.cat      || '—',
      d.type     || '—',
      d.date     || '—',
      d.exitTime || '—',
      d.retTime  || '—',
      d.hours    || '—',
      d.reason   || '—',
      d.reqId    || '—',
      'قيد المراجعة',  // الحالة الافتراضية
    ]);

    // تنسيق الصف الجديد
    const lastRow = sheet.getLastRow();
    const rowRange = sheet.getRange(lastRow, 1, 1, HEADERS.length);
    if (lastRow % 2 === 0) {
      rowRange.setBackground('#FBF8F4');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── إرسال البيانات للوحة الإدارة (GET) ─────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  // CORS headers
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (action === 'getData') {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const data  = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        output.setContent(JSON.stringify({ rows: [] }));
        return output;
      }

      const rows = data.slice(1).map(row => ({
        timestamp: row[0]  ? Utilities.formatDate(new Date(row[0]), 'Asia/Dubai', 'yyyy-MM-dd HH:mm') : '—',
        name:      row[1]  || '—',
        job:       row[2]  || '—',
        dept:      row[3]  || '—',
        cat:       row[4]  || '—',
        type:      row[5]  || '—',
        date:      row[6]  || '—',
        exitTime:  row[7]  || '—',
        retTime:   row[8]  || '—',
        hours:     row[9]  || '—',
        reason:    row[10] || '—',
        reqId:     row[11] || '—',
        status:    row[12] || 'قيد المراجعة',
      }));

      output.setContent(JSON.stringify({ success: true, rows, total: rows.length }));
    } catch (err) {
      output.setContent(JSON.stringify({ success: false, error: err.toString() }));
    }
  } else {
    output.setContent(JSON.stringify({ message: 'منظومة الاستئذان الذكية — مدرسة مريجب — API v2' }));
  }

  return output;
}
