// Admin-CLI gegen einen laufenden Server: Die Befehle gehen über den Socket an den Server und
// wirken sofort; ein Passwort-Reset meldet alte Sitzungen ab. Ohne Server arbeitet die CLI
// direkt auf der Datei.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const initSqlJs = require('sql.js');

const B = process.env.TEST_BASE, DB = process.env.TEST_DB;
const CLI = path.join(__dirname, '..', '..', 'server', 'cli.js');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const client = () => { let cookie = ''; return async (method, p, body) => {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const t = await r.text(); try { return JSON.parse(t); } catch (_) { return { _status: r.status }; } }; };
const cli = (args, dbPath = DB) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { env: { ...process.env, DB_PATH: dbPath, NO_COLOR: '1' }, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout + r.stderr).replace(/\x1b\[\d+m/g, '') };
};
const readFileDb = async (file) => { const SQL = await initSqlJs(); return new SQL.Database(fs.readFileSync(file)); };
const userRow = (db, email) => { const r = db.exec(`SELECT is_admin, pw_version FROM users WHERE email='${email}'`); return r[0] ? r[0].values[0] : null; };

(async () => {
  const sock = path.join(path.dirname(DB), 'admin.sock');
  ok(fs.existsSync(sock), 'server opens admin.sock next to the database');
  ok((fs.statSync(sock).mode & 0o777) === 0o600, 'socket only for the server user (0600)');

  const Ben = client();
  await Ben('POST', '/api/auth/register', { username: 'Ben', email: 'ben@x.de', password: 'secret123' });
  ok((await Ben('GET', '/api/auth/me')).is_admin === 0, 'Ben starts without admin rights');

  let r = cli(['users']);
  ok(r.code === 0 && /Anna/.test(r.out) && /Ben/.test(r.out), 'users lists both accounts (served by the running server)');

  r = cli(['promote', 'ben@x.de']);
  ok(r.code === 0 && /Admin-Rechte/.test(r.out), 'promote ben@x.de');
  ok((await Ben('GET', '/api/auth/me')).is_admin === 1, '… takes effect immediately in the running server');
  let fdb = await readFileDb(DB);
  ok(userRow(fdb, 'ben@x.de')[0] === 1, '… and is saved to the database file');

  r = cli(['password', 'Ben', 'neuesPasswort1']);
  ok(r.code === 0 && /abgemeldet/.test(r.out), 'password reset via CLI');
  ok((await Ben('GET', '/api/auth/me')).loggedIn === false, 'Ben\'s old session is logged out');
  const Old = client();
  ok(!(await Old('POST', '/api/auth/login', { email: 'ben@x.de', password: 'secret123' })).success, 'old password no longer works');
  const New = client();
  ok((await New('POST', '/api/auth/login', { email: 'ben@x.de', password: 'neuesPasswort1' })).success, 'new password works');

  r = cli(['password', 'Ben', 'kurz']);
  ok(r.code === 1 && /mindestens 6/.test(r.out), 'too short password is refused with exit code 1');
  r = cli(['info', 'ben']);
  ok(r.code === 0 && /ben@x\.de/.test(r.out), 'username is found regardless of case ("ben" → Ben)');
  r = cli(['promote', 'niemand']);
  ok(r.code === 1 && /nicht gefunden/.test(r.out), 'unknown user → exit code 1');
  r = cli(['quatsch']);
  ok(r.code === 1 && /Unbekannter Befehl/.test(r.out), 'unknown command → exit code 1');

  r = cli(['delete', 'ben@x.de']);
  ok(r.code === 0 && /--confirm/.test(r.out) && (await New('GET', '/api/auth/me')).loggedIn, 'delete without --confirm only previews');
  r = cli(['delete', 'ben@x.de', '--confirm']);
  ok(r.code === 0 && /gelöscht/.test(r.out), 'delete --confirm');
  ok((await New('GET', '/api/auth/me')).loggedIn === false, 'deleted user is logged out at once');
  ok(!(await client()('POST', '/api/auth/login', { email: 'ben@x.de', password: 'neuesPasswort1' })).success, 'deleted user cannot log in');

  // Without a server: the CLI works on the file itself
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flatswipe-cli-'));
  const copy = path.join(dir, 'copy.db');
  fs.copyFileSync(DB, copy);
  r = cli(['demote', 'anna@x.de'], copy);
  fdb = await readFileDb(copy);
  ok(r.code === 0 && userRow(fdb, 'anna@x.de')[0] === 0, 'without a running server the CLI changes the file directly');
  fs.writeFileSync(path.join(dir, 'admin.sock'), '');          // leftover socket file of a crashed server
  r = cli(['promote', 'anna@x.de'], copy);
  ok(r.code === 0 && userRow(await readFileDb(copy), 'anna@x.de')[0] === 1, 'a stale socket file does not get in the way');
  fs.rmSync(dir, { recursive: true, force: true });

  console.log(fails ? `${fails} FAILS` : 'all ok');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('Error:', e); process.exit(1); });
