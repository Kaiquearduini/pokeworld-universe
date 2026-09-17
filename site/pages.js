/* =====================================================================
   POKEWORLD UNIVERSE — subpáginas: animações compartilhadas e
   renderização (notícias, artigo, ranking, loja, wiki, galeria)
   ===================================================================== */
(function () {
  var page = document.body.dataset.page;
  var isDesktop = window.matchMedia('(min-width: 901px)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap && !reduce ? window.gsap : null;
  if (G) G.registerPlugin(ScrollTrigger);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderBody(lines) {
    var out = '', list = [];
    function flush() { if (list.length) { out += '<ul>' + list.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; list = []; } }
    (lines || []).forEach(function (l) {
      l = String(l);
      if (/^\s*-\s+/.test(l)) { list.push(l.replace(/^\s*-\s+/, '')); return; }
      flush();
      if (/^##\s+/.test(l)) out += '<h3>' + esc(l.replace(/^##\s+/, '')) + '</h3>';
      else if (l.trim()) out += '<p>' + esc(l) + '</p>';
    });
    flush();
    return out;
  }
  function NEWS() { return (window.PWU && PWU.store) ? PWU.store.news() : (PWU.news || []); }
  function DEX() { return (window.PWU && PWU.store) ? PWU.store.pokemon() : (PWU.pokedex || []); }
  function whenReady(fn) { if (window.PWU && PWU.store) PWU.store.ready.then(fn); else fn(); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }

  /* Pagamento (Mercado Pago, API de Orders): o site manda SÓ o id do pacote;
     o servidor define preço e coins, cria a order e devolve o checkout_url. */
  function pay(packageId, btn, provedor) {
    var label = btn ? btn.textContent : '';
    var rota = provedor === 'stripe' ? '/api/stripe-checkout' : '/api/checkout';
    var nome = provedor === 'stripe' ? 'Stripe' : 'Mercado Pago';
    function fail(msg) { PWU.toast(msg); if (btn) { btn.disabled = false; btn.textContent = label; } }
    if (btn) { btn.disabled = true; btn.textContent = 'Abrindo ' + nome + '...'; }
    return PWU.auth.token().then(function (token) {
      if (!token) throw new Error('Pagamentos exigem a conta conectada ao servidor. Entre novamente.');
      return fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ packageId: packageId }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401) throw new Error('Sua sessão expirou. Entre novamente.');
        if (r.status === 503) throw new Error('Pagamento ainda não configurado no servidor.');
        if (!r.ok || !d.checkoutUrl) throw new Error('Não foi possível iniciar o pagamento.');
        location.href = d.checkoutUrl;   // redirect pro checkout do Mercado Pago
      });
    }).catch(function (e) { fail(e.message === 'Failed to fetch' ? 'Pagamento indisponível neste ambiente.' : e.message); });
  }

  /* =====================================================================
     Animações compartilhadas
     ===================================================================== */
  if (G) {
    // cursor
    var cursor = null; // cursor customizado desativado
    if (cursor && finePointer && isDesktop) {
      document.documentElement.classList.add('has-cursor');
      var ring = cursor.querySelector('.cursor__ring'), dot = cursor.querySelector('.cursor__dot');
      var rx = G.quickTo(ring, 'x', { duration: .35, ease: 'power3' }), ry = G.quickTo(ring, 'y', { duration: .35, ease: 'power3' });
      var dx = G.quickTo(dot, 'x', { duration: .08 }), dy = G.quickTo(dot, 'y', { duration: .08 });
      window.addEventListener('mousemove', function (e) { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); cursor.classList.add('is-on'); });
      var hoverSel = 'a, button, .dex, .item, .mode, .ncard, summary, input, label';
      document.addEventListener('mouseover', function (e) { if (e.target.closest(hoverSel)) cursor.classList.add('is-hover'); });
      document.addEventListener('mouseout', function (e) { if (e.target.closest(hoverSel)) cursor.classList.remove('is-hover'); });
    }
    // progresso
    var prog = document.querySelector('.scroll-progress');
    if (prog) G.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    // header
    G.timeline({ defaults: { ease: 'power3.out' } })
      .from('.header-shape', { yPercent: -100, duration: .8, stagger: .08 })
      .from('.logo-sigla', { scale: 0, rotation: -25, duration: .7, ease: 'back.out(1.8)' }, '-=.4')
      .from('.nav a', { y: -20, autoAlpha: 0, duration: .45, stagger: .06 }, '-=.4')
      .from('.btn-jogue-agora', { scale: .6, autoAlpha: 0, duration: .5, ease: 'back.out(2)' }, '-=.3');
    // banner
    G.timeline({ defaults: { ease: 'power3.out' }, delay: .2 })
      .from('.banner__tag', { y: 20, autoAlpha: 0, duration: .6 })
      .from('.banner__title', { y: 60, autoAlpha: 0, duration: .9 }, '-=.3')
      .from('.banner__sub', { y: 20, autoAlpha: 0, duration: .6 }, '-=.5')
      .from('.banner__art', { x: 120, autoAlpha: 0, duration: 1 }, '-=.8');
    G.to('.banner__art', { y: -12, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    G.to('.banner', { backgroundPosition: '50% 30%', ease: 'none', scrollTrigger: { trigger: '.banner', start: 'top top', end: 'bottom top', scrub: true } });

    // magnéticos
    if (finePointer && isDesktop) {
      document.querySelectorAll('.btn-jogue-agora, .btn--yellow, .btn--lime').forEach(function (el) {
        var xTo = G.quickTo(el, 'x', { duration: .4, ease: 'power3' }), yTo = G.quickTo(el, 'y', { duration: .4, ease: 'power3' });
        el.addEventListener('mousemove', function (e) { var r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .3); });
        el.addEventListener('mouseleave', function () { G.to(el, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.4)' }); });
      });
    }
  }

  // reveal genérico (funciona para conteúdo renderizado depois também)
  function reveal(scope) {
    var els = (scope || document).querySelectorAll('[data-reveal]:not([data-revealed])');
    if (!els.length) return;
    els.forEach(function (el) { el.setAttribute('data-revealed', '1'); });
    if (!G) return;
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: function (b) { G.fromTo(b, { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, stagger: .1, ease: 'power3.out', overwrite: true }); }
    });
    ScrollTrigger.refresh();
  }

  /* =====================================================================
     Galeria (lightbox) — usada em O JOGO
     ===================================================================== */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('.lightbox__img');
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lightbox]');
      if (!a) return;
      e.preventDefault();
      lbImg.src = a.getAttribute('href'); lb.hidden = false; document.body.classList.add('is-locked');
    });
    lb.addEventListener('click', function () { lb.hidden = true; document.body.classList.remove('is-locked'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { lb.hidden = true; document.body.classList.remove('is-locked'); } });
  }

  /* =====================================================================
     O JOGO — marquee de pokémon
     ===================================================================== */
  if (page === 'o-jogo') {
    var track = document.querySelector('.pk-marquee__track');
    if (track && window.PWU) whenReady(function () {
      var list = DEX().slice(0, 28);
      var html = list.map(function (p) { return '<a href="wiki.html?p=' + p.id + '" title="' + esc(p.name) + '"><img src="' + p.image + '" alt="' + esc(p.name) + '" loading="lazy"></a>'; }).join('');
      track.innerHTML = html + html;
    });
    var counters = document.querySelectorAll('.stat-box b[data-count]');
    if (G && counters.length) {
      ScrollTrigger.create({ trigger: '.stats-row', start: 'top 85%', once: true, onEnter: function () {
        counters.forEach(function (el) {
          var target = +el.dataset.count, suffix = el.dataset.suffix || '', o = { v: 0 };
          G.to(o, { v: target, duration: 2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('pt-BR') + suffix; } });
        });
      } });
    }
  }

  /* =====================================================================
     NOTÍCIAS — lista com filtro
     ===================================================================== */
  function newsCard(n) {
    return '<article class="ncard" data-reveal>' +
      '<a class="ncard__img" href="noticia.html?id=' + n.slug + '"><img src="' + n.image + '" alt="" loading="lazy"></a>' +
      '<div class="ncard__body"><div class="news-meta"><span class="tag">' + esc(n.tag) + '</span><span>' + PWU.fmtDate(n.date) + '</span></div>' +
      '<h3><a href="noticia.html?id=' + n.slug + '">' + esc(n.title) + '</a></h3><p>' + esc(n.excerpt) + '</p>' +
      '<a class="more" href="noticia.html?id=' + n.slug + '">Saiba mais</a></div></article>';
  }
  if (page === 'noticias' && window.PWU) whenReady(function () {
    var grid = document.getElementById('news-grid'), feat = document.getElementById('news-featured');
    var chips = document.querySelectorAll('.chips [data-filter]');
    function renderNews(filter) {
      var list = NEWS().filter(function (n) { return filter === 'todas' || n.tag === filter; });
      var first = list[0];
      if (feat) {
        feat.innerHTML = first ? '<img src="' + first.image + '" alt=""><div class="news-featured__body"><div class="news-meta"><span class="tag">' + esc(first.tag) + '</span><span>' + PWU.fmtDate(first.date) + '</span></div>' +
          '<h2>' + esc(first.title) + '</h2><p>' + esc(first.excerpt) + '</p><div class="btn-row" style="margin-top:2.4rem"><a class="btn btn--yellow btn--sm" href="noticia.html?id=' + first.slug + '">Ler notícia</a></div></div>' : '';
      }
      grid.innerHTML = list.slice(1).map(newsCard).join('') || '<p class="empty">Nenhuma notícia nesta categoria.</p>';
      reveal(grid);
      if (G && feat && first) G.fromTo(feat, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: 'power3.out' });
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.toggle('is-active', x === c); });
        renderNews(c.dataset.filter);
      });
    });
    renderNews('todas');
  });

  /* =====================================================================
     ARTIGO
     ===================================================================== */
  if (page === 'noticia' && window.PWU) whenReady(function () {
    var slug = qs('id');
    var n = NEWS().find(function (x) { return x.slug === slug; }) || NEWS()[0];
    if (!n) return;
    document.title = n.title + ' — Pokeworld Universe';
    var el = document.getElementById('article');
    el.innerHTML = '<div class="article__hero"><img src="' + n.image + '" alt=""></div>' +
      '<h1>' + esc(n.title) + '</h1>' +
      '<div class="news-meta"><span class="tag">' + esc(n.tag) + '</span><span>' + PWU.fmtDate(n.date) + '</span><span>·</span><span>' + Math.max(2, Math.round(n.body.join(' ').length / 900)) + ' min de leitura</span></div>' +
      '<div class="article__body">' + renderBody(n.body) + '</div>' +
      '<div class="share"><button type="button" data-share="copy">Copiar link</button><button type="button" data-share="wa">WhatsApp</button><button type="button" data-share="x">X / Twitter</button></div>';
    var rel = NEWS().filter(function (x) { return x.slug !== n.slug; }).slice(0, 3);
    document.getElementById('related').innerHTML = rel.map(newsCard).join('');
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-share]'); if (!b) return;
      var url = location.href, txt = encodeURIComponent(n.title + ' ' + url);
      if (b.dataset.share === 'copy') { navigator.clipboard && navigator.clipboard.writeText(url); PWU.toast('Link copiado!', 'ok'); }
      if (b.dataset.share === 'wa') window.open('https://wa.me/?text=' + txt, '_blank');
      if (b.dataset.share === 'x') window.open('https://twitter.com/intent/tweet?text=' + txt, '_blank');
    });
    if (G) G.from('.article__body > *', { y: 20, autoAlpha: 0, duration: .6, stagger: .06, ease: 'power2.out', delay: .3 });
  });

  /* =====================================================================
     RANKING
     ===================================================================== */
  if (page === 'ranking' && window.PWU) {
    var cats = PWU.rankingCats, R = PWU.rankings, T = PWU.trophies;
    var me = PWU.auth && PWU.auth.user;
    var catsEl = document.getElementById('rank-cats'), listEl = document.getElementById('rank-list'), descEl = document.getElementById('rank-desc');
    var search = document.getElementById('rank-search');
    var current = 'experiencia';
    var vivo = {};      // cache do que veio do banco do jogo
    function fmt(v) { return Number(v || 0).toLocaleString('pt-BR'); }

    /* Busca no banco do jogo; se não estiver configurado, usa os dados de exemplo. */
    function carregar(cat) {
      if (vivo[cat]) return Promise.resolve(vivo[cat]);
      return fetch('/api/game?resource=ranking&cat=' + encodeURIComponent(cat))
        .then(function (r) { if (!r.ok) throw new Error('offline'); return r.json(); })
        .then(function (d) { vivo[cat] = d; return d; })
        .catch(function () { return null; });
    }

    function linhas(cat, d) {
      if (d && d.rows && d.rows.length) return d.rows;
      if (d && d.rows && !d.rows.length) return [];
      return (R[cat] || []).map(function (p, i) { return { pos: i + 1, name: p.name, value: p.value, guild: p.guild, members: p.members, team: (p.team || []).map(function (t) { return { name: t.id, level: t.lvl, pct: t.pct }; }) }; });
    }

    function renderCats() {
      catsEl.innerHTML = cats.map(function (c) {
        var d = vivo[c.id], top = (d && d.rows && d.rows[0]) || (R[c.id] && R[c.id][0]);
        return '<button type="button" class="rank-cat' + (c.id === current ? ' is-active' : '') + '" data-cat="' + c.id + '"><small>' + esc(c.label) + '</small><b>' + (top ? esc(top.name) + ' · <em>' + fmt(top.value) + '</em>' : '—') + '</b></button>';
      }).join('');
    }
    document.getElementById('trophy-legend').innerHTML = T.map(function (src, i) { return '<figure><img src="' + src + '" alt=""><figcaption>' + (i < 6 ? (i + 1) + 'º' : '7º+') + '</figcaption></figure>'; }).join('');

    function renderList() {
      var cat = cats.find(function (c) { return c.id === current; });
      var d = vivo[current];
      descEl.textContent = cat.desc + (d ? '' : ' (dados de exemplo — conecte o banco do jogo)');
      var q = (search.value || '').toLowerCase();
      var list = linhas(current, d).filter(function (p) { return p.name.toLowerCase().indexOf(q) > -1 || (p.guild || '').toLowerCase().indexOf(q) > -1; });

      if (d && d.missing === 'snapshot') {
        listEl.innerHTML = '<p class="rank-empty">Este ranking precisa do retrato diário de experiência.<br>Rode <b>sql/site-tables.sql</b> no banco e agende <b>/api/game?resource=snapshot</b> uma vez por dia.</p>';
        return;
      }

      listEl.innerHTML = list.map(function (p) {
        var trophy = T[Math.min(p.pos, 7) - 1];
        var slots = [];
        for (var k = 0; k < 6; k++) {
          var m = p.team && p.team[k];
          var id = m ? String(m.name || '').toLowerCase().replace(/\s+/g, '-') : null;
          slots.push(m ? '<div class="slot"><img src="assets/img/pokemon/' + id + '.png" alt="" onerror="this.style.visibility=\'hidden\'"><span class="slot__lvl">LVL <b>' + (m.level || 0) + '</b></span><div class="bar"><i data-w="' + (m.pct != null ? m.pct : Math.min(100, (m.level || 0))) + '"></i></div><span class="slot__pct">' + String(m.name).replace(/^./, function (c) { return c.toUpperCase(); }) + '</span></div>'
            : '<div class="slot slot--empty"><img src="assets/img/pokemon/pikachu.png" alt=""><span class="slot__lvl">LVL <b>0</b></span><div class="bar"><i></i></div><span class="slot__pct">—</span></div>');
        }
        var you = me && p.name.toLowerCase() === (me.name || '').toLowerCase();
        var sub = current === 'guildas' ? esc(p.guild || '') + (p.members ? ' · ' + p.members + ' membros' : '') : esc(p.guild || 'Sem guilda') + (p.level ? ' · nível ' + p.level : '');
        return '<article class="rank-card' + (p.pos <= 3 ? ' rank-card--top' : '') + (you ? ' you' : '') + '" data-reveal>' +
          '<div class="rank-card__head">' +
            '<div class="rank-card__pos' + (trophy ? '' : ' rank-card__pos--plain') + '">' + (trophy ? '<img src="' + trophy + '" alt="">' : '') + '<b>' + p.pos + '</b></div>' +
            '<div class="rank-card__name"><b>' + esc(p.name) + '</b><small>' + sub + '</small></div>' +
            '<div class="rank-card__value"><b>' + fmt(p.value) + '</b><small>' + esc((d && d.unit) || cat.unit) + '</small></div>' +
          '</div><div class="rank-team">' + slots.join('') + '</div></article>';
      }).join('') || '<p class="rank-empty">Nenhum resultado.</p>';

      if (G) {
        G.fromTo(listEl.querySelectorAll('.rank-card'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, stagger: .06, ease: 'power2.out', overwrite: true });
        G.fromTo(listEl.querySelectorAll('.bar i[data-w]'), { width: 0 }, { width: function (i, el) { return el.dataset.w + '%'; }, duration: 1, stagger: .01, ease: 'power3.out', delay: .2 });
      } else listEl.querySelectorAll('.bar i[data-w]').forEach(function (i) { i.style.width = i.dataset.w + '%'; });
      listEl.querySelectorAll('[data-reveal]').forEach(function (el) { el.setAttribute('data-revealed', '1'); });
    }

    function ir(cat) { current = cat; renderCats(); renderList(); carregar(cat).then(function () { renderCats(); renderList(); }); }
    catsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) ir(b.dataset.cat); });
    search.addEventListener('input', renderList);
    ir('experiencia');
    cats.forEach(function (c) { if (c.id !== 'experiencia') carregar(c.id).then(renderCats); });

    // status do servidor no topo
    fetch('/api/game?resource=status').then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
      if (!st) return;
      var el = document.getElementById('rank-updated');
      if (el) el.textContent = 'Estatísticas em ' + new Date().toLocaleDateString('pt-BR') + ' · ' + st.online + ' online agora · recorde de ' + st.record + ' · ' + st.trainers + ' treinadores.';
      document.querySelectorAll('.count[data-count]').forEach(function (c) { if (st.online) c.dataset.count = st.online; });
    }).catch(function () {});

    var end = new Date('2026-12-15T23:59:59-03:00').getTime();
    function tick() {
      var d2 = Math.max(0, end - Date.now());
      document.getElementById('t-d').textContent = Math.floor(d2 / 864e5);
      document.getElementById('t-h').textContent = ('0' + Math.floor(d2 % 864e5 / 36e5)).slice(-2);
      document.getElementById('t-m').textContent = ('0' + Math.floor(d2 % 36e5 / 6e4)).slice(-2);
    }
    tick(); setInterval(tick, 30000);
  }

  /* =====================================================================
     LOJA — filtros e carrinho (localStorage)
     ===================================================================== */
  if (page === 'loja' && window.PWU) {
    var CART_KEY = 'pwu_cart';
    var grid2 = document.getElementById('shop-grid'), fab = document.getElementById('cart-fab'), cart = document.getElementById('cart');
    function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { return []; } }
    function writeCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); renderCart(); }
    function price(it) {
      var parts = [];
      if (it.coins) parts.push('<span>🪙 ' + it.coins.toLocaleString('pt-BR') + '</span>');
      if (it.gems) parts.push('<span>💎 ' + it.gems.toLocaleString('pt-BR') + '</span>');
      if (it.price) parts.push('<span>' + PWU.brl(it.price) + '</span>');
      return parts.join('');
    }
    function renderShop(filter) {
      var list = PWU.shop.filter(function (i) { return filter === 'todos' || i.type === filter; });
      grid2.innerHTML = list.map(function (it) {
        return '<div class="item" data-reveal>' + (it.badge ? '<span class="item__badge">' + esc(it.badge) + '</span>' : '') +
          '<div class="item__img"><img src="' + it.image + '" alt="" loading="lazy"></div><h3>' + esc(it.name) + '</h3><p>' + esc(it.desc) + '</p>' +
          '<div class="item__price">' + price(it) + '</div><button class="btn btn--yellow btn--sm" data-require-auth data-add="' + it.id + '">Comprar</button></div>';
      }).join('');
      reveal(grid2);
    }
    document.querySelectorAll('.chips [data-filter]').forEach(function (c) {
      c.addEventListener('click', function () { document.querySelectorAll('.chips [data-filter]').forEach(function (x) { x.classList.toggle('is-active', x === c); }); renderShop(c.dataset.filter); });
    });
    grid2.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]'); if (!b || !PWU.auth.user) return;
      var c = readCart(); c.push(b.dataset.add); writeCart(c);
      PWU.toast('Adicionado ao carrinho!', 'ok');
      if (G) G.fromTo(fab, { scale: 1.25 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.4)' });
      var img = b.closest('.item').querySelector('img');
      if (G && img) {
        var ghost = img.cloneNode(); var r = img.getBoundingClientRect(), f = fab.getBoundingClientRect();
        ghost.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;z-index:300;pointer-events:none;object-fit:contain';
        document.body.appendChild(ghost);
        G.to(ghost, { left: f.left + f.width / 2 - 20, top: f.top + f.height / 2 - 20, width: 40, height: 40, opacity: .2, duration: .8, ease: 'power2.inOut', onComplete: function () { ghost.remove(); } });
      }
    });
    function renderCart() {
      var c = readCart(), items = c.map(function (id) { return PWU.shop.find(function (i) { return i.id === id; }); }).filter(Boolean);
      fab.querySelector('b').textContent = items.length;
      var list = cart.querySelector('.cart__list');
      list.innerHTML = items.map(function (it, i) { return '<div class="cart__item"><img src="' + it.image + '" alt=""><div>' + esc(it.name) + '<small>' + (it.price ? PWU.brl(it.price) : it.gems ? it.gems + ' gemas' : it.coins + ' moedas') + '</small></div><button type="button" data-rm="' + i + '" aria-label="Remover">×</button></div>'; }).join('') || '<p class="empty">Seu carrinho está vazio.</p>';
      var total = items.reduce(function (s, it) { return s + (it.price || 0); }, 0), gems = items.reduce(function (s, it) { return s + (it.gems || 0); }, 0);
      cart.querySelector('.cart__total b').textContent = (total ? PWU.brl(total) : '') + (gems ? (total ? ' + ' : '') + gems + ' gemas' : '') || 'R$ 0,00';
    }
    fab.addEventListener('click', function () { cart.classList.add('is-open'); });
    cart.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-close]')) cart.classList.remove('is-open');
      var rm = e.target.closest('[data-rm]'); if (rm) { var c = readCart(); c.splice(+rm.dataset.rm, 1); writeCart(c); }
      if (e.target.closest('[data-checkout]')) {
        if (!readCart().length) return PWU.toast('Seu carrinho está vazio.');
        PWU.toast('As compras usam coins. Vamos te levar para comprar coins na sua conta.');
        setTimeout(function () { location.href = 'minha-conta.html#coins'; }, 1200);
      }
    });
    renderShop('todos'); renderCart();

    // Loja só para quem está logado: abre o login ao entrar e trava a grade até conectar
    var gate = document.getElementById('shop-gate');
    function applyGate() {
      var logged = !!(PWU.auth && PWU.auth.user);
      gate.hidden = logged;
      grid2.classList.toggle('is-locked', !logged);
      fab.hidden = !logged;
    }
    applyGate();
    if (!(PWU.auth && PWU.auth.user)) setTimeout(function () { PWU.auth.open('login'); }, 600);
    document.addEventListener('auth:change', applyGate);
  }

  /* =====================================================================
     WIKI — Pokédex com busca, filtro e ficha
     ===================================================================== */
  if (page === 'wiki' && window.PWU) whenReady(function () {
    var dex = document.getElementById('dex-grid'), q = document.getElementById('dex-search'), modal = document.getElementById('dex-modal');
    var role = 'todos';
    function renderDex() {
      var term = (q.value || '').toLowerCase();
      var list = DEX().filter(function (p) { return (role === 'todos' || p.role === role) && p.name.toLowerCase().indexOf(term) > -1; });
      dex.innerHTML = list.map(function (p) {
        return '<div class="dex" data-id="' + p.id + '" style="--role:' + PWU.roles[p.role].color + '"><img src="' + p.image + '" alt="" loading="lazy"><h3>' + esc(p.name) + '</h3><span>' + PWU.roles[p.role].label + '</span></div>';
      }).join('') || '<p class="empty">Nenhum Pokémon encontrado.</p>';
      document.getElementById('dex-count').textContent = list.length;
      if (G) G.fromTo(dex.children, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45, stagger: .025, ease: 'power2.out', overwrite: true });
    }
    document.querySelectorAll('.chips [data-role]').forEach(function (c) {
      c.addEventListener('click', function () { document.querySelectorAll('.chips [data-role]').forEach(function (x) { x.classList.toggle('is-active', x === c); }); role = c.dataset.role; renderDex(); });
    });
    q.addEventListener('input', renderDex);
    function openDex(id) {
      var p = DEX().find(function (x) { return x.id === id; }); if (!p) return;
      var stats = [['Ataque', p.stats.ataque], ['Defesa', p.stats.defesa], ['Resistência', p.stats.resistencia], ['Suporte', p.stats.suporte], ['Mobilidade', p.stats.mobilidade]];
      modal.querySelector('.dex-modal__card').innerHTML = '<button class="close" type="button" data-close>×</button>' +
        '<div class="dex-modal__img"><img src="' + p.image + '" alt=""></div><div>' +
        '<h2>' + esc(p.name) + '</h2>' + (p.description ? '<p class="dex-modal__desc">' + esc(p.description) + '</p>' : '') + '<div class="meta"><span style="background:' + PWU.roles[p.role].color + ';color:#000">' + PWU.roles[p.role].label + '</span><span>' + (p.range === 'melee' ? 'Curto alcance' : 'Longo alcance') + '</span><span>Dificuldade <i class="stars">' + '★'.repeat(p.difficulty) + '☆'.repeat(5 - p.difficulty) + '</i></span></div>' +
        stats.map(function (s) { return '<div class="statbar"><span>' + s[0] + '</span><div class="bar"><i data-w="' + s[1] + '"></i></div><b>' + s[1] + '</b></div>'; }).join('') +
        '<div class="btn-row" style="margin-top:2.4rem"><a class="btn btn--yellow btn--sm" href="loja.html">Ver na loja</a><a class="btn btn--ghost btn--sm" href="o-jogo.html">Como jogar</a></div></div>';
      modal.hidden = false; document.body.classList.add('is-locked');
      if (G) {
        G.fromTo(modal.querySelector('.dex-modal__card'), { y: 40, scale: .95, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .5, ease: 'back.out(1.5)' });
        G.fromTo(modal.querySelector('.dex-modal__img img'), { x: -40, rotation: -8 }, { x: 0, rotation: 0, duration: .8, ease: 'power3.out' });
        G.fromTo(modal.querySelectorAll('.bar i'), { width: 0 }, { width: function (i, el) { return el.dataset.w + '%'; }, duration: .9, stagger: .08, ease: 'power3.out', delay: .2 });
      } else modal.querySelectorAll('.bar i').forEach(function (i) { i.style.width = i.dataset.w + '%'; });
    }
    function closeDex() { modal.hidden = true; document.body.classList.remove('is-locked'); }
    dex.addEventListener('click', function (e) { var d = e.target.closest('.dex'); if (d) openDex(d.dataset.id); });
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]') || e.target.classList.contains('dex-modal__bd')) closeDex(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDex(); });
    renderDex();
    if (qs('p')) openDex(qs('p'));
  });

  /* =====================================================================
     MINHA CONTA
     ===================================================================== */
  if (page === 'minha-conta' && window.PWU) {
    var gateA = document.getElementById('acc-gate'), acc = document.getElementById('acc');
    var pm = document.getElementById('pmodal'), pmBody = document.getElementById('pmodal-body');
    var shown = { name: false, email: false };
    var AVATARS = ['pikachu', 'charmander', 'bulbasaur', 'greninja', 'lucario', 'gengar', 'sylveon', 'umbreon'];

    function openP(html) { pmBody.innerHTML = html; pm.hidden = false; document.body.classList.add('is-locked'); if (G) G.fromTo(pm.querySelector('.pmodal__card'), { y: 30, scale: .96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .4, ease: 'back.out(1.5)' }); }
    function closeP() { pm.hidden = true; document.body.classList.remove('is-locked'); }
    pm.addEventListener('click', function (e) { if (e.target.closest('[data-pclose]')) closeP(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pm.hidden) closeP(); });
    function perr(msg) { var p = pmBody.querySelector('.auth__error'); if (p) { p.textContent = msg; p.hidden = !msg; } }

    var jogo = null;   // conta vinda do banco do jogo (null = modo local)

    function renderAcc() {
      var u = PWU.auth.user;
      gateA.hidden = !!u; acc.hidden = !u;
      if (!u) return;
      var pr = jogo ? { diamonds: jogo.coins, plan: jogo.plan, twitch: null, tickets: [], trainers: (jogo.trainers || []).map(function (t) { return { name: t.name, world: t.online ? 'Online agora' : 'Nível ' + t.level, avatar: (t.team[0] && String(t.team[0].name).toLowerCase().replace(/\s+/g, '-')) || 'pikachu', level: t.level }; }) } : PWU.auth.profile();
      document.getElementById('acc-name').value = shown.name ? (jogo ? jogo.name : u.name) : ' *  *  *  *  *';
      document.getElementById('acc-email').value = shown.email ? (jogo ? jogo.email : u.email) : ' *  *  *  *  *';
      document.getElementById('acc-diamonds').textContent = (pr.diamonds || 0).toLocaleString('pt-BR');
      document.getElementById('acc-plan').textContent = pr.plan || 'Conta Grátis';
      var tw = document.querySelector('[data-acc="twitch"]'); if (tw) tw.textContent = pr.twitch ? 'Twitch: ' + pr.twitch : 'Vincular Twitch';
      document.getElementById('acc-tcount').textContent = '(' + pr.trainers.length + ')';
      document.getElementById('acc-trainers').innerHTML = pr.trainers.map(function (t, i) {
        return '<div class="trainer">' + (jogo ? '' : '<button class="rm" type="button" data-rm-trainer="' + i + '" aria-label="Excluir">×</button>') +
          '<img src="assets/img/pokemon/' + esc(t.avatar) + '.png" alt="" onerror="this.src=\'assets/img/pokemon/pikachu.png\'"><h5>' + esc(t.name) + '</h5><span class="lvl">Nível ' + t.level + '</span><span class="world">' + esc(t.world) + '</span></div>';
      }).join('') || '<div class="trainers__empty">' + (jogo ? 'Sua conta ainda não tem treinadores.<br>Baixe o cliente, entre no jogo e crie o primeiro.' : 'Você ainda não tem treinadores.<br>Crie o primeiro aqui ou baixe o cliente e comece sua jornada.') + '</div>';
      if (G) G.fromTo('#acc-trainers .trainer', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .4, stagger: .06, ease: 'power2.out', overwrite: true });
    }

    document.addEventListener('click', function (e) {
      var tg = e.target.closest('[data-toggle]');
      if (tg) { var k = tg.dataset.toggle; shown[k] = !shown[k]; tg.textContent = shown[k] ? 'esconder' : 'mostrar'; renderAcc(); return; }
      var rm = e.target.closest('[data-rm-trainer]');
      if (rm) { var pr0 = PWU.auth.profile(); if (confirm('Excluir o treinador ' + pr0.trainers[+rm.dataset.rmTrainer].name + '?')) { pr0.trainers.splice(+rm.dataset.rmTrainer, 1); PWU.auth.saveProfile(pr0); renderAcc(); } return; }
      var a = e.target.closest('[data-acc]'); if (!a) return;
      var act = a.dataset.acc, pr = PWU.auth.profile();

      if (act === 'logout') { PWU.auth.logout(); return; }

      if (act === 'tickets') {
        openP('<h3>Tickets</h3><p class="sub">Abra um chamado para a equipe. Respondemos pelo e-mail da sua conta.</p>' +
          '<form id="f-ticket" novalidate><label class="field"><span>Assunto</span><select name="subject"><option>Problema com a conta</option><option>Pagamento ou doação</option><option>Bug no jogo</option><option>Denúncia</option><option>Outro</option></select></label>' +
          '<label class="field"><span>Mensagem</span><textarea name="message" rows="5" placeholder="Descreva o que aconteceu"></textarea></label><p class="auth__error" hidden></p><button class="auth__submit" type="submit"><span>Enviar ticket</span></button></form>' +
          '<div class="ticket-list">' + (pr.tickets.length ? pr.tickets.slice().reverse().map(function (t) { return '<div class="ticket"><b>#' + t.id + ' · ' + esc(t.subject) + '</b><small>' + new Date(t.at).toLocaleString('pt-BR') + ' · Aberto</small></div>'; }).join('') : '') + '</div>');
        document.getElementById('f-ticket').addEventListener('submit', function (ev) {
          ev.preventDefault(); var f = ev.currentTarget, msg = f.message.value.trim();
          if (msg.length < 10) return perr('Escreva pelo menos 10 caracteres.');
          if (jogo && PWU.auth.api.ticket) {
            PWU.auth.api.ticket(f.subject.value, msg).then(function () { closeP(); PWU.toast('Ticket enviado! Responderemos por e-mail.', 'ok'); })
              .catch(function (er) { perr(er.message || 'Não foi possível enviar.'); });
            return;
          }
          var p2 = PWU.auth.profile(); p2.tickets.push({ id: 1000 + p2.tickets.length + 1, subject: f.subject.value, message: msg, at: Date.now() }); PWU.auth.saveProfile(p2);
          closeP(); PWU.toast('Ticket enviado! Responderemos por e-mail.', 'ok');
        });
      }

      if (act === 'security') {
        openP('<h3>Segurança</h3><p class="sub">Troque a senha da sua conta. Use pelo menos 8 caracteres.</p><form id="f-sec" novalidate>' +
          '<label class="field"><span>Senha atual</span><input type="password" name="current" autocomplete="current-password"></label>' +
          '<label class="field"><span>Nova senha</span><input type="password" name="next" autocomplete="new-password"></label>' +
          '<label class="field"><span>Confirmar nova senha</span><input type="password" name="confirm" autocomplete="new-password"></label>' +
          '<p class="auth__error" hidden></p><button class="auth__submit" type="submit"><span>Salvar nova senha</span></button></form>');
        document.getElementById('f-sec').addEventListener('submit', function (ev) {
          ev.preventDefault(); var f = ev.currentTarget;
          if (f.next.value.length < 8) return perr('A nova senha precisa ter pelo menos 8 caracteres.');
          if (f.next.value !== f.confirm.value) return perr('As senhas não coincidem.');
          var b3 = f.querySelector('.auth__submit'); b3.classList.add('is-loading'); b3.disabled = true;
          PWU.auth.api.changePassword(PWU.auth.user.email, f.current.value, f.next.value)
            .then(function () { closeP(); PWU.toast('Senha alterada com sucesso!', 'ok'); })
            .catch(function (er) { perr(er.message); b3.classList.remove('is-loading'); b3.disabled = false; });
        });
      }

      if (act === 'twitch') {
        openP('<h3>Vincular Twitch</h3><p class="sub">Informe seu canal para receber drops e recompensas de lives parceiras.</p><form id="f-tw" novalidate>' +
          '<label class="field"><span>Usuário da Twitch</span><input type="text" name="user" placeholder="seu_canal" value="' + esc(pr.twitch || '') + '"></label><p class="auth__error" hidden></p>' +
          '<button class="auth__submit" type="submit" style="background:#9146ff;color:#fff"><span>Salvar</span></button></form>');
        document.getElementById('f-tw').addEventListener('submit', function (ev) {
          ev.preventDefault(); var v = ev.currentTarget.user.value.trim().replace(/^@/, '');
          if (v && !/^[A-Za-z0-9_]{4,25}$/.test(v)) return perr('Usuário inválido (4 a 25 letras, números ou _).');
          var p3 = PWU.auth.profile(); p3.twitch = v || null; PWU.auth.saveProfile(p3); closeP(); renderAcc(); PWU.toast(v ? 'Twitch vinculada!' : 'Twitch desvinculada.', 'ok');
        });
      }

      if (act === 'new-trainer') {
        if (jogo) return PWU.toast('Treinadores são criados dentro do jogo. Baixe o cliente e entre com esta conta.');
        if (pr.trainers.length >= 8) return PWU.toast('Limite de 8 treinadores por conta.');
        openP('<h3>Novo treinador</h3><p class="sub">Escolha o nome, o mundo e o parceiro inicial.</p><form id="f-tr" novalidate>' +
          '<label class="field"><span>Nome do treinador</span><input type="text" name="name" maxlength="20" placeholder="Ex.: Ash Ketchum"></label>' +
          '<label class="field"><span>Mundo</span><select name="world"><option>Sun</option><option>Moon</option></select></label>' +
          '<label class="field"><span>Parceiro</span><select name="avatar">' + AVATARS.map(function (a2) { return '<option value="' + a2 + '">' + a2.charAt(0).toUpperCase() + a2.slice(1) + '</option>'; }).join('') + '</select></label>' +
          '<p class="auth__error" hidden></p><button class="auth__submit" type="submit"><span>Criar treinador</span></button></form>');
        document.getElementById('f-tr').addEventListener('submit', function (ev) {
          ev.preventDefault(); var f = ev.currentTarget, nm = f.name.value.trim();
          if (!/^[A-Za-zÀ-ú0-9 ]{3,20}$/.test(nm)) return perr('Nome de 3 a 20 caracteres, sem símbolos.');
          var p4 = PWU.auth.profile();
          if (p4.trainers.some(function (t) { return t.name.toLowerCase() === nm.toLowerCase(); })) return perr('Você já tem um treinador com este nome.');
          p4.trainers.push({ name: nm, world: f.world.value, avatar: f.avatar.value, level: 1 }); PWU.auth.saveProfile(p4); closeP(); renderAcc(); PWU.toast('Treinador criado!', 'ok');
        });
      }
    });

    // pacotes de coins (exibição; preço real é do servidor)
    var packsEl = document.getElementById('acc-packs');
    if (packsEl && PWU.coinPackages) {
      packsEl.innerHTML = PWU.coinPackages.map(function (k, i) {
        var gems = ''; for (var g = 0; g < Math.min(5, Math.ceil((i + 1) / 1.6)); g++) gems += '<i></i>';
        return '<div class="pack' + (k.badge ? ' is-hot' : '') + '">' + (k.badge ? '<span class="pack__badge">' + esc(k.badge) + '</span>' : '') +
          '<div class="pack__gems">' + gems + '</div><b>' + k.coins.toLocaleString('pt-BR') + '</b><small>coins</small>' +
          '<em class="' + (k.bonusPct ? '' : 'is-none') + '">+' + k.bonusPct + '% bônus</em>' +
          '<button type="button" class="btn btn--yellow btn--sm" data-pack="' + k.id + '">' + PWU.brl(k.price) + '</button></div>';
      }).join('');
      packsEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pack]'); if (!b) return;
        var k = PWU.coinPackages.find(function (x) { return x.id === b.dataset.pack; }) || {};
        openP('<h3>Como quer pagar?</h3><p class="sub"><b>' + Number(k.coins || 0).toLocaleString('pt-BR') + ' coins</b> por ' + PWU.brl(k.price || 0) + '. Os coins caem na sua conta do jogo assim que o pagamento for confirmado.</p>' +
          '<div class="pay-ways">' +
          '<button type="button" class="pay-way" data-prov="mercadopago"><b>Mercado Pago</b><small>Pix, boleto ou cartão · Brasil</small></button>' +
          '<button type="button" class="pay-way" data-prov="stripe"><b>Stripe</b><small>Cartão de crédito · internacional</small></button>' +
          '</div><p class="mp-note">🔒 Você é levado para o site do provedor. Nenhum dado de cartão passa pelo Pokeworld.</p>');
        pmBody.addEventListener('click', function (ev) {
          var w = ev.target.closest('[data-prov]'); if (!w) return;
          pay(b.dataset.pack, w, w.dataset.prov);
        });
      });
    }
    if (location.hash === '#coins') setTimeout(function () { var d = document.getElementById('coins'); if (d && PWU.auth.user) d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 900);

    // saldo real (tabela wallets). Depois de voltar do pagamento, confere algumas vezes:
    // quem credita é o webhook, que pode chegar alguns segundos depois do redirect.
    function refreshCoins(tries) {
      PWU.auth.coins().then(function (c) {
        if (c == null) return;
        var el = document.getElementById('acc-diamonds'), before = +String(el.textContent).replace(/\D/g, '') || 0;
        el.textContent = c.toLocaleString('pt-BR');
        if (tries > 0 && c === before) setTimeout(function () { refreshCoins(tries - 1); }, 4000);
        else if (c > before && tries < 8) PWU.toast('Coins creditados na sua conta!', 'ok');
      }).catch(function () {});
    }

    // retorno do Mercado Pago
    var pg = qs('pagamento'), al = document.getElementById('acc-alert');
    if (pg && al) {
      al.hidden = false;
      if (pg === 'retorno' || pg === 'aprovado') al.textContent = 'Recebemos seu retorno do Mercado Pago. Os coins entram na conta assim que o pagamento for confirmado (normalmente em segundos).';
      else if (pg === 'pendente') { al.textContent = 'Pagamento pendente. Assim que o Mercado Pago confirmar, creditamos na sua conta.'; al.classList.add('is-warn'); }
      else { al.textContent = 'O pagamento não foi concluído. Nenhum valor foi cobrado.'; al.classList.add('is-err'); }
      history.replaceState(null, '', location.pathname);
    }

    function puxarJogo(tries) {
      if (!PWU.auth.game) return;
      PWU.auth.game().then(function (d) {
        if (!d || !d.id) return;
        var antes = jogo ? jogo.coins : null;
        jogo = d; renderAcc();
        if (antes != null && d.coins > antes) PWU.toast('Coins creditados na sua conta!', 'ok');
        else if (tries > 0) setTimeout(function () { puxarJogo(tries - 1); }, 4000);
      }).catch(function () {});
    }

    renderAcc();
    puxarJogo(pg ? 8 : 0);
    refreshCoins(0);
    if (!PWU.auth.user) setTimeout(function () { PWU.auth.open('login'); }, 500);
    document.addEventListener('auth:change', function () { renderAcc(); refreshCoins(0); });
  }

  /* contador do rodapé */
  document.querySelectorAll('.site-footer .count').forEach(function (el) {
    if (!G) return;
    ScrollTrigger.create({ trigger: el, start: 'top 95%', once: true, onEnter: function () {
      var o = { v: 0 }; G.to(o, { v: +el.dataset.count, duration: 2, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('pt-BR'); } });
    } });
  });

  reveal();
  window.addEventListener('load', function () { if (G) ScrollTrigger.refresh(); });
})();
