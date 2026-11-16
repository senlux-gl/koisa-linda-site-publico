/* Black Friday Koisa Linda: monta a página /black-friday/ a partir de window.KL_BF
   (black-friday/bf-modelos.js) e de window.KL_DATA (catálogo do sistema).
   Nada de preço, código ou data escrito aqui: tudo vem dessas duas fontes.
   A parte pura (datas, preço, links) é testada em bf-pagina.test.cjs. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KLBlackFriday = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PORTAS = {
    noiva: { ancora: 'noiva', categoria: 'vestidos-noiva', ocasiao: 'noiva', nomePadrao: 'Vestido de noiva' },
    debutante: { ancora: '15-anos', categoria: 'vestidos-debutante', ocasiao: 'debutante', nomePadrao: 'Vestido de debutante' }
  };
  var CHAVES_ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'gclid', 'fbclid', 'gbraid', 'wbraid'];

  /* O dia de hoje no fuso das lojas (Rio), como AAAA-MM-DD. */
  function hojeNoRio(agora) {
    var d = agora instanceof Date ? agora : new Date();
    try {
      var partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
      var v = {};
      partes.forEach(function (p) { v[p.type] = p.value; });
      return v.year + '-' + v.month + '-' + v.day;
    } catch (e) {
      var rio = new Date(d.getTime() - 3 * 3600 * 1000);
      return rio.toISOString().slice(0, 10);
    }
  }

  function dataValida(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
  }

  /* Vale o dia inteiro de validoAte; no dia seguinte, acabou. */
  function estaAtiva(bf, hoje) {
    if (!bf || bf.ativo === false || !dataValida(bf.validoAte)) return false;
    return String(hoje) <= bf.validoAte;
  }

  function reais(valor) {
    var n = Math.round(Number(valor));
    if (!isFinite(n) || n <= 0) return '';
    return 'R$ ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function diaMes(valor) {
    if (!dataValida(valor)) return '';
    return valor.slice(8, 10) + '/' + valor.slice(5, 7);
  }

  /* O nome vem do catálogo. Se o registro não descreve um vestido (erro de cadastro),
     a página mostra o nome da ocasião em vez de um nome que não bate com a foto. */
  function nomeDoModelo(produto, porta) {
    var nome = String(produto && produto.n || '').trim();
    return /vestido/i.test(nome) ? nome : PORTAS[porta].nomePadrao;
  }

  function miniatura(url) {
    var partes = String(url || '').split('?');
    if (!/\.jpg$/i.test(partes[0])) return '';
    return partes[0].replace(/\.jpg$/i, '-thumb.jpg') + (partes[1] ? '?' + partes.slice(1).join('?') : '');
  }

  /* Os modelos de uma porta, na ordem de KL_BF. Código fora do catálogo, de outra
     categoria ou sem foto fica fora: a página nunca mostra vestido sem foto. */
  function modelos(bf, porta, catalogo) {
    var cfg = PORTAS[porta];
    var lista = bf && bf[porta] && Array.isArray(bf[porta].codigos) ? bf[porta].codigos : [];
    var dados = Array.isArray(catalogo) ? catalogo : [];
    var vistos = {};
    return lista.reduce(function (saida, codigo) {
      var k = String(codigo || '').trim().toUpperCase();
      if (!k || vistos[k]) return saida;
      var p = dados.find(function (item) { return item && String(item.k || '').toUpperCase() === k; });
      if (!p || p.c !== cfg.categoria || !/^https:\/\//.test(String(p.u || ''))) return saida;
      vistos[k] = true;
      saida.push({ codigo: k, nome: nomeDoModelo(p, porta), foto: p.u, miniatura: miniatura(p.u) });
      return saida;
    }, []);
  }

  /* A agenda que já existe, com a ocasião e o modelo, e a origem que chegou na visita. */
  function linkDaAgenda(porta, codigo, busca) {
    var cfg = PORTAS[porta];
    var q = new URLSearchParams();
    q.set('ocasiao', cfg.ocasiao);
    if (/^[A-Z0-9][A-Z0-9-]{0,39}$/.test(String(codigo || ''))) q.set('modelo', codigo);
    q.set('ui_source', 'catalog_product_schedule');
    var origem = new URLSearchParams(busca || '');
    CHAVES_ORIGEM.forEach(function (k) {
      var v = origem.get(k);
      if (v && v.length <= 250) q.set(k, v);
    });
    return '/agendar/?' + q.toString();
  }

  /* ---------- navegador ---------- */

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function preco(bf, porta, classe, tag) {
    var p = el(tag || 'p', classe);
    var de = el('s', 'bf-de');
    de.textContent = 'de ' + reais(bf[porta].de);
    var por = el('span', 'bf-por');
    por.appendChild(el('span', 'bf-por-rotulo', 'por '));
    por.appendChild(document.createTextNode(reais(bf[porta].por)));
    p.appendChild(de);
    p.appendChild(document.createTextNode(' '));
    p.appendChild(por);
    return p;
  }

  function preencherCabeca(raiz, bf, porta, ate) {
    raiz.querySelectorAll('[data-bf-frase="' + porta + '"]').forEach(function (n) { n.textContent = bf[porta].frase || ''; });
    raiz.querySelectorAll('[data-bf-preco="' + porta + '"]').forEach(function (n) {
      n.replaceWith(preco(bf, porta, n.className, n.tagName.toLowerCase()));
    });
    raiz.querySelectorAll('[data-bf-ate]').forEach(function (n) { n.textContent = ate; });
  }

  function cartao(bf, porta, m, busca, aoClicar, indice) {
    var li = el('li', 'bf-modelo');
    var fig = el('figure', 'bf-foto');
    var img = document.createElement('img');
    img.src = m.miniatura || m.foto;
    if (m.miniatura) {
      img.srcset = m.miniatura + ' 640w, ' + m.foto + ' 1792w';
      img.sizes = '(max-width: 599px) calc(100vw - 32px), (max-width: 1023px) 45vw, 280px';
    }
    img.width = 640;
    img.height = 857;
    img.alt = m.nome + ', referência ' + m.codigo + ', vestido inteiro em foto de catálogo';
    img.decoding = 'async';
    img.loading = indice < 2 ? 'eager' : 'lazy';
    fig.appendChild(img);
    li.appendChild(fig);
    var corpo = el('div', 'bf-modelo-texto');
    corpo.appendChild(el('h3', 'bf-modelo-nome', m.nome));
    corpo.appendChild(el('p', 'bf-ref', 'Ref. ' + m.codigo));
    corpo.appendChild(preco(bf, porta, 'bf-preco bf-preco-cartao'));
    corpo.appendChild(el('p', 'bf-detalhe', porta === 'debutante' ? 'Os três vestidos · modelos selecionados' : 'Modelos selecionados'));
    var a = el('a', 'bf-botao', 'Quero provar este');
    a.href = linkDaAgenda(porta, m.codigo, busca);
    a.setAttribute('data-kl-track-manual', 'true');
    a.setAttribute('data-bf-modelo', m.codigo);
    a.addEventListener('click', function () { aoClicar(porta, m.codigo); });
    corpo.appendChild(a);
    li.appendChild(corpo);
    return li;
  }

  function medirClique(porta, codigo) {
    try {
      var t = window.KLTracking;
      if (t && typeof t.catalog === 'function') {
        t.catalog('KL_Catalog_Schedule_Click', { productCode: codigo, category: PORTAS[porta].categoria, source: 'catalog_product_schedule' });
      }
    } catch (e) {}
  }

  function revelar(raiz) {
    var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var itens = raiz.querySelectorAll('[data-bf-revela]');
    if (calmo || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('bf-movimento');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('bf-visivel');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    itens.forEach(function (n) { io.observe(n); });
  }

  function irPara(id, suave) {
    var alvo = document.getElementById(id);
    if (!alvo) return;
    var calmo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({ behavior: suave && !calmo ? 'smooth' : 'auto', block: 'start' });
  }

  function iniciar() {
    var raiz = document.getElementById('bf');
    if (!raiz) return;
    var bf = window.KL_BF;
    var catalogo = window.KL_DATA;
    var busca = location.search;
    var hoje = hojeNoRio(new Date());

    if (!estaAtiva(bf, hoje)) {
      raiz.setAttribute('data-bf-estado', bf ? 'acabou' : 'sem-dados');
      return;
    }
    var ate = 'Modelos selecionados · até ' + diaMes(bf.validoAte);
    ['noiva', 'debutante'].forEach(function (porta) {
      if (!bf[porta]) return;
      preencherCabeca(raiz, bf, porta, ate);
      var grade = raiz.querySelector('[data-bf-grade="' + porta + '"]');
      if (!grade) return;
      modelos(bf, porta, catalogo).forEach(function (m, i) {
        var c = cartao(bf, porta, m, busca, medirClique, i);
        c.setAttribute('data-bf-revela', '');
        grade.appendChild(c);
      });
    });
    raiz.querySelectorAll('[data-bf-ate-dia]').forEach(function (n) { n.textContent = diaMes(bf.validoAte); });
    raiz.setAttribute('data-bf-estado', 'ativa');

    /* As portas rolam na mesma página e mantêm a origem da visita no endereço. */
    raiz.querySelectorAll('[data-bf-ir]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('data-bf-ir');
        ev.preventDefault();
        try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (e) {}
        irPara(id, true);
      });
    });
    revelar(raiz);
    var hash = decodeURIComponent((location.hash || '').slice(1));
    if (hash === 'noiva' || hash === '15-anos') requestAnimationFrame(function () { irPara(hash, false); });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
    else iniciar();
  }

  return {
    PORTAS: PORTAS,
    hojeNoRio: hojeNoRio,
    estaAtiva: estaAtiva,
    reais: reais,
    diaMes: diaMes,
    nomeDoModelo: nomeDoModelo,
    miniatura: miniatura,
    modelos: modelos,
    linkDaAgenda: linkDaAgenda
  };
}));
