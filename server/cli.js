#!/usr/bin/env node
/**
 * Flatswipe Admin-CLI
 *
 * Verwendung:
 *   docker exec flatswipe node server/cli.js <befehl> [optionen]
 *
 * Befehle:
 *   users                          – alle Nutzer auflisten
 *   promote <username|email>       – Admin-Rechte vergeben
 *   demote  <username|email>       – Admin-Rechte entziehen
 *   password <username|email> <neues-passwort>  – Passwort setzen
 *   delete  <username|email>       – Nutzer löschen (mit Bestätigung)
 *   info    <username|email>       – Nutzerdetails anzeigen
 *
 * Läuft der Server, gehen die Befehle über einen Socket an ihn (er hält die Datenbank im
 * Speicher und würde direkt in die Datei geschriebene Änderungen überschreiben). Sonst
 * arbeitet die CLI direkt auf der Datei. Die Befehle selbst stehen in admin.js.
 */

const path      = require('path');
const fs        = require('fs');
const initSqlJs = require('sql.js');
const { runCommand, sendToServer, c } = require('./admin');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/wohnungsswipe.db');
const fail = msg => { console.error(`${c.red}✗ ${msg}${c.reset}`); process.exit(1); };

// Ohne laufenden Server: Datenbankdatei öffnen und nach Änderungen zurückschreiben
async function runOnFile(argv) {
  if (!fs.existsSync(DB_PATH)) fail(`Datenbank nicht gefunden: ${DB_PATH}\n  Ist DB_PATH korrekt gesetzt?`);
  const SQL = await initSqlJs();
  const raw = new SQL.Database(fs.readFileSync(DB_PATH));
  const all = (sql, p = []) => {
    const st = raw.prepare(sql); st.bind(p);
    const rows = []; while (st.step()) rows.push(st.getAsObject()); st.free();
    return rows;
  };
  const db = { all, get: (sql, p) => all(sql, p)[0] || null, run: (sql, p = []) => raw.run(sql, p) };
  const result = await runCommand(db, argv);
  if (result.changed) fs.writeFileSync(DB_PATH, Buffer.from(raw.export()));
  return result;
}

function printHelp() {
  console.log(`
${c.bold}${c.cyan}Flatswipe Admin-CLI${c.reset}
${'─'.repeat(50)}

${c.bold}Verwendung:${c.reset}
  docker exec flatswipe node server/cli.js <befehl> [optionen]

${c.bold}Befehle:${c.reset}
  ${c.yellow}users${c.reset}
      Alle Nutzer auflisten

  ${c.yellow}info <username|email>${c.reset}
      Detaillierte Nutzerinformationen

  ${c.yellow}promote <username|email>${c.reset}
      Admin-Rechte vergeben

  ${c.yellow}demote <username|email>${c.reset}
      Admin-Rechte entziehen

  ${c.yellow}password <username|email> <neues-passwort>${c.reset}
      Passwort eines Nutzers zurücksetzen

  ${c.yellow}delete <username|email>${c.reset}
      Nutzer löschen (zeigt Vorschau + Bestätigungsbefehl)

  ${c.yellow}delete <username|email> --confirm${c.reset}
      Nutzer endgültig löschen

${c.bold}Hinweis:${c.reset}
  Läuft der Server, führt er die Befehle selbst aus – Änderungen gelten sofort.

${c.bold}Beispiele:${c.reset}
  docker exec flatswipe node server/cli.js users
  docker exec flatswipe node server/cli.js promote max
  docker exec flatswipe node server/cli.js password max geheimespasswort123
  docker exec flatswipe node server/cli.js info max
  docker exec flatswipe node server/cli.js delete altnutzer --confirm
`);
}

// ── Main ──────────────────────────────────────────────────
(async () => {
  const argv = process.argv.slice(2, 5);
  const cmd = argv[0];
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { printHelp(); process.exit(0); }

  let result;
  try {
    result = await sendToServer(DB_PATH, argv) || await runOnFile(argv);
  } catch (e) {
    fail(`${e.message}${process.env.DEBUG ? `\n${e.stack}` : ''}`);
  }
  for (const [stream, text] of result.lines) (stream === 'err' ? console.error : console.log)(text);
  process.exit(result.code);
})();
