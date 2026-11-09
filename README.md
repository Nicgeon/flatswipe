<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/logo-dark.png">
    <img src="public/brand/logo-light.png" alt="Flatswipe" width="420">
  </picture>
</p>

# Flatswipe
_also known as WohnungsSwipe_

**This app is completely vibe coded...** and still somehow finds flats. 🏠

Flatswipe helps you (and your friends, your partner, your future flatmates) find a new place on German
sites like Kleinanzeigen, ImmoScout24 & co. Search agents keep an eye on the portals for you, new listings
land in a stack and you swipe them left or right – just like that *other* app, but the match is a flat.

_It's not as full-fledged as I'd wish it to be, but it's not bad._ Runs in a docker compose :>

## What it can do

- 🔎 **Search agents** for the result pages of the supported portals – with interval, visibility
  (private, group, everyone) and an archive
- 👉 **Swipe** with ratings, a detail view, photos and a map
- 👯 **Groups**: rate together and see where you all agree
- 🧹 **Duplicate detection**: the same flat on three portals shows up once
- ✉️ **Applicant profile & message templates** – optionally polished by an AI via an
  OpenAI-compatible API
- 🔔 **Notifications** via web push and e-mail
- 📱 Installable as a **PWA**, with a back button and deep links that behave like a real app

### Supported portals

Kleinanzeigen, ImmoScout24, Immowelt, Rentola, meinestadt.de, Vonovia, LEG and GEWOBA.
Heads-up: portals like to redesign their pages, so a scraper can break any day. Issues welcome!

> The app itself speaks German – it's built for the German flat hunt, after all.

## Setup

Just grab the docker compose and let's goo 🚀

```yaml
services:
  flatswipe:
    image: ghcr.io/nicgeon/flatswipe:latest
    container_name: flatswipe
    ports:
      - "3000:3000"
    volumes:
      - flatswipe_data:/data
    env_file: .env          # optional, template: .env.example
    restart: unless-stopped

volumes:
  flatswipe_data:
```

```bash
cp .env.example .env      # fill in what you need – everything is optional
docker compose up -d
```

