"use strict";
/* ---------- Darstellung ---------- */
function iconEl(a, size){
  const d = el('div', 'icon' + (size ? ' ' + size : ''), (a.name.trim()[0] || '?').toUpperCase()); d.style.setProperty('--h', a.hue);
  if (a.icon){ const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.onerror = () => i.remove(); i.src = a.icon; d.appendChild(i); }
  return d;
}
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !S.safe) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: .4 }) : null;
function media(src, a, ctl){
  if (/\.(mp4|webm|mov)(\?|$)/i.test(src)){
    const v = el('video'); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'metadata'; v.src = src; if (ctl) v.controls = true; vio && vio.observe(v); return v;
  }
  const i = new Image(); i.alt = ''; i.loading = 'lazy'; i.src = src; i.onerror = () => i.replaceWith(iconEl(a, 'xl')); return i;
}
const cover = a => (a.previews && a.previews[0]) || a.og || '';
const goLabel = a => a.type === 'game' ? 'Spielen' : 'Öffnen';
function favBtn(a){
  const f = el('button', 'fav' + (favs.includes(a.id) ? ' on' : ''), favs.includes(a.id) ? '★' : '☆'); f.setAttribute('aria-label', 'Favorit');
  f.onclick = e => { e.stopPropagation(); favs = favs.includes(a.id) ? favs.filter(x => x !== a.id) : [a.id, ...favs]; LS.set('al.favs', favs); tip('fav', 'Mit dem Stern findest du deine Lieblingsapps schneller.'); render(); if ($('#detail').classList.contains('open')) detail(a); };
  return f;
}
function card(a, i){
  const c = el('article', 'card glass'); c.style.setProperty('--h', a.hue); c.style.setProperty('--i', Math.min(i, 20)); c.tabIndex = 0;
  const pv = el('div', 'pv'), src = cover(a);
  if (src) pv.appendChild(media(src, a)); else pv.appendChild(iconEl(a, 'xl'));
  const pi = iconEl(a); pi.classList.add('pi'); pv.appendChild(pi); c.dataset.id = a.id; if (sort === 'manual' && view === 'discover'){ const h = el('button', 'dh', '⠿'); h.setAttribute('aria-label', 'Verschieben'); h.onclick = e => e.stopPropagation(); pv.appendChild(h); }
  if (a.update){ const bd = el('span', 'tag', 'Update'); bd.style.cssText = 'position:absolute;top:10px;left:10px;z-index:3;margin:0;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2))'; pv.appendChild(bd); }
  const t = el('div', 'txt'); t.append(el('div', 'nm', ((S.pins || []).includes(a.id) ? '📌 ' : '') + a.name), el('div', 'ds', a.desc || ''));
  const go = el('button', 'btn', goLabel(a)); go.onclick = e => { e.stopPropagation(); openApp(a); };
  const b = el('div', 'body'); b.append(t, go); c.append(pv, favBtn(a), b);
  c.onclick = () => detail(a); c.onkeydown = e => { if (e.key === 'Enter'){ e.preventDefault(); detail(a); } };
  return c;
}
function section(title, list, empty){
  const s = el('section'), h = el('h2', null, title); h.appendChild(el('small', null, String(list.length))); s.appendChild(h);
  if (!list.length){ const m = el('div', 'msg glass'); m.append(el('p', null, empty)); s.appendChild(m); return s; }
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
const TABS = [['discover', '✦', 'Entdecken'], ['mine', '★', 'Meine Apps'], ['archive', '❏', 'Archiv'], ['settings', '⚙', 'Einstellungen']];
function render(){ try { renderInner(); } catch (e){ fatal('Anzeige: ' + e.message); } }
function safeCard(a, i){ try { return card(a, i); } catch (e){ return el('div', 'msg glass small', ((a && a.name) || 'App') + ': Anzeige nicht möglich'); } }
function renderInner(){
  const root = $('#content'); root.replaceChildren();
  $('#title').textContent = TABS.find(t => t[0] === view)[2];
  $('#sbox').style.display = view === 'discover' ? '' : 'none';
  const nav = $('#tabs'); nav.replaceChildren();
  TABS.forEach(([k, ic, l]) => { const b = el('button', view === k ? 'on' : ''); b.append(el('span', null, ic), document.createTextNode(l)); b.onclick = () => { view = k; $('#lib').scrollTop = 0; render(); }; nav.appendChild(b); });
  const tools = $('#tools'); tools.replaceChildren(); tools.style.display = view === 'discover' ? '' : 'none';
  if (view === 'discover'){
    [['all', 'Alle'], ['app', 'Apps'], ['game', 'Games']].forEach(([k, l]) => { const b = el('button', 'chip glass' + (typeF === k ? ' on' : ''), l); b.onclick = () => { typeF = k; render(); }; tools.appendChild(b); });
    const sel = el('select'); sel.setAttribute('aria-label', 'Sortierung');
    [['name', 'Name'], ['source', 'Quelle'], ['recent', 'Zuletzt genutzt'], ['manual', 'Manuell']].forEach(([k, l]) => { const o = el('option', null, l); o.value = k; o.selected = sort === k; sel.appendChild(o); });
    sel.onchange = () => { sort = sel.value; render(); }; tools.appendChild(sel);
    S.sources.filter(s => s.enabled && s.err).forEach(s => root.appendChild(el('div', 'banner glass', `Quelle „${s.name}“: ${s.err}`)));
    if (loading && !apps.length){ const g = el('div', 'grid'); g.style.marginTop = '20px'; for (let i = 0; i < 6; i++) g.appendChild(el('div', 'sk')); root.appendChild(g); return; }
    const l = visible();
    if (!apps.length) root.appendChild(msg('Noch keine Apps', 'Lege .html-Dateien in „htmls“ oder Ordner mit index.html in „webapps“, oder füge unter Einstellungen eine Quelle hinzu.', 'Aktualisieren', () => loadAll(true)));
    else if (!l.length) root.appendChild(msg('Keine Treffer', 'Passe Suche oder Filter an.'));
    else { const g = el('div', 'grid'); g.style.marginTop = '20px'; l.forEach((a, i) => g.appendChild(safeCard(a, i))); root.appendChild(g); if (sort === 'manual') enableDrag(g); }
  } else if (view === 'mine'){
    const by = new Map(apps.map(a => [a.id, a]));
    if (apps.some(a => a.update)) root.appendChild(updateBar());
    root.append(section('Favoriten', favs.map(i => by.get(i)).filter(Boolean), 'Tippe auf den Stern einer App, um sie hier zu speichern.'),
      section('Zuletzt geöffnet', recents.map(i => by.get(i)).filter(Boolean), 'Hier erscheinen deine zuletzt geöffneten Apps.'),
      section('Lokale Apps', apps.filter(a => a.local), 'Importiere HTML-Dateien oder ZIP-Webapps unter Einstellungen → Eigene Apps.'),
      ...folders().map(f => section('📁 ' + f.name, f.apps.map(i => by.get(i)).filter(Boolean), 'Dieser Ordner ist leer.')));
  } else if (view === 'archive'){
    renderArchive(root);
  } else renderSettings(root);
}

