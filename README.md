<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-dark.png">
    <img src="public/brand/logo-light.png" alt="Flatswipe" width="420">
  </picture>
</p>

# Flatswipe

_auch bekannt als WohnungsSwipe_

Flatswipe hilft dir – allein oder mit Mitbewohnenden, Partner\*in oder Familie –, eine Wohnung zu finden.
Suchagenten fragen regelmäßig Wohnungsportale ab, neue Inserate landen in einem Stapel, den man wie
bei einer Dating-App nach links oder rechts wischt. Gruppen sehen, wem welche Wohnung gefällt, und aus
einem Bewerbungsprofil entstehen fertige Anschreiben für die Vermieter.

Flatswipe ist ein privates Hobbyprojekt, läuft selbst gehostet in Docker und ist auf deutsche Portale
ausgelegt. Große Teile des Codes sind mit KI-Unterstützung entstanden.

## Funktionen

- **Suchagenten** für Suchergebnis-Seiten der unterstützten Portale (siehe unten), mit Intervall,
  Sichtbarkeit (privat, Gruppe, alle) und Archiv
- **Swipen** mit Bewertung, Detailansicht, Fotos und Karte
- **Gruppen**: gemeinsame Bewertungen und Übereinstimmungen
- **Duplikaterkennung**: dieselbe Wohnung auf mehreren Portalen wird zusammengefasst
- **Bewerbungsprofil und Nachrichtenvorlagen**, optional mit KI-Formulierung über eine
  OpenAI-kompatible API
- **Benachrichtigungen** per Web-Push und E-Mail
- Installierbar als **PWA**, Zurück-Taste und Deep-Links wie in einer App

### Unterstützte Portale

Kleinanzeigen, ImmoScout24, Immowelt, Rentola, meinestadt.de, Vonovia, LEG und GEWOBA.
Die Portale ändern ihre Seiten regelmäßig – ein Abruf kann deshalb jederzeit ausfallen.

## Installation mit Docker Compose

```yaml
services:
  wohnungsswipe:
    image: nicgeon/wohnungsswipe:latest
    container_name: wohnungsswipe
    ports:
      - "3000:3000"
    volumes:
      - wohnungsswipe_data:/data
    env_file: .env          # optional, Vorlage: .env.example
    restart: unless-stopped

volumes:
  wohnungsswipe_data:
```

```bash
cp .env.example .env      # Werte eintragen (alles optional)
docker compose up -d
```

Danach läuft Flatswipe unter <http://localhost:3000>. Der erste registrierte Account wird mit
`node server/cli.js promote <name>` zum Admin (siehe Admin-CLI). Images gibt es für `linux/amd64`
und `linux/arm64` (z. B. Raspberry Pi); `:latest` ist das neueste Release, `:vX.Y.Z` eine feste Version.

Ohne Docker: Node.js 22, dann `npm ci && npm start`.

## Konfiguration

Alle Variablen sind optional; eine kommentierte Vorlage steht in [`.env.example`](.env.example).

| Variable | Zweck |
|---|---|
| `PORT` | Port des Servers (Standard `3000`) |
| `DB_PATH` | Pfad der SQLite-Datenbank (im Container `/data/wohnungsswipe.db`) |
| `BASE_URL` | Öffentliche Adresse für Links in E-Mails und Push. Mit `https://` werden Cookies nur über HTTPS gesendet |
| `SESSION_SECRET` | Signiert die Login-Cookies. Leer: wird beim ersten Start zufällig erzeugt und im Datenverzeichnis gespeichert |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | E-Mail-Versand. Ohne `SMTP_HOST` werden Mails nur geloggt |
| `VAPID_SUBJECT`, `VAPID_FILE` | Web-Push. Die Schlüssel werden automatisch erzeugt und gespeichert |
| `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_API_KEY_HEADER` | Optionaler KI-Modus für Nachrichten (OpenAI-kompatible Chat-API) |
| `SCRAPER_USER_AGENT` | Browser-Kennung für den Abruf der Portale |

### Sicherheitshinweise

- Hinter einem Reverse Proxy `BASE_URL` auf die öffentliche `https://`-Adresse setzen.
- Ein eigenes `SESSION_SECRET` lang und zufällig wählen, z. B. `openssl rand -hex 32`.
  Platzhalter wie `changeme` werden ignoriert.
- Das Datenverzeichnis (`/data`) enthält Datenbank, Session-Secret und Push-Schlüssel – nicht
  veröffentlichen und regelmäßig sichern.
- Sicherheitslücken bitte vertraulich melden, siehe [SECURITY.md](SECURITY.md).

## Tests

```bash
npm ci
npm test          # Unit- und API-Tests (jeder API-Test startet einen eigenen Server mit temporärer Datenbank)
npm run test:ui   # zusätzlich Browser-Tests (braucht Playwright: npm i -D playwright && npx playwright install chromium)
```

In den Tests werden keine echten Portale abgefragt: `test/helpers/fake-poll.js` liefert feste Inserate,
alles danach läuft echt. Einzelne Dateien: z. B. `node test/run.js dedupe`.

Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Rechtliches

