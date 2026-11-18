/**
 * categories.js – was Flatswipe sucht und wie ein Inserat davon aussieht
 *
 * Eine Datei für Browser und Server (server/index.js lädt sie mit require). Jede Kategorie
 * beschreibt, welche Felder ein Inserat hat und wo sie angezeigt werden:
 *
 *   price    Hauptpreis auf Karten: `main` (+ Zusatz `mainNote`), optional zweiter Preis `alt`
 *   facts    kurze Chips auf Karten und in der Detailansicht (z. B. „58 m²“, „2 Zi.“)
 *   costs    Liste „Kosten“ in der Detailansicht, `total` als hervorgehobene Summe
 *   details  Liste „Details“ in der Detailansicht
 *   changes  Feldnamen für den Änderungsverlauf
 *
 * Ein Feldschlüssel ist eine Spalte von `listings` (Wohnungen haben eigene Spalten) oder
 * `attr:<name>` für die Zusatzangaben in `listings.attrs_json` (alle anderen Kategorien).
 */
(function (root) {
  'use strict';

  const CATEGORIES = {
    wohnung: {
      label: 'Wohnungen', one: 'Wohnung', icon: 'home',
      price:   { main: 'price_cold', mainNote: 'kalt', alt: 'price', altNote: 'warm' },
      facts:   [{ key: 'size', icon: 'area' }, { key: 'rooms', icon: 'door', suffix: ' Zi.' }],
      costs:   [['Kaltmiete', 'price_cold'], ['Nebenkosten', 'nebenkosten'], ['Heizkosten', 'heizkosten'], ['Kaution', 'kaution']],
      total:   ['Warmmiete', 'price'],
      details: [['Wohnungstyp', 'property_type'], ['Verfügbar ab', 'available_from']],
      changes: { title: 'Titel', price: 'Warmmiete', price_cold: 'Kaltmiete', size: 'Größe', rooms: 'Zimmer' },
    },
    auto: {
      label: 'Autos', one: 'Auto', icon: 'car',
      price:   { main: 'price' },
      facts:   [{ key: 'attr:kilometerstand', icon: 'gauge' }, { key: 'attr:erstzulassung', icon: 'calendar', prefix: 'EZ ' }],
      costs:   [],
      details: [['Marke', 'attr:marke'], ['Modell', 'attr:modell'], ['Leistung', 'attr:leistung'], ['Kraftstoff', 'attr:kraftstoff'],
                ['Getriebe', 'attr:getriebe'], ['Fahrzeugtyp', 'attr:fahrzeugtyp'], ['HU bis', 'attr:hu']],
      changes: { title: 'Titel', price: 'Preis' },
    },
    sonstiges: {
      label: 'Sonstiges', one: 'Inserat', icon: 'grid',
      price:   { main: 'price' },
      facts:   [],
      costs:   [],
      details: [['Zustand', 'attr:zustand'], ['Versand', 'attr:versand']],
      changes: { title: 'Titel', price: 'Preis' },
    },
  };
  const DEFAULT = 'wohnung';

  const categoryOf = listing => CATEGORIES[listing && listing.category] || CATEGORIES[DEFAULT];
  const isCategory = key => Object.prototype.hasOwnProperty.call(CATEGORIES, key);

  // Zusatzangaben eines Inserats (attrs_json), einmal gelesen und am Objekt gemerkt
  function attrs(listing) {
    if (!listing) return {};
    if (listing._attrs) return listing._attrs;
    let a = {};
    try { a = JSON.parse(listing.attrs_json || '{}') || {}; } catch (_) { a = {}; }
    if (typeof a !== 'object' || Array.isArray(a)) a = {};
    try { Object.defineProperty(listing, '_attrs', { value: a, enumerable: false }); } catch (_) {}
    return a;
  }

  // Wert eines Feldes als getrimmter Text ('' wenn leer)
  function value(listing, key) {
    if (!key || !listing) return '';
    const v = key.startsWith('attr:') ? attrs(listing)[key.slice(5)] : listing[key];
    return v == null ? '' : String(v).trim();
  }

  // { main, note, alt, altNote } – note/alt nur, wenn es den Hauptpreis auch gibt
  function priceParts(listing) {
    const p = categoryOf(listing).price;
    const main = value(listing, p.main), alt = p.alt ? value(listing, p.alt) : '';
    if (main) return { main, note: p.mainNote || '', alt: alt && alt !== main ? alt : '', altNote: p.altNote || '' };
    return { main: alt, note: '', alt: '', altNote: '' };   // nur der zweite Preis bekannt (z. B. nur Warmmiete)
  }

  // Preis als Zahl zum Sortieren (Infinity ohne Preis): "1.150,50 €" → 1150.5
  function priceNumber(listing) {
    const raw = priceParts(listing).main.replace(/[^\d.,]/g, '');
    if (!raw) return Infinity;
    const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : Infinity;
  }

  // Chips: [{ icon, text }]
  const facts = listing => categoryOf(listing).facts
    .map(f => ({ f, v: value(listing, f.key) }))
    .filter(x => x.v)
    .map(({ f, v }) => ({ icon: f.icon, text: `${f.prefix || ''}${v}${f.suffix || ''}` }));

  // { costs: [[label, value]], total: [label, value] | null, details: [[label, value]] }
  function lists(listing) {
    const c = categoryOf(listing);
    const rows = defs => defs.map(([label, key]) => [label, value(listing, key)]).filter(([, v]) => v);
    const costs = rows(c.costs);
    let total = null;
    if (c.total) {
      const t = value(listing, c.total[1]);
      // Summe nur neben dem Grundbetrag (erste Kostenzeile, z. B. Kaltmiete) und nur, wenn sie davon abweicht
      const base = value(listing, c.costs[0] && c.costs[0][1]);
      if (t && base && t !== base) total = [c.total[0], t];
    }
    return { costs, total, details: rows(c.details) };
  }

  const changeLabel = (listing, field) => categoryOf(listing).changes[field] || field;

  const api = { CATEGORIES, DEFAULT, categoryOf, isCategory, attrs, value, priceParts, priceNumber, facts, lists, changeLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Categories = api;
})(typeof window !== 'undefined' ? window : this);
