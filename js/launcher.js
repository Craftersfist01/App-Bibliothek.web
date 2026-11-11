"use strict";
/* ---------- App starten / schließen + Zurück-Geste ---------- */
function openApp(a){
  recents = [a.id, ...recents.filter(x => x !== a.id)].slice(0, 12); LS.set('al.recents', recents); logOpen(a);
  $('#frame').setAttribute('allow', allowFor(a)); $('#frame').src = a.openUrl || a.url; document.body.classList.add('running'); document.title = a.name;
  tip('open', 'Tipp: Halte oben rechts gedrückt, um zur Bibliothek zurückzukehren.');
}
function closeApp(){
  document.body.classList.remove('running'); $('#xb').classList.remove('show'); document.title = 'App Library';
  setTimeout(() => { if (!document.body.classList.contains('running')) $('#frame').src = 'about:blank'; }, 480); render();
}
let ht = 0, xt = 0; const hot = $('#hot');
hot.addEventListener('pointerdown', () => { clearTimeout(ht); ht = setTimeout(() => { const x = $('#xb'); x.classList.add('show'); navigator.vibrate && navigator.vibrate(12); clearTimeout(xt); xt = setTimeout(() => x.classList.remove('show'), 1300); }, 900); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => hot.addEventListener(t, () => clearTimeout(ht)));
hot.addEventListener('contextmenu', e => e.preventDefault());
hot.addEventListener('click', e => { if (e.detail === 0) closeApp(); }); /* Tastatur / Screenreader */
$('#xb').onclick = closeApp;
addEventListener('keydown', e => { if (e.key === 'Escape'){ if ($('#detail').classList.contains('open')) closeDetail(); else if (document.body.classList.contains('running')) closeApp(); } });

