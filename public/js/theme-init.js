// Wird synchron im <head> geladen (eigene Datei statt Inline-Skript, wegen der Content-Security-Policy).
// Apply the saved theme before first paint (no dark→light flash). 'auto' follows the OS.
(function () {
  try {
    var m = localStorage.getItem('ws-theme') || 'dark';
    var sysDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    var t = m === 'auto' ? (sysDark ? 'dark' : 'light') : m;
    document.documentElement.dataset.theme = t;
    document.getElementById('meta-theme-color').setAttribute('content', t === 'light' ? '#f6f2ea' : '#0f0f11');
  } catch (e) {}
})();
