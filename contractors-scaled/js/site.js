/* Contractors Scaled — site behaviour. Plain JS, no dependencies.
   Everything here is progressive enhancement: the page reads and the form posts without it. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 64em)');

  /* ---------- Load-in ---------- */
  function markLoaded() { root.classList.add('is-loaded'); }
  if (document.fonts && document.fonts.ready) {
    var done = false;
    var finish = function () { if (!done) { done = true; markLoaded(); } };
    document.fonts.ready.then(finish);
    setTimeout(finish, 900); /* never wait on a slow font */
  } else { markLoaded(); }

  /* ---------- Year ---------- */
  var y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = y; });

  /* ---------- Nav state ---------- */
  var nav = document.querySelector('[data-nav]');
  var lastScrolled = null;
  function onScrollNav() {
    var s = window.scrollY > 12;
    if (s !== lastScrolled) { nav.classList.toggle('is-scrolled', s); lastScrolled = s; }
  }
  if (nav) { onScrollNav(); window.addEventListener('scroll', onScrollNav, { passive: true }); }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  var menuLabel = document.querySelector('[data-menu-label]');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';
    if (open) { var first = menu.querySelector('a'); if (first) first.focus({ preventScroll: true }); }
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
    });
    desktop.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Image fallback (tries .jpg → .jpeg → .png → .webp, then shows a label) ---------- */
  var exts = ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG'];
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    var base = img.getAttribute('data-fallback');
    var i = 0;
    function fail() {
      i += 1;
      if (i < exts.length) { img.src = base + exts[i]; return; }
      img.removeEventListener('error', fail);
      var holder = img.closest('.sheet__img');
      if (holder) holder.classList.add('is-missing');
      if (img.parentElement && img.parentElement.hasAttribute('data-stage')) {
        var ph = document.createElement('div');
        ph.className = 'ph';
        ph.setAttribute('data-panel', img.getAttribute('data-panel'));
        if (img.classList.contains('is-shown')) ph.classList.add('is-shown');
        ph.textContent = img.getAttribute('data-panel');
        img.replaceWith(ph);
        if (holder) holder.classList.remove('is-missing');
      }
    }
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Statement underline + process line ---------- */
  function watch(selector, cls) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (!('IntersectionObserver' in window) || reduceMotion.matches) { el.classList.add(cls); return; }
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { el.classList.add(cls); o.disconnect(); } });
    }, { threshold: 0.4 });
    o.observe(el);
  }
  watch('[data-statement]', 'is-in');
  watch('[data-steps]', 'is-in');

  /* ---------- Work: sticky stage follows the list ---------- */
  var stage = document.querySelector('[data-stage]');
  var list = document.querySelector('[data-work-list]');
  var stageCode = document.querySelector('[data-stage-code]');
  var stageLabel = document.querySelector('[data-stage-label]');
  if (stage && list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('.work__item'));
    var current = 'kitchen';
    var hoverUntil = 0;
    function show(key) {
      if (key === current) return;
      current = key;
      items.forEach(function (li) { li.classList.toggle('is-active', li.getAttribute('data-key') === key); });
      Array.prototype.forEach.call(stage.querySelectorAll('[data-panel]'), function (p) {
        p.classList.toggle('is-shown', p.getAttribute('data-panel') === key);
      });
      var li = items.filter(function (l) { return l.getAttribute('data-key') === key; })[0];
      if (li) {
        if (stageCode) stageCode.textContent = li.getAttribute('data-code');
        if (stageLabel) stageLabel.textContent = li.getAttribute('data-label');
      }
    }
    items.forEach(function (li) {
      li.addEventListener('mouseenter', function () { if (desktop.matches) { hoverUntil = Date.now() + 1200; show(li.getAttribute('data-key')); } });
      li.addEventListener('focusin', function () { if (desktop.matches) show(li.getAttribute('data-key')); });
    });
    if ('IntersectionObserver' in window) {
      var wo = new IntersectionObserver(function (entries) {
        if (!desktop.matches || Date.now() < hoverUntil) return;
        var best = null;
        entries.forEach(function (en) { if (en.isIntersecting && (!best || en.intersectionRatio > best.intersectionRatio)) best = en; });
        if (best) show(best.target.getAttribute('data-key'));
      }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
      items.forEach(function (li) { wo.observe(li); });
    }
  }

  /* ---------- Hero parallax (desktop, motion allowed) ---------- */
  var par = document.querySelector('[data-parallax]');
  if (par && !reduceMotion.matches) {
    var ticking = false;
    function move() {
      ticking = false;
      if (!desktop.matches) { par.style.transform = ''; return; }
      var r = par.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var p = (r.top + r.height / 2 - vh / 2) / vh; /* -0.5..0.5 around centre */
      par.style.transform = 'scale(1.08) translateY(' + (p * -18).toFixed(2) + 'px)';
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
    move();
  }

  /* ---------- Prefill from CTAs ---------- */
  var form = document.querySelector('[data-form]');
  var projectSelect = document.querySelector('[data-project-select]');
  function setRole(value) {
    var r = form && form.querySelector('input[name="I am a"][value="' + value + '"]');
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-project], [data-role]');
    if (!a || !form) return;
    if (a.hasAttribute('data-project') && projectSelect) { setRole('Homeowner'); projectSelect.value = a.getAttribute('data-project'); }
    if (a.hasAttribute('data-role')) setRole(a.getAttribute('data-role'));
  });

  /* ---------- Form: role-aware labels, AJAX submit with native fallback ---------- */
  if (form) {
    var status = form.querySelector('[data-status]');
    var next = form.querySelector('[data-next]');
    if (next) {
      /* Redirect target for the no-JS path is hard-coded; when JS runs, point it at wherever this page is hosted. */
      try { next.value = new URL('thank-you.html', window.location.href).href; } catch (err) { /* keep default */ }
    }

    function applyRole() {
      var checked = form.querySelector('input[name="I am a"]:checked');
      var role = checked ? checked.value.toLowerCase() : 'homeowner';
      form.querySelectorAll('[data-homeowner]').forEach(function (label) {
        var t = label.getAttribute('data-' + role);
        if (t) label.textContent = t;
      });
      var msg = form.querySelector('#f-message');
      if (msg) {
        msg.placeholder = role === 'contractor'
          ? 'Trades you cover, the area you work in, and how long you\'ve been building.'
          : 'What the room is now, what you\'d like it to be, and any timing you have in mind.';
      }
      var loc = form.querySelector('#f-location');
      if (loc) loc.placeholder = role === 'contractor' ? 'e.g. Tampa metro' : 'e.g. Tampa, FL';
    }
    form.addEventListener('change', function (e) { if (e.target.name === 'I am a') applyRole(); });
    applyRole();

    function onSubmit(e) {
      if (!window.fetch || !window.FormData) return; /* native POST */
      if (!form.checkValidity()) return;            /* browser shows its own messages */
      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) { e.preventDefault(); return; }
      e.preventDefault();
      form.classList.add('is-sending');
      if (status) { status.className = 'form__status'; status.textContent = 'Sending…'; }
      var data = new FormData(form);
      data.delete('_next');
      data.delete('_captcha');
      fetch('https://formsubmit.co/ajax/joseph@contractorscaled.com', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function () {
          form.classList.remove('is-sending');
          form.classList.add('is-done');
          if (status) { status.textContent = ''; }
          var done = form.querySelector('.form__done h3');
          if (done) done.setAttribute('tabindex', '-1'), done.focus({ preventScroll: true });
        })
        .catch(function () {
          /* Fall back to a normal POST so nothing is lost. */
          form.classList.remove('is-sending');
          if (status) { status.className = 'form__status is-error'; status.textContent = 'One moment, sending another way…'; }
          form.removeEventListener('submit', onSubmit);
          HTMLFormElement.prototype.submit.call(form);
        });
    }
    form.addEventListener('submit', onSubmit);
  }
})();
