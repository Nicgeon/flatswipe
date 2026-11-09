// Längenbegrenzungen: zu lange Eingaben werden mit 400 und einer verständlichen Meldung abgelehnt,
// Eingaben genau an der Grenze gehen durch.
const B = process.env.TEST_BASE;
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const client = () => { let cookie = ''; return async (method, p, body) => {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (_) { j = {}; } j._status = r.status; return j; }; };
const x = n => 'x'.repeat(n);

(async () => {
  const A = client();
  let r = await A('POST', '/api/auth/register', { username: x(41), email: 'long@x.de', password: 'secret123' });
  ok(r._status === 400 && /Username ist zu lang \(höchstens 40/.test(r.error), 'register: username > 40 refused');
  r = await A('POST', '/api/auth/register', { username: 'Lang', email: 'long@x.de', password: x(201) });
  ok(r._status === 400 && /Passwort ist zu lang/.test(r.error), 'register: password > 200 refused');
  r = await A('POST', '/api/auth/register', { username: x(40), email: 'long@x.de', password: 'secret123' });
  ok(r.success, 'register: username of exactly 40 characters is fine');

  r = await A('PUT', '/api/user/username', { username: x(41) });
  ok(r._status === 400, 'username change > 40 refused');
  r = await A('PUT', '/api/user/password', { currentPassword: 'secret123', newPassword: x(201) });
  ok(r._status === 400 && /zu lang/.test(r.error), 'password change > 200 refused');

  r = await A('POST', '/api/groups/create', { name: x(81) });
  ok(r._status === 400 && /Gruppenname ist zu lang/.test(r.error), 'group name > 80 refused');
  r = await A('POST', '/api/groups/create', { name: { evil: true } });
  ok(r._status === 400, 'group name that is not a string → 400 instead of a server error');
  const g = (await A('POST', '/api/groups/create', { name: x(80) })).group;
  ok(g && g.name.length === 80, 'group name of exactly 80 characters is fine');

  r = await A('POST', '/api/jobs', { label: x(101), search_url: 'https://www.kleinanzeigen.de/s-wohnung-mieten/bremen/c203l1' });
  ok(r._status === 400 && /Bezeichnung ist zu lang/.test(r.error), 'search agent label > 100 refused');
  r = await A('POST', '/api/jobs', { label: 'Lang', search_url: 'https://www.kleinanzeigen.de/s-wohnung-mieten/bremen/c203l1?q=' + x(2000) });
  ok(r._status === 400 && /Such-URL ist zu lang/.test(r.error), 'search URL > 2000 refused');
  r = await A('POST', '/api/listings/add', { url: 'https://www.kleinanzeigen.de/s-anzeige/' + x(2000) });
  ok(r._status === 400 && /URL ist zu lang/.test(r.error), 'listing URL > 2000 refused');

  r = await A('PUT', '/api/user/notifications', { ntfy_topic: x(101) });
  ok(r._status === 400 && /ntfy-Topic ist zu lang/.test(r.error), 'ntfy topic > 100 refused');
  r = await A('POST', '/api/push/subscribe', { endpoint: 'https://push.example.com/' + x(2000), keys: { p256dh: 'a', auth: 'b' } });
  ok(r._status === 400, 'push endpoint > 2000 refused');

  r = await A('POST', '/api/contacts', { listingId: 1, note: x(2001) });
  ok(r._status === 400 && /Notiz ist zu lang/.test(r.error), 'contact note > 2000 refused');
  r = await A('PATCH', '/api/contacts/1', { note: x(2001) });
  ok(r._status === 400, 'contact note update > 2000 refused');
  r = await A('POST', '/api/contacts', { listingId: 1, note: x(2000) });
  ok(r.success, 'contact note of exactly 2000 characters is fine');

  console.log(fails ? `${fails} FAILS` : 'all ok');
})().catch(e => { console.error('ERR', e); process.exit(1); });
