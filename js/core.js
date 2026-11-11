"use strict";
const $ = s => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k){ try { localStorage.removeItem(k); } catch {} }
};
function fatal(m){
  let b = $('#fatal');
  if (!b){ b = el('div'); b.id = 'fatal'; b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:90px;z-index:99;padding:12px 14px;border-radius:14px;background:#b3261e;color:#fff;font:13px system-ui'; b.onclick = () => b.remove(); document.body.appendChild(b); }
  b.textContent = 'Fehler: ' + m + ' (Tippen zum Schließen)';
}
addEventListener('error', e => fatal(e.message || 'Unbekannt'));
addEventListener('unhandledrejection', e => fatal(String(e.reason && e.reason.message || e.reason)));

