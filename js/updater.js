"use strict";
/* ---------- Installation, Updates, Archiv (transaktional, mit Integritätsprüfung) ---------- */
let INST = {}; /* appId -> installierter Datensatz */
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function gitSha(buf){ /* wie "git hash-object": sha1("blob <Länge>\0" + Inhalt), vergleichbar mit der GitHub-Tree-API */
  const h = new TextEncoder().encode('blob ' + buf.byteLength + '\0'), all = new Uint8Array(h.length + buf.byteLength);
  all.set(h); all.set(new Uint8Array(buf), h.length); return hex(await crypto.subtle.digest('SHA-1', all));
}
const instUid = id => { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return 'r' + (h >>> 0).toString(36) + id.length.toString(36); };
const mimeOf = p => MIME[p.split('.').pop().toLowerCase()] || 'application/octet-stream';
const instUrl = (uid, prefix = '') => new URL('local/' + prefix + uid + '/index.html', new URL('.', location.href)).href;
const fileUrl = (a, f) => a.cat === 'html' ? a.url : new URL(a.path + enc(f.rel), pagesBase(srcOf(a))).href;

function markUpdates(){
  let n = 0;
  apps.forEach(a => {
    a.update = false; const r = a.inst; if (!r || !a.files) return;
    a.update = a.files.length !== Object.keys(r.shas || {}).length || a.files.some(f => f.sha && r.shas[f.rel] !== f.sha);
    if (a.update) n++;
  });
  if (n) tip('update', 'Eine neue Version ist verfügbar.');
}
function busy(t){
  let b = $('#busy'); if (!t) return b && b.remove();
  if (!b){ b = el('div', 'toast glass'); b.id = 'busy'; b.style.animation = 'none'; $('#toasts').appendChild(b); } b.textContent = t;
}
function ask(title, text, buttons){
  return new Promise(res => {
    const o = el('div', 'dlg'), p = el('div', 'panel glass'), row = el('div', 'dbtns');
    buttons.forEach(b => { const x = el('button', 'btn' + (b.primary ? '' : ' gh'), b.label); x.onclick = () => { o.remove(); res(b.value); }; row.appendChild(x); if (b.focus) setTimeout(() => x.focus(), 60); });
    p.append(el('h3', null, title), el('p', null, text), row); o.appendChild(p); document.body.appendChild(o);
  });
}
function pinBtn(a){
  const on = (S.pins || []).includes(a.id), b = el('button', 'btn gh', on ? '📌 Angepinnt' : '📌 Anpinnen');
  b.onclick = () => { S.pins = on ? S.pins.filter(x => x !== a.id) : [a.id, ...(S.pins || [])]; save(); render(); detail(a); }; return b;
}

