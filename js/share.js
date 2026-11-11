"use strict";
/* ---------- Deep Links: ?source=owner/repo&app=html:name ---------- */
async function handleDeepLink(){ try { await handleDeepLink0(); } catch (e){ toast('Link konnte nicht geöffnet werden: ' + e.message); } }
async function handleDeepLink0(){
  const u = new URLSearchParams(location.search), s = u.get('source'), k = u.get('app'); if (!s || !k) return;
  history.replaceState(null, '', location.pathname);
  if (!S.sources.some(x => x.id === s.toLowerCase()) && /^[\w.-]+\/[\w.-]+$/.test(s) && confirm(`Externe Quelle „${s}“ hinzufügen, um diese App anzuzeigen?`)){
    const [o, r] = s.split('/'); S.sources.push({ id: sid(o, r), name: s, type: 'repo', owner: o, repo: r, branch: 'main', enabled: true }); save(); u.set('again', '1'); await loadAll(true); history.replaceState(null, '', location.pathname);
  }
  const a = apps.find(x => x.sid === s.toLowerCase() && x.key.toLowerCase() === k.toLowerCase());
  if (a) detail(a); else toast('Diese App ist nicht mehr verfügbar oder die Quelle nicht erreichbar.');
}

