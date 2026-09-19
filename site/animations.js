/* =====================================================================
   POKEWORLD UNIVERSE — camada de animação (GSAP + ScrollTrigger)
   ===================================================================== */
(function () {
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktop = window.matchMedia('(min-width: 901px)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hero = document.querySelector('.hero');

  function rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) / 10; }

  /* ---------- utilitário: divide texto em letras (preserva spans .grad) ---------- */
  function splitChars(el) {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';
    var chars = [];
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split('').forEach(function (ch) {
            if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'ch';
            s.textContent = ch;
            frag.appendChild(s);
            chars.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('grad')) { chars.push(n); return; }
          walk(n);
        }
      });
    }
    walk(el);
    return chars;
  }

  function splitWords(el) {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';
    var words = [];
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'wd';
            s.textContent = w;
            frag.appendChild(s);
            words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          if (n.classList.contains('grad')) { words.push(n); return; }
          walk(n);
        }
      });
    }
    walk(el);
    return words;
  }

  if (reduce) return; // respeita "reduzir movimento": site fica estático

  /* =====================================================================
     1. Cursor custom (desktop com mouse)
     ===================================================================== */
  var cursor = null; // cursor customizado desativado (cursor normal do sistema)
  if (cursor && finePointer && isDesktop) {
    document.documentElement.classList.add('has-cursor');
    var ring = cursor.querySelector('.cursor__ring');
    var dot = cursor.querySelector('.cursor__dot');
    var rx = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
    window.addEventListener('mousemove', function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      if (!cursor.classList.contains('is-on')) cursor.classList.add('is-on');
    });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
    var hoverSel = 'a, button, .tile, .news-card, .sys-card, .hamburger';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) cursor.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
  }

  /* =====================================================================
     2. Barra de progresso do scroll
     ===================================================================== */
  var prog = document.querySelector('.scroll-progress');
  if (prog) {
    gsap.to(prog, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
    });
  }

  /* =====================================================================
     3. Header: entrada
     ===================================================================== */
  var tlHead = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tlHead
    .from('.header-shape', { yPercent: -100, duration: 0.9, stagger: 0.08 })
    .from('.logo-sigla', { scale: 0, rotation: -25, duration: 0.8, ease: 'back.out(1.8)' }, '-=0.4')
    .from('.nav a', { y: -24, autoAlpha: 0, duration: 0.5, stagger: 0.07 }, '-=0.5')
    .from('.btn-jogue-agora', { scale: 0.6, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.3')
    .from('.hamburger', { autoAlpha: 0, x: 20, duration: 0.5 }, 0.3);

  /* =====================================================================
     4. Hero: reveal do card (dispara quando a logo do vídeo assenta)
     ===================================================================== */
  var titleWords = splitWords(document.querySelector('.cta-card__title'));
  var heroTargets = ['.cta-card', '.trailer', '.stats-bar'];
  gsap.set(heroTargets, { autoAlpha: 0 });

  function revealHero() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.cta-card', { y: 70, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9 })
      .from(titleWords, { y: 40, autoAlpha: 0, rotationX: -60, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.06 }, '-=0.5')
      .from('.cta-card .pill', { scale: 0.5, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)', stagger: 0.12 }, '-=0.3')
      .fromTo('.trailer', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, '-=0.6')
      .fromTo('.stats-bar', { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, '-=0.5')
      .from('.stats-bar .stat', { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.1 }, '-=0.4')
      .add(function () { countUp(document.querySelector('.stats-bar .count')); }, '-=0.3')
      .add(function () { document.dispatchEvent(new CustomEvent('hero:revealed')); });
  }
  if (hero && hero.classList.contains('has-video') && !hero.classList.contains('is-ready')) {
    document.addEventListener('hero:ready', revealHero, { once: true });
  } else {
    revealHero();
  }

  /* trailer: o botão pulsa de leve para chamar o clique */
  gsap.to('.trailer__play i', { scale: 1.08, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });

  /* =====================================================================
     5. Botões magnéticos + tilt de cards (desktop)
     ===================================================================== */
  function magnetic(sel, strength) {
    if (!finePointer || !isDesktop) return;
    document.querySelectorAll(sel).forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }
  magnetic('.btn-jogue-agora, .cta-card .pill, .btn-jogar, .btn-veja, .badge', 0.35);
  magnetic('.nav a', 0.25);

  function tilt(sel, max) {
    if (!finePointer || !isDesktop) return;
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.transformStyle = 'preserve-3d';
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2); rx(-py * max * 2);
      });
      el.addEventListener('mouseenter', function () { gsap.to(el, { scale: 1.03, duration: 0.4 }); });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { rotationX: 0, rotationY: 0, scale: 1, duration: 0.7, ease: 'power3.out' });
      });
    });
  }
  tilt('.sys-card', 7);
  tilt('.news-card', 5);
  gsap.set('.sys-grid, .news__list', { perspective: 1200 });

  /* =====================================================================
     6. Contador da barra de status
     ===================================================================== */
  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = '1';
    var target = +el.dataset.count;
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 2.2, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(obj.v).toLocaleString('pt-BR'); }
    });
  }
  ScrollTrigger.create({
    trigger: '.footer__stats', start: 'top 90%',
    onEnter: function () { countUp(document.querySelector('.footer__stats .count')); }
  });

  /* =====================================================================
     7. Seção "O que é": reveal, pokébola girando, Gengar flutuando, partículas
     ===================================================================== */
  var about = document.querySelector('.about');
  if (about) {
    gsap.from('.about__swoosh', {
      scaleX: 0, transformOrigin: 'left center', ease: 'power3.out', duration: 1.2,
      scrollTrigger: { trigger: about, start: 'top 80%' }
    });
    gsap.from('.about__blue', {
      yPercent: 25, autoAlpha: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: about, start: 'top 75%' }
    });
    var tlAbout = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: '.about-card__head', start: 'top 85%' }
    });
    tlAbout
      .from('.about-card__head', { x: -80, autoAlpha: 0, duration: 0.8 })
      .from('.about-card__body', { y: 60, autoAlpha: 0, duration: 0.8 }, '-=0.5')
      .from(splitChars(document.querySelector('.about-card__title')), { y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.02 }, '-=0.5')
      .from('.about__pokeball', { scale: 0, rotation: -180, duration: 0.7, ease: 'back.out(2)' }, '-=0.6')
      .from('.about__text', { y: 24, autoAlpha: 0, duration: 0.7 }, '-=0.4')
      .from('.btn-jogar', { scale: 0.6, autoAlpha: 0, duration: 0.6, ease: 'back.out(2)' }, '-=0.4')
      .from('.about__gengar', { x: 220, autoAlpha: 0, rotation: 8, duration: 1, ease: 'power3.out' }, 0.1)
      .from('.about__grid', { yPercent: 40, autoAlpha: 0, duration: 1 }, 0.2);

    // pokébola gira conforme o scroll
    gsap.to('.about__pokeball', {
      rotation: 360, ease: 'none',
      scrollTrigger: { trigger: about, start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
    // Gengar flutua (o wrap segue o cursor; a imagem faz o "bob")
    gsap.to('.about__gengar', { y: -14, rotation: -2, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.2 });

    // partículas (pokébolas) flutuando na área azul
    var pc = document.querySelector('.about__particles');
    if (pc) {
      var n = isDesktop ? 12 : 6;
      for (var i = 0; i < n; i++) {
        var s = document.createElement('img');
        s.src = 'assets/m-sys-icon.svg';
        s.alt = '';
        s.className = 'particle';
        var size = gsap.utils.random(1.2, 3.2);
        gsap.set(s, {
          width: size + 'rem', height: size + 'rem',
          left: gsap.utils.random(2, 96) + '%', top: gsap.utils.random(10, 92) + '%',
          opacity: gsap.utils.random(0.15, 0.5), rotation: gsap.utils.random(0, 360)
        });
        pc.appendChild(s);
        gsap.to(s, {
          y: gsap.utils.random(-40, 40), x: gsap.utils.random(-30, 30),
          rotation: '+=' + gsap.utils.random(90, 360),
          duration: gsap.utils.random(4, 9), yoyo: true, repeat: -1, ease: 'sine.inOut',
          delay: gsap.utils.random(0, 3)
        });
      }
    }
  }

  /* =====================================================================
     8. Sistemas do jogo: título, cards, Raichu/Dragonite com parallax
     ===================================================================== */
  var sysTitle = document.querySelector('.systems__title');
  if (sysTitle) {
    gsap.from(splitChars(sysTitle), {
      y: 50, autoAlpha: 0, rotationX: -80, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.03, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: sysTitle, start: 'top 85%' }
    });
  }
  ScrollTrigger.batch('.sys-card', {
    start: 'top 88%',
    onEnter: function (els) {
      gsap.fromTo(els, { y: 80, autoAlpha: 0, rotationX: 12 }, { y: 0, autoAlpha: 1, rotationX: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', overwrite: true });
    }
  });
  gsap.from('.sys-card__icon', {
    rotation: -360, scale: 0, duration: 0.8, ease: 'back.out(1.5)', stagger: 0.1,
    scrollTrigger: { trigger: '.sys-grid', start: 'top 80%' }
  });
  // dots piscando
  gsap.to('.sys-card__dots i', { opacity: 0.25, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.2, repeat: -1, yoyo: true } });

  if (isDesktop) {
    gsap.fromTo('.systems__raichu', { y: 120, rotation: -6 }, {
      y: -120, rotation: 4, ease: 'none',
      scrollTrigger: { trigger: '.systems', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
    });
    gsap.fromTo('.systems__dragonite', { y: 160, rotation: 4 }, {
      y: -160, rotation: -6, ease: 'none',
      scrollTrigger: { trigger: '.systems', start: 'top bottom', end: 'bottom top', scrub: 1.2 }
    });
    gsap.from('.systems__raichu', { x: -300, autoAlpha: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.systems__raichu', start: 'top 95%' } });
    gsap.from('.systems__dragonite', { x: 300, autoAlpha: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.systems__dragonite', start: 'top 95%' } });
  }

  /* =====================================================================
     9. Notícias: título, linha, cards, botão
     ===================================================================== */
  var newsTitle = document.querySelector('.news__title');
  if (newsTitle) {
    gsap.from(splitChars(newsTitle), {
      y: 50, autoAlpha: 0, rotationX: -80, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.03, ease: 'back.out(1.6)',
      scrollTrigger: { trigger: newsTitle, start: 'top 90%' }
    });
    gsap.from('.news__line', { scaleX: 0, transformOrigin: 'left center', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: newsTitle, start: 'top 90%' } });
  }
  ScrollTrigger.batch('.news-card', {
    start: 'top 90%',
    onEnter: function (els) {
      gsap.fromTo(els, { y: 100, autoAlpha: 0, scale: 0.92 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.9, stagger: 0.15, ease: 'power3.out', overwrite: true });
    }
  });
  gsap.from('.news-card__badge', {
    scale: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.15,
    scrollTrigger: { trigger: '.news__list', start: 'top 70%' }
  });
  gsap.from('.btn-veja', {
    scale: 0.6, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)',
    scrollTrigger: { trigger: '.btn-veja', start: 'top 95%' }
  });

  /* =====================================================================
     10. Palco final: título e badges "respirando"
     ===================================================================== */
  gsap.to('.footer__tag', { y: -6, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.badge', { y: -5, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.3 });

  /* =====================================================================
     10a. Reveal genérico [data-reveal] (novas seções)
     ===================================================================== */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    ScrollTrigger.batch(revealEls, {
      start: 'top 88%', once: true,
      onEnter: function (b) { gsap.fromTo(b, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, stagger: .12, ease: 'power3.out', overwrite: true }); }
    });
    document.querySelectorAll('.discord-card .count').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () { countUp(el); } });
    });
    gsap.to('.community__art', { y: -14, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: .6 });
    gsap.from('.steps-path', { scaleX: 0, transformOrigin: 'left center', duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.steps-grid', start: 'top 80%' } });
    gsap.to('.legend-sec__art', { y: -16, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  /* =====================================================================
     10b. Artes de canto: entram deslizando do canto e flutuam de leve
     ===================================================================== */
  document.querySelectorAll('.corner-art[data-corner]').forEach(function (el) {
    var dir = el.dataset.corner === 'left' ? -1 : 1;
    gsap.from(el, { x: 160 * dir, autoAlpha: 0, duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
    gsap.to(el, { y: -10, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() });
  });

  /* =====================================================================
     11. Estado inicial pronto
     ===================================================================== */
  document.documentElement.classList.add('is-animated');
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
