/* Intro em vídeo da hero (desktop) + reveal do card + loop dos personagens */
(function () {
  var hero = document.querySelector('.hero');
  var intro = document.querySelector('.hero__intro');
  var loop = document.querySelector('.hero__loop');
  if (!hero || !intro || !loop) return;

  var SHOW_AT = 3.8;          // segundo em que a logo assenta -> mostra o card
  var isDesktop = window.matchMedia('(min-width: 901px)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready() {
    if (hero.classList.contains('is-ready')) return;
    hero.classList.add('is-ready');
    document.dispatchEvent(new CustomEvent('hero:ready'));
  }
  function fallback() {
    hero.classList.remove('has-video');
    ready();
  }

  if (!isDesktop || reduceMotion) { fallback(); return; }

  hero.classList.add('has-video');
  // MP4 (H.264) na maioria dos navegadores; WebM (VP9) como alternativa
  var canMp4 = intro.canPlayType('video/mp4; codecs="avc1.640028"');
  var ext = canMp4 ? '.mp4' : '.webm';
  intro.src = intro.dataset.src.replace(/\.mp4$/, ext);
  loop.src = loop.dataset.src.replace(/\.mp4$/, ext);
  loop.load();

  var shown = false;
  intro.addEventListener('timeupdate', function () {
    if (!shown && intro.currentTime >= SHOW_AT) {
      shown = true;
      ready();
    }
  });

  intro.addEventListener('ended', function () {
    if (!shown) { shown = true; ready(); }
    var p = loop.play();
    if (p && p.catch) p.catch(function () { hero.classList.add('is-looping'); });
  });
  loop.addEventListener('playing', function () {
    hero.classList.add('is-looping');
  });

  intro.addEventListener('error', fallback);

  var play = intro.play();
  if (play && play.catch) play.catch(fallback);

  // Se por algum motivo o vídeo travar antes de mostrar o card, garante o card
  setTimeout(function () {
    if (!shown) { shown = true; ready(); }
  }, 8000);
})();

/* =====================================================================
   Gengar segue o cursor na seção "O que é o PokeWorld Universe"
   ===================================================================== */
