// Ganzer Durchlauf von scrapeListing für eine Auto-Anzeige, ohne Netz: node-fetch wird durch die
// nachgebaute Seite test/fixtures/kleinanzeigen-auto.html ersetzt.
const Module = require('module'); const fs = require('fs'); const path = require('path');
const AD = 'https://www.kleinanzeigen.de/s-anzeige/vw-golf-7/3500000001-216-46';
const html = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'kleinanzeigen-auto.html'), 'utf8');
const load = Module._load;
Module._load = function (req) {
  if (req === 'node-fetch') return async url => String(url).split('?')[0] === AD
    ? { ok: true, status: 200, url, text: async () => html, headers: { get: () => null } }
    : { ok: false, status: 404, url, text: async () => '', headers: { get: () => null } };
  return load.apply(this, arguments);
};
const P = require('../../server/poller.js');
let fails = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('✗', m, 'got', JSON.stringify(a), 'want', JSON.stringify(b)); } else console.log('✓', m); };
(async () => {
  const d = await P.scrapeListing(AD, { lite: true });
  eq([d.category, d.status, d.title], ['auto', 'active', 'VW Golf 7 1.4 TSI Highline'], 'category, status, title');
  eq([d.price, d.price_cold, d.size, d.rooms], ['12.500 € VB', '', '', ''], 'one price incl. "VB", no rent/size/rooms');
  eq(JSON.parse(d.attrs_json), { marke: 'Volkswagen', modell: 'Golf', kilometerstand: '85.000 km', erstzulassung: 'März 2018', kraftstoff: 'Benzin', leistung: '125 PS' }, 'facts as attrs');
  eq(JSON.parse(d.tags_json), ['Klimaanlage', 'Sitzheizung'], 'equipment as tags – no flat keywords (Garage, Balkon, Garten) from the text');
  eq(d.location, '28199 Bremen - Neustadt', 'location');
  console.log(fails ? `${fails} FAILS` : 'all ok');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
