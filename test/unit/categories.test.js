// Kategorie-Beschreibung (public/js/categories.js): Preis, Chips, Listen und Sortierwert je Kategorie
const C = require('../../public/js/categories.js');
let fails = 0; const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.log('✗', m, 'got', JSON.stringify(a), 'want', JSON.stringify(b)); } else console.log('✓', m); };

const flat = { price_cold: '700 €', price: '850 €', size: '58 m²', rooms: '2', nebenkosten: '150 €', property_type: 'Etagenwohnung' };
const car  = { category: 'auto', price: '12.500 € VB', size: '', attrs_json: JSON.stringify({ kilometerstand: '85.000 km', erstzulassung: '03/2018', kraftstoff: 'Benzin' }) };

eq(C.categoryOf(flat).label, 'Wohnungen', 'no category → Wohnung (old rows)');
eq(C.categoryOf({ category: 'gibtsnicht' }).label, 'Wohnungen', 'unknown category → Wohnung');
eq(C.priceParts(flat), { main: '700 €', note: 'kalt', alt: '850 €', altNote: 'warm' }, 'flat: cold + warm');
eq(C.priceParts({ price: '900 €' }), { main: '900 €', note: '', alt: '', altNote: '' }, 'flat with only warm rent');
eq(C.priceParts({ price_cold: '700 €', price: '700 €' }).alt, '', 'warm = cold → no second price');
eq(C.facts(flat), [{ icon: 'area', text: '58 m²' }, { icon: 'door', text: '2 Zi.' }], 'flat chips');
eq(C.lists(flat), { costs: [['Kaltmiete', '700 €'], ['Nebenkosten', '150 €']], total: ['Warmmiete', '850 €'], details: [['Wohnungstyp', 'Etagenwohnung']] }, 'flat lists');
eq(C.lists({ nebenkosten: '100 €', price: '900 €' }).total, null, 'no Warmmiete row without Kaltmiete');

eq(C.priceParts(car), { main: '12.500 € VB', note: '', alt: '', altNote: '' }, 'car: one price, no "kalt"');
eq(C.facts(car), [{ icon: 'gauge', text: '85.000 km' }, { icon: 'calendar', text: 'EZ 03/2018' }], 'car chips from attrs_json');
eq(C.lists(car), { costs: [], total: null, details: [['Kraftstoff', 'Benzin']] }, 'car details');
eq([C.priceNumber(flat), C.priceNumber(car), C.priceNumber({})], [700, 12500, Infinity], 'sort value');
eq(C.changeLabel(flat, 'price'), 'Warmmiete', 'change label flat');
eq(C.changeLabel(car, 'price'), 'Preis', 'change label car');
eq(C.facts({ category: 'auto', attrs_json: '{kaputt' }), [], 'broken attrs_json → no chips, no error');
eq(C.value({ category: 'auto', attrs_json: '[1,2]' }, 'attr:x'), '', 'attrs_json not an object → empty');
console.log(fails ? `${fails} FAILS` : 'all ok');
process.exit(fails ? 1 : 0);
