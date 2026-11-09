/**
 * admin.js – die Befehle der Admin-CLI (users, info, promote, demote, password, delete)
 *
 * Die Befehle laufen an zwei Stellen:
 *   • im laufenden Server, auf seiner Datenbank im Speicher. Die CLI schickt sie über einen
 *     lokalen Socket im Datenverzeichnis (siehe serveAdminSocket). Nur so bleiben Änderungen
 *     erhalten: Der Server schreibt seine Datenbank regelmäßig komplett auf die Platte und würde
 *     eine direkt in die Datei geschriebene Änderung wieder überschreiben.
 *   • direkt auf der Datei, wenn kein Server läuft (cli.js).
 *
 * Ein Befehl bekommt `db` mit all/get/run und `out` für die Ausgabe. Fehler werfen
 * AdminError (Exit-Code 1), die Rückgabe ist der Exit-Code.
 */
const fs     = require('fs');
const net    = require('net');
const path   = require('path');
const bcrypt = require('bcryptjs');

class AdminError extends Error {}

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', gray: '\x1b[90m',
};
const bold = msg => `${c.bold}${msg}${c.reset}`;

// Sammelt die Ausgabe als [stream, text]-Zeilen – ausgegeben wird sie von der CLI
function makeOut() {
  const lines = [];
  return {
    lines,
    log:  msg => lines.push(['out', msg]),
    ok:   msg => lines.push(['out', `${c.green}✓${c.reset} ${msg}`]),
    info: msg => lines.push(['out', `${c.cyan}→${c.reset} ${msg}`]),
    warn: msg => lines.push(['out', `${c.yellow}⚠${c.reset}  ${msg}`]),
    err:  msg => lines.push(['err', `${c.red}✗ ${msg}${c.reset}`]),
  };
}

// Exakter Treffer zuerst; sonst ohne Groß-/Kleinschreibung, aber nur wenn das eindeutig ist
// (Benutzernamen wie "Max" und "max" können nebeneinander existieren).
function findUser(db, identifier) {
  const exact = db.get('SELECT * FROM users WHERE username=? OR email=?', [identifier, identifier]);
  if (exact) return exact;
  const loose = db.all('SELECT * FROM users WHERE username=? COLLATE NOCASE OR email=? COLLATE NOCASE', [identifier, identifier]);
  if (loose.length > 1) throw new AdminError(`"${identifier}" passt auf mehrere Nutzer – bitte genau schreiben oder die E-Mail nehmen.`);
  return loose[0] || null;
}
function needUser(db, identifier, usage = 'Bitte Username oder E-Mail angeben.') {
  if (!identifier) throw new AdminError(usage);
  const user = findUser(db, identifier);
  if (!user) throw new AdminError(`Nutzer nicht gefunden: "${identifier}"`);
  return user;
}

// ── Befehle ───────────────────────────────────────────────
function cmdUsers(db, out) {
  const users = db.all('SELECT id,username,email,is_admin,created_at FROM users ORDER BY id');
  if (!users.length) { out.warn('Keine Nutzer in der Datenbank.'); return; }
  const line = `${c.gray}${'─'.repeat(85)}${c.reset}`;
  out.log(`\n${c.bold}${c.cyan}Flatswipe – Nutzer (${users.length})${c.reset}`);
  out.log(line);
  out.log(bold('ID  ').padEnd(14) + bold('Username').padEnd(20) + bold('E-Mail').padEnd(30) + bold('Admin').padEnd(7) + bold('Registriert'));
  out.log(line);
  for (const u of users) {
    const adminStr = u.is_admin ? `${c.yellow}✓ Ja${c.reset}` : `${c.gray}Nein${c.reset}`;
    const dateStr  = u.created_at ? u.created_at.substring(0, 16) : '—';
    out.log(`${c.gray}${String(u.id).padEnd(4)}${c.reset}  ${u.username.padEnd(20)}${u.email.padEnd(30)}${adminStr.padEnd(21)}${c.gray}${dateStr}${c.reset}`);
  }
  out.log(line);
  out.log(`${c.gray}${users.length} Nutzer insgesamt${c.reset}\n`);
}

function cmdPromote(db, out, identifier) {
  const user = needUser(db, identifier, 'Bitte Username oder E-Mail angeben.\n  Beispiel: node server/cli.js promote max');
  if (user.is_admin) { out.warn(`${user.username} ist bereits Admin.`); return; }
  db.run('UPDATE users SET is_admin=1 WHERE id=?', [user.id]);
  out.ok(`${bold(user.username)} (${user.email}) hat jetzt Admin-Rechte.`);
}

function cmdDemote(db, out, identifier) {
  const user = needUser(db, identifier);
  if (!user.is_admin) { out.warn(`${user.username} ist kein Admin.`); return; }
  db.run('UPDATE users SET is_admin=0 WHERE id=?', [user.id]);
  out.ok(`Admin-Rechte von ${bold(user.username)} (${user.email}) wurden entfernt.`);
}

