/* Lara de verdade na janela do site (25/11/2026, cartão #1711).
 * Só liga quando LARA_CHAT_URL está preenchido e a visita cai na metade do teste.
 * Sem endereço, o menu antigo de respostas prontas continua igual.
 * Não pede nome nem telefone; dado pessoal só no formulário da agenda. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KLLaraChat = api;
  if (root && root.document) {
    // Depois do kl-site-enhance montar o botão da Lara.
    var start = function () { root.setTimeout(function () { api.init(root); }, 60); };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var LARA_CHAT_URL = 'https://n8n-kl.senlux.com.br/webhook/kl-site-chat-20261125'; // ligado 25/11 (OK do Guilherme por passo)
  var PAGES = /^\/(?:|index\.html|noivas\/?|noivas\.html)$/;
  var BUCKET_KEY = 'kl_lara_chat_bucket_v1';
  var SESSION_KEY = 'kl_lara_chat_session_v1';
  var LOJAS = {
    sf: { nome: 'São Francisco', whatsapp: '5521970858787' },
    barra: { nome: 'Barra', whatsapp: '5521966475383' }
  };
  var BOTOES = {
    agenda_noiva: { label: 'Ver horários de noiva', href: '/agendar/?ocasiao=noiva&ui_source=lara_site' },
    agenda_debutante: { label: 'Ver horários de debutante', href: '/agendar/?ocasiao=debutante&ui_source=lara_site' },
    catalogo_noiva: { label: 'Ver vestidos de noiva', href: '/catalogo/?cat=vestidos-noiva&ui_source=lara_site' },
    catalogo_debutante: { label: 'Ver vestidos de debutante', href: '/catalogo/?cat=vestidos-debutante&ui_source=lara_site' },
    catalogo_festa: { label: 'Ver vestidos de festa', href: '/catalogo/?cat=vestidos-madrinha&ui_source=lara_site' },
    unidades: { label: 'Endereços e horários', href: '/unidades/?ui_source=lara_site' }
  };
  var ATALHOS = ['Sou noiva', 'Sou debutante', 'Madrinha ou festa'];

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  function bucket(win, rnd) {
    var saved = safe(function () { return win.localStorage.getItem(BUCKET_KEY); }, null);
    if (saved === 'chat' || saved === 'menu') return saved;
    var b = (rnd || Math.random)() < 0.5 ? 'chat' : 'menu';
    safe(function () { win.localStorage.setItem(BUCKET_KEY, b); });
    return b;
  }

  function session(win) {
    var s = safe(function () { return win.sessionStorage.getItem(SESSION_KEY); }, null);
    if (s && /^[a-f0-9]{32}$/.test(s)) return s;
    var bytes = new Uint8Array(16);
    if (win.crypto && win.crypto.getRandomValues) win.crypto.getRandomValues(bytes);
    else for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    s = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    safe(function () { win.sessionStorage.setItem(SESSION_KEY, s); });
    return s;
  }

  function track(win, action, extra) {
    var data = Object.assign({ page_path: win.location.pathname, lara_variant: 'chat' }, extra || {});
    safe(function () { if (typeof win.gtag === 'function') win.gtag('event', 'lara_site_' + action, data); });
  }

  function shouldRun(win, url, rnd) {
    if (!url) return false;
    if (!PAGES.test(win.location.pathname || '/')) return false;
    var b = bucket(win, rnd);
    safe(function () { if (typeof win.gtag === 'function') win.gtag('event', 'lara_site_variant', { lara_variant: b, page_path: win.location.pathname }); });
    return b === 'chat';
  }

  function init(win, opts) {
    opts = opts || {};
    var url = opts.url !== undefined ? opts.url : LARA_CHAT_URL;
    var doc = win.document;
    if (!shouldRun(win, url, opts.random)) return null;
    var shell = doc.querySelector('.kl-lara-web');
    if (!shell) return null;
    var body = shell.querySelector('.kl-lara-body');
    var head = shell.querySelector('.kl-lara-head b');
    if (!body) return null;
    shell.classList.add('kl-lara-chat');
    if (head) head.textContent = 'Pergunte o que quiser.';
    body.textContent = '';
    var log = doc.createElement('div'); log.className = 'kl-lc-log'; log.setAttribute('aria-live', 'polite');
    var chips = doc.createElement('div'); chips.className = 'kl-lc-chips';
    var form = doc.createElement('form'); form.className = 'kl-lc-form';
    var input = doc.createElement('input');
    input.type = 'text'; input.maxLength = 600; input.placeholder = 'Escreva sua dúvida'; input.setAttribute('aria-label', 'Sua mensagem para a Lara');
    input.autocomplete = 'off';
    var trap = doc.createElement('input'); trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.className = 'kl-lc-trap'; trap.setAttribute('aria-hidden', 'true');
    var send = doc.createElement('button'); send.type = 'submit'; send.textContent = 'Enviar';
    form.appendChild(input); form.appendChild(trap); form.appendChild(send);
    var note = doc.createElement('p'); note.className = 'kl-lc-note';
    note.textContent = 'Respostas da Lara, assistente com IA. Para marcar, use a agenda.';
    body.appendChild(log); body.appendChild(chips); body.appendChild(form); body.appendChild(note);

    function bubble(role, text) {
      var p = doc.createElement('p');
      p.className = 'kl-lc-msg kl-lc-' + role;
      p.textContent = text;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return p;
    }
    function actions(list) {
      if (!list || !list.length) return;
      var box = doc.createElement('div'); box.className = 'kl-lc-actions';
      list.forEach(function (id) {
        if (id === 'whatsapp') {
          ['sf', 'barra'].forEach(function (k) {
            var a = doc.createElement('a');
            a.href = 'https://wa.me/' + LOJAS[k].whatsapp + '?text=' + encodeURIComponent('Olá! Vim pelo site da Koisa Linda e quero tirar uma dúvida.');
            a.target = '_blank'; a.rel = 'noopener';
            a.textContent = 'WhatsApp ' + LOJAS[k].nome;
            a.setAttribute('data-lara-button', 'whatsapp_' + k);
            box.appendChild(a);
          });
        } else if (BOTOES[id]) {
          var a = doc.createElement('a');
          a.href = BOTOES[id].href; a.textContent = BOTOES[id].label; a.setAttribute('data-lara-button', id);
          box.appendChild(a);
        }
      });
      log.appendChild(box);
      log.scrollTop = log.scrollHeight;
    }
    bubble('lara', 'Oi, eu sou a Lara, da Koisa Linda. Me conta o que você procura que eu te ajudo.');
    ATALHOS.forEach(function (t) {
      var b = doc.createElement('button'); b.type = 'button'; b.textContent = t;
      b.addEventListener('click', function () { ask(t); });
      chips.appendChild(b);
    });

    var busy = false, sent = 0;
    function ask(text) {
      text = String(text || '').trim();
      if (!text || busy) return;
      busy = true; send.disabled = true; chips.hidden = true;
      bubble('user', text);
      var wait = bubble('lara kl-lc-wait', '...');
      sent += 1;
      track(win, 'message', { lara_turn: sent });
      var fetcher = opts.fetch || win.fetch;
      Promise.resolve().then(function () {
        return fetcher(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: session(win), text: text.slice(0, 600), page: win.location.pathname, website: trap.value })
        });
      }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          wait.remove();
          if (j.reply) bubble('lara', j.reply);
          actions(j.buttons);
          track(win, 'reply', { lara_action: j.action || '', lara_fallback: !!j.fallback, lara_limit: !!j.limit });
        })
        .catch(function () {
          wait.remove();
          bubble('lara', 'Agora não consegui responder por aqui. A equipe da loja te atende pelo WhatsApp.');
          actions(['whatsapp']);
          track(win, 'error');
        })
        .then(function () { busy = false; send.disabled = false; });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); var t = input.value; input.value = ''; ask(t); });
    log.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[data-lara-button]') : null;
      if (a) track(win, 'button', { lara_button: a.getAttribute('data-lara-button') });
    });
    return { ask: ask, log: log };
  }

  return { init: init, bucket: bucket, session: session, shouldRun: shouldRun };
}));