(function () {
  var about = document.querySelector('.about');
  var gengar = document.querySelector('.about__gengar-wrap') || document.querySelector('.about__gengar');
  if (!about || !gengar) return;
  if (window.matchMedia('(max-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var RANGE_X = 28, RANGE_Y = 18;   // deslocamento máximo em px (na escala 1920)
  var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

  function tick() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    var rem = parseFloat(getComputedStyle(document.documentElement).fontSize) / 10;
    gengar.style.transform = 'translate(' + (cx * rem).toFixed(2) + 'px,' + (cy * rem).toFixed(2) + 'px)';
    if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(tick);
    else raf = null;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  about.addEventListener('mousemove', function (e) {
    var r = about.getBoundingClientRect();
    var nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
    var ny = (e.clientY - r.top) / r.height - 0.5;
    tx = nx * 2 * RANGE_X;
    ty = ny * 2 * RANGE_Y;
    kick();
  });
  about.addEventListener('mouseleave', function () { tx = 0; ty = 0; kick(); });
})();

/* =====================================================================
   Palco de scroll: imagem cheia -> vira card na esteira -> fade preto
   ===================================================================== */
(function () {
  var stage = document.getElementById('stage');
  // no celular a cena final fica escondida (o rodapé normal entra no lugar)
  if (!stage || window.matchMedia('(max-width: 900px)').matches) return;
  var sticky = stage.querySelector('.stage__sticky');
  var frame = stage.querySelector('.stage__frame');
  var hero = stage.querySelector('.stage__hero');
  var overlay = stage.querySelector('.stage__overlay');
  var content = stage.querySelector('.stage__content');
  var marquees = Array.prototype.slice.call(stage.querySelectorAll('.marquee'));
  var IMG = hero.getAttribute('src');
  var K = 4;                    // tiles por cópia (2 cópias por trilho)
  var SPEED = 5.5;              // rem por segundo
  var LAND = 0.32;              // progresso em que a imagem vira card
  var FADE_START = 0.62, FADE_END = 0.82, CONTENT_START = 0.7;

  function rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) / 10; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeInOut(t) { return t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }

  // monta trilhos: 2 x K tiles
  marquees.forEach(function (m) {
    var track = m.querySelector('.marquee__track');
    for (var i = 0; i < K * 2; i++) {
      var img = document.createElement('img');
      img.className = 'tile';
      img.src = IMG;
      img.alt = '';
      img.draggable = false;
      track.appendChild(img);
    }
  });

  var slot = null;      // tile em que a imagem "pousa"
  var start = null;     // retângulo inicial (cover do frame)
  var land = null;      // retângulo do slot
  var loopW = 0;        // largura de uma cópia (px)
  var offset = 0, running = false, lastT = 0;

  function visibleMarquees() {
    return marquees.filter(function (m) { return getComputedStyle(m).display !== 'none'; });
  }

  function measure() {
    var fr = frame.getBoundingClientRect();
    var W = fr.width, H = fr.height;
    // cover 16:9 do frame
    var ratio = 16 / 9, w, h;
    if (W / H > ratio) { w = W; h = W / ratio; } else { h = H; w = H * ratio; }
    start = { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };

    // slot: tile do 1º trilho com maior área visível (com trilho na origem)
    var first = visibleMarquees()[0];
    var tiles = first.querySelectorAll('.tile');
    var best = null, bestA = -1;
    var tr = first.querySelector('.marquee__track');
    var saved = tr.style.transform; tr.style.transform = 'none';
    for (var i = 0; i < K; i++) {
      var r = tiles[i].getBoundingClientRect();
      var vx = Math.max(0, Math.min(r.right, fr.right) - Math.max(r.left, fr.left));
      var vy = Math.max(0, Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top));
      if (vx * vy > bestA) { bestA = vx * vy; best = tiles[i]; land = { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height }; }
    }
    tr.style.transform = saved;
    if (slot) slot.classList.remove('is-slot');
    slot = best; slot.classList.add('is-slot');

    var t0 = tiles[0].getBoundingClientRect(), tk = tiles[K].getBoundingClientRect();
    loopW = tk.left - t0.left;
  }

  function progress() {
    var top = stage.getBoundingClientRect().top;
    var total = stage.offsetHeight - sticky.offsetHeight;
    return clamp(-top / total, 0, 1);
  }

  function render() {
    var p = progress();
    var cards = p >= LAND;
    stage.classList.toggle('is-cards', cards);
    stage.classList.toggle('is-final', p >= FADE_END);
    running = cards;

    if (!cards) {
      var t = easeInOut(clamp(p / LAND, 0, 1));
      hero.style.left = (start.x + (land.x - start.x) * t) + 'px';
      hero.style.top = (start.y + (land.y - start.y) * t) + 'px';
      hero.style.width = (start.w + (land.w - start.w) * t) + 'px';
      hero.style.height = (start.h + (land.h - start.h) * t) + 'px';
      // esteira aparece ao longo da aproximação
      marquees.forEach(function (m) { m.style.opacity = clamp((t - 0.35) / 0.65, 0, 1); });
    } else {
      marquees.forEach(function (m) { m.style.opacity = ''; });
    }

    var f = clamp((p - FADE_START) / (FADE_END - FADE_START), 0, 1);
    overlay.style.opacity = (f * 0.5).toFixed(3);
    var c = easeInOut(clamp((p - CONTENT_START) / (1 - CONTENT_START), 0, 1));
    content.style.opacity = c.toFixed(3);
    content.style.transform = 'translateY(' + ((1 - c) * 6) + 'rem)';
  }

  function loop(ts) {
    var dt = lastT ? (ts - lastT) / 1000 : 0; lastT = ts;
    if (running) {
      offset = (offset + SPEED * rem() * dt) % loopW;
    } else if (offset !== 0) {
      // volta suavemente para a origem para a imagem pousar no slot certo
      var o = offset > loopW / 2 ? offset - loopW : offset;
      o *= 0.85; if (Math.abs(o) < 0.5) o = 0;
      offset = o < 0 ? o + loopW : o;
      if (offset === loopW) offset = 0;
    }
    marquees.forEach(function (m) {
      var dir = +m.dataset.dir || 1;
      var x = dir > 0 ? -offset : offset - loopW;
      m.querySelector('.marquee__track').style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
    requestAnimationFrame(loop);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { render(); ticking = false; });
  }
  function onResize() { measure(); render(); }

  // lightbox
  var lb = document.getElementById('lightbox');
  var lbImg = lb.querySelector('.lightbox__img');
  function openLb(src) { lbImg.src = src; lb.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; }
  stage.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('tile') && stage.classList.contains('is-cards')) openLb(t.src);
  });
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  measure(); render();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  requestAnimationFrame(loop);
})();
