"use strict";
/* ---------- Hinweise ---------- */
function toast(m){ const t = el('div', 'toast glass', m); $('#toasts').appendChild(t); setTimeout(() => t.remove(), 5200); }
function tip(k, m){ if (S.tips[k]) return; S.tips[k] = 1; save(); toast(m); }