- Flatswipe steht in **keiner Verbindung** zu den genannten Portalen oder Wohnungsunternehmen.
  Namen und Marken gehören ihren jeweiligen Inhabern.
- Wer Flatswipe betreibt, ist selbst dafür verantwortlich, die Nutzungsbedingungen der abgefragten
  Portale einzuhalten, maßvolle Abrufintervalle zu wählen und mit personenbezogenen Daten
  (Bewerbungsprofile, Kontakte) datenschutzkonform umzugehen.
- Lizenz: [MIT](LICENSE). Die mitgelieferten Schriften Fraunces und DM Sans stehen unter der
  SIL Open Font License (`public/fonts/`).

## Credits

Teile dieses Projekts stammen aus dem Fork
[Cuzimgamer2/wohnungsswipe_cuzi](https://github.com/Cuzimgamer2/wohnungsswipe_cuzi)
von **Noah Koning ([@Cuzimgamer2](https://github.com/Cuzimgamer2))** – danke!

- Verbesserter **Immowelt-Scraper** (sauberere Titel, Adresse, vollständige Fotogalerie aus den
  eingebetteten Seitendaten, Erkennung von Suchergebnis-URLs)
- **Mehrere eigene Bewertungen auf einmal entfernen** in der Ansicht „Bewertet“

## Admin-CLI (English)

A command-line tool for managing WohnungsSwipe directly inside the Docker container — no server restart required.

### Usage

```bash
docker exec wohnungsswipe node server/cli.js <command> [options]
```

---

### Commands

#### `users`
List all registered users with their ID, username, email, admin status and registration date.

```bash
docker exec wohnungsswipe node server/cli.js users
```

---

#### `info <username|email>`
Show detailed information about a specific user, including swipe stats, group memberships, search agents and pending notifications.

```bash
docker exec wohnungsswipe node server/cli.js info max
docker exec wohnungsswipe node server/cli.js info max@example.com
```

---

#### `promote <username|email>`
Grant admin privileges to a user. Admins can see all search agents regardless of visibility, manage other users via the in-app admin panel, and access all admin CLI commands.

```bash
docker exec wohnungsswipe node server/cli.js promote max
docker exec wohnungsswipe node server/cli.js promote max@example.com
```

> **Note:** If no admins exist yet (fresh install), any user can be promoted without restrictions. After the first admin is set, only existing admins can promote others.

---

#### `demote <username|email>`
Remove admin privileges from a user. You cannot demote yourself.

```bash
docker exec wohnungsswipe node server/cli.js demote max
```

---

#### `password <username|email> <new-password>`
Reset a user's password directly. The new password must be at least 6 characters. The user's active sessions are not immediately invalidated, but they will need to log in again once the session expires.

```bash
docker exec wohnungsswipe node server/cli.js password max newSecurePassword123
docker exec wohnungsswipe node server/cli.js password max@example.com newSecurePassword123
```

---

#### `delete <username|email>`
Preview a user deletion. Shows the user's details and the volume of data that would be removed (swipes, group memberships, search agents). Does **not** delete anything — use `--confirm` to actually delete.

```bash
docker exec wohnungsswipe node server/cli.js delete olduser
```

#### `delete <username|email> --confirm`
Permanently delete a user and all their associated data. This includes swipes, group memberships, push subscriptions, contacts, notification queue entries and contact notes. Search agents created by the user are kept but their owner reference is cleared.

```bash
docker exec wohnungsswipe node server/cli.js delete olduser --confirm
```

> ⚠️ **This action cannot be undone.**

---

#### `help`
Print the help message with all available commands and examples.

```bash
docker exec wohnungsswipe node server/cli.js help
```

---

### Notes

- Commands accept both **username** and **email address** as identifier — whichever is more convenient.
- The CLI reads and writes the SQLite database file directly (`/data/wohnungsswipe.db`). It works even if the server is down.
- Because the CLI bypasses the running server's in-memory state, avoid running write commands (password, promote, demote, delete) while the server is under heavy load — the server saves the database periodically and could theoretically overwrite a concurrent CLI write. For safety, run CLI commands during low-traffic periods or after stopping the server with `docker compose stop`.
- The `DB_PATH` environment variable is respected if you have a non-default database location configured.

---

### Examples

```bash
# See who is registered and who has admin rights
docker exec wohnungsswipe node server/cli.js users

# Check what a specific user has been up to
docker exec wohnungsswipe node server/cli.js info max

# Someone forgot their password
docker exec wohnungsswipe node server/cli.js password max temporaryPassword42

# Make a trusted user an admin
docker exec wohnungsswipe node server/cli.js promote kate

# Remove admin rights after someone leaves the group
docker exec wohnungsswipe node server/cli.js demote formerAdmin

# Clean up a test account
docker exec wohnungsswipe node server/cli.js delete testuser
docker exec wohnungsswipe node server/cli.js delete testuser --confirm
```