async function cmdPassword(db, out, identifier, newPassword) {
  const usage = 'Verwendung: node server/cli.js password <username|email> <neues-passwort>';
  if (!identifier || !newPassword) throw new AdminError(usage);
  if (newPassword.length < 6) throw new AdminError('Passwort muss mindestens 6 Zeichen lang sein.');
  if (newPassword.length > 200) throw new AdminError('Passwort ist zu lang (höchstens 200 Zeichen).');
  const user = needUser(db, identifier, usage);
  const hash = await bcrypt.hash(newPassword, 10);
  // pw_version hochzählen meldet alle bestehenden Sitzungen dieses Kontos ab (wie beim
  // Passwortwechsel in der App) – wichtig, wenn das Konto übernommen wurde.
  db.run('UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL, pw_version=COALESCE(pw_version,0)+1 WHERE id=?',
    [hash, user.id]);
  out.ok(`Passwort für ${bold(user.username)} (${user.email}) wurde geändert.`);
  out.info('Alle bestehenden Sitzungen dieses Kontos sind abgemeldet.');
}

function deletePreview(db, out, user, identifier) {
  const count = (sql) => db.get(sql, [user.id])?.c || 0;
  out.warn('Du bist dabei, folgenden Nutzer zu löschen:');
  out.log(`  ID:       ${user.id}`);
  out.log(`  Username: ${bold(user.username)}`);
  out.log(`  E-Mail:   ${user.email}`);
  out.log(`  Admin:    ${user.is_admin ? 'Ja' : 'Nein'}`);
  out.log(`  Daten:    ${count('SELECT COUNT(*) as c FROM swipes WHERE user_id=?')} Swipes · `
        + `${count('SELECT COUNT(*) as c FROM group_members WHERE user_id=?')} Gruppen · `
        + `${count('SELECT COUNT(*) as c FROM search_jobs WHERE added_by=?')} Suchagenten`);
  out.log('');
  out.warn(`${c.red}${c.bold}Diese Aktion kann nicht rückgängig gemacht werden!${c.reset}`);
  out.log('');
  out.info('Zum Bestätigen: Führe den Befehl mit --confirm aus:');
  out.log(`  node server/cli.js delete ${identifier} --confirm`);
}

function cmdDelete(db, out, identifier, confirm) {
  const user = needUser(db, identifier);
  if (!confirm) { deletePreview(db, out, user, identifier); return; }
  const id = [user.id];
  db.run('DELETE FROM swipes              WHERE user_id=?', id);
  db.run('DELETE FROM group_members       WHERE user_id=?', id);
  db.run('DELETE FROM group_join_requests WHERE user_id=?', id);
  db.run('DELETE FROM group_templates     WHERE user_id=?', id);
  db.run('DELETE FROM applicant_profiles  WHERE user_id=?', id);
  db.run('DELETE FROM push_subscriptions  WHERE user_id=?', id);
  db.run('DELETE FROM contacts            WHERE user_id=?', id);
  db.run('DELETE FROM notification_queue  WHERE user_id=?', id);
  db.run('UPDATE search_jobs     SET added_by=NULL WHERE added_by=?', id);
  db.run('UPDATE listing_sources SET added_by=NULL WHERE added_by=?', id);
  db.run('UPDATE groups_table    SET created_by=NULL WHERE created_by=?', id);
  db.run('DELETE FROM users               WHERE id=?', id);
  out.ok(`Nutzer ${bold(user.username)} wurde gelöscht.`);
}

function cmdInfo(db, out, identifier) {
  const user = needUser(db, identifier);
  const swipes   = db.all('SELECT action, COUNT(*) as c FROM swipes WHERE user_id=? GROUP BY action', [user.id]);
  const groups   = db.all('SELECT g.name FROM groups_table g JOIN group_members gm ON g.id=gm.group_id WHERE gm.user_id=?', [user.id]);
  const jobs     = db.all('SELECT label, visibility FROM search_jobs WHERE added_by=?', [user.id]);
  const queueLen = db.get('SELECT COUNT(*) as c FROM notification_queue WHERE user_id=?', [user.id])?.c || 0;
  out.log(`\n${c.bold}${c.cyan}Nutzer: ${user.username}${c.reset}`);
  out.log('─'.repeat(40));
  out.log(`  ID:           ${user.id}`);
  out.log(`  Username:     ${bold(user.username)}`);
  out.log(`  E-Mail:       ${user.email}`);
  out.log(`  Admin:        ${user.is_admin ? `${c.yellow}Ja${c.reset}` : 'Nein'}`);
  out.log(`  Registriert:  ${user.created_at || '—'}`);
  out.log(`  Digest:       ${user.notify_digest_interval || 'instant'} | Schwellenwert: ${user.notify_threshold || 1}`);
  out.log(`  ntfy-Topic:   ${user.ntfy_topic || '(nicht gesetzt)'}`);
  out.log('');
  out.log('  Swipes:');
  swipes.forEach(s => out.log(`    ${s.action.padEnd(10)} ${s.c}x`));
  out.log(`  Gruppen:      ${groups.map(g => g.name).join(', ') || '(keine)'}`);
  out.log(`  Suchagenten:  ${jobs.map(j => `${j.label} [${j.visibility}]`).join(', ') || '(keine)'}`);
  out.log(`  Queue:        ${queueLen} ausstehende Benachrichtigungen`);
  out.log('');
}

