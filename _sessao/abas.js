/* oia-abas.js — abas laterais, A-/A+ e tema. Gerado por _scripts/gerar_site_oia.py. */
(function () {
  var toggles = [].slice.call(document.querySelectorAll('.aba-toggle'));
  function painel(t) { return document.getElementById(t.id.replace(/T$/, '')); }
  function empilhar() {
    /* 8 abas: se nao couberem na altura da tela, a letra das linguetas diminui */
    document.body.classList.remove('abas-compactas');
    function pos(gap) { var y = 56; toggles.forEach(function (t) { t.style.top = y + 'px'; y += t.offsetHeight + gap; }); return y; }
    if (pos(10) > window.innerHeight) { document.body.classList.add('abas-compactas'); pos(4); }
  }
  var topoPaineis = [].slice.call(document.querySelectorAll('.topo-btns [aria-controls]'));
  function fechar() {
    toggles.forEach(function (t) { t.classList.remove('ativa'); painel(t).classList.remove('open'); });
    topoPaineis.forEach(function (b) {
      var p = document.getElementById(b.getAttribute('aria-controls'));
      if (p) { p.classList.remove('open'); }
      b.classList.remove('ativa'); b.setAttribute('aria-expanded', 'false');
    });
  }
  /* icones Instalar e Estilo (topo): abrem/fecham seu painel, que nao tem lingueta na lateral */
  topoPaineis.forEach(function (b) {
    var p = document.getElementById(b.getAttribute('aria-controls'));
    if (!p) { return; }
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = !p.classList.contains('open');
      fechar();
      if (abrir) { p.classList.add('open'); b.classList.add('ativa'); b.setAttribute('aria-expanded', 'true'); }
    });
  });
  toggles.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = !painel(t).classList.contains('open');
      fechar();
      if (abrir) { painel(t).classList.add('open'); t.classList.add('ativa'); }
    });
  });
  /* celular: tocar em qualquer parte fecha a aba, menos nos controles do painel (links, botoes, temas, campos) */
  var celular = window.matchMedia('(max-width: 560px)');
  var CONTROLES = 'a, button, summary, input, select, textarea, label, .prompt';
  [].slice.call(document.querySelectorAll('.aba-painel')).forEach(function (p) {
    p.addEventListener('click', function (e) {
      if (e.target.closest('a')) { return; }
      e.stopPropagation();
      if (celular.matches && !e.target.closest(CONTROLES)) { fechar(); }
    });
  });
  /* toque fora com aba aberta: so fecha, sem acionar o que estiver por baixo */
  document.addEventListener('click', function (e) {
    var aberta = document.querySelector('.aba-painel.open');
    if (!aberta || e.target.closest('.aba-painel, .aba-toggle, .topo-btns')) { return; }
    e.preventDefault(); e.stopPropagation(); fechar();
  }, true);
  document.addEventListener('click', fechar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fechar(); } });
  empilhar();
  window.addEventListener('resize', empilhar);
})();

/* A-/A+: 3 tamanhos (normal, g, gg); a escolha vem do <head> e fica em oia-letra. */
(function () {
  var h = document.documentElement, menos = document.getElementById('letraMenos'),
      mais = document.getElementById('letraMais'), passos = ['', 'g', 'gg'];
  if (!menos || !mais) { return; }
  function atual() { return Math.max(0, passos.indexOf(h.getAttribute('data-letra') || '')); }
  function mostrar() { var i = atual(); menos.disabled = i === 0; mais.disabled = i === passos.length - 1; }
  function mudar(d, e) {
    e.stopPropagation();
    var i = Math.min(passos.length - 1, Math.max(0, atual() + d));
    if (passos[i]) { h.setAttribute('data-letra', passos[i]); } else { h.removeAttribute('data-letra'); }
    try { localStorage.setItem('oia-letra', passos[i]); } catch (err) { /* sem localStorage */ }
    mostrar();
    window.dispatchEvent(new Event('resize'));
  }
  menos.addEventListener('click', function (e) { mudar(-1, e); });
  mais.addEventListener('click', function (e) { mudar(1, e); });
  mostrar();
})();

/* Tema (sol/lua): o inicial vem do <head> (escolha guardada ou o do aparelho). */
(function () {
  var b = document.getElementById('temaBtn'), h = document.documentElement;
  if (!b) { return; }
  function rotulo() {
    var r = h.getAttribute('data-tema') === 'claro' ? 'Mudar para o modo escuro' : 'Mudar para o modo claro';
    b.setAttribute('aria-label', r); b.title = r;
  }
  b.addEventListener('click', function (e) {
    e.stopPropagation();
    var novo = h.getAttribute('data-tema') === 'claro' ? 'escuro' : 'claro';
    h.setAttribute('data-tema', novo);
    try { localStorage.setItem('oia-tema', novo); } catch (err) { /* sem localStorage */ }
    rotulo();
  });
  rotulo();
})();

/* Icone Avaliacao: abre/fecha o menu (avaliacao, painel do professor, sugestao, agradecimentos); toque fora ou Esc fecha. */
(function () {
  var b = document.getElementById('avaMenuBtn'), m = document.getElementById('avaMenu');
  if (!b || !m) { return; }
  function abrir(on) { m.hidden = !on; b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.classList.toggle('ativo', on); }
  b.addEventListener('click', function (e) { e.stopPropagation(); abrir(m.hidden); });
  m.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { abrir(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { abrir(false); } });
})();
