"use strict";
/* ---------- Start ---------- */
const mq = matchMedia('(prefers-color-scheme: light)');
function applyTheme(){ const t = S.theme === 'auto' ? (mq.matches ? 'light' : 'dark') : S.theme; document.documentElement.dataset.theme = t; document.querySelector('meta[name=theme-color]').content = t === 'light' ? '#eef0f7' : '#0b0d14'; }
mq.addEventListener && mq.addEventListener('change', applyTheme);
try { /* Apple-Touch-Icon für den Home-Bildschirm */
  const c = el('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 180, 180); g.addColorStop(0, '#5b6cff'); g.addColorStop(1, '#ff5fa8'); x.fillStyle = g; x.fillRect(0, 0, 180, 180); x.fillStyle = 'rgba(255,255,255,.92)';
  [[36, 36], [100, 36], [36, 100], [100, 100]].forEach(p => x.fillRect(p[0], p[1], 44, 44)); const l = el('link'); l.rel = 'apple-touch-icon'; l.href = c.toDataURL('image/png'); document.head.appendChild(l);
} catch {}
$('#q').addEventListener('input', e => { query = e.target.value; render(); });
document.documentElement.classList.toggle('safe', !!S.safe);
if ('serviceWorker' in navigator && HTTP) navigator.serviceWorker.register('sw.js').catch(() => {});
applyTheme(); render(); loadAll(false).then(resumeWork);
tip('welcome', 'Willkommen in deiner App-Bibliothek! Hier findest du deine Apps und Games an einem Ort.');