That's it, Flatswipe now lives at <http://localhost:3000>. The first account you register automatically
becomes admin – so be quick 😉 More admins: see [Admin CLI](#admin-cli).
Images are built for `linux/amd64` and `linux/arm64` (hello, Raspberry Pi 👋): `:latest` is the newest
release, `:beta` the newest pre-release (for the brave 🧪), `:vX.Y.Z` a fixed version.

No Docker? Node.js 22, then `npm ci && npm start`.

## Configuration

Everything is optional; [`.env.example`](.env.example) has a commented template.

| Variable | What it does |
|---|---|
| `PORT` | Server port (default `3000`) |
| `DB_PATH` | Path of the SQLite database (in the container `/data/wohnungsswipe.db`) |
| `BASE_URL` | Public address for links in e-mails and push. With `https://` cookies are only sent over HTTPS |
| `SESSION_SECRET` | Signs the login cookies. Empty: generated randomly on first start and stored in the data volume |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Sending e-mails. Without `SMTP_HOST` mails are only logged |
| `VAPID_SUBJECT`, `VAPID_FILE` | Web push. The keys are generated and stored automatically |
| `LLM_API_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_API_KEY_HEADER` | Optional AI mode for messages (OpenAI-compatible chat API) |
| `SCRAPER_USER_AGENT` | Browser user agent used to fetch the portals |

### Stay safe

- Behind a reverse proxy, set `BASE_URL` to your public `https://` address.
- If you set your own `SESSION_SECRET`, make it long and random, e.g. `openssl rand -hex 32`.
  Placeholders like `changeme` are ignored.
- The data volume (`/data`) holds the database, the session secret and the push keys – keep it private
  and back it up.
- Found a security issue? Please report it privately, see [SECURITY.md](SECURITY.md).

## Tests

```bash
npm ci
npm test          # unit + API tests (each API test starts its own server with a temporary database)
npm run test:ui   # plus the browser tests (needs Playwright: npm i -D playwright && npx playwright install chromium)
```

The tests never hit the real portals: `test/helpers/fake-poll.js` feeds the search agents fixed listings,
everything after that runs for real. Single files: e.g. `node test/run.js dedupe`.

Want to help? Yay – see [CONTRIBUTING.md](CONTRIBUTING.md).

## The legal bit

- Flatswipe is **not affiliated** with any of the portals or housing companies mentioned. Names and
  trademarks belong to their owners.
- If you run Flatswipe, it's on you to respect the terms of the portals you query, keep polling
  intervals reasonable and handle personal data (applicant profiles, contacts) in line with data
  protection law.
- License: [MIT](LICENSE). The bundled fonts Fraunces and DM Sans are under the SIL Open Font License
  (`public/fonts/`).

## Credits

Parts of this project were taken over from the fork
[Cuzimgamer2/wohnungsswipe_cuzi](https://github.com/Cuzimgamer2/wohnungsswipe_cuzi)
by **Noah Koning ([@Cuzimgamer2](https://github.com/Cuzimgamer2))** – thanks! 💛

- Improved **Immowelt scraper** (cleaner titles, address, full photo gallery from the embedded page data,
  search-result URL detection)
- **Bulk removal of your own ratings** in the "Bewertet" view

## Admin CLI

A command-line tool for managing Flatswipe directly inside the Docker container — no server restart required.

### Usage

```bash
docker exec flatswipe node server/cli.js <command> [options]
```

---

### Commands

#### `users`
List all registered users with their ID, username, email, admin status and registration date.

```bash
docker exec flatswipe node server/cli.js users
```

---

#### `info <username|email>`
Show detailed information about a specific user, including swipe stats, group memberships, search agents and pending notifications.

```bash
docker exec flatswipe node server/cli.js info max
docker exec flatswipe node server/cli.js info max@example.com
```

---

#### `promote <username|email>`
Grant admin privileges to a user. Admins can see all search agents regardless of visibility, manage other users via the in-app admin panel, and access all admin CLI commands.

```bash
docker exec flatswipe node server/cli.js promote max
docker exec flatswipe node server/cli.js promote max@example.com
```

> **Note:** If no admins exist yet (fresh install), any user can be promoted without restrictions. After the first admin is set, only existing admins can promote others.

---

#### `demote <username|email>`
Remove admin privileges from a user. You cannot demote yourself.

```bash
docker exec flatswipe node server/cli.js demote max
```

---

#### `password <username|email> <new-password>`
Reset a user's password directly. The new password must be at least 6 characters. All of the user's active sessions are logged out right away – handy if an account was taken over.

```bash
docker exec flatswipe node server/cli.js password max newSecurePassword123
docker exec flatswipe node server/cli.js password max@example.com newSecurePassword123
```

---

#### `delete <username|email>`
Preview a user deletion. Shows the user's details and the volume of data that would be removed (swipes, group memberships, search agents). Does **not** delete anything — use `--confirm` to actually delete.

```bash
docker exec flatswipe node server/cli.js delete olduser
```

#### `delete <username|email> --confirm`
Permanently delete a user and all their associated data: swipes, group memberships and join requests, applicant profile, group templates, push subscriptions, contacts and notification queue entries. Search agents and listings the user added are kept, but their owner reference is cleared.

```bash
docker exec flatswipe node server/cli.js delete olduser --confirm
```

> ⚠️ **This action cannot be undone.**

---

#### `help`
Print the help message with all available commands and examples.

```bash
docker exec flatswipe node server/cli.js help
```

---

### Notes

- Commands accept both **username** and **email address** as identifier — whichever is more convenient.
- While the server is running, the CLI hands its commands to the server through a socket in the data directory (`/data/admin.sock`, only accessible to the container user). The server runs them on its live database, so changes apply immediately and are saved.
- If the server is not running, the CLI reads and writes the SQLite database file (`/data/wohnungsswipe.db`) directly.
- The `DB_PATH` environment variable is respected if you have a non-default database location configured.

---

### Examples

```bash
# See who is registered and who has admin rights
docker exec flatswipe node server/cli.js users

# Check what a specific user has been up to
docker exec flatswipe node server/cli.js info max

# Someone forgot their password
docker exec flatswipe node server/cli.js password max temporaryPassword42

# Make a trusted user an admin
docker exec flatswipe node server/cli.js promote kate

# Remove admin rights after someone leaves the group
docker exec flatswipe node server/cli.js demote formerAdmin

# Clean up a test account
docker exec flatswipe node server/cli.js delete testuser
docker exec flatswipe node server/cli.js delete testuser --confirm
```
