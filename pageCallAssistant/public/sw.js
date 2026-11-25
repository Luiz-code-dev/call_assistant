const CACHE = "speakflow-v10";
const ESCOLA_CACHE = "speakflow-escola-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE).then((cache) =>
        cache.addAll(["/home", "/feed", "/live", "/network", "/manifest.json", "/icon.svg"])
      ),
      caches.open(ESCOLA_CACHE).then((cache) =>
        cache.addAll([
          "/escola/entrar",
          "/escola-manifest.json",
          "/icon.svg",
          "/icon.png",
        ])
      ),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  const keep = [CACHE, ESCOLA_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "SpeakFlow Network";
  const body  = data.body  || "Novo desafio disponível no seu Circle!";
  // Ícone, grupo e vibração podem vir no aviso (SpeakFlow Escolas manda um por tipo);
  // sem eles, fica tudo como antes
  const icon  = data.icon  || "/icon.svg";
  const url   = data.url   || "/home";

  // Telas abertas do app ficam sabendo do aviso e buscam os dados de novo (recado novo aparece sem recarregar)
  const avisarTelas = self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((list) => list.forEach((c) => c.postMessage({ type: "sf-aviso", tipo: data.tipo || null })))
    .catch(() => {});

  event.waitUntil(Promise.all([avisarTelas,
    self.registration.showNotification(title, {
      body,
      icon,
      badge: data.badge || icon,
      data: { url },
      vibrate: Array.isArray(data.vibrate) ? data.vibrate : [200, 100, 200],
      ...(data.tag ? { tag: data.tag, renotify: true } : {}),
    })
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/network";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const found = list.find((c) => c.url.includes(url));
      // Tela já aberta: recarrega na página do aviso antes de mostrar, para o conteúdo novo aparecer
      if (found) {
        if ("navigate" in found) return found.navigate(url).then((c) => (c || found).focus()).catch(() => found.focus());
        return found.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// O Safari recusa abrir uma página guardada que veio de um redirecionamento
// ("Response served by service worker has redirections"). Devolve uma cópia limpa.
function semRedirecionamento(res) {
  if (!res || !res.redirected) return res;
  return res.blob().then((corpo) => new Response(corpo, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

// Tela simples de "sem conexão" para o SpeakFlow Escolas, com botão de tentar de novo
function semConexaoEscola() {
  const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title>'
    + '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F8F7FC;color:#1F1A2E;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;box-sizing:border-box}'
    + 'main{max-width:360px;text-align:center}h1{font-size:22px;margin:0 0 8px}p{font-size:16px;line-height:1.45;color:#5B5470;margin:0 0 20px}'
    + 'button{width:100%;min-height:52px;border:0;border-radius:14px;background:#6D28D9;color:#fff;font-size:16px;font-weight:700}</style></head>'
    + '<body><main><h1>Sem conexão agora</h1><p>Não foi possível carregar esta tela. Confira a internet do aparelho e tente de novo.</p>'
    + '<button onclick="location.reload()">Tentar de novo</button></main></body></html>';
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;

  // Navigation requests (HTML pages): always try network, never serve stale HTML
  if (event.request.mode === "navigate") {
    const naEscola = new URL(event.request.url).pathname.startsWith("/escola");
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request)
          // SpeakFlow Escolas nunca cai na tela inicial de outro produto: mostra o aviso de sem conexão
          .then((cached) => cached || (naEscola ? null : caches.match("/home")))
          .then((cached) => semRedirecionamento(cached))
          .then((cached) => cached || (naEscola ? semConexaoEscola() : new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })))
          .catch(() => (naEscola ? semConexaoEscola() : new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })))
      )
    );
    return;
  }

  // Static assets: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || new Response("", { status: 408, statusText: "Offline" })
        )
      )
  );
});
