// Suche-Tab: Liste zuerst, Formulare im Bottom Sheet ("Neuer Suchagent", "Inserat per Link").
// Zurück-Geste, Escape und Tipp auf den Hintergrund schließen das Sheet; "Erweitert" zeigt die Wahl.
const B = process.env.TEST_BASE;
const SC = process.argv[2]; const { chromium, launchOptions } = require('../helpers/browser');
(async () => {
  const b = await chromium.launch(launchOptions);
  const errs = []; let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
  for (const [L, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
    const desk = w >= 900;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !desk });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(L + ': ' + e.message));
    await page.goto(B);
    await page.evaluate(() => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'anna@x.de', password: 'secret123' }) }));
    await page.goto(B + '/#/suche'); await page.reload(); await page.waitForSelector('#jobs-list .job-card, #jobs-list > *', { timeout: 8000 }); await page.waitForTimeout(300);
    const shown = sel => page.isVisible(sel);
    const sheetOpen = id => page.evaluate(id => document.getElementById(id).style.display === 'flex', id);

    // list first, no form on the page
    ok(!(await shown('#job-label')) && await shown('#jobs-list'), `${L}: Suchagenten page shows the list, no form`);
    const listTop = await page.evaluate(() => document.getElementById('jobs-list').getBoundingClientRect().top);
    ok(listTop < h * 0.45, `${L}: list starts in the upper part of the screen (${Math.round(listTop)} px)`);

    // open sheet, back gesture closes it and stays on the page
    await page.click('#view-jobs .page-head [data-open-sheet]'); await page.waitForTimeout(200);
    ok(await sheetOpen('job-sheet') && await shown('#job-label'), `${L}: "Neu" opens the sheet`);
    ok(/alle 60 Min\..*alle Nutzer/.test(await page.textContent('#job-adv-state')), `${L}: "Erweitert" shows interval and visibility`);
    await page.goBack(); await page.waitForTimeout(400);
    ok(!(await sheetOpen('job-sheet')) && await page.evaluate(() => document.getElementById('view-jobs').classList.contains('active')), `${L}: back closes the sheet, page stays`);

    // Escape and backdrop
    await page.click('#view-jobs .page-head [data-open-sheet]'); await page.waitForTimeout(150);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    ok(!(await sheetOpen('job-sheet')), `${L}: Escape closes the sheet`);
    await page.click('#view-jobs .page-head [data-open-sheet]'); await page.waitForTimeout(150);
    await page.mouse.click(5, 5); await page.waitForTimeout(150);
    ok(!(await sheetOpen('job-sheet')), `${L}: tap on the backdrop closes the sheet`);

    // validation keeps the sheet open, a valid agent closes it and appears in the list
    await page.click('#view-jobs .page-head [data-open-sheet]'); await page.waitForTimeout(150);
    await page.click('#job-add-btn'); await page.waitForTimeout(150);
    ok(await sheetOpen('job-sheet') && /Bezeichnung/.test(await page.textContent('#job-error')), `${L}: missing label → error in the sheet`);
    const before = await page.locator('#jobs-list > *').count();
    await page.fill('#job-label', `Test ${L}`);
    await page.fill('#job-url', `https://www.kleinanzeigen.de/s-wohnung-mieten/bremen-${L}/c203l1`);
    await page.click('.sheet-more:has(#job-visibility) summary');
    await page.selectOption('#job-visibility', 'private');
    ok(/nur ich/.test(await page.textContent('#job-adv-state')), `${L}: "Erweitert" follows the visibility choice`);
    await page.click('#job-add-btn'); await page.waitForTimeout(800);
    ok(!(await sheetOpen('job-sheet')), `${L}: saving closes the sheet`);
    ok(await page.locator('#jobs-list > *').count() === before + 1, `${L}: new agent in the list`);
    ok(await page.$eval('#job-error', e => e.textContent) === '', `${L}: error cleared`);

    // "Hinzufügen": empty state with a button that opens the link sheet
    await page.goto(B + '/#/suche/hinzufuegen'); await page.reload(); await page.waitForTimeout(800);
    ok(!(await shown('#listing-url')) && await shown('#my-added-empty .empty-action'), `${L}: Hinzufügen shows the list/empty state with a button`);
    await page.click('#my-added-empty .empty-action'); await page.waitForTimeout(150);
    ok(await sheetOpen('add-sheet') && await shown('#listing-url'), `${L}: empty-state button opens the link sheet`);
    await page.fill('#listing-url', 'kein link'); await page.click('#add-listing-btn'); await page.waitForTimeout(150);
    ok(await sheetOpen('add-sheet') && /gültige URL/.test(await page.textContent('#add-error')), `${L}: invalid link → error in the sheet`);
    await page.click('#add-sheet [data-close-sheet]'); await page.waitForTimeout(150);
    ok(!(await sheetOpen('add-sheet')), `${L}: × closes the sheet`);
    await page.click('#view-add .page-head [data-open-sheet]'); await page.waitForTimeout(150);
    ok(await page.textContent('#add-error') === '', `${L}: reopening starts without the old error`);
    await page.screenshot({ path: `${SC}/search-sheet-${L}.png` });
    await ctx.close();
  }
  await b.close();
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  console.log(fails ? `${fails} FAILS` : 'all ok');
})().catch(e => { console.error('ERR', e); process.exit(1); });
