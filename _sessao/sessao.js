/* oia-sessao.js — pagina da sessao da Fisica 1 (molde da trilha do RIF). Gerado por gerar_site_oia.py.
   PRE-metodo-prj0004-sessao-pagina-rif-fisica1-2026-10-06. Dados da pagina em window.OIA_SESSAO.
   Aquecimento gradativo (.grad-g 1-4) e Fase 2 (.grad-g 5); perguntas do aquecimento corrigidas na tela e enviadas
   com o RA (Apps Script da LME, tipo_msg METODO; sem internet, fila no aparelho); duvidas em audio na Fase 2;
   cronometro no topo (aquecimento 10 min, estudo 15 min), so mede. Teste: ?rapido=1 (1 min = 1 s). */
(function () {
  var S = window.OIA_SESSAO;
  if (!S) { return; }
  var LETRA = 'abcd';
  function esc(s) { var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
  function ler(k) { try { return localStorage.getItem(k) || ''; } catch (x) { return ''; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (x) { /* sem localStorage */ } }
  function $(sel) { return document.querySelector(sel); }
  function aviso(m) { var a = $('.c-aviso'); if (a) { a.textContent = m; a.hidden = !m; } }
  var TEMA = S.id.split('-')[0];
  /* destino: oia-oa (padrao) ou fc1-oa (PRE-site-fc1-oa-sessoes-livro-t11-t18-2026-10-10). Os dois sites estao na
     mesma origem (github.io): as chaves do aparelho levam o prefixo do destino para nao colidir. */
  var P = S.pref || 'oia-', DISC = S.disc || 'OIA';
  /* RA: na FC1, o mesmo RA ja digitado em qualquer OA da FC1 (ifmg_fc1_*aluno); na OIA, o da aba Estilo */
  function lerRA() {
    if (DISC !== 'FC1') { return ler('oia-estilo-ra'); }
    var o = null, i, k;
    try { o = JSON.parse(ler('ifmg_fc1_aluno') || 'null'); } catch (x) { o = null; }
    if (o && o.ra) { return String(o.ra).replace(/\D/g, ''); }
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (/^ifmg_fc1_.*aluno$/.test(k)) { o = JSON.parse(localStorage.getItem(k) || 'null'); if (o && o.ra) { return String(o.ra).replace(/\D/g, ''); } }
      }
    } catch (x) { /* sem localStorage */ }
    return '';
  }
  function guardarRA(ra) { if (DISC === 'FC1') { guardar('ifmg_fc1_aluno', JSON.stringify({ ra: ra })); } else { guardar('oia-estilo-ra', ra); } }

  /* ---- envio: fila no aparelho ---- */
  var enviando = false;
  function online() { return S.url && location.protocol.indexOf('http') === 0; }
  function fila() { try { return JSON.parse(ler(P + 'metodo-fila') || '[]'); } catch (x) { return []; } }
  function enviarFila() {
    var f = fila();
    if (enviando || !f.length || !online()) { return; }
    enviando = true;
    fetch(S.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(f[0]) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var g = fila(); g.shift(); guardar(P + 'metodo-fila', JSON.stringify(g)); enviando = false;
        if (!res.ok) { aviso('Envio recusado: ' + (res.erro || 'tente de novo.')); } else { aviso('Respostas enviadas.'); enviarFila(); }
      })
      .catch(function () { enviando = false; aviso('Sem conexão: suas respostas ficaram guardadas e vão quando a internet voltar.'); });
  }

  /* ---- Responda no celular: 0 de 3 ---- */
  var resp = (S.banco || []).map(function (q) {
    var o = [], i, j, k, t; for (i = 0; i < q.a.length; i++) { o.push(i); }
    for (j = o.length - 1; j > 0; j--) { k = Math.floor(Math.random() * (j + 1)); t = o[j]; o[j] = o[k]; o[k] = t; }
    return { ordem: o, escolha: -1 };
  });
  var erros = [];
  function placar() {
    var n = 0, a = 0;
    resp.forEach(function (x, qi) { if (x.escolha >= 0) { n++; if (x.escolha === S.banco[qi].c) { a++; } } });
    return { n: n, a: a, total: S.banco.length };
  }
  function registrar() {
    var ra = lerRA(), p = placar(), f;
    if (!ra) { aviso('Digite o seu RA acima para enviar as respostas.'); return; }
    f = fila();
    f.push({ tipo_msg: 'METODO', disciplina: DISC, trilha: S.trilha || '', ra: ra, sessao: S.id, etapa: 'antes',
             respostas: resp.map(function (x) { return LETRA.charAt(x.escolha); }).join(''), acertos: p.a });
    guardar(P + 'metodo-fila', JSON.stringify(f));
    enviarFila();
  }
  function cartoes() {
    var el = $('.c-cards'), p = placar();
    if (!el || !S.banco) { return; }
    el.innerHTML = '<p class="c-rot">Responda no celular: ' + p.n + ' de ' + p.total +
      (p.n ? ' · ' + p.a + (p.a === 1 ? ' certa' : ' certas') : '') + '</p>' +
      S.banco.map(function (q, qi) {
        var r = resp[qi];
        return '<div class="c-q" data-qi="' + qi + '"><p class="c-qt">' + (qi + 1) + '. ' + esc(q.q) + '</p>' +
          r.ordem.map(function (ai) {
            var cl = r.escolha < 0 ? '' : (ai === q.c ? ' certa' : (ai === r.escolha ? ' errada' : ''));
            return '<button type="button" class="c-alt' + cl + '" data-ai="' + ai + '"' + (r.escolha >= 0 ? ' disabled' : '') + '>' + esc(q.a[ai]) + '</button>';
          }).join('') +
          (r.escolha >= 0 ? '<p class="c-fb ' + (r.escolha === q.c ? 'ok' : 'nao') + '">' + (r.escolha === q.c ? 'Certo. ' : 'Errado. ') +
            esc(q.fb[r.escolha]) + ' <span class="c-ref">(' + esc(q.ref) + ')</span></p>' : '') + '</div>';
      }).join('');
  }
  function responder(btn) {
    var qi = +btn.closest('.c-q').getAttribute('data-qi'), ai = +btn.getAttribute('data-ai'), q = S.banco[qi];
    if (resp[qi].escolha >= 0) { return; }
    resp[qi].escolha = ai;
    if (ai !== q.c) { erros.push({ q: q.q, certa: q.a[q.c] }); }
    var p = placar();
    if (p.n === p.total) {
      registrar();
      /* erros desta sessao: aparecem no comeco da proxima sessao do tema (so neste aparelho) */
      guardar(P + 'f1-revisao-' + TEMA, erros.length ? JSON.stringify({ de: S.id, erros: erros }) : '');
    }
    cartoes();
  }
  function revisao() {
    var el = $('.s-rev'), r = null;
    if (!el) { return; }
    try { r = JSON.parse(ler(P + 'f1-revisao-' + TEMA) || 'null'); } catch (x) { r = null; }
    if (!r || r.de === S.id || !r.erros || !r.erros.length) { return; }
    el.innerHTML = '<p class="c-rot">Revise antes de começar: na sessão anterior deste tema você errou</p><ul>' +
      r.erros.map(function (e) { return '<li>' + esc(e.q) + ' <span class="c-ref">Resposta certa: ' + esc(e.certa) + '</span></li>'; }).join('') + '</ul>';
    el.hidden = false;
  }
  function blocoRA() {
    var el = $('.c-ra');
    if (el) { el.hidden = !!lerRA(); }
  }

  /* ---- aquecimento gradativo: .grad-g 1..5; progresso no aparelho ---- */
  function gradativo() {
    var grupos = [].slice.call(document.querySelectorAll('.grad-g')), chave = P + 'grad-' + S.id, g = 1;
    if (!grupos.length) { return; }
    try { g = Math.min(Math.max((JSON.parse(ler(chave) || '{}').g) || 1, 1), grupos.length); } catch (x) { g = 1; }
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'grad-btn'; b.textContent = 'Pronto, próxima etapa';
    function mostrar() {
      grupos.forEach(function (el) { el.hidden = +el.getAttribute('data-g') > g; });
      if (b.parentNode) { b.parentNode.removeChild(b); }
      if (g < grupos.length) {   /* o proximo grupo e uma fase nova (Fase 2 ou Fase 3)? */
        b.textContent = grupos[g].classList.contains('fase') ? 'Pronto, próxima fase' : 'Pronto, próxima etapa';
        grupos[g - 1].appendChild(b);
      }
    }
    b.addEventListener('click', function () {
      g += 1; guardar(chave, JSON.stringify({ g: g })); mostrar();
      var novo = grupos[g - 1]; novo.scrollIntoView({ block: 'start', behavior: 'smooth' });
      var foco = novo.querySelector('.etapa, .fase-t'); if (foco) { foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true }); }
    });
    mostrar();
  }

  /* ---- exemplo resolvido: 5 passos, condensada, em que passo eu errei ---- */
  function passoErrado(alvo) {
    var cxs = [].slice.call(document.querySelectorAll('.s-perr')), v = +alvo.value, sel;
    sel = cxs.filter(function (x) { return x.checked; }).map(function (x) { return +x.value; });
    if (v === 0 && alvo.checked) { sel = [0]; } else if (v > 0) { sel = sel.filter(function (k) { return k > 0; }); }
    cxs.forEach(function (x) { x.checked = sel.indexOf(+x.value) >= 0; });
    guardar(P + 'passo-' + S.id, JSON.stringify(sel));
  }
  function marcarPassos() {
    var sel = []; try { sel = JSON.parse(ler(P + 'passo-' + S.id) || '[]'); } catch (x) { sel = []; }
    [].forEach.call(document.querySelectorAll('.s-perr'), function (x) { x.checked = sel.indexOf(+x.value) >= 0; });
  }

  /* ---- duvidas em audio (Fase 2): ate 3 gravacoes de 20 s; coletor do FC1 (tipo DUVIDA, F26) ---- */
  var duv = [], gravador = null, cronoGrav = null, enviandoDuv = false;
  function filaDuv() { try { return JSON.parse(ler(P + 'duvida-fila') || '[]'); } catch (x) { return []; } }
  function enviarDuvidas() {
    var f = filaDuv();
    if (enviandoDuv || !f.length || !S.coleta || location.protocol.indexOf('http') !== 0) { return; }
    enviandoDuv = true;
    fetch(S.coleta, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(f[0]) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var g = filaDuv(), it = g.shift(); guardar(P + 'duvida-fila', JSON.stringify(g)); enviandoDuv = false;
        duv.forEach(function (d) { if (d && d.id === it.id) { d.estado = res.ok ? 'enviada' : 'recusada'; } });
        desenharDuvidas();
        if (res.ok) { enviarDuvidas(); } else { aviso('Áudio recusado: ' + (res.erro || 'tente de novo.')); }
      })
      .catch(function () { enviandoDuv = false; aviso('Sem conexão: o áudio ficou guardado e vai quando a internet voltar.'); });
  }
  function b64(blob) {
    return new Promise(function (ok, falha) {
      var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); }; fr.onerror = falha; fr.readAsDataURL(blob);
    });
  }
  /* uma gravacao por questao, logo depois do enunciado (.c-duv[data-i] = questao 0, 1, 2) */
  function desenharDuvidas() {
    [].forEach.call(document.querySelectorAll('.c-duv[data-i]'), function (el) {
      var i = +el.getAttribute('data-i');
      el.innerHTML = '<p class="c-rot">Minha dúvida nesta questão (áudio de até 20 s):</p>' + slotDuvida(i);
    });
  }
  function slotDuvida(i) {
    var d = duv[i], acoes;
    if (gravador && gravador.i === i) { acoes = '<button type="button" class="c-gparar">Parar (' + gravador.resta + ' s)</button>'; }
    else if (!d) { acoes = '<button type="button" class="c-gravar" data-i="' + i + '"' + (gravador ? ' disabled' : '') + '>Gravar</button>'; }
    else {
      acoes = '<audio controls src="' + d.url + '"></audio>' +
        (d.estado === 'nova' ? '<button type="button" class="c-genviar" data-i="' + i + '">Enviar</button><button type="button" class="c-gapagar" data-i="' + i + '">Apagar</button>'
                             : '<span class="c-gest">' + ({ fila: 'Na fila…', enviada: 'Enviada ✓', recusada: 'Recusada' })[d.estado] + '</span>');
    }
    return '<div class="c-gslot">' + acoes + '</div>';
  }
  function gravar(i) {
    if (!navigator.mediaDevices || !window.MediaRecorder) { aviso('Este aparelho não grava áudio aqui: anote as dúvidas no caderno.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      var partes = [], rec = new MediaRecorder(st);
      gravador = { i: i, rec: rec, resta: 20 };
      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) { partes.push(ev.data); } };
      rec.onstop = function () {
        st.getTracks().forEach(function (t) { t.stop(); });
        clearInterval(cronoGrav); gravador = null;
        var blob = new Blob(partes, { type: rec.mimeType || 'audio/webm' });
        duv[i] = { blob: blob, url: URL.createObjectURL(blob), mime: blob.type, estado: 'nova', id: S.id + '-' + (i + 1) + '-' + Date.now() };
        desenharDuvidas();
      };
      rec.start();
      cronoGrav = setInterval(function () {
        if (!gravador) { return; }
        gravador.resta -= 1;
        if (gravador.resta <= 0) { gravador.rec.stop(); } else { desenharDuvidas(); }
      }, 1000);
      desenharDuvidas();
    }).catch(function () { aviso('Sem acesso ao microfone: autorize o microfone ou anote as dúvidas no caderno.'); });
  }
  function enviarDuvida(i) {
    var ra = lerRA(), d = duv[i];
    if (!ra) { aviso('Digite o seu RA no começo da página para enviar o áudio.'); return; }
    b64(d.blob).then(function (x) {
      var f = filaDuv();
      f.push({ tipo: 'DUVIDA', origem: DISC, trilha: S.trilha || '', ra: ra, sessao: S.id, n: i + 1, audio_b64: x, audio_mime: (d.mime || 'audio/webm').split(';')[0], id: d.id });
      guardar(P + 'duvida-fila', JSON.stringify(f));
      d.estado = 'fila'; desenharDuvidas(); enviarDuvidas();
    });
  }

  /* ---- cronometro do topo (molde rif-crono.js): so mede; nada muda sozinho ---- */
  function cronometro() {
    var b = document.getElementById('cronoBtn');
    if (!b) { return; }
    /* Uma linha do tempo so de 30 min (PRE-metodo-prj0004-fase3-analise-cronometro30-fisica1-2026-10-06):
       aquecimento 0-10, estudo 10-25, atividade final 25-30, sem novo toque; alerta aos 29; pausa aos 30.
       Estado: { ini: ms, parado: ms | null, visto: { estudo, final, alerta } }. */
    var rapido = /[?&]rapido=1\b/.test(location.search), MIN = rapido ? 1000 : 60000;
    var CHAVE = P + 'crono-' + S.id, FIM = { aquec: 10 * MIN, foco: 25 * MIN, final: 30 * MIN };
    var NOME = { aquec: 'Aquecimento', foco: 'Estudo focado', final: 'Atividade final' };
    var ICONE = b.innerHTML, est = null, timer = null, dlg = null;
    function lerE() {
      try { var e = JSON.parse(ler(CHAVE) || 'null'); return e && !e.fase ? e : null; } catch (x) { return null; }   /* formato antigo (com fase) e descartado */
    }
    function gravarE() { try { if (est) { localStorage.setItem(CHAVE, JSON.stringify(est)); } else { localStorage.removeItem(CHAVE); } } catch (x) { /* sem localStorage */ } }
    function passou() { return est ? (est.parado || Date.now()) - est.ini : 0; }
    function faseAgora() { var p = passou(); return p < FIM.aquec ? 'aquec' : (p < FIM.foco ? 'foco' : 'final'); }
    function resta() { return est ? FIM[faseAgora()] - passou() : 0; }
    function vibrar() { try { if (navigator.vibrate) { navigator.vibrate([300, 150, 300]); } } catch (x) { /* sem vibracao */ } }
    function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
    function rot(r) { b.setAttribute('aria-label', r); b.title = r; }
    function fechar() {
      var d = dlg; dlg = null;
      if (d) { [].forEach.call(d.querySelectorAll('audio'), function (a) { a.pause(); }); if (d.close && d.open) { d.close(); } d.remove(); }
    }
    function janela(titulo, textos, botoes, forte, comAudio) {
      fechar();
      var d = document.createElement('dialog');
      d.className = 'crono-dlg sessao-dlg'; d.setAttribute('aria-labelledby', 'cronoTit');
      d.innerHTML = '<h2 id="cronoTit"></h2><div class="texto"></div><div class="acoes"></div>';
      d.querySelector('h2').textContent = titulo;
      [].concat(textos).forEach(function (t, i) {
        var p = document.createElement('p'); p.textContent = t; if (i === 0 && forte) { p.className = 'meta'; }
        d.querySelector('.texto').appendChild(p);
      });
      if (comAudio && (S.audios || []).length) {   /* Resumo em Audio do metodo, so na janela das metas */
        var au = document.createElement('div'); au.className = 'crono-audio';
        S.audios.forEach(function (x) {
          var r = document.createElement('p'), a = document.createElement('audio');
          r.textContent = x[0]; a.controls = true; a.preload = 'none'; a.src = x[1];
          a.addEventListener('play', function () { [].forEach.call(au.querySelectorAll('audio'), function (o) { if (o !== a) { o.pause(); } }); });
          au.appendChild(r); au.appendChild(a);
        });
        d.querySelector('.texto').appendChild(au);
      }
      var acoes = d.querySelector('.acoes'), foco = null;
      botoes.forEach(function (x) {
        var k = document.createElement('button'); k.type = 'button'; k.textContent = x[0];
        if (x[2]) { k.className = 'principal'; foco = k; }
        k.addEventListener('click', function () { fechar(); if (x[1]) { x[1](); } });
        acoes.appendChild(k);
      });
      d.addEventListener('close', function () { if (dlg === d) { dlg = null; } d.remove(); });
      document.body.appendChild(d); dlg = d;
      if (d.showModal) { d.showModal(); } else { d.setAttribute('open', ''); }
      (foco || acoes.firstChild).focus();
    }
    function iniciar() { est = { ini: Date.now(), parado: null, visto: {} }; gravarE(); pintar(); }
    function zerar() { est = null; gravarE(); pintar(); }
    /* marcos da linha do tempo: cada aviso aparece uma vez so */
    function marcos() {
      var p = passou(), v = est.visto;
      if (p >= FIM.final) {
        est = null; gravarE(); vibrar();
        janela('Pausa!', ['30 minutos de foco: missão cumprida.',
               'Levante, beba água e descanse. A próxima sessão deste tema fica para outro dia.'], [['Fechar', null, true]], true);
        return true;
      }
      if (p >= FIM.final - MIN && !v.alerta) {
        v.alerta = v.final = v.estudo = true; gravarE(); vibrar();   /* avisos ja passados nao reaparecem */
        janela('Falta 1 minuto', 'Falta 1 minuto para fechar os 30 minutos. Termine o raciocínio da questão.', [['OK', null, true]]);
      } else if (p >= FIM.foco && !v.final) {
        v.final = v.estudo = true; gravarE(); vibrar();
        janela('Atividade final', 'Agora, a Fase 3: analise e refine a questão em que mais travou. Até 5 minutos.', [['OK', null, true]]);
      } else if (p >= FIM.aquec && !v.estudo) {
        v.estudo = true; gravarE(); vibrar();
        janela('Estudo focado', 'Aquecimento concluído. Agora, a Fase 2: as 3 questões do livro, até 15 minutos.', [['OK', null, true]]);
      }
      return false;
    }
    function pintar() {
      clearInterval(timer); timer = null;
      b.classList.remove('rodando', 'aquec', 'final', 'congelado');
      if (!est) { b.innerHTML = ICONE; rot('Cronômetro da sessão: 30 minutos (aquecimento 10, estudo 15, atividade final 5)'); return; }
      if (!est.parado && marcos()) { pintar(); return; }
      var f = faseAgora(), r = resta();
      b.textContent = mmss(r);   /* a cor diz a fase: ambar = aquecimento, azul = estudo, verde = atividade final */
      b.classList.add(f === 'foco' ? 'rodando' : f);
      if (est.parado) { b.classList.add('congelado'); }
      rot(NOME[f] + (est.parado ? ' parado' : '') + ': faltam ' + mmss(r));
      if (!est.parado) { timer = setInterval(pintar, rapido ? 250 : 1000); }
    }
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!est) {
        janela('Metas desta sessão', ['30 minutos: aquecimento até 10, estudo focado até 15 e atividade final até 5. O '
               + 'cronômetro passa de uma fase para a outra sozinho e avisa quando faltar 1 minuto.',
               'Desligue as notificações do celular e deixe as redes sociais de lado durante a sessão.'],
               [['Agora não', null], ['Começar o aquecimento', iniciar, true]], true, true);
        return;
      }
      var alt = est.parado
        ? ['Continuar', function () { est.ini += Date.now() - est.parado; est.parado = null; gravarE(); pintar(); }, true]
        : ['Pausar', function () { est.parado = Date.now(); gravarE(); pintar(); }, true];
      janela(NOME[faseAgora()] + ': faltam ' + mmss(resta()), est.parado ? 'O cronômetro está parado.' : 'O cronômetro está contando.',
             [['Zerar', zerar], alt]);
    });
    est = lerE();
    if (est && !est.parado && Date.now() - (est.ini + FIM.final) > 12 * 3600 * 1000) { est = null; gravarE(); }
    if (est && !est.visto) { est.visto = {}; }
    pintar();
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !dlg) { pintar(); } });
  }

  /* "Estou sem o livro" (passo 2): abre de uma vez as versoes sem livro do exemplo e das questoes; so nesta sessao */
  function semLivro(liga, gravar) {
    [].forEach.call(document.querySelectorAll('.s-sl'), function (el) { el.hidden = !liga; });
    [].forEach.call(document.querySelectorAll('.s-semlivro'), function (b) {
      b.setAttribute('aria-pressed', liga ? 'true' : 'false');
      b.textContent = liga ? 'Estou com o livro' : 'Estou sem o livro';
    });
    if (gravar) { guardar(P + 'semlivro-' + S.id, liga ? '1' : ''); }
  }

  function iniciarPagina() {
    semLivro(ler(P + 'semlivro-' + S.id) === '1', false);
    blocoRA(); revisao(); cartoes(); marcarPassos(); desenharDuvidas(); gradativo(); cronometro();
    enviarFila(); enviarDuvidas();
    document.addEventListener('click', function (ev) {
      var t = ev.target, c = t.classList;
      if (!c) { return; }
      if (c.contains('c-alt')) { responder(t); }
      else if (c.contains('s-semlivro')) { semLivro(t.getAttribute('aria-pressed') !== 'true', true); }
      else if (c.contains('s-ex')) {
        var alvo = document.getElementById(t.getAttribute('aria-controls')), abre = alvo.hidden;
        alvo.hidden = !abre; t.setAttribute('aria-expanded', abre ? 'true' : 'false');
      }
      else if (c.contains('s-perr')) { passoErrado(t); }
      else if (c.contains('s-copiar')) {
        var txt = t.previousElementSibling.textContent;
        var ok = function () { t.textContent = 'Copiado!'; setTimeout(function () { t.textContent = 'Copiar o prompt'; }, 1800); };
        var velho = function () {
          var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', '');
          ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); ok(); } catch (x) { t.textContent = 'Selecione e copie'; }
          document.body.removeChild(ta);
        };
        if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(ok, velho); } else { velho(); }
      }
      else if (c.contains('c-gravar')) { gravar(+t.getAttribute('data-i')); }
      else if (c.contains('c-gparar')) { if (gravador) { gravador.rec.stop(); } }
      else if (c.contains('c-gapagar')) { duv[+t.getAttribute('data-i')] = null; desenharDuvidas(); }
      else if (c.contains('c-genviar')) { enviarDuvida(+t.getAttribute('data-i')); }
      else if (c.contains('c-ra-ok')) {
        var ra = $('#cRA').value.replace(/\D/g, '');
        if (ra.length < 4) { aviso('Digite o seu RA (só os números).'); return; }
        guardarRA(ra); blocoRA(); aviso('');
        if (placar().n === placar().total) { registrar(); }
      }
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', iniciarPagina); } else { iniciarPagina(); }
})();
