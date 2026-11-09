# Mitmachen

Danke für dein Interesse! Flatswipe ist ein kleines Freizeitprojekt – Issues und Pull Requests
sind willkommen.

## Fehler und Ideen
- **Fehler:** Issue mit der Vorlage „Fehler melden“ – mit Schritten zum Nachvollziehen und, wenn
  es um ein Portal geht, dem Portal (bitte keine privaten Daten oder eigenen Zugangsdaten posten).
- **Sicherheitslücken:** nicht als Issue, sondern wie in [SECURITY.md](SECURITY.md) beschrieben.
- **Ideen:** Issue mit der Vorlage „Idee / Wunsch“.

## Entwickeln
```bash
npm ci
npm start            # http://localhost:3000
npm test             # Unit- und API-Tests
npm run test:ui      # zusätzlich Browser-Tests (braucht Playwright)
```
Konfiguration: siehe [.env.example](.env.example).

## Pull Requests
- Bitte einen PR pro Thema, mit kurzer Beschreibung, was und warum.
- `npm test` muss grün sein; neue Logik bekommt nach Möglichkeit einen Test unter `test/`.
- Neue Portale: Abruf über `fetchPageRaw` (SSRF-Schutz), Tests mit gespeicherten Seiten statt
  Live-Abrufen, und bitte die Nutzungsbedingungen des Portals beachten.
- Mit einem Pull Request stimmst du zu, dass dein Beitrag unter der [MIT-Lizenz](LICENSE) des
  Projekts veröffentlicht wird.