// Befehle, die etwas ändern – danach muss gespeichert werden
const WRITES = new Set(['promote', 'demote', 'password', 'delete']);

/**
 * Führt einen Befehl aus. argv = [befehl, arg1, arg2]
 * @returns {Promise<{code:number, lines:Array, changed:boolean}>}
 */
async function runCommand(db, argv) {
  const [cmd, arg1, arg2] = argv;
  const out = makeOut();
  let code = 0;
  try {
    switch (cmd) {
      case 'users':    cmdUsers(db, out); break;
      case 'info':     cmdInfo(db, out, arg1); break;
      case 'promote':  cmdPromote(db, out, arg1); break;
      case 'demote':   cmdDemote(db, out, arg1); break;
      case 'password': await cmdPassword(db, out, arg1, arg2); break;
      case 'delete':   cmdDelete(db, out, arg1, arg2 === '--confirm'); break;
      default:
        out.err(`Unbekannter Befehl: "${cmd}"`);
        out.info('Verfügbare Befehle: users, promote, demote, password, info, delete');
        out.info('Hilfe:              node server/cli.js help');
        code = 1;
    }
  } catch (e) {
    if (e instanceof AdminError) out.err(e.message);
    else { out.err(`Unerwarteter Fehler: ${e.message}`); if (process.env.DEBUG) out.err(e.stack); }
    code = 1;
  }
  return { code, lines: out.lines, changed: code === 0 && WRITES.has(cmd) };
}

// ── Socket zwischen CLI und laufendem Server ──────────────
const socketPath = dbFile => path.join(path.dirname(path.resolve(dbFile)), 'admin.sock');

/**
 * Im Server: nimmt CLI-Befehle über einen Unix-Socket im Datenverzeichnis entgegen.
 * Der Socket ist nur für den Nutzer des Server-Prozesses zugänglich (0600) – wer ihn
 * erreicht, kommt ohnehin an die Datenbankdatei.
 * @param db    {all, get, run} auf der Datenbank im Speicher
 * @param save  speichert die Datenbank
 */
function serveAdminSocket(dbFile, db, save) {
  if (process.platform === 'win32') return null;            // dort arbeitet die CLI direkt auf der Datei
  const sock = socketPath(dbFile);
  try { fs.unlinkSync(sock); } catch (_) {}                 // Rest eines abgestürzten Servers
  const server = net.createServer(conn => {
    let buf = '';
    conn.setEncoding('utf8');
    conn.on('data', async chunk => {
      buf += chunk;
      if (buf.length > 10000) return conn.destroy();
      const nl = buf.indexOf('\n');
      if (nl < 0) return;
      let argv;
      try { argv = JSON.parse(buf.slice(0, nl)).argv; } catch (_) { return conn.destroy(); }
      if (!Array.isArray(argv) || !argv.every(a => typeof a === 'string')) return conn.destroy();
      const result = await runCommand(db, argv);
      if (result.changed) save();
      conn.end(JSON.stringify({ code: result.code, lines: result.lines }) + '\n');
    });
    conn.on('error', () => {});
  });
  server.on('error', e => console.error(`[Admin-CLI] Socket ${sock} nicht verfügbar: ${e.message}`));
  const oldMask = process.umask(0o177);                     // Socket gleich mit 0600 anlegen
  server.listen(sock, () => { try { fs.chmodSync(sock, 0o600); } catch (_) {} });
  process.umask(oldMask);
  const cleanup = () => { try { fs.unlinkSync(sock); } catch (_) {} };
  process.on('exit', cleanup);
  return server;
}

/**
 * In der CLI: schickt den Befehl an den laufenden Server.
 * @returns das Ergebnis, oder null wenn kein Server erreichbar ist
 */
function sendToServer(dbFile, argv, timeoutMs = 15000) {
  const sock = socketPath(dbFile);
  if (process.platform === 'win32' || !fs.existsSync(sock)) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const conn = net.createConnection(sock);
    let buf = '', connected = false;
    const timer = setTimeout(() => { conn.destroy(); reject(new Error('Der Server antwortet nicht.')); }, timeoutMs);
    conn.setEncoding('utf8');
    conn.on('connect', () => { connected = true; conn.write(JSON.stringify({ argv }) + '\n'); });
    conn.on('data', d => { buf += d; });
    conn.on('end', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(buf)); } catch (_) { reject(new Error('Ungültige Antwort vom Server.')); }
    });
    conn.on('error', e => {
      clearTimeout(timer);
      // Socket-Datei ohne Server dahinter (z. B. nach einem Absturz) → direkt auf der Datei arbeiten
      if (!connected && (e.code === 'ECONNREFUSED' || e.code === 'ENOENT')) resolve(null);
      else reject(e);
    });
  });
}

module.exports = { runCommand, serveAdminSocket, sendToServer, socketPath, c };
