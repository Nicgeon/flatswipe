// Detailansicht: ⋯-Menü mit den seltenen Aktionen, "Nachricht" in der Bewertungsleiste.
// Leerer Swipe-Stapel: Knöpfe führen direkt zum passenden Formular. Gruppen-Detail: Kopfzeile mit Zurück.
const B = process.env.TEST_BASE;
const SC = process.argv[2]; const { chromium, launchOptions } = require('../helpers/browser');
const { watchCsp, cspViolations } = require('../helpers/csp');
(async () => {
  const b = await chromium.launch(launchOptions);
  const errs = []; let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
  for (const [L, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 }); await watchCsp(ctx);
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(L + ': ' + e.message));
    const api = (method, p, body) => page.evaluate(([m, p, body]) => fetch(p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()), [method, p, body]);
    await page.goto(B);
    await api('POST', '/api/auth/login', { email: 'anna@x.de', password: 'secret123' });
    const ids = ((await api('GET', '/api/listings/swipe')).listings || []).map(l => l.id);
    await api('POST', '/api/listings/swipe', { listingId: ids[0], action: 'like' });

    // detail from "Bewertet"
    await page.goto(B + '/#/bewertet'); await page.reload(); await page.waitForTimeout(900);
    await page.locator('#view-rated [data-open-detail], #view-rated .rc-card').first().click(); await page.waitForTimeout(700);
    const shown = sel => page.isVisible(sel);
    ok(await shown('#detail-bar-msg') && !(await shown('#detail-msg-btn')), `${L}: "Nachricht" sits in the rating bar (not twice)`);
    ok(!(await shown('#detail-report-btn')) && !(await shown('#detail-original-link')), `${L}: rare actions are not in the content any more`);
    await page.click('#detail-more-btn'); await page.waitForTimeout(150);
    ok(await shown('#detail-report-btn') && await shown('#detail-original-link') && await page.getAttribute('#detail-more-btn', 'aria-expanded') === 'true', `${L}: ⋯ opens the menu`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    ok(!(await shown('#detail-report-btn')) && await shown('#detail-view'), `${L}: Escape closes only the menu, detail stays open`);
    await page.click('#detail-more-btn'); await page.waitForTimeout(100);
    await page.click('#detail-title'); await page.waitForTimeout(100);
    ok(!(await shown('#detail-report-btn')), `${L}: click elsewhere closes the menu`);
    await page.click('#detail-bar-msg'); await page.waitForTimeout(700);
    ok(await page.evaluate(() => document.getElementById('message-modal').style.display === 'flex'), `${L}: "Nachricht" opens the message window`);
    await page.goBack(); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.getElementById('message-modal').style.display !== 'flex') && await shown('#detail-view'), `${L}: back closes the message window, detail stays`);
    await page.goBack(); await page.waitForTimeout(400);

    // group detail: header with back button and the group name as title
    const g = (await api('POST', '/api/groups/create', { name: `WG ${L}` })).group;
    await page.goto(B + '/#/gruppen'); await page.reload(); await page.waitForTimeout(800);
    await page.locator('.group-card', { hasText: `WG ${L}` }).click(); await page.waitForTimeout(600);
    ok((await page.textContent('#group-detail-title')) === `WG ${L}` && await shown('#back-to-groups'), `${L}: group detail has a header with back + name`);
    await page.click('#back-to-groups'); await page.waitForTimeout(400);
    ok(await shown('#groups-list') && !(await shown('#group-detail')), `${L}: back → group list`);
    await api('DELETE', `/api/groups/${g.id}/leave`).catch(() => {});

    // empty swipe stack: buttons lead to the forms
    for (const id of ids.slice(1)) await api('POST', '/api/listings/swipe', { listingId: id, action: 'dislike' });
    await page.goto(B + '/'); await page.reload(); await page.waitForTimeout(900);
    ok(await shown('#empty-swipe .empty-actions'), `${L}: empty stack offers actions`);
    await page.click('#empty-swipe [data-open-sheet="job-sheet"]'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.getElementById('view-jobs').classList.contains('active') && document.getElementById('job-sheet').style.display === 'flex'), `${L}: "Suchagent einrichten" → Suche with the sheet open`);
    await page.goBack(); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.getElementById('job-sheet').style.display !== 'flex' && document.getElementById('view-jobs').classList.contains('active')), `${L}: back closes the sheet first`);
    await page.goBack(); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.getElementById('view-swipe').classList.contains('active')), `${L}: second back → swipe page`);
    await page.screenshot({ path: `${SC}/detail-actions-${L}.png` });
    // undo for the next size
    for (const id of ids) await api('DELETE', `/api/listings/swipe/${id}`);
    { const v = await cspViolations(page); ok(!v.length, 'no CSP violations ' + JSON.stringify(v)); }
    await ctx.close();
  }
  await b.close();
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  console.log(fails ? `${fails} FAILS` : 'all ok');
})().catch(e => { console.error('ERR', e); process.exit(1); });
