// Seite "Neues Passwort" (/reset-password?token=…) – eigene Datei wegen der Content-Security-Policy
(function () {
  const token = new URLSearchParams(location.search).get('token');
  const msg = document.getElementById('msg');
  const show = (cls, text) => { msg.className = 'msg ' + cls; msg.textContent = text; };
  document.getElementById('reset-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw1 = document.getElementById('pw1').value;
    const pw2 = document.getElementById('pw2').value;
    if (!pw1 || pw1.length < 6) return show('err', 'Mindestens 6 Zeichen');
    if (pw1 !== pw2)            return show('err', 'Passwörter stimmen nicht überein');
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pw1 }),
    }).then(r => r.json()).catch(() => ({ error: 'Keine Verbindung zum Server' }));
    if (r.success) {
      show('ok', '✓ Passwort geändert – du kannst dich jetzt einloggen.');
      setTimeout(() => { location.href = '/'; }, 2000);
    } else {
      show('err', r.error || 'Fehler');
    }
  });
})();
