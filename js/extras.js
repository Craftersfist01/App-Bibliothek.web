"use strict";
/* ---------- Ordner, Update-Warteschlange, Speicher, Verlauf, Sicherung, Berechtigungen, lokale Metadaten ---------- */
function download(name, text, type = 'application/json'){
  const l = el('a'); l.href = URL.createObjectURL(new Blob([text], { type })); l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 6e4);
}

/* Notfallmodus automatisch, wenn der letzte Start nicht stabil lief */
(function(){
  if (LS.get('al.boot', 0) && !S.safe){ S.safe = true; save(); document.documentElement.classList.add('safe'); setTimeout(() => toast('Der letzte Start war nicht stabil. Der Notfallmodus wurde aktiviert (Einstellungen).'), 800); }
  LS.set('al.boot', Date.now()); setTimeout(() => LS.del('al.boot'), 4000);
  setTimeout(async () => { try { const e = await navigator.storage.estimate(); if (e.usage / e.quota > .85) toast('⚠ Speicher fast voll. Details unter Einstellungen → Speicher.'); } catch {} }, 5000);
})();

/* Ordner */
const folders = () => S.folders || (S.folders = []);
const folderBtn = a => { const b = el('button', 'btn gh', '📁 Ordner'); b.onclick = () => folderDialog(a); return b; };
async function folderDialog(a){
  const fs = folders(), opts = fs.map(f => ({ label: (f.apps.includes(a.id) ? '✓ ' : '') + f.name, value: f.id }));
  const v = await ask('Ordner', `Tippe einen Ordner an, um „${a.name}“ hinzuzufügen oder zu entfernen.`, [...opts, { label: '＋ Neuer Ordner', value: '+', primary: true }, { label: 'Schließen', value: null }]);
  if (!v) return;
  if (v === '+'){ const n = (prompt('Name des Ordners:') || '').trim(); if (!n) return; fs.push({ id: 'f' + Date.now().toString(36), name: n, apps: [a.id] }); }
  else { const f = fs.find(x => x.id === v); f.apps = f.apps.includes(a.id) ? f.apps.filter(x => x !== a.id) : [...f.apps, a.id]; }
  save(); render(); detail(a);
}
function renderFolders(p){
  if (!folders().length) p.appendChild(el('div', 'chk', 'Noch keine Ordner. Lege sie in der Detailansicht einer App an.'));
  folders().forEach(f => {
    const r = el('div', 'f'), t = el('div'), c = el('div'), rn = el('button', 'btn gh', 'Umbenennen'), dl = el('button', 'btn gh', 'Löschen');
    t.append(el('b', null, f.name), el('small', null, f.apps.length + ' Apps')); c.style.cssText = 'display:flex;gap:6px';
    rn.onclick = () => { const n = (prompt('Neuer Name:', f.name) || '').trim(); if (n){ f.name = n; save(); render(); } };
    dl.onclick = () => { if (confirm(`Ordner „${f.name}“ löschen? Die Apps bleiben erhalten.`)){ S.folders = folders().filter(x => x !== f); save(); render(); } };
    c.append(rn, dl); r.append(t, c); p.appendChild(r);
  });
}

/* Update-Warteschlange */
function updateBar(){
  const ups = apps.filter(a => a.update), m = msg(`${ups.length} Update${ups.length > 1 ? 's' : ''} verfügbar`, ups.map(a => a.name).join(', '), 'Alle nacheinander aktualisieren', updateAll);
  m.style.marginTop = '16px'; return m;
}

