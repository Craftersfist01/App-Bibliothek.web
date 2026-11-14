/* Recover offline installs when GitHub Pages is behind the Git tree or cannot serve a file. */
(() => {
  const install = installApp;
  let busy = false;

  function rawUrl(a, f) {
    const source = srcOf(a), branch = String(source.branch || 'main').split('/').map(encodeURIComponent).join('/');
    const path = a.cat === 'html' ? a.path : a.path + enc(f.rel);
    const safePath = path.split('/').map(part => {
      try { return encodeURIComponent(decodeURIComponent(part)); }
      catch { return encodeURIComponent(part); }
    }).join('/');
    return `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${branch}/${safePath}`;
  }

  async function verified(response, sha) {
    if (!response || !response.ok) return null;
    const buffer = await response.clone().arrayBuffer();
    return await gitSha(buffer) === sha ? { response, buffer } : null;
  }

  window.installApp = async function installWithRecovery(app, mode) {
    if (busy) return toast('Ein Download läuft bereits.');
    if (!app || !Array.isArray(app.files) || !app.files.length) return install(app, mode);
    busy = true;
    const nativeFetch = window.fetch;
    const byUrl = new Map(app.files.map(file => [new URL(fileUrl(app, file), location.href).href, file]));

    window.fetch = async function fetchWithRecovery(input, init) {
      const requestUrl = new URL(typeof input === 'string' ? input : input.url, location.href).href;
      const file = byUrl.get(requestUrl);
      if (!file || !file.sha) return nativeFetch.call(this, input, init);

      let pageResponse;
      try { pageResponse = await nativeFetch.call(this, input, init); } catch {}
      try {
        const validPage = await verified(pageResponse, file.sha);
        if (validPage) return validPage.response;
      } catch {}

      try {
        const rawResponse = await nativeFetch.call(this, rawUrl(app, file), { cache: 'no-store' });
        const validRaw = await verified(rawResponse, file.sha);
        if (validRaw) return new Response(validRaw.buffer, { status: 200, headers: rawResponse.headers });
      } catch {}

      /* Let the normal installer show its integrity/HTTP error if both sources fail. */
      if (pageResponse) return pageResponse;
      return nativeFetch.call(this, input, init);
    };

    try { return await install(app, mode); }
    finally { window.fetch = nativeFetch; busy = false; }
  };
})();
