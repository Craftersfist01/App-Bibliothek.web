"use strict";
/* ---------- Einstellungen ---------- */
function renderSettings(root){
  const P = t => { const p = el('div', 'panel glass'); p.appendChild(el('h3', null, t)); root.appendChild(p); return p; };
  const row = (p, label, sub, ctrl) => { const f = el('div', 'f'), l = el('div'); l.appendChild(el('b', null, label)); if (sub) l.appendChild(el('small', sub.bad ? 'bad' : '', sub.t || sub)); f.append(l, ctrl); p.appendChild(f); };
  const sw = (on, fn) => { const i = el('input', 'sw'); i.type = 'checkbox'; i.checked = on; i.onchange = () => fn(i.checked); return i; };
  const btn = (t, fn, g) => { const b = el('button', 'btn' + (g ? ' gh' : ''), t); b.onclick = fn; return b; };
  const ps = P('Meine Quellen');
  S.sources.forEach(s => {
    const st = s.err ? { t: s.err, bad: 1 } : s.sync ? 'Synchronisiert ' + new Date(s.sync).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : (s.type === 'url' ? s.url : 'Noch nicht synchronisiert');
    const c = el('div'); c.style.cssText = 'display:flex;gap:8px;align-items:center';
    c.append(sw(s.enabled, v => { s.enabled = v; save(); loadAll(false); }), btn('✕', () => { if (confirm(`Quelle „${s.name}“ entfernen?`)){ S.sources = S.sources.filter(x => x !== s); save(); loadAll(false); } }, 1));
    row(ps, s.name + (s.type !== 'url' ? ' · ' + s.owner + '/' + s.repo : ''), st, c);
  });
  const add = el('div'); add.style.marginTop = '12px';
  const sel = el('select'); sel.style.margin = '0 0 8px'; [['repo', 'GitHub-Repository'], ['library', 'Bibliotheks-Repository'], ['url', 'Direkte Webapp-URL']].forEach(([k, l]) => { const o = el('option', null, l); o.value = k; o.selected = addType === k; sel.appendChild(o); });
  sel.onchange = () => { addType = sel.value; render(); };
  const mk = ph => { const i = el('input'); i.type = 'text'; i.placeholder = ph; i.autocapitalize = 'off'; i.autocorrect = 'off'; i.spellcheck = false; i.style.cssText = 'width:100%;height:38px;margin:0 0 8px;border-radius:12px;border:1px solid var(--bd);background:var(--g);padding:0 12px;outline:0'; return i; };
  const nm = mk('Name'), a1 = mk(addType !== 'url' ? 'nutzer/repository' : 'https://example.com/game/'), a2 = mk(addType !== 'url' ? 'Branch (Standard: main)' : 'Beschreibung (optional)');
  const go = btn('Quelle hinzufügen', () => {
    let o;
    if (addType !== 'url'){ const m = a1.value.trim().match(/^(?:https?:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/); if (!m) return toast('Bitte „nutzer/repository“ eingeben.'); o = { id: (addType === 'library' ? 'lib-' : '') + sid(m[1], m[2]), name: nm.value.trim() || m[1] + '/' + m[2], type: addType, owner: m[1], repo: m[2], branch: a2.value.trim() || 'main', enabled: true }; }
    else { let u; try { u = new URL(a1.value.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return toast('Bitte eine gültige https-Adresse eingeben.'); } o = { id: 'url-' + hashHue(u.href) + '-' + u.href.length, name: nm.value.trim() || u.hostname, type: 'url', url: u.href, desc: a2.value.trim(), atype: 'app', enabled: true }; }
    if (S.sources.some(x => x.id === o.id)) return toast('Diese Quelle gibt es schon.');
    S.sources.push(o); save(); loadAll(true);
  });
  add.append(sel, nm, a1, a2, go); ps.appendChild(add);
  const pd = P('Darstellung');
  const th = el('select'); th.style.margin = '0'; [['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].forEach(([k, l]) => { const o = el('option', null, l); o.value = k; o.selected = S.theme === k; th.appendChild(o); });
  th.onchange = () => { S.theme = th.value; save(); applyTheme(); };
  row(pd, 'Farbschema', '', th);
  row(pd, 'Notfallmodus', 'Ohne Animationen, Hintergrund und Video-Autoplay', sw(S.safe, v => { S.safe = v; save(); document.documentElement.classList.toggle('safe', v); }));
  row(pd, 'Strenge Berechtigungen', 'Apps ohne Angabe in app.json erhalten keinen Zugriff auf Kamera, Mikrofon, Standort und Zwischenablage', sw(!!S.strictPerms, v => { S.strictPerms = v; save(); }));
  row(pd, 'Automatisch nach Updates suchen', 'Alle 15 Minuten, solange die Bibliothek offen ist', sw(S.autoCheck !== false, v => { S.autoCheck = v; save(); }));
  row(pd, 'Hinweise', 'Einführungs-Tipps erneut anzeigen', btn('Zurücksetzen', () => { S.tips = {}; save(); toast('Hinweise zurückgesetzt.'); }, 1));
  const pl = P('Eigene Apps');
  row(pl, 'HTML-Datei importieren', 'Einzelne .html-Datei, nur auf diesem Gerät gespeichert', btn('Auswählen', () => pickImport('html')));
  row(pl, 'Webapp (ZIP) importieren', 'ZIP mit index.html und allen Ressourcen', btn('Auswählen', () => pickImport('zip')));
  row(pl, 'QR-Code scannen', 'Link einer App aus einer anderen Bibliothek (Kamera nur jetzt)', btn('Scannen', scanQR));
  row(pl, 'Bibliotheks-Export', 'library-export.json erzeugen, damit andere deine Bibliothek als Quelle einbinden', btn('Erzeugen', exportLibrary, 1));
  renderFolders(P('Ordner'));
  renderStorage(P('Speicher'));
  renderHistory(P('Nutzungsverlauf'));
  const pb = P('Sicherung & Übertragung');
  row(pb, 'Einstellungen exportieren', 'Quellen, Favoriten, Ordner und Verlauf als Datei, z. B. für ein anderes Gerät', btn('Export', exportBackup, 1));
  row(pb, 'Einstellungen wiederherstellen', 'Aus einer Sicherungsdatei', btn('Import', importBackup, 1));
  const py = P('System');
  const out = el('div'); out.style.marginTop = '8px';
  row(py, 'Systemcheck', 'Speicher, Offline-Modus, Quellen', btn('Prüfen', () => syscheck(out), 1));
  row(py, 'Reparieren', 'Metadaten und defekte Cache-Einträge neu aufbauen', btn('Reparieren', repair, 1));
  row(py, 'Cache leeren', 'Entfernt Listen, Metadaten und Offline-Dateien. Favoriten bleiben.', btn('Leeren', async () => { Object.keys(localStorage).filter(k => /^al\.(tree|lib)/.test(k) || k === 'al.meta').forEach(k => LS.del(k)); meta = {}; try { for (const k of await caches.keys()) await caches.delete(k); } catch {} toast('Cache geleert.'); loadAll(true); }, 1));
  row(py, 'Aktualisieren', 'Quellen neu einlesen', btn('Jetzt', () => loadAll(true)));
  py.appendChild(out);
}
async function syscheck(box){
  const r = [], add = (ok, t) => r.push([ok, t]);
  try { localStorage.setItem('al.t', '1'); localStorage.removeItem('al.t'); add(1, 'Lokaler Speicher verfügbar'); } catch { add(0, 'Lokaler Speicher blockiert'); }
  try { const g = await navigator.serviceWorker?.getRegistration(); add(!!g, g ? 'Service Worker aktiv (Offline-Betrieb möglich)' : 'Service Worker nicht aktiv (nur über https)'); } catch { add(0, 'Service Worker nicht prüfbar'); }
  add(navigator.onLine, navigator.onLine ? 'Internetverbindung vorhanden' : 'Gerät ist offline');
  S.sources.forEach(s => add(!s.err, `${s.name}: ${s.err || (s.enabled ? 'in Ordnung' : 'deaktiviert')}`));
  add(1, `${apps.length} Apps, davon ${apps.filter(a => meta[a.id] && meta[a.id].json).length} mit app.json`);
  { const b = apps.filter(a => a.broken); add(!b.length, b.length ? 'Fehlerhafte Einträge (isoliert): ' + b.map(a => a.name).join(', ') : 'Keine fehlerhaften Einträge'); }
  try { const e = await navigator.storage.estimate(); add(1, `Speicher: ${(e.usage / 1048576).toFixed(1)} MB von ${(e.quota / 1048576).toFixed(0)} MB belegt`); } catch {}
  box.replaceChildren(...r.map(([ok, t]) => el('div', 'chk ' + (ok ? 'ok' : 'bad'), (ok ? '✓ ' : '✗ ') + t)));
}

