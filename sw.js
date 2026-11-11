/* Service Worker: Offline-Cache (Stale-While-Revalidate) + Auslieferung lokaler Apps aus IndexedDB unter local/<id>/... */
const CACHE = 'al-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'css/app.css', 'js/vendor/qrcode.js', 'js/vendor/jszip.min.js', 'js/vendor/jsqr.js', ...['core', 'sources', 'metadata', 'ui', 'detail', 'launcher', 'notify', 'share', 'settings', 'local', 'updater', 'scan', 'extras', 'main'].map(n => 'js/' + n + '.js')];
const SCOPE = new URL('./', self.registration.scope).pathname, LOCAL = SCOPE + 'local/';
const appish = p => /^(htmls|webapps|library-data)\//.test(p.slice(SCOPE.length)); /* Apps und Metadaten: Netzwerk zuerst, damit keine veralteten Versionen starten */
const keep = (c, r, res) => { if (res && res.ok && !(+res.headers.get('content-length') > 25e6)) c.put(r, res.clone()).catch(() => {}); };
async function netFirst(r){
  const c = await caches.open(CACHE);
  try { const res = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(new Error('Zeitüberschreitung')), 6000))]); keep(c, r, res); return res; }
  catch (err){ const hit = await c.match(r); if (hit) return hit; throw err; }
}
const openDB = () => new Promise((res, rej) => { const r = indexedDB.open('app-library', 2); r.onupgradeneeded = () => { const db = r.result; [['apps', { keyPath: 'id' }], ['files'], ['archive', { keyPath: 'id' }]].forEach(([n, o]) => { if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, o); }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function local(pathname, rg, soft){
  let k; try { k = decodeURIComponent(pathname.slice(LOCAL.length)); } catch { return new Response('Ungültiger Pfad', { status: 400 }); }
  if (!k || k.split('/').includes('..')) return new Response('Ungültiger Pfad', { status: 400 });
  if (!k.includes('/')) return Response.redirect(new URL(pathname + '/', location.origin).href, 302);
  if (k.endsWith('/')) k += 'index.html';
  try {
    const db = await openDB(), rec = await new Promise(res => { const r = db.transaction('files').objectStore('files').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
    db.close();
    if (!rec) return soft ? null : new Response('Nicht gefunden', { status: 404 });
    const size = rec.blob.size, m = rg && /bytes=(\d*)-(\d*)/.exec(rg);
    if (m){ const s = m[1] === '' ? Math.max(0, size - +m[2]) : +m[1], e2 = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1); return new Response(rec.blob.slice(s, e2 + 1), { status: 206, headers: { 'Content-Type': rec.type, 'Content-Range': `bytes ${s}-${e2}/${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' } }); }
    return new Response(rec.blob, { headers: { 'Content-Type': rec.type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' } });
  } catch { return new Response('Lokaler Speicher nicht verfügbar', { status: 500 }); }
}
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('al-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.startsWith(LOCAL)){ e.respondWith(local(u.pathname, r.headers.get('range'))); return; }
  let ref = ''; try { ref = r.referrer ? new URL(r.referrer).pathname : ''; } catch {}
  if (ref.startsWith(LOCAL)){ /* root-absolute Pfade einer lokalen App (z. B. /style.css) auf deren Dateien abbilden */
    const id = ref.slice(LOCAL.length).split('/')[0];
    e.respondWith(local(LOCAL + id + '/' + u.pathname.replace(/^\//, ''), r.headers.get('range'), true).then(x => x || fetch(r))); return;
  }
  if (r.headers.has('range')) return;
  if (appish(u.pathname)){ e.respondWith(netFirst(r)); return; }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r, { ignoreSearch: r.mode === 'navigate' });
    const net = fetch(r).then(res => { keep(c, r, res); return res; }).catch(() => null);
    return hit || (await net) || (r.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
