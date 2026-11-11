"use strict";
/* ---------- Zustand & Quellen ---------- */
const S = Object.assign({ theme: 'auto', safe: false, tips: {}, sources: [] }, LS.get('al.settings', {}));
const save = () => LS.set('al.settings', S);
let favs = LS.get('al.favs', []), recents = LS.get('al.recents', []), meta = LS.get('al.meta', {});
let apps = [], view = 'discover', typeF = 'all', sort = 'name', query = '', loading = false, addType = 'repo';
const HTTP = /^https?:$/.test(location.protocol);

function guess(){
  const h = location.hostname, m = h.match(/^([^.]+)\.github\.io$/i), seg = location.pathname.split('/')[1];
  return { owner: m ? m[1] : 'timi3112010-del', repo: m ? (seg && !/\.html?$/i.test(seg) ? seg : h) : 'timi3112010-del' };
}
const sid = (o, r) => (o + '/' + r).toLowerCase();
S.sources = (Array.isArray(S.sources) ? S.sources : []).filter(s => s && typeof s.id === 'string' && typeof s.name === 'string' && (s.type === 'url' ? typeof s.url === 'string' : typeof s.owner === 'string' && typeof s.repo === 'string')); /* defekte Einträge verwerfen */
if (!S.sources.length){ /* Migration der alten Einzel-Repository-Version */
  const g = guess(), o = S.owner || g.owner, r = S.repo || g.repo;
  S.sources.push({ id: sid(o, r), name: 'Meine Bibliothek', type: 'repo', owner: o, repo: r, branch: S.branch || 'main', enabled: true, main: true });
  const mig = x => /^(github|url):/.test(x) ? x : `github:${S.sources[0].id}:${x}`;
  favs = favs.map(mig); recents = recents.map(mig); LS.set('al.favs', favs); LS.set('al.recents', recents); save();
}
const srcOf = a => a.local ? { name: 'Dieses Gerät', local: true } : (S.sources.find(s => s.id === a.sid) || {});
function pagesBase(s){
  if (s.main && HTTP) return new URL('.', location.href);
  const o = s.owner.toLowerCase();
  return new URL(s.repo.toLowerCase() === o + '.github.io' ? `https://${o}.github.io/` : `https://${o}.github.io/${encodeURIComponent(s.repo)}/`);
}
const hashHue = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const pretty = s => { s = decodeURIComponent(s).replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : 'App'; };
const enc = p => p.split('/').map(encodeURIComponent).join('/');

