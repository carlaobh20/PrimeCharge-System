// Service worker mínimo do PrimeCharge (Fase 2). Objetivo: instalabilidade (PWA) + abertura
// rápida do app shell, tolerando conexão ruim. NÃO faz cache offline complexo dos dados (isso
// seria uma fase à parte, com invalidação cuidadosa) — dados sempre vêm da rede/Supabase.
//
// Estratégia:
//  - navegações (HTML): network-first com fallback pro shell em cache (permite abrir offline).
//  - assets estáticos com hash (/assets/...): cache-first (são imutáveis por hash).
//  - qualquer coisa de API/Supabase: NÃO intercepta (deixa passar direto pra rede).

const CACHE = 'primecharge-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Só intervém em requisições da própria origem. Supabase/Storage e qualquer terceiro passam direto.
  if (url.origin !== self.location.origin) return;

  // Navegações (SPA): network-first, cai pro index.html em cache se offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Assets com hash: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
  }
});
