const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://'+process.argv[2],{waitUntil:'load'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
  await p.pdf({path:process.argv[3], format:'A4', landscape:true, printBackground:true, preferCSSPageSize:true,
               margin:{top:'0',bottom:'0',left:'0',right:'0'}});
  await b.close(); console.log('done');
})();
