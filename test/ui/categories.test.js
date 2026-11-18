// Darstellung nach Kategorie: ein Auto zeigt Preis, km und Erstzulassung statt "kalt", m² und Zimmer;
// eine Wohnung sieht aus wie bisher.
const B = process.env.TEST_BASE;
const SC = process.argv[2]; const { chromium, launchOptions } = require('../helpers/browser');
const { watchCsp, cspViolations } = require('../helpers/csp');
(async () => {
  const b = await chromium.launch(launchOptions);
  const errs = []; let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
  let first = true;
  for (const [L, w, h] of [['m', 390, 844], ['d', 1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 }); await watchCsp(ctx);
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(L + ': ' + e.message));
    const api = (method, p, body) => page.evaluate(([m, p, body]) => fetch(p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json()), [method, p, body]);
    await page.goto(B);
    if (first) {
      await api('POST', '/api/auth/register', { username: 'Dana', email: 'dana@x.de', password: 'secret123' });
      for (const [label, url] of [['Autos', 'https://www.kleinanzeigen.de/s-autos/bremen/c216l1r20'], ['Wohnungen', 'https://www.kleinanzeigen.de/s-wohnung-mieten/bremen/c203l1']]) {
        const { job } = await api('POST', '/api/jobs', { label, search_url: url, visibility: 'global' });
        await api('POST', `/api/jobs/${job.id}/run`);
      }
      await page.waitForTimeout(800); first = false;
    } else await api('POST', '/api/auth/login', { email: 'dana@x.de', password: 'secret123' });
    await page.reload(); await page.waitForSelector('.swipe-card', { timeout: 8000 }); await page.waitForTimeout(500);

    const card = page.locator('.swipe-card', { hasText: 'VW Golf 7 1.4 TSI' });
    const carText = await card.innerText();
    ok(/12\.500 € VB/.test(carText) && !/kalt/.test(carText), `${L}: car card shows its price without "kalt"`);
    ok(/85\.000 km/.test(carText) && /EZ 03\/2018/.test(carText) && !/Zi\./.test(carText), `${L}: car card chips: km + first registration`);
    const flatText = await page.locator('.swipe-card', { hasText: '2-Zimmer Neustadt' }).textContent();
    ok(/700 €/.test(flatText) && /kalt/.test(flatText) && /850 € warm/.test(flatText) && /58 m²/.test(flatText) && /2 Zi\./.test(flatText), `${L}: flat card unchanged (kalt/warm, m², Zi.)`);

    // detail of the car (from "Bewertet", so it opens as overlay on both sizes)
    const carId = await card.getAttribute('data-id');
    await api('POST', '/api/listings/swipe', { listingId: Number(carId), action: 'like' });
    await page.goto(B + '/#/bewertet'); await page.reload(); await page.waitForTimeout(900);
    const rc = page.locator('#view-rated .list-card', { hasText: 'VW Golf 7 1.4 TSI' }).first();
    const rcText = await rc.innerText();
    ok(/12\.500 € VB/.test(rcText) && /85\.000 km/.test(rcText) && !/kalt/.test(rcText), `${L}: "Bewertet" card shows car data`);
    await rc.locator('[data-open-detail]').click(); await page.waitForTimeout(700);
    const price = await page.innerText('#detail-price'), meta = await page.innerText('#detail-meta'), costs = await page.innerText('#detail-costs');
    ok(/12\.500 € VB/.test(price) && !/kalt|warm/.test(price), `${L}: detail price without kalt/warm`);
    ok(/85\.000 km/.test(meta) && /EZ 03\/2018/.test(meta), `${L}: detail chips`);
    ok(/Kraftstoff/.test(costs) && /Benzin/.test(costs) && !/Kosten|Kaltmiete/.test(costs), `${L}: detail lists "Details" (Kraftstoff), no rent costs`);
    await page.screenshot({ path: `${SC}/categories-car-${L}.png` });
    await api('DELETE', `/api/listings/swipe/${carId}`);
    { const v = await cspViolations(page); ok(!v.length, 'no CSP violations ' + JSON.stringify(v)); }
    await ctx.close();
  }
  await b.close();
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  console.log(fails ? `${fails} FAILS` : 'all ok');
})().catch(e => { console.error('ERR', e); process.exit(1); });
