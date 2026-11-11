"use strict";
/* ---------- Detailansicht (Produktseite): wenig sichtbar, Technik unter „Erweitert“ ---------- */
function shareLink(a){ return ['url', 'lib'].includes(a.cat) ? a.url : location.href.split(/[?#]/)[0] + `?source=${encodeURIComponent(a.sid)}&app=${encodeURIComponent(a.key)}`; }
async function copyLink(a, b){ try { await navigator.clipboard.writeText(shareLink(a)); toast('Link kopiert.'); if (b) b.textContent = 'Kopiert ✓'; } catch { prompt('Link kopieren:', shareLink(a)); } }
function detail(a){
  const d = $('#detail'), p = el('div', 'dp'); p.style.setProperty('--h', a.hue); d.replaceChildren(p);
  const src = cover(a), amb = el('div', 'amb'); if (src && !isVid(src)) amb.style.backgroundImage = `url("${String(src).replace(/"/g, '%22')}")`; p.appendChild(amb);
  const x = el('button', 'x', '✕'); x.setAttribute('aria-label', 'Schließen'); x.onclick = closeDetail; p.appendChild(x);
  const gal = el('div', 'gal'), items = (a.previews && a.previews.length ? a.previews : [a.og]).filter(Boolean);
  if (items.length) items.forEach(s => { const m = media(s, a); if (isVid(s)) m.onclick = () => m.paused ? m.play() : m.pause(); gal.appendChild(m); });
  else { const n = el('div', 'none'); n.appendChild(iconEl(a, 'xl')); gal.appendChild(n); }
  p.appendChild(gal);
  const s = srcOf(a), head = el('div', 'head'), t = el('div');
  t.append(el('h2', null, a.name), el('div', 'sub', [a.type === 'game' ? 'Game' : 'App', a.category].filter(Boolean).join(' · '))); head.append(iconEl(a, 'xl'), t); p.appendChild(head);
  const acts = el('div', 'acts'), go = el('button', 'btn big', goLabel(a)); go.onclick = () => { closeDetail(); openApp(a); };
  acts.append(go, favBtn(a));
  if (!a.local){ const sh = el('button', 'ib glass'); sh.innerHTML = ICON.share; sh.setAttribute('aria-label', 'Teilen'); sh.onclick = () => navigator.share ? navigator.share({ title: a.name, url: shareLink(a) }).catch(() => {}) : copyLink(a); acts.appendChild(sh); }
  p.appendChild(acts);
  const st = el('div', 'stat');
  if (a.update){ const b = el('button', 'btn up', '⬆ Update verfügbar'); b.onclick = () => { closeDetail(); installApp(a, 'update'); }; st.appendChild(b); }
  else if (a.inst || a.local) st.appendChild(el('span', 'pill', '✓ Offline verfügbar'));
  else if (a.files){ const b = el('button', 'btn gh', '⬇ Offline speichern'); b.onclick = () => { closeDetail(); installApp(a, 'install'); }; st.appendChild(b); }
  if (st.children.length) p.appendChild(st);
  p.appendChild(el('p', 'dsc', a.desc || 'Keine Beschreibung vorhanden.'));
  if (a.tags && a.tags.length){ const tg = el('div'); a.tags.forEach(x => { const t = el('button', 'tag', x); t.onclick = () => { query = x; $('#q').value = x; view = 'discover'; closeDetail(); render(); }; tg.appendChild(t); }); p.appendChild(tg); }
  /* Erweitert: nur für Interessierte und Entwickler */
  const adv = el('details', 'adv glass'); adv.appendChild(el('summary', null, 'Erweitert'));
  const dl = el('dl'), row = (k, v) => { if (v) dl.append(el('dt', null, k), el('dd', null, String(v))); }, sz = a.inst ? a.inst.size : a.size;
  row('Version', a.version); row('Entwickler', a.dev); row('Veröffentlicht', a.pub); row('Geändert', a.mod);
  row('Quelle', (s.name || '') + (s.type === 'repo' ? ` (${s.owner}/${s.repo})` : '') + (s.main || s.local ? '' : ' · externe Quelle')); row('Auch in', (a.dups || []).join(', '));
  row('Installiert', a.inst ? 'Version ' + (a.inst.version || 'ohne Angabe') + (a.update ? ' (Update verfügbar)' : '') : ''); row('Speicher', sz ? (sz / 1048576).toFixed(1) + ' MB' : '');
  row('Berechtigungen', (a.permissions || []).join(', ') || 'keine Angabe'); row('Dieses Gerät', compat(a)); row('Hinweis', a.metaErr || (a.broken ? 'Startdatei nicht erreichbar oder keine gültige HTML-Datei' : ''));
  const off = el('dd', null, 'Wird geprüft …'); dl.append(el('dt', null, 'Offline'), off); adv.appendChild(dl);
  (window.caches ? caches.match(a.url) : Promise.resolve(null)).then(r => { off.textContent = a.local || a.inst ? 'Vollständig offline verfügbar.' : r ? 'Teilweise offline: Startdatei und bereits besuchte Dateien.' : 'Nicht offline verfügbar. „Offline speichern“ sichert alles.'; });
  const ac = el('div', 'acts'), mk = (txt, fn) => { const b = el('button', 'btn gh', txt); b.onclick = fn; ac.appendChild(b); return b; };
  ac.append(pinBtn(a), folderBtn(a));
  if (a.local){
    mk('Bearbeiten', () => editLocal(a));
    mk('Neue Version importieren', async () => { const k = await ask('Neue Version importieren', 'Welches Format hat die neue Version?', [{ label: 'ZIP-Webapp', value: 'zip', primary: true }, { label: 'HTML-Datei', value: 'html' }, { label: 'Abbrechen', value: null }]); if (k){ closeDetail(); pickImport(k, a); } });
    mk('Als ZIP exportieren', () => exportLocal(a)); mk('Löschen', () => deleteLocal(a));
  } else {
    const cp = mk('Link kopieren', () => copyLink(a, cp)), qr = el('div'); qr.style.cssText = 'margin:6px 0 14px;padding:14px;border-radius:18px;background:#fff;max-width:260px;display:none';
    mk('QR-Code', () => { if (!qr.innerHTML){ try { qr.innerHTML = qrSvg(shareLink(a)); } catch (e){ return toast('QR-Code nicht möglich: ' + e.message); } } qr.style.display = qr.style.display === 'none' ? 'block' : 'none'; });
    if (a.inst){ mk('Als ZIP exportieren', () => exportLocal({ uid: a.inst.id, name: a.name })); mk('Installation entfernen', () => removeInstall(a)); }
    adv.append(ac, qr);
  }
  if (a.local) adv.appendChild(ac);
  if (a.changelog && a.changelog.length){ adv.appendChild(el('h4', null, 'Änderungsprotokoll')); const ul = el('ul'); a.changelog.forEach(c => ul.appendChild(el('li', null, typeof c === 'string' ? c : [c.version, c.text || c.notes].filter(Boolean).join(': ')))); adv.appendChild(ul); }
  p.appendChild(adv); d.classList.add('open');
}
function closeDetail(){ const d = $('#detail'); d.classList.remove('open'); d.replaceChildren(); }
$('#detail').addEventListener('click', e => { if (e.target.id === 'detail') closeDetail(); });
