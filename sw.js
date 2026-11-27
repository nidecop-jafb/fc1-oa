/* sw.js — service worker da FC1.
 *
 * Rede primeiro, cache depois. O site muda toda semana (OA novo, versao nova):
 * servir do cache por padrao entregaria material velho ao estudante. O cache
 * existe so para o aparelho sem internet.
 *
 * Gerado por _scripts/gerar_instalar_fc1.py — nao editar a mao.
 */
/* O nome do cache carrega a data/hora desta geracao. Ele MUDA a cada
 * publicacao, e e isso que faz o `activate` apagar o cache anterior:
 * o handler so remove caches com nome DIFERENTE do atual, entao com um
 * nome fixo ('fe1-oa-v1') nada era apagado — as respostas antigas
 * ficavam ali para sempre e voltavam a ser servidas em qualquer falha
 * de rede. Foi o bug de 2026-09-14: a pagina abria com as 7 abas novas
 * e, num tropeco de rede, voltava para a copia velha de 6. */
var CACHE = 'fc1-oa-20261127-190000';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', './manifest.webmanifest',
                     './_icones/app-site-192.png', './_icones/app-site-512.png']);
  }).catch(function () { /* sem rede na instalacao: segue sem cache */ }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE; })
                            .map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') { return; }
  // FC1: so o proprio site; Apps Script (coleta, contador) e outros enderecos seguem direto.
  if (new URL(e.request.url).origin !== self.location.origin) { return; }
  // O GitHub Pages manda Cache-Control: max-age=600 no HTML: um fetch()
  // "normal" dentro dos 10 min devolve a copia do CACHE DO NAVEGADOR, sem
  // nunca chegar na rede — quebrando a promessa acima ("nunca serve pagina
  // velha"). Descoberto 2026-09-16 (mesmo defeito reportado na ILB) com o
  // app instalado mostrando o site de antes do ultimo push. Corrige-se com
  // um parametro de URL sempre novo: o navegador so tem cache por URL
  // exata, entao isso forca ida a rede.
  var furar = e.request.url + (e.request.url.indexOf('?') < 0 ? '?' : '&') + '_sw=' + Date.now();
  e.respondWith(
    fetch(furar, { cache: 'no-store' }).then(function (resp) {
      /* So entra no cache resposta boa e do proprio site: guardar um 404 ou um
         502 faria o modo offline servir a pagina de erro para sempre. */
      if (resp && resp.ok && resp.type === 'basic') {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      }
      return resp;
    }).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || caches.match('./');
      });
    })
  );
});
