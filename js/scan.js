"use strict";
/* ---------- QR-Import (Kamera nur auf Wunsch) und Bibliotheks-Export ---------- */
const lazyJs = (src, ok) => new Promise((res, rej) => {
  if (ok()) return res();
  const s = el('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Bibliothek nicht ladbar (offline?)')); document.head.appendChild(s);
});
function decodeFrame(src, w, h){
  const c = el('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h);
  const r = jsQR(x.getImageData(0, 0, w, h).data, w, h); return r && r.data;
}
function useQR(text){
  let u; try { u = new URL(text); } catch { return toast('Der QR-Code enthält keinen Link.'); }
  const s = u.searchParams.get('source'), k = u.searchParams.get('app');
  if (!s || !k) return toast('Das ist kein Link einer App-Bibliothek.');
  history.replaceState(null, '', '?' + new URLSearchParams({ source: s, app: k })); view = 'discover'; render(); handleDeepLink();
}
async function scanQR(){
  try { await lazyJs('js/vendor/jsqr.js', () => window.jsQR); } catch (e){ return toast(e.message); }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return pickQRImage();
  const o = el('div', 'dlg'), p = el('div', 'panel glass'), v = el('video'), bar = el('div', 'dbtns'), cl = el('button', 'btn', 'Abbrechen'), im = el('button', 'btn gh', 'Foto wählen');
  v.setAttribute('playsinline', ''); v.muted = true; v.style.cssText = 'width:100%;border-radius:18px;background:#000';
  bar.append(cl, im); p.append(el('h3', null, 'QR-Code scannen'), v, bar); o.appendChild(p); document.body.appendChild(o);
  let stream, stop = false, last = 0;
  const end = () => { stop = true; stream && stream.getTracks().forEach(t => t.stop()); o.remove(); };
  cl.onclick = end; im.onclick = () => { end(); pickQRImage(); };
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => {
    if (stop) return s.getTracks().forEach(t => t.stop());
    stream = s; v.srcObject = s; v.play();
    const tick = t => {
      if (stop) return;
      if (t - last > 120 && v.videoWidth){ last = t; const r = decodeFrame(v, v.videoWidth, v.videoHeight); if (r){ end(); return useQR(r); } }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).catch(e => { end(); toast('Kamera nicht verfügbar: ' + e.message); });
}
async function pickQRImage(){
  try { await lazyJs('js/vendor/jsqr.js', () => window.jsQR); } catch (e){ return toast(e.message); }
  const i = el('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = async () => { try { const b = await createImageBitmap(i.files[0]), r = decodeFrame(b, b.width, b.height); r ? useQR(r) : toast('Kein QR-Code im Bild erkannt.'); } catch (e){ toast('Bild nicht lesbar: ' + e.message); } };
  i.click();
}
function exportLibrary(){ /* standardisiertes Quellenformat: library-export.json (format 1) */
  const list = apps.filter(a => !a.local && /^https?:/i.test(a.url || '')).map(a => ({ id: a.key, name: a.name, description: a.desc || '', type: a.type, category: a.category || '', tags: a.tags || [], icon: a.icon || '', previews: a.previews || [], version: a.version || '', developer: a.dev || '', url: a.url }));
  const main = S.sources.find(s => s.main), blob = new Blob([JSON.stringify({ format: 1, name: main ? main.name : 'Bibliothek', exported: new Date().toISOString(), apps: list }, null, 2)], { type: 'application/json' });
  const l = el('a'); l.href = URL.createObjectURL(blob); l.download = 'library-export.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(l.href), 6e4);
}
