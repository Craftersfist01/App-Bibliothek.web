"use strict";
/* ---------- Oberfläche (Premium): Karten, Hervorhebungen, Navigation, Ansichten ---------- */
const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = { discover: SV('<path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/>'), mine: SV('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'), archive: SV('<path d="M4 7h16v4H4zM6 11v8h12v-8M10 15h4"/>'), settings: SV('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'), share: SV('<path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5"/>') };
const TABS = [['discover', 'Entdecken'], ['mine', 'Meine Apps'], ['archive', 'Archiv'], ['settings', 'Einstellungen']];
const isVid = s => /\.(mp4|webm|mov)(\?|$)/i.test(String(s || ''));
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'; };
let lastView = '';

function iconEl(a, size){
  const d = el('div', 'icon' + (size ? ' ' + size : ''), (a.name.trim()[0] || '?').toUpperCase()); d.style.setProperty('--h', a.hue);
  if (a.icon){ const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.onerror = () => i.remove(); i.src = a.icon; d.appendChild(i); }
  return d;
}
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !S.safe) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: .35 }) : null;
function media(src, a, ctl){
  if (isVid(src)){ const v = el('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata'; v.src = src; if (ctl) v.controls = true; vio && vio.observe(v); return v; }
  const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.className = 'fade'; i.onload = () => i.classList.add('ld'); i.onerror = () => i.replaceWith(iconEl(a, 'xl')); i.src = src; return i;
}
const cover = a => (a.previews && a.previews[0]) || a.og || '';
const goLabel = a => a.type === 'game' ? 'Spielen' : 'Öffnen';

/* Animationen: Einblenden beim Scrollen und 3D-Neigung mit Lichtreflex */
const rio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; rio.unobserve(e.target); const c = e.target; c.classList.add('in');
  setTimeout(() => c.classList.remove('rv', 'in'), 1100 + (parseInt(c.style.getPropertyValue('--i')) || 0) * 55);
}), { rootMargin: '0px 0px -5% 0px' }) : null;
function reveal(c, i){ if (rio && !S.safe){ c.classList.add('rv'); c.style.setProperty('--i', Math.min(i, 9)); rio.observe(c); } }
function tilt(c){
  if (!fine || S.safe) return;
  c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; c.style.setProperty('--ry', ((x - .5) * 8) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 8) + 'deg'); c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%'); });
  c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
}
function favBtn(a){
  const on = favs.includes(a.id), f = el('button', 'fav' + (on ? ' on' : ''), on ? '♥' : '♡'); f.dataset.id = a.id; f.setAttribute('aria-label', 'Favorit'); f.setAttribute('aria-pressed', String(on));
  f.onclick = e => {
    e.stopPropagation(); favs = favs.includes(a.id) ? favs.filter(x => x !== a.id) : [a.id, ...favs]; LS.set('al.favs', favs); tip('fav', 'Mit dem Herz findest du deine Lieblingsapps schneller.');
    const now = favs.includes(a.id);
    document.querySelectorAll('.fav').forEach(b => { if (b.dataset.id !== a.id) return; b.classList.toggle('on', now); b.textContent = now ? '♥' : '♡'; b.setAttribute('aria-pressed', String(now)); });
    f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop'); if (view === 'mine') setTimeout(render, 450);
  };
  return f;
}
function card(a, i){
  const c = el('article', 'card glass'); c.style.setProperty('--h', a.hue); c.tabIndex = 0; c.dataset.id = a.id; c.setAttribute('role', 'button'); c.setAttribute('aria-label', a.name + ' – Details');
  const pv = el('div', 'pv'), src = cover(a); pv.appendChild(src ? media(src, a) : iconEl(a, 'xl'));
  const pi = iconEl(a); pi.classList.add('pi'); pv.appendChild(pi);
  if (a.update) pv.appendChild(el('span', 'badge', 'Update'));
  if (sort === 'manual' && view === 'discover'){ const h = el('button', 'dh', '⠿'); h.setAttribute('aria-label', 'Verschieben'); h.onclick = e => e.stopPropagation(); pv.appendChild(h); }
  const t = el('div', 'txt'); t.append(el('div', 'nm', ((S.pins || []).includes(a.id) ? '📌 ' : '') + a.name), el('div', 'ds', a.desc || ''));
  const go = el('button', 'btn', goLabel(a)); go.onclick = e => { e.stopPropagation(); openApp(a); };
  const b = el('div', 'body'); b.append(t, go); c.append(pv, favBtn(a), b);
  c.onclick = () => detail(a); c.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); detail(a); } };
  tilt(c); reveal(c, i); return c;
}
function feat(a, kicker, i){
  const c = el('article', 'feat'); c.style.setProperty('--h', a.hue); c.tabIndex = 0; c.dataset.id = a.id; c.setAttribute('role', 'button'); c.setAttribute('aria-label', a.name + ' – Details');
  const src = cover(a), bg = el('div', 'fbg');
  if (src){ const m = media(src, a); m.classList.add('kb'); bg.appendChild(m); } else bg.appendChild(el('span', 'big', (a.name[0] || '?').toUpperCase()));
  const t = el('div', 'ft'), go = el('button', 'btn', goLabel(a)); go.onclick = e => { e.stopPropagation(); openApp(a); };
  t.append(el('span', 'kicker', kicker), el('h3', null, a.name), el('p', null, a.desc || ''), go);
  const pi = iconEl(a); pi.classList.add('fi');
  c.append(bg, pi, favBtn(a), t); c.onclick = () => detail(a); c.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); detail(a); } };
  reveal(c, i); return c;
}
function highlights(list){
  const by = new Map(list.map(a => [a.id, a])), pins = (S.pins || []).map(i => by.get(i)).filter(Boolean), rec = recents.map(i => by.get(i)).filter(Boolean), out = [];
  [...pins, ...rec, ...list.filter(cover)].forEach(a => { if (!out.includes(a)) out.push(a); });
  return out.slice(0, 6).map(a => [a, pins.includes(a) ? 'Angepinnt' : rec.includes(a) ? 'Zuletzt genutzt' : a.type === 'game' ? 'Game' : 'App']);
}
function safeCard(a, i){ try { return card(a, i); } catch (e){ return el('div', 'msg glass small', ((a && a.name) || 'App') + ': Anzeige nicht möglich'); } }
function section(title, list, empty){
  const s = el('section'), h = el('h2', null, title); h.appendChild(el('small', null, String(list.length))); s.appendChild(h);
  if (!list.length){ const m = el('div', 'msg glass small'); m.textContent = empty; s.appendChild(m); return s; }
  const g = el('div', 'grid'); list.forEach((a, i) => g.appendChild(safeCard(a, i))); s.appendChild(g); return s;
}
function msg(t, p, btnTxt, fn){
  const m = el('div', 'msg glass'); m.append(el('b', null, t), el('p', null, p));
  if (btnTxt){ const b = el('button', 'btn', btnTxt); b.onclick = fn; m.appendChild(b); } return m;
}
function visible(){
  const q = query.trim().toLowerCase();
  const l = apps.filter(a => (typeF === 'all' || a.type === typeF) && (!q || [a.name, a.desc, a.file, ...(a.tags || [])].join(' ').toLowerCase().includes(q)));
  const rk = a => (recents.indexOf(a.id) + 1) || 999;
  l.sort(sort === 'manual' ? (a, b) => orderIdx(a) - orderIdx(b) : sort === 'recent' ? (a, b) => rk(a) - rk(b) : sort === 'source' ? (a, b) => (srcOf(a).name || '').localeCompare(srcOf(b).name || '', 'de') || a.name.localeCompare(b.name, 'de') : (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
  l.sort((a, b) => (S.pins || []).includes(b.id) - (S.pins || []).includes(a.id)); return l;
}
function buildNav(){
  const nav = $('#tabs'); if (nav.dataset.ok) return; nav.dataset.ok = '1';
  const ind = el('i'); ind.id = 'ind'; nav.appendChild(ind);
  TABS.forEach(([k, l]) => { const b = el('button'); b.dataset.k = k; b.setAttribute('aria-label', l); b.innerHTML = ICON[k] + '<span>' + l + '</span>'; b.onclick = () => { view = k; $('#lib').scrollTop = 0; render(); }; nav.appendChild(b); });
}
function render(){ try { renderInner(); } catch (e){ fatal('Anzeige: ' + e.message); } }
function renderInner(){
  const root = $('#content'); buildNav();
  const changed = lastView !== view; lastView = view; root.replaceChildren();
  if (changed){ root.classList.remove('vin'); void root.offsetWidth; root.classList.add('vin'); }
  $('#title').textContent = TABS.find(t => t[0] === view)[1]; $('#hello').textContent = view === 'discover' ? greet() : '';
  $('#sbox').style.display = view === 'discover' ? '' : 'none';
  $('#tabs').querySelectorAll('button').forEach((b, i) => { const on = b.dataset.k === view; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); if (on) $('#ind').style.transform = `translateX(${i * 100}%)`; });
  const tools = $('#tools'); tools.replaceChildren(); tools.style.display = view === 'discover' ? '' : 'none';
  if (view === 'discover'){
    tools.appendChild(seg([['all', 'Alle'], ['app', 'Apps'], ['game', 'Games']], typeF, k => { typeF = k; render(); }));
    const sel = el('select'); sel.setAttribute('aria-label', 'Sortierung');
    [['name', 'Name'], ['source', 'Quelle'], ['recent', 'Zuletzt genutzt'], ['manual', 'Manuell']].forEach(([k, l]) => { const o = el('option', null, l); o.value = k; o.selected = sort === k; sel.appendChild(o); });
    sel.onchange = () => { sort = sel.value; render(); }; tools.appendChild(sel);
    S.sources.filter(s => s.enabled && s.err).forEach(s => root.appendChild(el('div', 'banner glass', `⚠ Quelle „${s.name}“: ${s.err}`)));
    if (loading && !apps.length){ const g = el('div', 'grid'); g.style.marginTop = '24px'; for (let i = 0; i < 6; i++) g.appendChild(el('div', 'sk')); root.appendChild(g); return; }
    const l = visible();
    if (!apps.length) return root.appendChild(msg('Noch keine Apps', 'Lege .html-Dateien in „htmls“ oder Ordner mit index.html in „webapps“, oder füge unter Einstellungen eine Quelle hinzu.', 'Aktualisieren', () => loadAll(true)));
    if (!l.length) return root.appendChild(msg('Keine Treffer', 'Passe Suche oder Filter an.'));
    if (!query.trim() && typeF === 'all' && sort !== 'manual'){
      const h = highlights(l); if (h.length){ const s = el('section'), row = el('div', 'row'); h.forEach(([a, k], i) => row.appendChild(feat(a, k, i))); s.appendChild(row); root.appendChild(s); }
    }
    const s = el('section'), h2 = el('h2', null, query.trim() ? 'Suchergebnisse' : 'Alle Apps & Games'), g = el('div', 'grid'); h2.appendChild(el('small', null, String(l.length)));
    l.forEach((a, i) => g.appendChild(safeCard(a, i))); s.append(h2, g); root.appendChild(s); if (sort === 'manual') enableDrag(g);
  } else if (view === 'mine'){
    const by = new Map(apps.map(a => [a.id, a]));
    if (apps.some(a => a.update)) root.appendChild(updateBar());
    root.append(section('Favoriten', favs.map(i => by.get(i)).filter(Boolean), 'Tippe auf das Herz einer App, um sie hier zu speichern.'),
      section('Zuletzt geöffnet', recents.map(i => by.get(i)).filter(Boolean), 'Hier erscheinen deine zuletzt geöffneten Apps.'),
      section('Lokale Apps', apps.filter(a => a.local), 'Importiere HTML-Dateien oder ZIP-Webapps unter Einstellungen → Eigene Apps.'),
      ...folders().map(f => section('📁 ' + f.name, f.apps.map(i => by.get(i)).filter(Boolean), 'Dieser Ordner ist leer.')));
  } else if (view === 'archive'){ renderArchive(root); }
  else renderSettings(root);
}
/* Kopfzeile schrumpft beim Scrollen, Hintergrund reagiert auf Scrollen und Mauszeiger */
(function(){
  const lib = $('#lib'), hd = $('#hd'); let tick = 0;
  lib.addEventListener('scroll', () => { if (tick) return; tick = requestAnimationFrame(() => { tick = 0; document.documentElement.style.setProperty('--sy', lib.scrollTop); hd.classList.toggle('sm', lib.scrollTop > 40); }); }, { passive: true });
  if (fine) addEventListener('pointermove', e => { document.documentElement.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3)); document.documentElement.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3)); }, { passive: true });
  $('#refreshBtn').onclick = () => { const b = $('#refreshBtn'); b.classList.add('spin'); loadAll(true).finally(() => b.classList.remove('spin')); };
})();