async function installApp(a, mode){
  if (!HTTP || !('serviceWorker' in navigator)) return toast('Installation benötigt https (z. B. GitHub Pages) und einen Service Worker.');
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg || !reg.active) return toast('Service Worker noch nicht aktiv. Seite neu laden und erneut versuchen.');
  if (!(window.crypto && crypto.subtle)) return toast('Die Integritätsprüfung benötigt eine sichere Verbindung (https).');
  if (!a.files || !a.files.length) return toast('Dateiliste nicht verfügbar. Bitte aktualisieren.');
  let archive = false;
  if (mode === 'update'){
    const c = await ask('Update verfügbar', 'Diese App wurde vom Entwickler verändert. Inkompatible Daten könnten verloren gehen. Möchtest du aktualisieren?',
      [{ label: 'Alte Version sichern und updaten', value: 'arch', primary: true }, { label: 'Updaten', value: 'upd' }, { label: 'Später', value: null }]);
    if (!c) return; archive = c === 'arch';
    if (a.migration && a.migration.dataLoss){ /* nur bei tatsächlich deklariertem Datenverlust */
      const ok = await ask('Achtung', 'Inkompatible Daten werden unwiderruflich gelöscht. Möchtest du fortfahren?', [{ label: 'Abbrechen', value: false, primary: true, focus: true }, { label: 'Fortfahren', value: true }]);
      if (!ok) return;
    }
  }
  const uid = a.inst ? a.inst.id : instUid(a.id), stage = 'tmp-' + uid + '/', db = await openDB(), have = new Map(), staged = [], queue = a.files.slice(); let n = 0;
  try {
    busy(`Lade ${a.name} …`);
    const st = db.transaction('files').objectStore('files'), ks = await rq(st.getAllKeys(range('tmp-' + uid))), vs = await rq(st.getAll(range('tmp-' + uid)));
    ks.forEach((k, i) => have.set(k.slice(stage.length), vs[i])); /* unterbrochene Downloads fortsetzen */
    const worker = async () => {
      for (let f; (f = queue.shift());){
        let rec = have.get(f.rel);
        if (!(rec && f.sha && rec.sha === f.sha)){
          const r = await fetch(fileUrl(a, f), { cache: 'no-store' }); if (!r.ok) throw new Error(`${f.rel}: HTTP ${r.status}`);
          const buf = await r.arrayBuffer(), sha = await gitSha(buf);
          if (f.sha && sha !== f.sha) throw new Error(`Integritätsprüfung fehlgeschlagen (${f.rel}). Evtl. ist GitHub Pages noch nicht aktualisiert`);
          rec = { type: mimeOf(f.rel), blob: new Blob([buf]), sha };
          const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(rec, stage + f.rel); await done(tx);
        }
        staged.push({ p: f.rel, ...rec }); busy(`Lade ${a.name} … ${++n}/${a.files.length}`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (staged.length !== a.files.length) throw new Error('Download unvollständig');
    const rec = { id: uid, name: a.name, type: a.type, origin: a.id, version: a.version || '', installed: new Date().toISOString(), shas: Object.fromEntries(a.files.map(f => [f.rel, f.sha])), size: staged.reduce((s, f) => s + f.blob.size, 0), count: staged.length };
    await commit(uid, rec, staged, archive); /* atomar: bei Fehler bleibt die alte Version unverändert */
    const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(range('tmp-' + uid)); await done(tx);
    if (mode === 'update' && a.migration && a.migration.dataLoss) /* nur ausdrücklich deklarierte Schlüssel-Präfixe, nie pauschal */
      (a.migration.deleteLocalStorage || []).forEach(p => Object.keys(localStorage).filter(k => p && k.startsWith(p)).forEach(k => localStorage.removeItem(k)));
    toast(mode === 'update' ? `„${a.name}“ aktualisiert.` : `„${a.name}“ installiert und offline verfügbar.`); await loadAll(false);
  } catch (e){
    toast(`${mode === 'update' ? 'Update' : 'Installation'} fehlgeschlagen: ${e.message}. Die bisherige Version bleibt unverändert; ein neuer Versuch setzt den Download fort.`);
  } finally { busy(null); }
}
async function commit(uid, rec, files, archiveOld, dropArchive){
  const db = await openDB(), old = await rq(db.transaction('apps').objectStore('apps').get(uid)); let ok = [], ov = [];
  if (old && archiveOld){ const st = db.transaction('files').objectStore('files'); ok = await rq(st.getAllKeys(range(uid))); ov = await rq(st.getAll(range(uid))); }
  const tx = db.transaction(['apps', 'files', 'archive'], 'readwrite'), fs = tx.objectStore('files');
  if (old && archiveOld){
    const aid = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    tx.objectStore('archive').put({ id: aid, appId: old.origin || 'local:device:' + uid, name: old.name, version: old.version || '', date: new Date().toISOString(), size: old.size || 0, rec: old });
    ok.forEach((k, i) => fs.put(ov[i], 'a-' + aid + k.slice(uid.length)));
  }
  fs.delete(range(uid)); files.forEach(f => fs.put({ type: f.type, blob: f.blob, sha: f.sha }, uid + '/' + f.p));
  tx.objectStore('apps').put(rec);
  if (dropArchive){ tx.objectStore('archive').delete(dropArchive); fs.delete(range('a-' + dropArchive)); }
  await done(tx);
}
async function removeInstall(a){
  if (!confirm(`Installation von „${a.name}“ entfernen? Archivierte Versionen bleiben erhalten.`)) return;
  try { const tx = (await openDB()).transaction(['apps', 'files'], 'readwrite'); tx.objectStore('apps').delete(a.inst.id); tx.objectStore('files').delete(range(a.inst.id)); await done(tx); closeDetail(); await loadAll(false); }
  catch (e){ toast('Entfernen fehlgeschlagen: ' + e.message); }
}

/* ---------- Archiv ---------- */
async function renderArchive(root){
  let list = [];
  try { list = await rq((await openDB()).transaction('archive').objectStore('archive').getAll()); } catch (e){ if (view === 'archive') root.replaceChildren(msg('Archiv nicht lesbar', e.message)); return; }
  if (view !== 'archive') return;
  if (!list.length) return root.replaceChildren(msg('Archiv', 'Noch keine archivierten Versionen. Beim Update kannst du „Alte Version sichern und updaten“ wählen.'));
  list.sort((a, b) => b.date.localeCompare(a.date));
  const s = el('section'), g = el('div', 'grid'); s.append(el('h2', null, 'Archivierte Versionen'), g);
  list.forEach(r => {
    const c = el('div', 'panel glass'), row = el('div', 'acts'); c.style.margin = '0';
    c.append(el('b', null, r.name + ' · archiviert'), el('div', 'ds', `Version ${r.version || 'unbekannt'} · ${new Date(r.date).toLocaleDateString('de-DE')} · ${(r.size / 1048576).toFixed(1)} MB`), el('div', 'ds', 'App-ID: ' + r.appId));
    const mk = (t, fn, gh) => { const b = el('button', 'btn' + (gh ? ' gh' : ''), t); b.onclick = fn; row.appendChild(b); };
    mk('Öffnen', () => openApp({ id: 'archive:' + r.id, name: r.name + ' (archiviert)', url: instUrl(r.id, 'a-') }));
    mk('Wiederherstellen', () => restoreArchive(r), 1); mk('Löschen', () => deleteArchive(r), 1);
    c.appendChild(row); g.appendChild(c);
  });
  root.replaceChildren(s);
}
async function restoreArchive(r){
  if (!confirm(`Version ${r.version || ''} von „${r.name}“ wiederherstellen? Die aktuell installierte Version wird dabei archiviert.`)) return;
  try {
    const pre = 'a-' + r.id, st = (await openDB()).transaction('files').objectStore('files'), ks = await rq(st.getAllKeys(range(pre))), vs = await rq(st.getAll(range(pre)));
    await commit(r.rec.id, { ...r.rec }, ks.map((k, i) => ({ p: k.slice(pre.length + 1), ...vs[i] })), true, r.id);
    toast('Version wiederhergestellt.'); await loadAll(false); render();
  } catch (e){ toast('Wiederherstellen fehlgeschlagen: ' + e.message); }
}
async function deleteArchive(r){
  if (!confirm(`Archivierte Version ${r.version || ''} von „${r.name}“ endgültig löschen?`)) return;
  try { const tx = (await openDB()).transaction(['archive', 'files'], 'readwrite'); tx.objectStore('archive').delete(r.id); tx.objectStore('files').delete(range('a-' + r.id)); await done(tx); render(); }
  catch (e){ toast('Löschen fehlgeschlagen: ' + e.message); }
}
