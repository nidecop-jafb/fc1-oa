/* sw.js — Correcao de Provas FC1: a pagina abre e corrige SEM internet.
   Rede primeiro (sem cache HTTP: o Pages manda max-age=600 e o fetch comum
   devolveria o HTML velho — licao de 2026-09-16), e o cache so quando cai.
   So arquivos do proprio site; as chamadas ao Apps Script passam direto.
   CACHE e carimbado pelo gerar_correcao.py a cada publicacao. */
var CACHE = 'fc1-correcao-c444026e63';
var ARQUIVOS = ['./', 'index.html', 'omr.js', 'lib/jsQR.js', 'lib/qrcode.js', 'manifest.webmanifest',
  '../coleta-config.js', '../_icones/app-rap-192.png', '../_icones/app-rap-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('fc1-correcao-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  var fresco = new URL(e.request.url);
  fresco.searchParams.set('_sw', Date.now());
  e.respondWith(fetch(fresco.toString(), { cache: 'no-store' }).then(function (r) {
    if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copia); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true });
  }));
});
