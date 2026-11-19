// Kleinanzeigen allgemein: Kategorie aus Such-/Anzeigen-URL, Eckdaten-Liste und Ausstattung einer
// Anzeige (nachgebautes Markup wie auf kleinanzeigen.de, Stand November 2026).
const cheerio = require('cheerio');
const P = require('../../server/poller.js');
let fails = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('✗', m, 'got', JSON.stringify(a), 'want', JSON.stringify(b)); } else console.log('✓', m); };

const KA = 'https://www.kleinanzeigen.de';
eq([
  `${KA}/s-autos/bremen/c216l1r20`, `${KA}/s-autos/28199/preis::5000/c216l42r20`, `${KA}/s-wohnung-mieten/bremen/c203l1`,
  `${KA}/s-haus-mieten/c205`, `${KA}/s-auf-zeit-wg/bremen/c199l1`, `${KA}/s-fahrraeder/bremen/c217l1r10`,
  `${KA}/s-bremen/golf/k0l1`, `${KA}/s-wohnung-mieten/bremen/k0c203l1`, `${KA}/s-autos/golf/k0c216l1r50`, `${KA}/s-wohnung-mieten/bremen/k0c203`,
  `${KA}/s-wohnung-mieten/bremen/anzeige:angebote/c203l1/`,
].map(P.detectCategory), ['auto', 'auto', 'wohnung', 'wohnung', 'wohnung', 'sonstiges', 'sonstiges', 'wohnung', 'auto', 'wohnung', 'wohnung'],
   'category from search URLs (also with keyword part "k0c203" and trailing slash)');
eq([
  `${KA}/s-anzeige/opel-vivaro/3551630096-216-54`, `${KA}/s-anzeige/2-zimmer/3562508158-203-46`, `${KA}/s-anzeige/city-bike/3565398033-217-40`,
].map(P.detectCategory), ['auto', 'wohnung', 'sonstiges'], 'category from ad URLs');
eq(['https://www.immobilienscout24.de/expose/1', 'https://www.immowelt.de/expose/x', 'https://www.leg-wohnen.de/a'].map(P.detectCategory),
   ['wohnung', 'wohnung', 'wohnung'], 'flat portals are always "wohnung"');

const li = (label, value, extra = '') => `<li class="addetailslist--detail"> ${label}<span class="addetailslist--detail--value" ${extra}> ${value}</span> </li>`;
const page = `<div id="viewad-details"><div class="addetailslist"><ul class="addetailslist--split">
  ${li('Marke', 'Opel', 'itemprop="brand"')}${li('Kilometerstand', '191.521 km')}${li('Erstzulassung', 'Juli 2018')}
  ${li('Kraftstoffart', 'Diesel')}${li('HU bis', 'Oktober 2027')}${li('Außenfarbe', 'Silber')}${li('Material Innenausstattung', 'Stoff')}
  </ul></div></div>
  <div id="viewad-configuration"><ul class="checktaglist"><li class="checktag">Klimaanlage</li><li class="checktag"> Navigationssystem </li><li class="checktag">Klimaanlage</li></ul></div>`;
const $ = cheerio.load(page);
eq(P.extractKleinanzeigenDetails($), { marke: 'Opel', kilometerstand: '191.521 km', erstzulassung: 'Juli 2018', kraftstoff: 'Diesel',
  hu: 'Oktober 2027', aussenfarbe: 'Silber', material_innenausstattung: 'Stoff' }, 'details: keys without umlauts, aliases (Kraftstoffart → kraftstoff, HU bis → hu)');
eq(P.extractKleinanzeigenChecktags($), ['Klimaanlage', 'Navigationssystem'], 'equipment check tags, trimmed and unique');
const old = cheerio.load(`<div id="viewad-details"><li class="addetailslist--detail"><span class="addetailslist--detail--label">Zimmer</span><span class="addetailslist--detail--value">3</span></li></div>`);
eq(P.extractKleinanzeigenDetails(old), { zimmer: '3' }, 'older markup with a label element');
eq(P.extractKleinanzeigenDetails(cheerio.load('<div>nichts</div>')), {}, 'no detail list → empty');
console.log(fails ? `${fails} FAILS` : 'all ok');
process.exit(fails ? 1 : 0);
