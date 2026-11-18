# Kleinanzeigen: Such-URLs selbst bauen

Grundlage für eingebaute Suchagenten (Phase 3 des Kategorien-Plans). Geprüft am 18.11.2026
mit einfachen Abrufen (Kennung „Flatswipe/1.0“); die Schnittstellen sind **nicht offiziell
dokumentiert** und können sich ändern – Ergebnisse deshalb zwischenspeichern und Fehler sichtbar
machen.

## Orts-ID

```
GET https://www.kleinanzeigen.de/s-ort-empfehlungen.json?query=<Ort oder PLZ>
```

Antwort: ein JSON-Objekt, Schlüssel `_<id>`, Wert die Anzeige. `_0` ist immer „Deutschland“.

| Anfrage | Antwort (Auszug) |
|---|---|
| `Bremen` | `_1` Bremen, `_41` Neustadt - Bremen, `_37` Findorff - Bremen … |
| `28199` | `_42` 28199 Neustadt, `_13501` 28199 Hohentor … |
| `Bad Oldesloe` | `_917` Bad Oldesloe - Schleswig-Holstein |

Städte, Stadtteile und PLZ funktionieren. Bei mehreren Treffern muss der Nutzer wählen
(oder der erste Treffer nach `_0` wird genommen).

## Such-URL

```
https://www.kleinanzeigen.de/s-<kategorie-slug>/<ort-slug>/[preis:<min>:<max>/]c<kategorie-id>l<orts-id>[r<umkreis-km>]
```

| Geprüft | Ergebnis |
|---|---|
| `s-autos/bremen/c216l1` | „Gebrauchtwagen kaufen in Bremen“ |
| `s-autos/bremen/c216l1r20` | „… in Bremen **und Umgebung**“ – Umkreis greift |
| `s-autos/28199/c216l42r20` | „… in Neustadt - Bremen und Umgebung“ – PLZ-Ort-ID greift |
| `s-autos/bremen/preis::5000/c216l1r20` | alle Preise ≤ 5.000 € – Preisfilter greift |
| `s-fahrraeder/bremen/c217l1r10` | „Fahrräder & Zubehör in Bremen und Umgebung“ |
| `s-wohnung-mieten/bremen/c203l1r5` | „Mietwohnung in Bremen und Umgebung“ |

Der Ort-Slug im Pfad ist nur Zierde; maßgeblich sind `c…`, `l…` und `r…`.

## Bekannte Kategorie-IDs

| ID | Slug | Kategorie |
|---|---|---|
| 203 | `s-wohnung-mieten` | Mietwohnungen |
| 216 | `s-autos` | Autos |
| 217 | `s-fahrraeder` | Fahrräder & Zubehör |