function parseTree(s, tree){
  const out = [], seen = new Set();
  for (const it of tree){
    if (it.type !== 'blob') continue;
    let m, a = null;
    if ((m = it.path.match(/^(htmls)\/([^\/]+\.html?)$/i))) a = { cat: 'html', file: m[2], dir: m[2].replace(/\.html?$/i, ''), path: m[1] + '/' + enc(m[2]) };
    else if ((m = it.path.match(/^(webapps)\/([^\/]+)\/index\.html?$/i))) a = { cat: 'webapp', file: m[2], dir: m[2], path: m[1] + '/' + enc(m[2]) + '/' };
    if (!a) continue;
    a.key = a.cat + ':' + a.file; a.sid = s.id; a.id = `github:${s.id}:${a.key}`.toLowerCase();
    if (seen.has(a.id)) continue; seen.add(a.id);
    a.name = pretty(a.file); a.hue = hashHue(a.file); a.type = 'app';
    out.push(a);
  }
  const by = new Map(tree.map(t => [t.path, t]));
  const dirs = new Map(out.filter(a => a.cat === 'webapp').map(a => [a.file, a]));
  for (const it of tree){ if (it.type !== 'blob') continue; const m = it.path.match(/^webapps\/([^\/]+)\/(.+)$/i), a = m && dirs.get(m[1]); if (a) (a.files = a.files || []).push({ rel: m[2], sha: it.sha, size: it.size }); }
  out.filter(a => a.cat === 'html').forEach(a => { const t = by.get(decodeURIComponent(a.path)); a.files = [{ rel: 'index.html', sha: t && t.sha, size: t && t.size }]; });
  return out;
}
async function loadSource(s, force){
  if (s.type === 'url'){
    return [{ id: 'url:' + s.id, sid: s.id, cat: 'url', key: 'url', file: s.name, name: s.name, hue: hashHue(s.id), type: s.atype || 'app', url: s.url, desc: s.desc || '' }];
  }
  if (s.type === 'library'){
    const lk = 'al.lib.' + s.id, lc = LS.get(lk, null);
    if (!force && lc && Date.now() - lc.t < 6e5) return lc.list;
    try {
      const r = await fetch(new URL('library-export.json', pagesBase(s)), { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status === 404 ? 'library-export.json nicht gefunden (in der anderen Bibliothek unter Einstellungen erzeugen).' : 'HTTP ' + r.status);
      const d = await r.json(); if (d.format !== 1 || !Array.isArray(d.apps)) throw new Error('Unbekanntes Exportformat.');
      const list = d.apps.filter(x => x && x.id && x.name && /^https?:\/\//i.test(x.url)).map(x => ({ id: `lib:${s.id}:${x.id}`.toLowerCase(), sid: s.id, cat: 'lib', key: 'lib:' + x.id, file: String(x.id), name: String(x.name), desc: String(x.description || ''), type: x.type === 'game' ? 'game' : 'app', category: x.category, tags: (x.tags || []).map(String), icon: x.icon, previews: Array.isArray(x.previews) ? x.previews : [], version: x.version, dev: x.developer, url: x.url, hue: hashHue(String(x.id)) }));
      LS.set(lk, { t: Date.now(), list }); s.sync = Date.now(); s.err = ''; return list;
    } catch (e){ s.err = navigator.onLine ? e.message : 'Offline'; return lc ? lc.list : []; }
  }
  const key = 'al.tree2.' + s.id, c = LS.get(key, null);
  if (!force && c && Date.now() - c.t < 6e5) return c.list;
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
    const r = await fetch(`https://api.github.com/repos/${s.owner}/${s.repo}/git/trees/${encodeURIComponent(s.branch || 'main')}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' }, signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok){
      if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') throw new Error('GitHub-Limit erreicht, später erneut versuchen.');
      throw new Error(r.status === 404 ? 'Repository oder Branch nicht gefunden.' : 'GitHub-Status ' + r.status);
    }
    const d = await r.json(); if (!Array.isArray(d.tree)) throw new Error('Unerwartete Antwort.');
    const list = parseTree(s, d.tree); LS.set(key, { t: Date.now(), list }); s.sync = Date.now(); s.err = ''; return list;
  } catch (e){
    s.err = e.name === 'AbortError' ? 'Zeitüberschreitung.' : (navigator.onLine ? e.message : 'Offline'); return c ? c.list : [];
  }
}
let loadSeq = 0;
async function loadAll(force){
  const my = ++loadSeq; loading = true; render();
  try {
    const res = await Promise.all(S.sources.filter(s => s.enabled).map(async s => {
      try { const l = await loadSource(s, force); l.forEach(a => { if (!a.url) a.url = new URL(a.path, pagesBase(s)).href; }); return l; }
      catch (e) { s.err = 'Quelle fehlerhaft: ' + e.message; return []; } /* eine defekte Quelle blockiert die anderen nicht */
    }));
    const list = res.flat(); let loc = [];
    try { loc = await localApps(); } catch (e) { toast('Lokale Apps nicht lesbar: ' + e.message); }
    if (my !== loadSeq) return; /* eine neuere Anfrage läuft bereits */
    const have = new Set(list.map(a => a.id));
    Object.values(INST).filter(r => !have.has(r.origin)).forEach(r => loc.push({ id: r.origin, uid: r.id, sid: 'local', cat: 'local', key: 'local:' + r.id, local: true, file: r.name, name: r.name, desc: 'Installierte App (Quelle nicht verfügbar)', type: r.type, hue: hashHue(r.id), size: r.size, url: instUrl(r.id) }));
    apps = list.concat(loc); save();
    const by = {}; apps.forEach(a => (by[a.name.toLowerCase()] = by[a.name.toLowerCase()] || []).push(a));
    apps.forEach(a => { const g = by[a.name.toLowerCase()]; a.dups = g.length > 1 ? g.filter(x => x !== a).map(x => srcOf(x).name) : []; });
    apps.forEach(a => applyMeta(a, meta[a.id]));
    apps.forEach(a => { const r = a.local ? null : INST[a.id]; a.inst = r || null; a.openUrl = r ? instUrl(r.id) : ''; }); markUpdates();
  } catch (e){ fatal('Laden: ' + e.message); }
  finally { if (my === loadSeq){ loading = false; render(); } }
  if (my === loadSeq){ enrich(force); handleDeepLink(); }
}
