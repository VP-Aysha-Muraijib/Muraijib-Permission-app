const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PORT = 9333;

const FOOTER = (label) => `
<div style="width:100%;font-family:sans-serif;font-size:7px;color:#6b6b6b;
 padding:0 9mm;display:flex;justify-content:space-between;direction:rtl;">
 <span>${label}</span>
 <span>صفحة <span class="pageNumber"></span> من <span class="totalPages"></span></span>
</div>`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--disable-dev-shm-usage', '--font-render-hinting=none',
    `--remote-debugging-port=${PORT}`, 'about:blank',
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      version = await r.json();
      break;
    } catch (e) { await sleep(300); }
  }
  if (!version) throw new Error('chrome did not start');

  const jobs = [
    ['detailed.html', 'muraijib-checklist-detailed.pdf', 'قائمة تحقق الرقابة المدرسية — النسخة التفصيلية'],
    ['summary.html', 'muraijib-checklist-summary.pdf', 'قائمة تحقق الرقابة المدرسية — النسخة المختصرة'],
  ];

  for (const [src, out, label] of jobs) {
    const target = await (await fetch(
      `http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const pending = new Map();
    const events = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method) { (events.get(m.method) || []).forEach(f => f(m)); events.set(m.method, []); }
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const myId = ++id;
      pending.set(myId, (m) => m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result));
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
    const once = (method) => new Promise(res => {
      events.set(method, [...(events.get(method) || []), res]);
    });

    await send('Page.enable');
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: 'file://' + path.resolve(__dirname, src) });
    await loaded;
    await sleep(1200);

    const { data } = await send('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: FOOTER(label),
    });
    fs.writeFileSync(path.resolve(__dirname, out), Buffer.from(data, 'base64'));
    console.log('wrote', out);
    ws.close();
  }
  chrome.kill();
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
