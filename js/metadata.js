"use strict";
/* ---------- Metadaten: app.json bevorzugt, sonst HTML-Auslese ---------- */
function applyMeta(a, m){
  if (!m) return;
  for (const k of ['name', 'desc', 'icon', 'tags', 'previews', 'version', 'dev', 'pub', 'mod', 'changelog', 'offline', 'category', 'og', 'migration', 'permissions', 'features'])
    if (m[k] != null && m[k] !== '') a[k] = m[k];
  if (m.type) a.type = m.type; if (m.hue != null) a.hue = m.hue;
}
function toHue(hex){
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
  let h = m[1]; if (h.length === 3) h = h.replace(/./g, c => c + c);
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (d < .12) return null;
  const v = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round((v * 60 + 360) % 360);
}
async function readMeta(a){
  const abs = (u, b) => { try { return u ? new URL(u, b || a.url).href : ''; } catch { return ''; } };
  const base = new URL(a.path.replace(/[^\/]*$/, ''), pagesBase(srcOf(a)));
  try { /* 1) library-data/<name>/app.json – unbekannte Felder werden ignoriert */
    const jb = new URL(`library-data/${encodeURIComponent(a.dir)}/`, pagesBase(srcOf(a)));
    const r = await fetch(new URL('app.json', jb), { cache: 'no-cache' });
    if (r.ok){
      const j = await r.json(), arr = v => Array.isArray(v) ? v : v ? [v] : [];
      return { t: Date.now(), json: true, name: j.name || j.displayName, desc: j.description, type: j.type === 'game' ? 'game' : 'app', category: j.category,
        tags: arr(j.tags).map(String), icon: abs(j.icon, jb), previews: arr(j.previews || j.preview).map(p => { p = typeof p === 'string' ? p : p && p.src; return p ? abs(/[\/]/.test(p) ? p : 'previews/' + p, jb) : ''; }).filter(Boolean),
        version: j.version, dev: j.developer, pub: j.published, mod: j.modified, changelog: arr(j.changelog), permissions: arr(j.permissions).map(String), features: arr(j.features || j.supports).map(String), migration: j.migration && typeof j.migration === 'object' ? j.migration : null, offline: j.offline, hue: toHue(j.color) };
    }
  } catch {}
  const res = await fetch(a.url, { cache: 'no-cache' }); if (!res.ok) throw 0; /* 2) Rückfall: HTML auslesen (ohne Skriptausführung) */
  const txt = (await res.text()).slice(0, 250000); if (!/<(!doctype|html|head|body|script|div|canvas|title)\b/i.test(txt)) throw new Error('keine HTML-Datei'); const doc = new DOMParser().parseFromString(txt, 'text/html');
  const q = s => doc.querySelector(s), mt = n => (q(`meta[name="${n}"]`) || q(`meta[property="${n}"]`))?.getAttribute('content')?.trim() || '';
  const lk = r => abs(q(`link[rel~="${r}"][href]`)?.getAttribute('href'));
  const og = abs(mt('og:image')); let name = mt('apple-mobile-web-app-title') || mt('og:site_name'); const t = doc.title?.trim(); if (!name && t && t.length <= 28) name = t;
  return { t: Date.now(), name, desc: (mt('description') || mt('og:description')).slice(0, 160), og,
    icon: lk('apple-touch-icon') || abs(q('link[rel~="icon"][href]')?.getAttribute('href')) || og, hue: toHue(mt('theme-color')) };
}
let rt = 0; const soft = () => { clearTimeout(rt); rt = setTimeout(() => { if (view === 'discover' || view === 'mine') render(); }, 350); };
async function enrich(force){
  const todo = apps.filter(a => !['url', 'local', 'lib'].includes(a.cat) && (force || !meta[a.id] || Date.now() - meta[a.id].t > 864e5)), snap = apps; let i = 0;
  const w = async () => { while (i < todo.length && snap === apps){ const a = todo[i++]; try { meta[a.id] = await readMeta(a); a.broken = false; applyMeta(a, meta[a.id]); } catch { a.broken = true; } soft(); } };
  await Promise.all([w(), w(), w(), w()]); LS.set('al.meta', meta);
}

