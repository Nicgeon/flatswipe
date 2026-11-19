// Kategorien über die API: Suchagenten speichern Kategorie und Zusatzangaben, alte Daten sind
// Wohnungen, Duplikate werden nur unter Wohnungen gesucht.
const B = process.env.TEST_BASE;
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const client = () => { let cookie = ''; return async (method, p, body) => {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return r.json(); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const A = client();
  await A('POST', '/api/auth/register', { username: 'Cara', email: 'cara@x.de', password: 'secret123' });
  const jobs = {};
  for (const [label, url] of [['Autos', 'https://www.kleinanzeigen.de/s-autos/bremen/c216l1r20'], ['Wohnungen', 'https://www.kleinanzeigen.de/s-wohnung-mieten/bremen/c203l1']]) {
    const { job } = await A('POST', '/api/jobs', { label, search_url: url, visibility: 'global' });
    jobs[label] = job;
    await A('POST', `/api/jobs/${job.id}/run`);
  }
  ok(jobs.Autos.category === 'auto' && jobs.Wohnungen.category === 'wohnung', 'new agents get their category from the search URL (c216 → auto, c203 → wohnung)');
  const other = (await A('POST', '/api/jobs', { label: 'Räder', search_url: 'https://www.kleinanzeigen.de/s-fahrraeder/bremen/c217l1r10' })).job;
  ok(other.category === 'sonstiges', 'other Kleinanzeigen categories → sonstiges');
  let q = [];
  for (let i = 0; i < 50 && q.length < 3; i++) { await sleep(100); q = (await A('GET', '/api/listings/swipe')).listings || []; }
  const car = q.find(l => l.title === 'VW Golf 7 1.4 TSI');
  ok(car && car.category === 'auto', 'car listing stored with category "auto"');
  const attrs = JSON.parse(car.attrs_json);
  ok(attrs.kilometerstand === '85.000 km' && attrs.erstzulassung === '03/2018', 'attrs_json kept (km, EZ)');
  ok(!('BÖSE KEY' in attrs) && !('leistung' in attrs), 'invalid keys and nested values are dropped');
  const flats = q.filter(l => (l.category || 'wohnung') === 'wohnung');
  ok(flats.length === 1 && flats[0].also_on.length === 1, 'the two flat copies are merged into one (dedupe still works for flats)');
  const twin = q.find(l => l.title.startsWith('VW Golf 7 (andere'));
  ok(car && twin && !car.cluster_id && !twin.cluster_id, 'cars are not merged by the flat rules (same "size/rooms/place")');
  ok(twin && twin.category === 'auto', 'a listing without its own category gets the agent\'s category');
  ok(q.length === 3, `stack: 2 cars + 1 flat (${q.length})`);
  const detail = (await A('GET', `/api/listings/${car.id}`)).listing;
  ok(detail.category === 'auto' && detail.attrs_json.includes('kilometerstand'), 'detail endpoint returns category and attrs');
  console.log(fails ? `${fails} FAILS` : 'all ok');
})().catch(e => { console.error('ERR', e); process.exit(1); });
