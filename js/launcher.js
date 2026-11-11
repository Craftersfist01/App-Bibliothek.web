"use strict";
/* ---------- App starten / schließen + Zurück-Geste ---------- */
function openApp(a){
  recents = [a.id, ...recents.filter(x => x !== a.id)].slice(0, 12); LS.set('al.recents', recents); logOpen(a);
  $('#frame').setAttribute('allow', allowFor(a)); $('#frame').src = a.openUrl || a.url; document.body.classList.add('running', 'ovl'); document.title = a.name;
  tip('open', 'Tipp: Halte oben rechts gedrückt, um zur Bibliothek zurückzukehren.');
}
function closeApp(){
  document.body.classList.remove('running', 'ovl'); $('#xb').classList.remove('show'); document.title = 'App Library';
  setTimeout(() => { if (!document.body.classList.contains('running')) $('#frame').src = 'about:blank'; }, 480); render();
}
let ht = 0, xt = 0; const hot = $('#hot');
const showX = () => { const x = $('#xb'); x.classList.add('show'); navigator.vibrate && navigator.vibrate(12); clearTimeout(xt); xt = setTimeout(() => x.classList.remove('show'), 1300); };
hot.addEventListener('pointerdown', () => { clearTimeout(ht); ht = setTimeout(showX, 900); }); /* nur Rückfall für fremde Domains */
/* Gleiche Domain: Gesten werden direkt im App-Dokument beobachtet, nichts liegt über der App, Tippen und Bedienen bleiben unverändert. */
const probe = el('div'); probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)'; document.body.appendChild(probe);
function wireCorner(){
  if (!document.body.classList.contains('running')) return;
  let w, d; try { w = $('#frame').contentWindow; d = w.document; void d.documentElement; w.location.href; } catch { document.body.classList.add('ovl'); return; }
  if (!d || w.location.href === 'about:blank') return;
  document.body.classList.remove('ovl');
  let t = 0, sx = 0, sy = 0; const stop = () => { clearTimeout(t); t = 0; };
  const inZone = e => e.clientX > w.innerWidth - 64 && e.clientY < 64 + (parseFloat(getComputedStyle(probe).paddingTop) || 0);
  d.addEventListener('pointerdown', e => { if (!inZone(e)) return; sx = e.clientX; sy = e.clientY; stop(); t = setTimeout(showX, 900); }, { capture: true, passive: true });
  d.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 14) stop(); }, { capture: true, passive: true });
  ['pointerup', 'pointercancel'].forEach(n => d.addEventListener(n, stop, { capture: true, passive: true }));
}
$('#frame').addEventListener('load', wireCorner);
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => hot.addEventListener(t, () => clearTimeout(ht)));
hot.addEventListener('contextmenu', e => e.preventDefault());
hot.addEventListener('click', e => { if (e.detail === 0) closeApp(); }); /* Tastatur / Screenreader */
$('#xb').onclick = closeApp;
addEventListener('keydown', e => { if (e.key === 'Escape'){ if ($('#detail').classList.contains('open')) closeDetail(); else if (document.body.classList.contains('running')) closeApp(); } });

