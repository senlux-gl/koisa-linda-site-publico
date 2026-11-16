/* Black Friday Koisa Linda (16 a 29/11/2026) no resto do site.
 *
 * Os modelos, os preços e a data moram só em /black-friday/bf-modelos.js (window.KL_BF).
 * Este arquivo só lê de lá:
 *  - com data-kl-bf-faixa no próprio <script> (home, noivas, debutantes), desenha a faixa
 *    no lugar onde o script está, antes do conteúdo, sem cobrir foto;
 *  - sem o atributo (catálogo, galeria, página de peça, páginas de estilo), põe um selo
 *    discreto nos vestidos que estão na lista.
 * Depois de validoAte (fim do dia em Brasília) ou com ativo diferente de true, nada aparece.
 * Sem porcentagem, sem "aluguel" ou "venda" na oferta e "modelos selecionados" junto de todo preço.
 */
(function (root) {
  'use strict';

  var doc = root.document;
  var script = doc && doc.currentScript;
  var ANCORA = { noiva: '/black-friday/#noiva', debutante: '/black-friday/#15-anos' };
  var ROTULO = { noiva: 'Noiva', debutante: '15 anos' };

  function dinheiro(valor) {
    var n = Math.round(Number(valor));
    if (!isFinite(n) || n <= 0) return '';
    return 'R$\u00a0' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function dataFinal(bf) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(bf && bf.validoAte || ''));
    return m ? { ano: +m[1], mes: +m[2], dia: +m[3] } : null;
  }

  // Vale até o fim do dia de validoAte no horário de Brasília (UTC-3, sem horário de verão).
  function fimEmMs(bf) {
    var d = dataFinal(bf);
    return d ? Date.UTC(d.ano, d.mes - 1, d.dia + 1, 3, 0, 0) : NaN;
  }

  function ativa(bf, agora) {
    if (!bf || bf.ativo !== true) return false;
    var fim = fimEmMs(bf);
    var t = typeof agora === 'number' ? agora : Date.now();
    return isFinite(fim) && t < fim;
  }

  function ate(bf) {
    var d = dataFinal(bf);
    return d ? 'até ' + (d.dia < 10 ? '0' : '') + d.dia + '/' + (d.mes < 10 ? '0' : '') + d.mes : '';
  }

  function oferta(bf, tipo) {
    var o = bf && bf[tipo];
    if (!o || !dinheiro(o.de) || !dinheiro(o.por) || !(Number(o.por) < Number(o.de))) return null;
    return {
      tipo: tipo,
      frase: String(o.frase || ''),
      de: dinheiro(o.de),
      por: dinheiro(o.por),
      // Debutante: o preço é dos três vestidos juntos, nunca de um só.
      preco: (tipo === 'debutante' ? '3 vestidos de ' : 'de ') + dinheiro(o.de) + ' por ' + dinheiro(o.por),
      codigos: Array.isArray(o.codigos) ? o.codigos.map(function (c) { return String(c).trim().toUpperCase(); }) : [],
      href: ANCORA[tipo]
    };
  }

  function ofertaDoCodigo(bf, codigo) {
    var c = String(codigo || '').trim().toUpperCase();
    if (!c) return null;
    var tipos = ['noiva', 'debutante'];
    for (var i = 0; i < tipos.length; i++) {
      var o = oferta(bf, tipos[i]);
      if (o && o.codigos.indexOf(c) >= 0) return o;
    }
    return null;
  }

  function textoSelo(o) {
    return 'Black Friday · ' + o.preco + ' · modelos selecionados';
  }

  var CSS = [
    '.kl-bf-faixa{--bf-ink:#2c2326;--bf-ruby:#722F37;--bf-gold:#C89F3C;--bf-vanilla:#F4E5C4;background:var(--bf-ink);color:var(--bf-vanilla);border-bottom:1px solid var(--bf-gold);padding:22px 24px}',
    '.kl-bf-faixa *{box-sizing:border-box}',
    '.kl-bf-faixa-caixa{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px 32px;flex-wrap:wrap}',
    '.kl-bf-faixa p{margin:0}',
    '.kl-bf-eyebrow{font-family:Questrial,system-ui,sans-serif;font-size:11.5px;letter-spacing:4px;text-transform:uppercase;color:var(--bf-gold);margin-bottom:6px!important}',
    '.kl-bf-titulo{font-family:"Playfair Display",Georgia,serif;font-style:italic;font-weight:500;font-size:clamp(23px,2.6vw,30px);line-height:1.15;color:var(--bf-vanilla)}',
    '.kl-bf-preco{font-family:Questrial,system-ui,sans-serif;font-size:clamp(15px,1.5vw,17px);letter-spacing:.6px;margin-top:6px!important;color:var(--bf-vanilla)}',
    '.kl-bf-nota{font-family:Questrial,system-ui,sans-serif;font-size:12px;letter-spacing:1.2px;margin-top:4px!important;color:var(--bf-vanilla)}',
    '.kl-bf-cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:13px 26px;border-radius:999px;background:var(--bf-ruby);color:var(--bf-vanilla)!important;border:1px solid var(--bf-gold);font-family:Questrial,system-ui,sans-serif;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;text-decoration:none;white-space:nowrap}',
    '.kl-bf-cta:hover{background:#5a242b}',
    '.kl-bf-cta:focus-visible,.kl-bf-item:focus-visible{outline:2px solid var(--bf-vanilla);outline-offset:3px}',
    '.kl-bf-faixa-home .kl-bf-faixa-caixa{display:block}',
    '.kl-bf-itens{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}',
    '.kl-bf-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border:1px solid rgba(200,159,60,.55);border-radius:14px;color:var(--bf-vanilla)!important;text-decoration:none}',
    '.kl-bf-item:hover{border-color:var(--bf-gold)}',
    '.kl-bf-item .kl-bf-rotulo{display:block;font-family:Questrial,system-ui,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--bf-gold);margin-bottom:4px}',
    '.kl-bf-item .kl-bf-titulo{display:block;font-size:clamp(20px,2.1vw,25px)}',
    '.kl-bf-item .kl-bf-preco,.kl-bf-item .kl-bf-nota{display:block}',
    '.kl-bf-flecha{display:none}',
    '.kl-bf-seta{flex:0 0 auto;font-family:Questrial,system-ui,sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;padding:11px 16px;border-radius:999px;background:var(--bf-ruby);border:1px solid var(--bf-gold);white-space:nowrap}',
    '@media(max-width:760px){.kl-bf-faixa{padding:18px 20px}.kl-bf-faixa-caixa{gap:14px}.kl-bf-cta{width:100%}.kl-bf-itens{grid-template-columns:1fr;gap:10px}.kl-bf-item{padding:14px 14px}}',
    '@media(max-width:560px){.kl-bf-seta{padding:0;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;letter-spacing:0}.kl-bf-seta-texto{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.kl-bf-flecha{display:inline}}',
    '.kl-bf-selo{display:block;margin:2px 0 0;padding:6px 8px;background:#F4E5C4;color:#2c2326;border-left:2px solid #C89F3C;font-family:Questrial,system-ui,sans-serif;font-size:11px;line-height:1.4;letter-spacing:.3px;text-transform:none;font-style:normal;font-weight:400;overflow-wrap:anywhere}',
    '.kl-bf-selo b{color:#722F37;font-weight:400;letter-spacing:1.4px;text-transform:uppercase}',
    '.kl-bf-selo-peca{font-size:13px;padding:10px 12px;margin:14px 0 4px}',
    '.kl-bf-selo-link{display:inline-block;margin:6px 0 10px;font-family:Questrial,system-ui,sans-serif;font-size:13px;letter-spacing:.4px;color:#722F37!important;text-decoration:underline;text-underline-offset:3px}',
    '@media(max-width:560px){.kl-bf-selo{font-size:10.5px;padding:5px 7px}.kl-bf-selo-peca{font-size:12.5px;padding:9px 11px}}'
  ].join('\n');

  function estilo() {
    if (!doc || doc.getElementById('kl-bf-estilo')) return;
    var s = doc.createElement('style');
    s.id = 'kl-bf-estilo';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function el(tag, cls, texto) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function faixaSimples(bf, o) {
    var sec = el('section', 'kl-bf-faixa kl-bf-faixa-' + o.tipo);
    sec.setAttribute('aria-label', 'Black Friday Koisa Linda');
    sec.setAttribute('data-kl-bf', o.tipo);
    var caixa = el('div', 'kl-bf-faixa-caixa');
    var texto = el('div', 'kl-bf-faixa-texto');
    texto.appendChild(el('p', 'kl-bf-eyebrow', 'Black Friday · ' + ate(bf)));
    if (o.frase) texto.appendChild(el('p', 'kl-bf-titulo', o.frase));
    texto.appendChild(el('p', 'kl-bf-preco', 'De ' + o.de + ' por ' + o.por + '.'));
    texto.appendChild(el('p', 'kl-bf-nota', 'Modelos selecionados · Barra da Tijuca e São Francisco'));
    var cta = el('a', 'kl-bf-cta', 'Ver os modelos');
    cta.href = o.href;
    cta.setAttribute('data-kl-bf-click', o.tipo);
    cta.setAttribute('aria-label', 'Ver os modelos da Black Friday de ' + (o.tipo === 'noiva' ? 'noiva' : '15 anos'));
    caixa.appendChild(texto);
    caixa.appendChild(cta);
    sec.appendChild(caixa);
    return sec;
  }

  function faixaHome(bf, ofertas) {
    var sec = el('section', 'kl-bf-faixa kl-bf-faixa-home');
    sec.setAttribute('aria-label', 'Black Friday Koisa Linda');
    sec.setAttribute('data-kl-bf', 'home');
    var caixa = el('div', 'kl-bf-faixa-caixa');
    caixa.appendChild(el('p', 'kl-bf-eyebrow', 'Black Friday · ' + ate(bf) + ' · Barra da Tijuca e São Francisco'));
    var itens = el('div', 'kl-bf-itens');
    ofertas.forEach(function (o) {
      var a = el('a', 'kl-bf-item');
      a.href = o.href;
      a.setAttribute('data-kl-bf-click', o.tipo);
      var txt = el('span', 'kl-bf-item-texto');
      txt.appendChild(el('span', 'kl-bf-rotulo', ROTULO[o.tipo]));
      if (o.frase) txt.appendChild(el('span', 'kl-bf-titulo', o.frase));
      txt.appendChild(el('span', 'kl-bf-preco', 'De ' + o.de + ' por ' + o.por + '.'));
      txt.appendChild(el('span', 'kl-bf-nota', 'Modelos selecionados'));
      a.appendChild(txt);
      var seta = el('span', 'kl-bf-seta');
      seta.appendChild(el('span', 'kl-bf-seta-texto', 'Ver os modelos'));
      var flecha = el('span', 'kl-bf-flecha', '→');
      flecha.setAttribute('aria-hidden', 'true');
      seta.appendChild(flecha);
      a.appendChild(seta);
      itens.appendChild(a);
    });
    caixa.appendChild(itens);
    sec.appendChild(caixa);
    return sec;
  }

  var MARCA = 'kl_bf_visita';

  function lembrarVisita() {
    try { root.sessionStorage.setItem(MARCA, '1'); } catch (e) {}
  }

  function veioDaBlackFriday(bf, loc, referrer, lembrou) {
    var sp = new URLSearchParams(loc && loc.search || '');
    if (/^kl_bf_/i.test(sp.get('utm_campaign') || '')) return true;
    if (/^\/black-friday(\/|$)/.test(caminhoDe(referrer))) return true;
    if (ofertaDoCodigo(bf, sp.get('modelo') || sp.get('codigo') || '')) return true;
    return lembrou === true;
  }

  function caminhoDe(url) {
    try {
      var u = new URL(String(url || ''));
      return /(^|\.)koisalinda\.com\.br$|^127\.0\.0\.1$|^localhost$/.test(u.hostname) ? u.pathname : '';
    } catch (e) { return ''; }
  }

  function ocasiaoDaAgenda(bf, loc) {
    var sp = new URLSearchParams(loc && loc.search || '');
    var oc = String(sp.get('ocasiao') || sp.get('oc') || '').toLowerCase();
    oc = { noivas: 'noiva', '15-anos': 'debutante', '15anos': 'debutante', debutantes: 'debutante' }[oc] || oc;
    if (oc === 'noiva' || oc === 'debutante') return oc;
    var o = ofertaDoCodigo(bf, sp.get('modelo') || sp.get('codigo') || '');
    return o ? o.tipo : '';
  }

  // Agenda: troca só o texto da faixa de preço, para quem veio da Black Friday.
  function trocarFaixaDaAgenda(bf) {
    var faixa = doc.querySelector('.kl-price-intro');
    if (!faixa) return false;
    var lembrou = false;
    try { lembrou = root.sessionStorage.getItem(MARCA) === '1'; } catch (e) {}
    if (!veioDaBlackFriday(bf, root.location, doc.referrer, lembrou)) return false;
    lembrarVisita();
    var tipo = ocasiaoDaAgenda(bf, root.location);
    var noiva = oferta(bf, 'noiva');
    var deb = oferta(bf, 'debutante');
    var forte = el('strong');
    var resto;
    if (tipo === 'noiva' && noiva) {
      forte.textContent = 'Black Friday: o vestido do seu sim de ' + noiva.de + ' por ' + noiva.por + '.';
      resto = 'Modelos selecionados, ' + ate(bf) + ', na Barra da Tijuca e em São Francisco.';
    } else if (tipo === 'debutante' && deb) {
      forte.textContent = 'Black Friday: os três vestidos de debutante de ' + deb.de + ' por ' + deb.por + '.';
      resto = 'Modelos selecionados, ' + ate(bf) + ', na Barra da Tijuca e em São Francisco.';
    } else if (noiva && deb) {
      forte.textContent = 'Black Friday, ' + ate(bf) + ', modelos selecionados.';
      resto = 'Noiva de ' + noiva.de + ' por ' + noiva.por + ' · 15 anos, os três vestidos de ' + deb.de + ' por ' + deb.por + '.';
    } else {
      return false;
    }
    while (faixa.firstChild) faixa.removeChild(faixa.firstChild);
    faixa.appendChild(forte);
    faixa.appendChild(el('br'));
    faixa.appendChild(doc.createTextNode(resto));
    faixa.setAttribute('data-kl-bf', tipo || 'ambas');
    return true;
  }

  function medirClique(evento) {
    var alvo = evento.target && evento.target.closest && evento.target.closest('[data-kl-bf-click]');
    if (!alvo) return;
    lembrarVisita();
    try {
      var t = root.KLTracking;
      if (t && typeof t.gaEvent === 'function') {
        t.gaEvent('KL_BF_Click', { occasion: alvo.getAttribute('data-kl-bf-click'), ui_source: alvo.getAttribute('data-kl-bf-origem') || 'faixa' });
      }
    } catch (e) {}
  }

  // /debutantes/: durante a Black Friday, os textos com "25%" mostram a oferta da Black. Só troca
  // o que ainda diz 25%; depois de validoAte volta o texto da página (decisão sobre ele é do dono).
  var ALVOS_DEBUTANTE = [
    '.nf-debutante .nf-oferta strong',
    '.nf-debutante #aluguel-e-condicoes h2',
    '.nf-debutante #aluguel-e-condicoes .nf-linhas > div:first-child p'
  ];

  function esconderDebutanteAteTrocar() {
    var s = doc.createElement('style');
    s.id = 'kl-bf-debutante-espera';
    s.textContent = ALVOS_DEBUTANTE.join(',') + '{visibility:hidden}';
    (doc.head || doc.documentElement).appendChild(s);
  }

  function trocarDebutante(bf) {
    var o = oferta(bf, 'debutante');
    var textos = o ? [
      'Os três vestidos de ' + o.de + ' por ' + o.por + ' · modelos selecionados',
      'Black Friday: os três vestidos de ' + o.de + ' por ' + o.por + '.',
      'De ' + o.de + ' por ' + o.por + ' nos modelos selecionados, ' + ate(bf) + '.'
    ] : [];
    ALVOS_DEBUTANTE.forEach(function (sel, i) {
      var alvo = doc.querySelector(sel);
      if (o && alvo && /\d\s*%/.test(alvo.textContent)) {
        alvo.textContent = textos[i];
        alvo.setAttribute('data-kl-bf', 'debutante');
      }
    });
    var faq = doc.querySelectorAll('.nf-debutante details');
    for (var i = 0; o && i < faq.length; i++) {
      var resp = faq[i].querySelector('p');
      if (resp && /\d\s*%/.test(resp.textContent)) {
        resp.textContent = 'Na Black Friday, ' + ate(bf) + ', os três vestidos de debutante saem de ' + o.de + ' por ' + o.por + ' nos modelos selecionados.';
        resp.setAttribute('data-kl-bf', 'debutante');
      }
    }
    var espera = doc.getElementById('kl-bf-debutante-espera');
    if (espera) espera.parentNode.removeChild(espera);
  }

  function desenharFaixa(bf, qual, antes) {
    if (!antes || !antes.parentNode) return null;
    var faixa = null;
    if (qual === 'home') {
      var lista = [oferta(bf, 'noiva'), oferta(bf, 'debutante')].filter(Boolean);
      if (lista.length) faixa = faixaHome(bf, lista);
    } else if (qual === 'noiva' || qual === 'debutante') {
      var o = oferta(bf, qual);
      if (o) faixa = faixaSimples(bf, o);
    }
    if (!faixa) return null;
    estilo();
    antes.parentNode.insertBefore(faixa, antes);
    faixa.addEventListener('click', medirClique);
    if (qual === 'debutante') {
      esconderDebutanteAteTrocar();
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { trocarDebutante(bf); });
      else trocarDebutante(bf);
    }
    return faixa;
  }

  function selo(o, classeExtra, tag) {
    var s = el(tag || 'p', 'kl-bf-selo' + (classeExtra ? ' ' + classeExtra : ''));
    s.setAttribute('data-kl-bf-selo', o.tipo);
    s.appendChild(el('b', '', 'Black Friday'));
    s.appendChild(doc.createTextNode(' · ' + o.preco + ' · modelos selecionados'));
    return s;
  }

  function linkDaOferta(o, origem) {
    var a = el('a', 'kl-bf-selo-link', 'Ver os modelos da Black Friday');
    a.href = o.href;
    a.setAttribute('data-kl-bf-click', o.tipo);
    a.setAttribute('data-kl-bf-origem', origem);
    a.addEventListener('click', medirClique);
    return a;
  }

  function marcarCards(bf) {
    // Catálogo: o card é montado no navegador a partir de kl-catalog-data.js (sem preço).
    var cards = doc.querySelectorAll('.catalog-card[data-code]:not([data-kl-bf-ok])');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      card.setAttribute('data-kl-bf-ok', '1');
      var o = ofertaDoCodigo(bf, card.getAttribute('data-code'));
      var meta = card.querySelector('.catalog-card-meta');
      if (o && meta) meta.insertBefore(selo(o), meta.querySelector('button'));
    }
    // Páginas de estilo: cartões estáticos que levam à ficha /p/CODIGO.html.
    var links = doc.querySelectorAll('a[href*="/p/"]:not([data-kl-bf-ok])');
    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      a.setAttribute('data-kl-bf-ok', '1');
      var m = /\/p\/([A-Za-z0-9-]+)\.html(?:[?#]|$)/.exec(a.getAttribute('href') || '');
      var oc = m && ofertaDoCodigo(bf, m[1]);
      if (oc && a.querySelector('img')) a.appendChild(selo(oc, '', 'small'));
    }
  }

  function marcarGaleria(bf) {
    var titulo = doc.getElementById('gallery-title');
    var codigo = doc.getElementById('gallery-code');
    if (!titulo || !codigo) return;
    var o = ofertaDoCodigo(bf, titulo.textContent);
    var atual = doc.getElementById('kl-bf-galeria');
    var chave = o ? o.tipo + ':' + titulo.textContent : '';
    if (atual && atual.getAttribute('data-chave') === chave) return;
    if (atual) atual.parentNode.removeChild(atual);
    if (!o) return;
    var caixa = el('div');
    caixa.id = 'kl-bf-galeria';
    caixa.setAttribute('data-chave', chave);
    caixa.appendChild(selo(o, 'kl-bf-selo-peca'));
    caixa.appendChild(linkDaOferta(o, 'galeria'));
    codigo.parentNode.insertBefore(caixa, codigo.nextSibling);
  }

  function marcarPeca(bf) {
    if (doc.getElementById('kl-bf-peca')) return;
    // /p/CODIGO.html: página estática por peça, montada pelo build a partir da fonte em p/.
    var corpo = doc.body;
    var codigo = corpo && corpo.getAttribute('data-kl-page') === 'produto' ? corpo.getAttribute('data-kl-booking-code') : '';
    var depois = codigo ? doc.querySelector('.peca h1') : null;
    // /peca/?codigo=: ficha montada no navegador dentro de #app.
    if (!depois) {
      var app = doc.getElementById('app');
      var cod = app && app.querySelector('.product .code');
      if (cod) {
        codigo = String(cod.textContent || '').replace(/^Código\s+/i, '');
        depois = cod;
      }
    }
    var o = depois && ofertaDoCodigo(bf, codigo);
    if (!o) return;
    var caixa = el('div');
    caixa.id = 'kl-bf-peca';
    caixa.appendChild(selo(o, 'kl-bf-selo-peca'));
    caixa.appendChild(linkDaOferta(o, 'peca'));
    depois.parentNode.insertBefore(caixa, depois.nextSibling);
  }

  function marcarTudo(bf) {
    estilo();
    marcarCards(bf);
    marcarGaleria(bf);
    marcarPeca(bf);
  }

  function iniciarSelos(bf) {
    var agendado = false;
    function rodar() {
      agendado = false;
      marcarTudo(bf);
    }
    rodar();
    if (typeof root.MutationObserver !== 'function' || !doc.body) return;
    new root.MutationObserver(function () {
      if (agendado) return;
      agendado = true;
      (root.requestAnimationFrame || root.setTimeout)(rodar);
    }).observe(doc.body, { childList: true, subtree: true, characterData: true });
  }

  var api = {
    ativa: ativa,
    oferta: oferta,
    ofertaDoCodigo: ofertaDoCodigo,
    textoSelo: textoSelo,
    fimEmMs: fimEmMs,
    ate: ate,
    dinheiro: dinheiro,
    veioDaBlackFriday: veioDaBlackFriday,
    ocasiaoDaAgenda: ocasiaoDaAgenda
  };
  root.KLBlackFriday = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!doc) return;

  var bf = root.KL_BF;
  if (!ativa(bf)) return;

  try {
    if (/^kl_bf_/i.test(new URLSearchParams(root.location.search).get('utm_campaign') || '')) lembrarVisita();
  } catch (e) {}

  if (script && script.getAttribute('data-kl-bf-agenda')) {
    trocarFaixaDaAgenda(bf);
    return;
  }

  var qual = script && script.getAttribute('data-kl-bf-faixa');
  if (qual) {
    desenharFaixa(bf, qual, script);
    return;
  }
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { iniciarSelos(bf); });
  } else {
    iniciarSelos(bf);
  }
}(typeof window !== 'undefined' ? window : globalThis));
