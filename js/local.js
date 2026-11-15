"use strict";
/* ---------- Lokale Apps: IndexedDB, Import (HTML/ZIP), Export, Löschen, QR ---------- */
const LOCAL_MAX_BYTES = 300 * 1048576, LOCAL_MAX_FILES = 5000;
const MIME = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', txt: 'text/plain', wasm: 'application/wasm', xml: 'application/xml' };
const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error || new Error('Speichern abgebrochen')); });
let dbp = null;
function openDB(){ return openDB0().catch(e => { dbp = null; throw e; }); }
function openDB0(){
  return dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('app-library', 2); /* Schema identisch in sw.js */
    r.onupgradeneeded = () => { const db = r.result; [['apps', { keyPath: 'id' }], ['files'], ['archive', { keyPath: 'id' }]].forEach(([n, o]) => { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, o); }); };
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; res(r.result); }; r.onerror = () => rej(r.error); r.onblocked = () => toast('Datenbank-Update blockiert: bitte andere Tabs der Bibliothek schließen.');
  }));
}
const range = uid => IDBKeyRange.bound(uid + '/', uid + '/\uffff');

async function localApps(){
  if (!window.indexedDB) return [];
  const all = await rq((await openDB()).transaction('apps').objectStore('apps').getAll()), dir = new URL('.', location.href), list = all.filter(m => !m.origin);
  INST = Object.fromEntries(all.filter(m => m.origin).map(m => [m.origin, m]));
  return list.map(m => ({ id: 'local:device:' + m.id, uid: m.id, sid: 'local', cat: 'local', local: true, file: m.name, name: m.name, desc: m.desc || '', type: m.type, hue: m.hue ?? hashHue(m.id), tags: m.tags || [], category: m.category, icon: m.icon ? new URL('local/' + m.id + '/_lib/' + m.icon, dir).href : '', previews: (m.previews || []).map(x => new URL('local/' + m.id + '/_lib/' + x, dir).href), version: m.version || '', dev: m.dev || '', pub: m.pub || (m.added || '').slice(0, 10), mod: m.mod || '', changelog: m.changelog || [], permissions: m.permissions || [], features: m.features || [], offline: m.offline, key: 'local:' + m.id, size: m.size, url: new URL('local/' + m.id + '/index.html', dir).href }));
}
function safePath(p){ /* Schutz vor Pfadmanipulation: kein .., kein absoluter Pfad, keine Laufwerke */
  p = p.replace(/\\/g, '/');
  if (!p || p.startsWith('/') || /^[a-z]:/i.test(p) || p.includes('\0')) throw new Error('Unzulässiger Pfad in der ZIP-Datei: ' + p);
  const parts = p.split('/').filter(x => x && x !== '.');
  if (!parts.length || parts.includes('..')) throw new Error('Unzulässiger Pfad in der ZIP-Datei: ' + p);
  return parts.join('/');
}
function needZip(){
  return new Promise((res, rej) => {
    if (window.JSZip) return res();
    const s = el('script'); s.src = 'js/vendor/jszip.min.js'; s.onload = res; s.onerror = () => rej(new Error('ZIP-Bibliothek nicht ladbar (offline?)')); document.head.appendChild(s);
  });
}
function pickImport(kind, target){
  if (!HTTP || !('serviceWorker' in navigator)) return toast('Lokale Apps benötigen https (z. B. GitHub Pages) und einen Service Worker.');
  const i = el('input'); i.type = 'file'; i.accept = kind === 'zip' ? '.zip,application/zip' : '.html,.htm,text/html';
  if (kind === 'app') i.accept = '.zip,.html,.htm,application/zip,text/html';
  i.onchange = () => {
    const file = i.files[0]; if (!file) return;
    const detected = kind === 'app' ? (/\.zip$/i.test(file.name) || file.type === 'application/zip' ? 'zip' : 'html') : kind;
    importLocal(file, detected, target).catch(e => toast('Installation fehlgeschlagen: ' + e.message));
  };
  i.click();
}
async function installMenu(){
  const choice = await ask('App installieren', 'Wähle aus, was du installieren möchtest.', [
    { label: 'Geteilte App installieren', value: 'shared', primary: true },
    { label: 'App installieren', value: 'app' },
    { label: 'Abbrechen', value: null }
  ]);
  if (choice === 'shared') pickImport('zip');
  if (choice === 'app') pickImport('app');
}
async function importLocal(file, kind, target){
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg || !reg.active) throw new Error('Service Worker noch nicht aktiv. Seite neu laden und erneut versuchen.');
  const files = new Map(); let total = 0;
  const put = (path, blob) => { total += blob.size; if (total > LOCAL_MAX_BYTES || files.size >= LOCAL_MAX_FILES) throw new Error('Import zu groß (max. 300 MB und 5000 Dateien).'); files.set(path, blob); };
  if (kind === 'html') put('index.html', file);
  else {
    await needZip();
    const zip = await JSZip.loadAsync(file);
    const paths = Object.keys(zip.files).filter(n => !zip.files[n].dir && !/(^|\/)(__MACOSX\/|\.DS_Store$)/.test(n)).map(n => [n, safePath(n)]);
    const roots = new Set(paths.map(([, p]) => p.split('/')[0]));
    const strip = roots.size === 1 && paths.every(([, p]) => p.includes('/')) ? [...roots][0] + '/' : '';
    for (const [n, p] of paths) put(strip ? p.slice(strip.length) : p, await zip.files[n].async('blob'));
    if (!files.has('index.html')) throw new Error('Die ZIP-Datei enthält keine index.html im Hauptordner.');
  }
  const bundle = await localBundle(files);
  files.clear(); bundle.appFiles.forEach((v, k) => files.set(k, v));
  bundle.libraryFiles.forEach((v, k) => files.set('_lib/' + k, v));
  const incoming = bundle.meta;
  if (target){ /* neue Version einer lokalen App: optional alte Version archivieren, Icon/Vorschauen bleiben erhalten */
    const c = await ask('Neue Version importieren', `Die vorhandene Version von „${target.name}“ wird ersetzt. Inkompatible Daten könnten verloren gehen. Möchtest du fortfahren?`, [{ label: 'Alte Version sichern und updaten', value: 'arch', primary: true }, { label: 'Updaten', value: 'upd' }, { label: 'Abbrechen', value: null }]);
    if (!c) return;
    const db0 = await openDB(), cur = await rq(db0.transaction('apps').objectStore('apps').get(target.uid)), st = db0.transaction('files').objectStore('files'), lr = IDBKeyRange.bound(target.uid + '/_lib/', target.uid + '/_lib/\uffff');
    const lk = await rq(st.getAllKeys(lr)), lv = await rq(st.getAll(lr)), v = (prompt('Versionsnummer der neuen Version (optional):', cur.version || '') || '').trim();
    const list = [...files].map(([p, f]) => ({ p, type: mimeOf(p), blob: f })).concat(lk.map((k, i) => ({ p: k.slice(target.uid.length + 1), ...lv[i] })));
    const next = { ...cur, ...incoming, version: incoming.version || v || cur.version || '', size: total, count: bundle.appFiles.size, updated: new Date().toISOString() };
    await commit(target.uid, next, list, c === 'arch');
    toast(`„${cur.name}“ aktualisiert.`); return loadAll(false);
  }
  const name = incoming.name || (prompt('Name der App:', pretty(file.name.replace(/\.(zip|html?)$/i, ''))) || '').trim(); if (!name) return;
  const type = incoming.type || (confirm('Ist das ein Game?\nOK = Game, Abbrechen = App') ? 'game' : 'app');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const tx = (await openDB()).transaction(['apps', 'files'], 'readwrite'); /* alles oder nichts */
  tx.objectStore('apps').put({ id, name, type, desc: '', tags: [], ...incoming, added: new Date().toISOString(), size: total, count: bundle.appFiles.size });
  for (const [p, f] of files) tx.objectStore('files').put({ type: MIME[p.split('.').pop().toLowerCase()] || 'application/octet-stream', blob: f }, id + '/' + p);
  await done(tx);
  toast(`„${name}“ importiert (${files.size} Dateien).`); await loadAll(false);
}
async function localBundle(files){
  const appFiles = new Map(files), libraryFiles = new Map(), meta = {};
  const json = [...files].find(([p]) => /^library-data\/[^/]+\/app\.json$/i.test(p));
  if (!json) return { appFiles, libraryFiles, meta };
  const folder = json[0].split('/')[1], prefix = `library-data/${folder}/`;
  try {
    const raw = JSON.parse(await json[1].text());
    const rel = value => String(value || '').replace(/^\.?\//, '').replace(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '');
    [...files].forEach(([p, blob]) => { if (p.startsWith(prefix)){ libraryFiles.set(p.slice(prefix.length), blob); appFiles.delete(p); } });
    const arr = value => Array.isArray(value) ? value : value ? [value] : [];
    Object.assign(meta, {
      name: raw.name || raw.displayName || '',
      desc: raw.description || '',
      type: raw.type === 'game' ? 'game' : 'app',
      category: raw.category || '',
      tags: arr(raw.tags).map(String),
      icon: raw.icon ? rel(raw.icon) : '',
      previews: arr(raw.previews || raw.preview).map(x => rel(typeof x === 'string' ? x : x && x.src)).filter(Boolean),
      version: raw.version || '',
      dev: raw.developer || '',
      pub: raw.published || '',
      mod: raw.modified || '',
      changelog: arr(raw.changelog),
      permissions: arr(raw.permissions).map(String),
      features: arr(raw.features || raw.supports).map(String),
      offline: raw.offline,
      hue: typeof raw.color === 'number' ? raw.color : null
    });
  } catch (e){ throw new Error('library-data/app.json ist ungültig: ' + e.message); }
  return { appFiles, libraryFiles, meta };
}
const localSlug = name => String(name || 'app').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'app';
const localAppJson = rec => ({
  name: rec.name, description: rec.desc || '', type: rec.type === 'game' ? 'game' : 'app',
  category: rec.category || '', tags: rec.tags || [], icon: rec.icon || '', previews: rec.previews || [],
  version: rec.version || '', developer: rec.dev || '', published: rec.pub || '', modified: rec.mod || '',
  changelog: rec.changelog || [], permissions: rec.permissions || [], features: rec.features || [],
  offline: rec.offline !== false, color: typeof rec.hue === 'number' ? rec.hue : undefined
});
async function exportLocal(a){
  try {
    await needZip();
    const db = await openDB(), rec = await rq(db.transaction('apps').objectStore('apps').get(a.uid)), st = db.transaction('files').objectStore('files'), keys = await rq(st.getAllKeys(range(a.uid))), vals = await rq(st.getAll(range(a.uid))), z = new JSZip(), folder = localSlug(rec && rec.name || a.name);
    keys.forEach((k, i) => {
      const rel = k.slice(a.uid.length + 1);
      z.file(rel.startsWith('_lib/') ? `library-data/${folder}/${rel.slice(5)}` : rel, vals[i].blob);
    });
    const json = JSON.stringify(localAppJson(rec || a), null, 2);
    z.file(`library-data/${folder}/app.json`, json);
    const blob = await z.generateAsync({ type: 'blob' }), l = el('a');
    l.href = URL.createObjectURL(blob); l.download = a.name.replace(/[^\w.-]+/g, '_') + '.zip'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 6e4);
  } catch (e){ toast('Export fehlgeschlagen: ' + e.message); }
}
async function deleteLocal(a){
  if (!confirm(`„${a.name}“ endgültig von diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.`)) return;
  try {
    const tx = (await openDB()).transaction(['apps', 'files'], 'readwrite');
    tx.objectStore('apps').delete(a.uid); tx.objectStore('files').delete(range(a.uid)); await done(tx);
    favs = favs.filter(x => x !== a.id); recents = recents.filter(x => x !== a.id); LS.set('al.favs', favs); LS.set('al.recents', recents);
    closeDetail(); await loadAll(false);
  } catch (e){ toast('Löschen fehlgeschlagen: ' + e.message); }
}
function qrSvg(t){ const q = qrcode(0, 'M'); q.addData(t); q.make(); return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }); }
