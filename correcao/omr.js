/* ============================================================
   omr.js — leitura do Cartao-Resposta FC1 (CR-v1) pela foto do celular
   Briefing: 01_FC1/_planejamento/_pre/PRE-site-correcao-provas-celular-2026-09-19.md

   Tudo roda no aparelho do professor: a foto nunca sai dele.
   Caminho: foto -> tons de cinza -> 4 marcas pretas dos cantos ->
   homografia (cartao em mm -> pixel) -> QR do RA (jsQR) -> bolhas.

   Regra de ouro: questao duvidosa NUNCA vira letra. Rasura, dupla
   marcacao, marca fraca e questao em branco saem com status
   'duvida' ou 'branco' e o professor decide na tela.
   ============================================================ */
(function (root) {
  'use strict';

  /* Geometria do cartao (mm). Origem = centro da marca do canto superior
     esquerdo; W x H = distancia entre os centros das marcas. */
  var L = {
    W: 184, H: 124, FID: 7,
    QR: { x: 150, y: 3, s: 25 },
    N: 20, ALT: 'ABCDE',
    COL_X: [26, 118], DX: 9, Y0: 47, DY: 7.4,
    R: 2.8, RIN: 1.9,
    FOLHA: { w: 210, h: 148.5 }
  };
  L.OX = (L.FOLHA.w - L.W) / 2;
  L.OY = (L.FOLHA.h - L.H) / 2;

  /* Limiares de preenchimento (0 = papel, 1 = tinta como a marca do canto),
     ja descontada a linha de base do proprio cartao. */
  var T_VAZIO = 0.16, T_MARCA = 0.38;

  function centroBolha(q, a) {
    var col = q < 10 ? 0 : 1, i = q % 10;
    return [L.COL_X[col] + a * L.DX, L.Y0 + i * L.DY];
  }

  /* ---------- algebra ---------- */
  function resolver(A, b) {
    var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      for (r = 0; r < n; r++) {
        if (r === c) continue;
        var f = M[r][c] / M[c][c];
        for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map(function (r, i) { return r[n] / r[i]; });
  }
  function homografia(src, dst) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var h = resolver(A, b);
    return h ? h.concat([1]) : null;
  }
  function aplicar(H, x, y) {
    var w = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
  }

  /* ---------- imagem ---------- */
  function cinza(img) {
    var w = img.width, h = img.height, s = img.data, d = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < d.length; i++, j += 4) d[i] = (s[j] * 77 + s[j + 1] * 150 + s[j + 2] * 29) >> 8;
    return { w: w, h: h, d: d };
  }
  function amostra(g, x, y) {
    if (x < 0 || y < 0 || x > g.w - 2 || y > g.h - 2) return 255;
    var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * g.w + x0, d = g.d;
    return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + g.w] * (1 - fx) + d[i + g.w + 1] * fx) * fy;
  }
  function binarizar(g, raio, C) {
    var w = g.w, h = g.h, W1 = w + 1, I = new Float64Array(W1 * (h + 1)), b = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) {
      var lin = 0;
      for (var x = 0; x < w; x++) { lin += g.d[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + lin; }
    }
    for (y = 0; y < h; y++) {
      var y0 = Math.max(0, y - raio), y1 = Math.min(h, y + raio + 1);
      for (x = 0; x < w; x++) {
        var x0 = Math.max(0, x - raio), x1 = Math.min(w, x + raio + 1);
        var area = (x1 - x0) * (y1 - y0);
        var soma = I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0];
        if (g.d[y * w + x] * area < soma - C * area) b[y * w + x] = 1;
      }
    }
    return b;
  }
  function componentes(b, w, h) {
    var rot = new Int32Array(w * h), pilha = new Int32Array(w * h), lista = [], n = 0;
    for (var i = 0; i < b.length; i++) {
      if (!b[i] || rot[i]) continue;
      n++;
      var c = { area: 0, sx: 0, sy: 0, x0: w, x1: 0, y0: h, y1: 0 }, topo = 0;
      pilha[topo++] = i; rot[i] = n;
      while (topo) {
        var p = pilha[--topo], x = p % w, y = (p - x) / w;
        c.area++; c.sx += x; c.sy += y;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
        if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        if (x > 0 && b[p - 1] && !rot[p - 1]) { rot[p - 1] = n; pilha[topo++] = p - 1; }
        if (x < w - 1 && b[p + 1] && !rot[p + 1]) { rot[p + 1] = n; pilha[topo++] = p + 1; }
        if (y > 0 && b[p - w] && !rot[p - w]) { rot[p - w] = n; pilha[topo++] = p - w; }
        if (y < h - 1 && b[p + w] && !rot[p + w]) { rot[p + w] = n; pilha[topo++] = p + w; }
      }
      lista.push(c);
    }
    return lista;
  }

  /* ---------- marcas dos cantos ---------- */
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function acharMarcas(g) {
    var maior = Math.max(g.w, g.h);
    var bin = binarizar(g, Math.round(maior / 25), 18);
    var minA = Math.pow(maior * 0.011, 2), maxA = g.w * g.h * 0.02;
    var cands = componentes(bin, g.w, g.h).filter(function (c) {
      var bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, asp = bw / bh, fill = c.area / (bw * bh);
      return c.area >= minA && c.area <= maxA && asp > 0.6 && asp < 1.65 && fill > 0.8;
    }).sort(function (a, b) { return b.area - a.area; }).slice(0, 9)
      .map(function (c) { return { p: [c.sx / c.area, c.sy / c.area], area: c.area }; });
    if (cands.length < 4) return [];
    var quads = [];
    for (var a = 0; a < cands.length; a++) for (var b = a + 1; b < cands.length; b++)
      for (var c = b + 1; c < cands.length; c++) for (var d = c + 1; d < cands.length; d++) {
        var q = [cands[a], cands[b], cands[c], cands[d]];
        var areas = q.map(function (k) { return k.area; });
        if (Math.max.apply(null, areas) / Math.min.apply(null, areas) > 2.5) continue;
        var P = ordenar(q.map(function (k) { return k.p; }));
        var s = [dist(P[0], P[1]), dist(P[1], P[2]), dist(P[2], P[3]), dist(P[3], P[0])];
        var longo = (s[0] + s[2]) / 2, curto = (s[1] + s[3]) / 2, r = Math.max(longo, curto) / Math.min(longo, curto);
        if (r < 1.1 || r > 2.3 || !convexo(P)) continue;
        quads.push({ P: P, area: areaQuad(P) });
      }
    /* do maior para o menor: com a folha inteira na foto (2 cartoes), o
       maior quadrilatero junta cantos dos dois — o QR decide qual e o certo */
    return quads.sort(function (a, b) { return b.area - a.area; }).slice(0, 6).map(function (q) { return q.P; });
  }
  function ordenar(pts) {
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
    pts = pts.slice().sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx); });
    var k = 0;
    for (var i = 1; i < 4; i++) if (pts[i][0] + pts[i][1] < pts[k][0] + pts[k][1]) k = i;
    return pts.slice(k).concat(pts.slice(0, k));   // TL, TR, BR, BL (imagem)
  }
  function convexo(P) {
    var sinal = 0;
    for (var i = 0; i < 4; i++) {
      var a = P[i], b = P[(i + 1) % 4], c = P[(i + 2) % 4];
      var z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (!sinal) sinal = Math.sign(z); else if (Math.sign(z) !== sinal) return false;
    }
    return true;
  }
  function areaQuad(P) {
    var s = 0;
    for (var i = 0; i < 4; i++) s += P[i][0] * P[(i + 1) % 4][1] - P[(i + 1) % 4][0] * P[i][1];
    return Math.abs(s) / 2;
  }

  /* ---------- QR ---------- */
  var CARTAO = [[0, 0], [L.W, 0], [L.W, L.H], [0, L.H]];
  function lerQR(g, H, jsQR) {
    if (!jsQR) return null;
    var S = 240, m = 3, x0 = L.QR.x - m, y0 = L.QR.y - m, lado = L.QR.s + 2 * m;
    var dados = new Uint8ClampedArray(S * S * 4);
    for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
      var p = aplicar(H, x0 + (x + 0.5) * lado / S, y0 + (y + 0.5) * lado / S);
      var v = amostra(g, p[0], p[1]), j = (y * S + x) * 4;
      dados[j] = dados[j + 1] = dados[j + 2] = v; dados[j + 3] = 255;
    }
    var r = jsQR(dados, S, S, { inversionAttempts: 'dontInvert' });
    return r ? r.data : null;
  }
  function interpretarQR(txt) {
    var m = /^FC1\|(\d{7})\|([ABC])$/.exec(txt || '');
    return m ? { ra: m[1], versao: m[2] } : null;
  }
  /* Textura do bloco do QR: muitas transicoes claro/escuro. Desempata a
     orientacao quando o QR nao e lido (o canto oposto so tem bolhas). */
  function texturaQR(g, H) {
    var t = 0, ant = null;
    for (var i = 0; i < 30; i++) for (var j = 0; j < 30; j++) {
      var p = aplicar(H, L.QR.x + (j + 0.5) * L.QR.s / 30, L.QR.y + (i + 0.5) * L.QR.s / 30);
      var esc = amostra(g, p[0], p[1]) < 128;
      if (ant !== null && esc !== ant) t++;
      ant = esc;
    }
    return t;
  }

  /* ---------- bolhas ---------- */
  function mediaCirculo(g, H, cx, cy, r, n) {
    var s = 0;
    for (var k = 0; k < n; k++) {
      var a = 2 * Math.PI * k / n, p = aplicar(H, cx + r * Math.cos(a), cy + r * Math.sin(a));
      s += amostra(g, p[0], p[1]);
    }
    return s / n;
  }
  var DISCO = (function () {
    var pts = [];
    for (var y = -L.RIN; y <= L.RIN; y += 0.42) for (var x = -L.RIN; x <= L.RIN; x += 0.42)
      if (x * x + y * y <= L.RIN * L.RIN) pts.push([x, y]);
    return pts;
  })();
  function mediaDisco(g, H, cx, cy) {
    var s = 0;
    for (var k = 0; k < DISCO.length; k++) {
      var p = aplicar(H, cx + DISCO[k][0], cy + DISCO[k][1]);
      s += amostra(g, p[0], p[1]);
    }
    return s / DISCO.length;
  }
  function mediana(v) {
    var s = v.slice().sort(function (a, b) { return a - b; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function percentil(v, p) {
    var s = v.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  }

  function lerBolhas(g, H, n) {
    /* tinta de referencia: centro das 4 marcas dos cantos */
    var pretos = CARTAO.map(function (c) {
      var v = [];
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
        var p = aplicar(H, c[0] + dx, c[1] + dy); v.push(amostra(g, p[0], p[1]));
      }
      return mediana(v);
    });
    var preto = mediana(pretos);
    var linhas = [], contraste = [];
    for (var q = 0; q < n; q++) {
      var base = centroBolha(q, 0);
      /* ajuste fino da linha: o contorno impresso das bolhas procura o
         melhor encaixe (+-1,5 mm) — absorve papel curvo e foto torta */
      var melhor = -1e9, odx = 0, ody = 0;
      for (var dy = -1.5; dy <= 1.51; dy += 0.5) for (var dx = -1.5; dx <= 1.51; dx += 0.5) {
        var s = 0;
        for (var a = 0; a < 5; a++) {
          var cx = base[0] + a * L.DX + dx, cy = base[1] + dy;
          s += mediaCirculo(g, H, cx, cy, L.R + 0.9, 12) - mediaCirculo(g, H, cx, cy, L.R, 16);
        }
        s -= 0.8 * (dx * dx + dy * dy);
        if (s > melhor) { melhor = s; odx = dx; ody = dy; }
      }
      contraste.push(melhor / 5);
      /* branco local: papel entre as bolhas da propria linha */
      var brancos = [];
      for (a = -1; a < 5; a++) {
        var bx = base[0] + (a + 0.5) * L.DX + odx, by = base[1] + ody;
        for (var e = -1; e <= 1; e++) {
          var p = aplicar(H, bx, by + e * 1.2); brancos.push(amostra(g, p[0], p[1]));
        }
      }
      var branco = percentil(brancos, 0.75);
      var fills = [];
      for (a = 0; a < 5; a++) {
        var v = mediaDisco(g, H, base[0] + a * L.DX + odx, base[1] + ody);
        fills.push(Math.max(0, (branco - v) / Math.max(40, branco - preto)));
      }
      linhas.push(fills);
    }
    /* linha de base: a letra clara impressa dentro da bolha vazia */
    var todos = [];
    linhas.forEach(function (f) { todos = todos.concat(f); });
    var baseLinha = percentil(todos, 0.4);
    var respostas = linhas.map(function (f, q) {
      var adj = f.map(function (x) { return Math.round(Math.max(0, x - baseLinha) * 100) / 100; });
      var ord = adj.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return b[0] - a[0]; });
      var m1 = ord[0][0], m2 = ord[1][0], letra = L.ALT[ord[0][1]], st, motivo = '';
      if (m1 < T_VAZIO) { st = 'branco'; letra = ''; }
      else if (m1 >= T_MARCA && m2 < T_VAZIO) st = 'ok';
      else {
        st = 'duvida';
        motivo = m2 >= T_MARCA ? 'dupla marcação' : (m1 < T_MARCA ? 'marca fraca' : 'rasura ou segunda marca');
      }
      return { q: q + 1, letra: letra, status: st, motivo: motivo, fills: adj };
    });
    return { respostas: respostas, contraste: mediana(contraste) };
  }

  /* ---------- leitura completa ---------- */
  function ler(img, opt) {
    opt = opt || {};
    var g = img.d ? img : cinza(img), n = opt.n || L.N;
    var quads = acharMarcas(g);
    var NAO_ACHEI = 'As 4 marcas pretas dos cantos não foram encontradas. Enquadre UM cartão inteiro, sem sombra e sem cortar os cantos.';
    if (!quads.length) return { ok: false, erro: NAO_ACHEI };
    var esc = null, qr = null, reserva = null;
    for (var iq = 0; iq < quads.length && !qr; iq++) {
      var P = quads[iq], cand = [];
      for (var k = 0; k < 4; k++) {
        var dst = [P[k], P[(k + 1) % 4], P[(k + 2) % 4], P[(k + 3) % 4]];
        var H = homografia(CARTAO, dst);
        if (H) cand.push({ k: k, H: H, r: dist(dst[0], dst[1]) / dist(dst[1], dst[2]) });
      }
      var longos = cand.filter(function (c) { return c.r > 1; });
      if (longos.length) cand = longos;
      for (var i = 0; i < cand.length && !qr; i++) {
        var txt = lerQR(g, cand[i].H, opt.jsQR);
        if (txt) { qr = txt; esc = cand[i]; }
      }
      if (!reserva && cand.length) {
        cand.forEach(function (c) { c.t = texturaQR(g, c.H); });
        reserva = cand.sort(function (a, b) { return b.t - a.t; })[0];
      }
    }
    esc = esc || reserva;
    if (!esc) return { ok: false, erro: NAO_ACHEI };
    var b = lerBolhas(g, esc.H, n);
    /* sem QR e sem o contorno das bolhas onde deviam estar = nao e um cartao
       bem enquadrado; ler assim seria chutar */
    if (!qr && b.contraste < 12) return { ok: false, erro: NAO_ACHEI };
    var avisos = [];
    var id = interpretarQR(qr);
    if (!qr) avisos.push('QR do RA não lido — digite o RA.');
    else if (!id) avisos.push('QR lido, mas não é de um cartão FC1: ' + qr);
    if (b.contraste < 12) avisos.push('Foto com pouco contraste ou fora de foco — confira cada questão.');
    return {
      ok: true, H: esc.H, orientacao: esc.k, qr: qr,
      ra: id ? id.ra : '', versao: id ? id.versao : '',
      respostas: b.respostas, contraste: Math.round(b.contraste), avisos: avisos,
      foto_ruim: b.contraste < 12
    };
  }

  /* Cartao retificado para conferencia visual (canvas RGBA). */
  function retificar(img, H, largura) {
    var g = img.d ? img : cinza(img), m = 6, esc = largura / (L.W + 2 * m);
    var altura = Math.round((L.H + 2 * m) * esc), out = new Uint8ClampedArray(largura * altura * 4);
    for (var y = 0; y < altura; y++) for (var x = 0; x < largura; x++) {
      var p = aplicar(H, x / esc - m, y / esc - m), v = amostra(g, p[0], p[1]), j = (y * largura + x) * 4;
      out[j] = out[j + 1] = out[j + 2] = v; out[j + 3] = 255;
    }
    return { largura: largura, altura: altura, dados: out, esc: esc, margem: m };
  }

  /* ---------- desenho do cartao (SVG, unidades em mm) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var SIMBOLO = { A: '●', B: '▲', C: '■' };
  function cartaoSVG(al, qrMod) {
    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.FOLHA.w + ' ' + L.FOLHA.h +
      '" width="' + L.FOLHA.w + 'mm" height="' + L.FOLHA.h + 'mm" font-family="Arial, Helvetica, sans-serif">');
    o.push('<rect width="100%" height="100%" fill="#fff"/>');
    o.push('<g transform="translate(' + L.OX + ' ' + L.OY + ')">');
    CARTAO.forEach(function (c) {
      o.push('<rect x="' + (c[0] - L.FID / 2) + '" y="' + (c[1] - L.FID / 2) + '" width="' + L.FID + '" height="' + L.FID + '" fill="#000"/>');
    });
    if (qrMod) {
      var nm = qrMod.length, t = L.QR.s / nm, d = '';
      for (var r = 0; r < nm; r++) for (var c = 0; c < nm; c++)
        if (qrMod[r][c]) d += 'M' + (L.QR.x + c * t).toFixed(3) + ' ' + (L.QR.y + r * t).toFixed(3) + 'h' + t.toFixed(3) + 'v' + t.toFixed(3) + 'h-' + t.toFixed(3) + 'z';
      o.push('<path d="' + d + '" fill="#000" shape-rendering="crispEdges"/>');
    }
    o.push('<text x="8" y="1.5" font-size="3.3" font-weight="bold" letter-spacing=".2">FÍSICA CONCEITUAL 1 · CARTÃO-RESPOSTA</text>');
    o.push('<text x="8" y="9.5" font-size="4.4" font-weight="bold">' + esc(al.nome || '') + '</text>');
    var sep = '&#160;&#160;&#160;&#160;';
    o.push('<text x="8" y="16" font-size="3.5">Turma: ' + esc(al.turma || '') + sep + 'RA: ' + esc(al.ra || '') +
      sep + 'Caderno: <tspan font-size="4">' + (SIMBOLO[al.versao] || '') + '</tspan></text>');
    o.push('<text x="8" y="23.5" font-size="3.3">Prova: ________________________________   Data: ____/____</text>');
    o.push('<text x="8" y="31.5" font-size="2.7" fill="#333">Preencha a bolinha INTEIRA com caneta azul ou preta · uma por questão · não rasure: se errar, avise o professor.</text>');
    for (var col = 0; col < 2; col++) for (var a = 0; a < 5; a++)
      o.push('<text x="' + (L.COL_X[col] + a * L.DX) + '" y="' + (L.Y0 - 4.6) + '" font-size="3" font-weight="bold" text-anchor="middle">' + L.ALT[a] + '</text>');
    for (var q = 0; q < L.N; q++) {
      var b0 = centroBolha(q, 0);
      o.push('<text x="' + (b0[0] - 5.2) + '" y="' + (b0[1] + 1.2) + '" font-size="3.4" font-weight="bold" text-anchor="end">' + (q + 1) + '</text>');
      for (a = 0; a < 5; a++) {
        var b = centroBolha(q, a);
        o.push('<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + L.R + '" fill="none" stroke="#444" stroke-width=".35"/>');
        o.push('<text x="' + b[0] + '" y="' + (b[1] + 0.85) + '" font-size="2.3" fill="#c4c4c4" text-anchor="middle">' + L.ALT[a] + '</text>');
      }
    }
    o.push('<text x="' + (L.W / 2) + '" y="' + (L.H - 1.5) + '" font-size="2.3" fill="#666" text-anchor="middle">IFMG campus Ouro Preto · CODAFIS · NIDEC · Não dobre nem amasse este cartão</text>');
    o.push('</g></svg>');
    return o.join('');
  }

  var OMR = {
    L: L, T_VAZIO: T_VAZIO, T_MARCA: T_MARCA, SIMBOLO: SIMBOLO,
    ler: ler, retificar: retificar, cinza: cinza, aplicar: aplicar, homografia: homografia,
    centroBolha: centroBolha, cartaoSVG: cartaoSVG, interpretarQR: interpretarQR,
    versaoDoRA: function (ra) { return 'ABC'[parseInt(ra, 10) % 3]; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = OMR;
  else root.OMR = OMR;
})(this);
