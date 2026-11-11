"use strict";
/* ---------- Detailansicht ---------- */
function shareLink(a){ return ['url', 'lib'].includes(a.cat) ? a.url : location.href.split(/[?#]/)[0] + `?source=${encodeURIComponent(a.sid)}&app=${encodeURIComponent(a.key)}`; }
function detail(a){
  const d = $('#detail'), p = el('div', 'dp'); d.replaceChildren(p);
  const x = el('button', 'x', '✕'); x.setAttribute('aria-label', 'Schließen'); x.onclick = closeDetail; p.appendChild(x);
  const gal = el('div', 'gal'), items = (a.previews && a.previews.length ? a.previews : [a.og]).filter(Boolean);
  if (items.length) items.forEach(s => gal.appendChild(media(s, a, true))); else { const n = el('div', 'none'); n.style.setProperty('--h', a.hue); n.appendChild(iconEl(a, 'xl')); gal.appendChild(n); }
  p.appendChild(gal);
  const head = el('div', 'head'), t = el('div'), s = srcOf(a);
  t.append(el('h2', null, a.name), el('small', null, (s.name || '') + (s.main || s.local ? '' : ' · externe Quelle'))); head.append(iconEl(a, 'xl'), t); p.appendChild(head);
  const acts = el('div', 'acts'), go = el('button', 'btn', goLabel(a)); go.onclick = () => { closeDetail(); openApp(a); };
  const fv = el('button', 'btn gh', favs.includes(a.id) ? '★ Favorit' : '☆ Favorit'); fv.onclick = () => { favs = favs.includes(a.id) ? favs.filter(x => x !== a.id) : [a.id, ...favs]; LS.set('al.favs', favs); tip('fav', 'Mit dem Stern findest du deine Lieblingsapps schneller.'); render(); detail(a); };
  const cp = el('button', 'btn gh', 'Link kopieren'); cp.onclick = async () => { try { await navigator.clipboard.writeText(shareLink(a)); cp.textContent = 'Kopiert ✓'; } catch { prompt('Link kopieren:', shareLink(a)); } };
  acts.append(go, fv, pinBtn(a), folderBtn(a));
  if (a.local){
    const ex = el('button', 'btn gh', 'Als ZIP exportieren'), dl2 = el('button', 'btn gh', 'Löschen'); ex.onclick = () => exportLocal(a); dl2.onclick = () => deleteLocal(a); const ed = el('button', 'btn gh', 'Bearbeiten'), up = el('button', 'btn gh', 'Neue Version importieren'); ed.onclick = () => editLocal(a);
    up.onclick = async () => { const k = await ask('Neue Version importieren', 'Welches Format hat die neue Version?', [{ label: 'ZIP-Webapp', value: 'zip', primary: true }, { label: 'HTML-Datei', value: 'html' }, { label: 'Abbrechen', value: null }]); if (k){ closeDetail(); pickImport(k, a); } };
    acts.append(ed, up, ex, dl2);
  } else {
    acts.appendChild(cp);
    const qr = el('div'); qr.style.cssText = 'margin:14px 20px 0;padding:14px;border-radius:18px;background:#fff;max-width:260px;display:none'; acts.qrBox = qr;
    const qb = el('button', 'btn gh', 'QR-Code'); qb.onclick = () => { if (!qr.innerHTML){ try { qr.innerHTML = qrSvg(shareLink(a)); } catch (e) { return toast('QR-Code nicht möglich: ' + e.message); } } qr.style.display = qr.style.display === 'none' ? 'block' : 'none'; };
    acts.appendChild(qb);
    if (a.files){
      if (!a.inst){ const ib = el('button', 'btn gh', 'Installieren'); ib.onclick = () => { closeDetail(); installApp(a, 'install'); }; acts.appendChild(ib); }
      else {
        if (a.update){ const ub = el('button', 'btn', 'Update'); ub.onclick = () => { closeDetail(); installApp(a, 'update'); }; acts.appendChild(ub); }
        const rb = el('button', 'btn gh', 'Installation entfernen'); rb.onclick = () => removeInstall(a); const xb2 = el('button', 'btn gh', 'Als ZIP exportieren'); xb2.onclick = () => exportLocal({ uid: a.inst.id, name: a.name }); acts.append(xb2, rb);
      }
    }
  }
  if (navigator.share && !a.local){ const sh = el('button', 'btn gh', 'Teilen'); sh.onclick = () => navigator.share({ title: a.name, url: shareLink(a) }).catch(() => {}); acts.appendChild(sh); }
  p.appendChild(acts); if (acts.qrBox) p.appendChild(acts.qrBox);
  const dsc = el('p', null, a.desc || 'Keine Beschreibung vorhanden.'); dsc.style.cssText = 'color:var(--tx);margin-top:16px'; p.appendChild(dsc);
  if (a.tags && a.tags.length){ const tg = el('div'); a.tags.forEach(x => { const t = el('span', 'tag', x); t.style.cursor = 'pointer'; t.onclick = () => { query = x; $('#q').value = x; view = 'discover'; closeDetail(); render(); }; tg.appendChild(t); }); p.appendChild(tg); }
  const dl = el('dl'), row = (k, v) => { if (v) { dl.append(el('dt', null, k), el('dd', null, String(v))); } };
  row('Typ', a.type === 'game' ? 'Game' : 'App'); row('Kategorie', a.category); row('Version', a.version); row('Entwickler', a.dev);
  row('Veröffentlicht', a.pub); row('Geändert', a.mod); row('Quelle', s.name + (s.type === 'repo' ? ` (${s.owner}/${s.repo})` : '')); row('Auch in', (a.dups || []).join(', ')); row('Installiert', a.inst ? 'Version ' + (a.inst.version || 'ohne Angabe') + (a.update ? ' (Update verfügbar)' : '') : ''); const sz = a.inst ? a.inst.size : a.size; row('Speicher', sz ? (sz / 1048576).toFixed(1) + ' MB' : ''); row('Berechtigungen', (a.permissions || []).join(', ') || 'keine Angabe'); row('Dieses Gerät', compat(a)); row('Hinweis', a.broken ? 'Startdatei nicht erreichbar oder keine gültige HTML-Datei' : '');
  const off = el('dd', null, 'Wird geprüft …'); dl.append(el('dt', null, 'Offline'), off); p.appendChild(dl);
  (window.caches ? caches.match(a.url) : Promise.resolve(null)).then(r => { off.textContent = a.local || a.inst ? 'Vollständig offline verfügbar.' : r ? 'Teilweise offline: Startdatei und bereits besuchte Dateien.' : (a.offline === true || a.offline === 'full' ? 'Laut Entwickler offlinefähig; noch nicht gespeichert.' : 'Nicht offline verfügbar. „Installieren“ speichert alles.'); });
  if (a.changelog && a.changelog.length){ p.appendChild(el('h4', null, 'Änderungsprotokoll')); const ul = el('ul'); a.changelog.forEach(c => ul.appendChild(el('li', null, typeof c === 'string' ? c : [c.version, c.text || c.notes].filter(Boolean).join(': ')))); p.appendChild(ul); }
  d.classList.add('open');
}
function closeDetail(){ const d = $('#detail'); d.classList.remove('open'); d.replaceChildren(); }
$('#detail').addEventListener('click', e => { if (e.target.id === 'detail') closeDetail(); });

