(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KLCapturePopup = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var SESSION_KEY = 'kl_capture_popup_seen_v1';
  function mount(win, section, options) {
    options = options || {};
    var doc = win.document, dialog = doc.createElement('dialog');
    if (typeof dialog.showModal !== 'function') return null;
    dialog.setAttribute('id', 'kl-capture-dialog');
    dialog.setAttribute('class', 'kl-capture-dialog');
    dialog.setAttribute('aria-labelledby', 'kl-capture-title');
    var close = doc.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('class', 'kl-capture-popup-close');
    close.setAttribute('aria-label', 'Fechar convite de WhatsApp');
    close.textContent = '×';
    dialog.appendChild(close);
    doc.body.appendChild(dialog);
    var marker = doc.createElement('span'), previousFocus = null, previousScroll = null;
    marker.hidden = true;
    section.parentNode.insertBefore(marker, section);
    function seen() {
      try { return win.__klCapturePopupSeen || win.sessionStorage.getItem(SESSION_KEY) === 'shown'; }
      catch (_) { return Boolean(win.__klCapturePopupSeen); }
    }
    function otherDialog() {
      return Array.prototype.some.call(doc.querySelectorAll('dialog'), function (d) { return d !== dialog && d.open; });
    }
    function open(manual, trigger) {
      if (dialog.open || otherDialog()) return false;
      hideTeaser();
      if (!manual && (seen() || (options.isSuppressed && options.isSuppressed()) || doc.visibilityState === 'hidden' || /^(INPUT|TEXTAREA|SELECT)$/.test((doc.activeElement || {}).tagName))) return false;
      previousFocus = doc.activeElement;
      previousScroll = {left:win.scrollX || 0,top:win.scrollY || 0,behavior:'instant'};
      marker.style.height = Math.ceil(section.getBoundingClientRect().height) + 'px';
      marker.style.display = 'block';
      if (win.getComputedStyle) {
        var style = win.getComputedStyle(section);
        marker.style.marginTop = style.marginTop || '0px';
        marker.style.marginBottom = style.marginBottom || '0px';
      }
      marker.hidden = false;
      dialog.appendChild(section);
      doc.body.classList.add('kl-capture-popup-open');
      try { dialog.showModal(); }
      catch (_) { restore(); return false; }
      win.__klCapturePopupSeen = true;
      try { win.sessionStorage.setItem(SESSION_KEY, 'shown'); } catch (_) {}
      close.focus({preventScroll:true});
      if (options.onOpen) options.onOpen(trigger || (manual ? 'manual' : 'page_open'));
      return true;
    }
    function restore() {
      // The marker keeps the same form/controller and its place in the page.
      marker.parentNode.insertBefore(section, marker);
      marker.hidden = true;marker.style.display = 'none';
      doc.body.classList.remove('kl-capture-popup-open');
    }
    function dismiss() { if (dialog.open) dialog.close(); }
    dialog.addEventListener('close', function () {
      restore();
      if (options.onClose) options.onClose();
      if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus({preventScroll:true});
      if (win.scrollTo && previousScroll) win.scrollTo(previousScroll);
    });
    close.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', function (ev) { ev.preventDefault(); dismiss(); });
    dialog.addEventListener('click', function (ev) { if (ev.target === dialog) dismiss(); });
    /* 25/11/2026: o convite não cobre mais a página ao abrir (476 de 528 fechavam).
     * Um cartão pequeno sobe no rodapé depois de interesse real: 40% da página lida
     * ou 12 segundos com a aba à vista. O formulário completo só abre no toque. */
    var teaser = null, armed = false, timer = null;
    function hideTeaser() {
      if (!teaser) return;
      teaser.classList.remove('kl-capture-teaser-on');
      doc.body.classList.remove('kl-capture-teaser-open');
    }
    function showTeaser() {
      if (teaser || dialog.open || otherDialog() || seen() || (options.isSuppressed && options.isSuppressed()) || doc.visibilityState === 'hidden') return false;
      teaser = doc.createElement('aside');
      teaser.setAttribute('class', 'kl-capture-teaser');
      teaser.setAttribute('aria-label', 'Convite para receber modelos no WhatsApp');
      function el(tag, cls, text, label) {
        var n = doc.createElement(tag);
        n.setAttribute('class', cls);
        if (tag === 'button') n.setAttribute('type', 'button');
        if (label) n.setAttribute('aria-label', label);
        if (text) n.textContent = text;
        teaser.appendChild(n);
        return n;
      }
      el('p', 'kl-capture-teaser-t', 'Quer ver mais modelos?');
      el('p', 'kl-capture-teaser-s', 'A loja manda pelo seu WhatsApp.');
      var go = el('button', 'kl-capture-teaser-go', 'Receber modelos');
      var x = el('button', 'kl-capture-teaser-x', '\u00d7', 'Fechar convite');
      doc.body.appendChild(teaser);
      win.__klCapturePopupSeen = true;
      try { win.sessionStorage.setItem(SESSION_KEY, 'shown'); } catch (_) {}
      go.addEventListener('click', function () { open(true, 'teaser'); });
      x.addEventListener('click', function () {
        hideTeaser();
        if (options.onTeaserDismiss) options.onTeaserDismiss();
      });
      win.setTimeout(function () {
        teaser.classList.add('kl-capture-teaser-on');
        doc.body.classList.add('kl-capture-teaser-open');
      }, 40);
      if (options.onTeaser) options.onTeaser();
      return true;
    }
    function tryAutomatic() {
      // Catalog selection must not be interrupted; explicit capture links still work.
      if (/\/catalogo(?:\/|\.html|$)/.test(win.location && win.location.pathname || '')) return false;
      return showTeaser();
    }
    function onScroll() {
      var d = doc.documentElement || {}, total = (d.scrollHeight || 0) - (win.innerHeight || 0);
      if (total > 0 && (win.scrollY || 0) / total >= 0.4) fire();
    }
    function fire() {
      if (!armed) return;
      armed = false;
      if (timer && win.clearTimeout) win.clearTimeout(timer);
      if (win.removeEventListener) win.removeEventListener('scroll', onScroll);
      tryAutomatic();
    }
    function arm() {
      if (armed || teaser || seen()) return;
      armed = true;
      if (win.addEventListener) win.addEventListener('scroll', onScroll, {passive:true});
      timer = win.setTimeout(fire, 12000);
    }
    arm();
    return {open:open,close:dismiss,isOpen:function(){return dialog.open;},tryAutomatic:tryAutomatic,isTeaserOn:function(){return Boolean(teaser && teaser.classList.contains('kl-capture-teaser-on'));}};
  }
  return {mount:mount};
}));