/* Speicher */
async function renderStorage(p){
  const box = el('div'); p.appendChild(box);
  try {
    const db = await openDB(), all = await rq(db.transaction('apps').objectStore('apps').getAll()), arc = await rq(db.transaction('archive').objectStore('archive').getAll());
    const mb = n => (n / 1048576).toFixed(1) + ' MB', sum = all.reduce((s, m) => s + (m.size || 0), 0), asum = arc.reduce((s, m) => s + (m.size || 0), 0);
    all.forEach(m => box.appendChild(el('div', 'chk', `${m.name} (${m.origin ? 'installiert' : 'lokal'}): ${mb(m.size || 0)}`)));
    box.appendChild(el('div', 'chk', `Archiv (${arc.length} Versionen): ${mb(asum)}`));
    const e = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    if (e){
      box.appendChild(el('div', 'chk', `Gesamt ${mb(e.usage)} von ${mb(e.quota)} · Cache und Sonstiges ≈ ${mb(Math.max(0, e.usage - sum - asum))}`));
      if (e.usage / e.quota > .85) box.appendChild(el('div', 'chk bad', '⚠ Speicher fast voll. Entferne Vorschauen oder alte Archive.'));
    }
  } catch (x){ box.textContent = 'Speicher nicht lesbar: ' + x.message; }
  const b = el('button', 'btn gh', 'Vorschauen und temporäre Daten entfernen'); b.style.marginTop = '10px'; b.onclick = clearTemp; p.appendChild(b);
}
async function clearTemp(){
  if (!confirm('Zwischengespeicherte Vorschauen und unfertige Update-Downloads entfernen? Installierte Apps, lokale Apps und Archive bleiben erhalten.')) return;
  try {
    for (const k of await caches.keys()){ const c = await caches.open(k); for (const r of await c.keys()) if (/\/library-data\//.test(r.url)) await c.delete(r); }
    const tx = (await openDB()).transaction('files', 'readwrite'); tx.objectStore('files').delete(IDBKeyRange.bound('tmp-', 'tmp-\uffff')); await done(tx);
    toast('Temporäre Daten entfernt.'); render();
  } catch (e){ toast('Fehlgeschlagen: ' + e.message); }
}

/* Nutzungsverlauf */
function logOpen(a){ const h = LS.get('al.hist', []); h.unshift({ id: a.id, n: a.name, t: Date.now() }); LS.set('al.hist', h.slice(0, 100)); }
function renderHistory(p){
  const h = LS.get('al.hist', []); if (!h.length) p.appendChild(el('div', 'chk', 'Noch keine Einträge.'));
  h.slice(0, 15).forEach(x => p.appendChild(el('div', 'chk', new Date(x.t).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + x.n)));
  const b = el('button', 'btn gh', 'Verlauf löschen'); b.style.marginTop = '10px'; b.onclick = () => { LS.del('al.hist'); render(); }; p.appendChild(b);
}

/* Sicherung / Geräteübertragung */
const BK = ['al.settings', 'al.favs', 'al.recents', 'al.hist'];
function exportBackup(){ download('app-bibliothek-sicherung.json', JSON.stringify({ format: 1, exported: new Date().toISOString(), data: Object.fromEntries(BK.map(k => [k, LS.get(k, null)])) })); }
function importBackup(){
  const i = el('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    try {
      const d = JSON.parse(await i.files[0].text()); if (d.format !== 1 || !d.data) throw new Error('Unbekanntes Format');
      if (!confirm('Einstellungen, Quellen, Favoriten und Verlauf mit der Sicherung überschreiben?')) return;
      BK.forEach(k => d.data[k] != null && LS.set(k, d.data[k])); location.reload();
    } catch (e){ toast('Wiederherstellen fehlgeschlagen: ' + e.message); }
  };
  i.click();
}

/* Berechtigungen (iframe-"allow") und Geräte-Kompatibilität */
const PERM = { camera: 'camera', microphone: 'microphone', geolocation: 'geolocation', clipboard: 'clipboard-read; clipboard-write', motion: 'accelerometer; gyroscope; magnetometer' };
function allowFor(a){
  const base = 'fullscreen; autoplay; web-share';
  if (a.permissions && a.permissions.length) return base + a.permissions.map(p => PERM[p] ? '; ' + PERM[p] : '').join('');
  return S.strictPerms ? base : base + '; ' + Object.values(PERM).join('; '); /* Kompatibilitätsmodus für Apps ohne Angabe */
}
function compat(a){
  const need = a.permissions || [], miss = [];
  if ((need.includes('camera') || need.includes('microphone')) && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) miss.push('Kamera/Mikrofon');
  if (need.includes('geolocation') && !navigator.geolocation) miss.push('Standort');
  if (need.includes('clipboard') && !navigator.clipboard) miss.push('Zwischenablage');
  (a.features || []).forEach(f => {
    if (f === 'indexeddb' && !window.indexedDB) miss.push('IndexedDB');
    if (f === 'webgl' && !document.createElement('canvas').getContext('webgl')) miss.push('WebGL');
    if (f === 'webaudio' && !(window.AudioContext || window.webkitAudioContext)) miss.push('Web Audio');
  });
  return miss.length ? 'Eingeschränkt: ' + miss.join(', ') + ' fehlt' : 'Kompatibel mit diesem Gerät';
}

/* Lokale Apps: Metadaten bearbeiten (Name, Beschreibung, Typ, Kategorie, Tags, Icon, Vorschauen) */
function editLocal(a){
  const o = el('div', 'dlg'), p = el('div', 'panel glass'); o.appendChild(p); p.style.maxHeight = '88vh'; p.style.overflowY = 'auto';
  const fld = (ph, v, multi) => { const i = el(multi ? 'textarea' : 'input'); i.value = v || ''; i.placeholder = ph; i.setAttribute('aria-label', ph); if (multi) i.rows = 3; i.style.cssText = 'width:100%;margin:6px 0;padding:8px 12px;border-radius:12px;border:1px solid var(--bd);background:var(--g);outline:0;font:inherit;color:inherit'; p.appendChild(i); return i; };
  const file = (l, multi, acc) => { const w = el('label', 'ds', l + ': '), i = el('input'); i.type = 'file'; i.accept = acc; i.multiple = !!multi; w.appendChild(i); w.style.cssText = 'display:block;margin:8px 0'; p.appendChild(w); return i; };
  p.appendChild(el('h3', null, 'Details bearbeiten'));
  const nm = fld('Name', a.name), ds = fld('Beschreibung', a.desc, 1), ct = fld('Kategorie', a.category), tg = fld('Tags (durch Komma getrennt)', (a.tags || []).join(', '));
  const ty = el('select'); [['app', 'App'], ['game', 'Game']].forEach(([k, l]) => { const x = el('option', null, l); x.value = k; x.selected = a.type === k; ty.appendChild(x); }); ty.style.margin = '6px 0'; p.appendChild(ty);
  const ic = file('Icon (optional)', 0, 'image/*'), pv = file('Vorschauen, Bilder/GIFs/Videos (ersetzen vorhandene)', 1, 'image/*,video/*');
  const row = el('div', 'dbtns'), ok = el('button', 'btn', 'Speichern'), cl = el('button', 'btn gh', 'Abbrechen'); row.append(ok, cl); p.appendChild(row); document.body.appendChild(o);
  cl.onclick = () => o.remove();
  ok.onclick = async () => {
    try {
      const db = await openDB(), cur = await rq(db.transaction('apps').objectStore('apps').get(a.uid)), tx = db.transaction(['apps', 'files'], 'readwrite'), fs = tx.objectStore('files');
      const ext = f => (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin', put = (n, f) => fs.put({ type: f.type || mimeOf(n), blob: f }, a.uid + '/_lib/' + n);
      Object.assign(cur, { name: nm.value.trim() || cur.name, desc: ds.value.trim(), category: ct.value.trim(), type: ty.value, tags: tg.value.split(',').map(x => x.trim()).filter(Boolean) });
      if (ic.files[0]){ if (cur.icon) fs.delete(a.uid + '/_lib/' + cur.icon); cur.icon = 'icon.' + ext(ic.files[0]); put(cur.icon, ic.files[0]); }
      if (pv.files.length){ (cur.previews || []).forEach(n => fs.delete(a.uid + '/_lib/' + n)); cur.previews = [...pv.files].map((f, i) => 'p' + i + '.' + ext(f)); [...pv.files].forEach((f, i) => put(cur.previews[i], f)); }
      tx.objectStore('apps').put(cur); await done(tx); o.remove(); closeDetail(); await loadAll(false); toast('Gespeichert.');
    } catch (e){ toast('Speichern fehlgeschlagen: ' + e.message); }
  };
}

/* Update-Warteschlange (dauerhaft, setzt nach Neustart fort) */
const QK = 'al.queue';
async function updateAll(){ LS.set(QK, apps.filter(a => a.update).map(a => ({ id: a.id, mode: 'update' }))); await runQueue(); }
async function runQueue(){
  for (let q = LS.get(QK, []); q.length; q = LS.get(QK, [])){
    const it = q[0], a = apps.find(x => x.id === it.id);
    if (a && (it.mode === 'install' ? !a.inst : a.update)) await installApp(a, it.mode);
    LS.set(QK, LS.get(QK, []).filter(x => x.id !== it.id)); /* auch bei Fehler entfernen; unfertige Downloads erkennt resumeWork am Zwischenbereich */
  }
}
async function resumeWork(){ /* unterbrochene Downloads und Updates beim Start wieder aufnehmen */
  try {
    let q = LS.get(QK, []);
    const ks = await rq((await openDB()).transaction('files').objectStore('files').getAllKeys(IDBKeyRange.bound('tmp-', 'tmp-\uffff'))), uids = new Set(ks.map(k => k.slice(4).split('/')[0]));
    apps.forEach(a => { if (a.files && uids.has(a.inst ? a.inst.id : instUid(a.id)) && !q.some(x => x.id === a.id) && (!a.inst || a.update)) q.push({ id: a.id, mode: a.inst ? 'update' : 'install' }); });
    q = q.filter(x => apps.some(a => a.id === x.id)); LS.set(QK, q); if (!q.length) return;
    const ok = await ask('Unterbrochene Vorgänge', 'Fortsetzen: ' + q.map(x => apps.find(a => a.id === x.id).name).join(', ') + '?', [{ label: 'Fortsetzen', value: true, primary: true }, { label: 'Verwerfen', value: false }]);
    if (ok) await runQueue();
    else { LS.del(QK); const tx = (await openDB()).transaction('files', 'readwrite'); tx.objectStore('files').delete(IDBKeyRange.bound('tmp-', 'tmp-\uffff')); await done(tx); }
  } catch {}
}
/* automatische Update-Suche, solange die Bibliothek offen ist */
let lastCheck = Date.now();
const autoCheck = () => { if (S.autoCheck !== false && document.visibilityState === 'visible' && !document.body.classList.contains('running') && navigator.onLine && Date.now() - lastCheck > 15 * 60e3){ lastCheck = Date.now(); loadAll(true); } };
document.addEventListener('visibilitychange', autoCheck); addEventListener('online', autoCheck); setInterval(autoCheck, 5 * 60e3);

/* Manuelle Sortierung per Ziehen */
const orderIdx = a => { const i = (S.order || []).indexOf(a.id); return i < 0 ? 1e6 : i; };
function enableDrag(grid){
  grid.querySelectorAll('.dh').forEach(h => h.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const card = h.closest('.card'); card.classList.add('drag'); h.setPointerCapture(e.pointerId);
    const move = ev => {
      const t = document.elementFromPoint(ev.clientX, ev.clientY), over = t && t.closest('.card'), lib = $('#lib');
      if (ev.clientY > innerHeight - 90) lib.scrollTop += 14; else if (ev.clientY < 130) lib.scrollTop -= 14;
      if (over && over !== card && over.parentNode === grid) grid.insertBefore(card, card.compareDocumentPosition(over) & Node.DOCUMENT_POSITION_FOLLOWING ? over.nextSibling : over);
    };
    const end = () => {
      ['pointermove', 'pointerup', 'pointercancel'].forEach(t => h.removeEventListener(t, t === 'pointermove' ? move : end)); card.classList.remove('drag');
      const ids = [...grid.querySelectorAll('.card')].map(c => c.dataset.id), vis = new Set(ids), cur = S.order || [], full = [...cur, ...apps.map(a => a.id).filter(i => !cur.includes(i))]; let i = 0;
      S.order = full.map(x => vis.has(x) ? ids[i++] : x); save();
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  }));
}
async function repair(){ /* defekte Metadaten und Cache-Einträge neu aufbauen */
  meta = {}; LS.del('al.meta'); Object.keys(localStorage).filter(k => /^al\.(tree|lib)/.test(k)).forEach(k => LS.del(k));
  try { const c = await caches.open('al-v7'); for (const r of await c.keys()){ const x = await c.match(r); if (!x || !x.ok) await c.delete(r); } } catch {}
  toast('Reparatur abgeschlossen, Quellen werden neu geladen.'); loadAll(true);
}
