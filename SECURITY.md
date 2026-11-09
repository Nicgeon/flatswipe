# Sicherheit

## Sicherheitslücken melden

Bitte melde Sicherheitslücken **nicht** als öffentliches Issue, sondern privat über GitHub:
**Security → Report a vulnerability** in diesem Repository
([direkter Link](https://github.com/Nicgeon/flatswipe/security/advisories/new)).

Hilfreich sind:
- betroffene Version bzw. Commit,
- Beschreibung und Schritte zum Nachvollziehen,
- mögliche Auswirkungen.

Ich melde mich in der Regel innerhalb von einer Woche. Flatswipe ist ein Freizeitprojekt – feste
Fristen kann ich nicht zusagen, Sicherheitsmeldungen haben aber Vorrang.

## Unterstützte Versionen

Sicherheitskorrekturen gibt es nur für die **neueste veröffentlichte Version** (siehe Releases bzw.
das Docker-Image `nicgeon/wohnungsswipe:latest`).

## Geltungsbereich

Im Geltungsbereich ist der Code in diesem Repository: Server (`server/`), Weboberfläche (`public/`),
Docker-Image und Workflows.

Nicht im Geltungsbereich:
- Instanzen, die andere betreiben, und deren Konfiguration,
- die Wohnungsportale, deren Inserate Flatswipe abruft,
- Angriffe, die Zugriff auf den Server oder das Datenverzeichnis voraussetzen.
