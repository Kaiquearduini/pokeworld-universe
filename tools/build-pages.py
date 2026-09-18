#!/usr/bin/env python3
"""Gera as subpáginas estáticas do site (site/*.html) a partir de um template único.
Uso: python3 tools/build-pages.py
"""
import os, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site"
AQUI = pathlib.Path(__file__).resolve().parent

# Documento legal completo (termos, serviços pagos, regras do jogo e cookies).
# Editar em tools/regras-conteudo.html e rodar este script de novo.
REGRAS_HTML = (AQUI / "regras-conteudo.html").read_text(encoding="utf-8")

NAV = [
    ("o-jogo.html", "O JOGO"),
    ("wiki.html", "wiki"),
    ("download.html", "download"),
    ("ranking.html", "ranking"),
    ("loja.html", "loja"),
    ("doar.html", "doar"),
]

def nav_html(active):
    ativo = ' class="is-active"'
    return "".join(
        '<a href="%s"%s>%s</a>' % (href, ativo if href == active else "", label)
        for href, label in NAV
    )

FOOTER = """
  <footer class="site-footer">
    <div class="wrap">
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <img src="assets/logo-sigla.png" alt="Pokeworld Universe">
          <p>Pokeworld Universe é um jogo online moderno para explorar mundos incríveis, colecionar criaturas únicas e batalhar com treinadores do mundo todo.</p>
          <div class="site-footer__social">
            <a href="#" aria-label="Discord"><img src="assets/social-discord.png" alt="" style="object-fit:cover;width:100%;height:100%"></a>
            <a href="#" aria-label="Instagram"><img src="assets/social-instagram.svg" alt=""></a>
          </div>
        </div>
        <div>
          <h4>Jogo</h4>
          <ul><li><a href="o-jogo.html">Sobre o jogo</a></li><li><a href="wiki.html">Pokédex</a></li><li><a href="ranking.html">Ranking</a></li><li><a href="loja.html">Loja</a></li></ul>
        </div>
        <div>
          <h4>Suporte</h4>
          <ul><li><a href="download.html">Baixar</a></li><li><a href="download.html#faq">Perguntas frequentes</a></li><li><a href="minha-conta.html">Minha conta</a></li><li><a href="doar.html#pacotes">Doar</a></li><li><a href="regras.html">Regras</a></li><li><a href="admin.html">Painel admin</a></li></ul>
        </div>
        <div>
          <h4>Baixe agora</h4>
          <div class="site-footer__baixar">
            <a class="btn btn--yellow btn--sm" href="download.html">Baixar o launcher</a>
            <a class="baixar-alt" href="download.html">Android · APK</a>
          </div>
        </div>
      </div>
      <div class="site-footer__bar">
        <div class="stat"><img class="stat__icon stat__icon--gamepad" src="assets/icon-gamepad.svg" alt=""><span><b class="count" data-count="1342321">1.342.321</b> jogadores online</span></div>
        <span>© 2026 Pokeworld Universe. Projeto de demonstração, sem afiliação com The Pokémon Company.</span>
      </div>
    </div>
  </footer>
"""

def layout(slug, title, desc, banner, body, extra_head="", extra_bottom=""):
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Pokeworld Universe</title>
  <meta name="description" content="{desc}">
  <link rel="icon" href="assets/logo-sigla.png">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="pages.css">{extra_head}
</head>
<body data-page="{slug}">
<div class="scroll-progress" aria-hidden="true"></div>
<div class="cursor" aria-hidden="true"><div class="cursor__ring"></div><div class="cursor__dot"></div></div>
<div class="page page--sub">

  <header class="topbar">
    <div class="header-shape header-shape--white"></div>
    <div class="header-shape header-shape--grad"></div>
    <a class="logo-sigla" href="index.html"><img src="assets/logo-sigla.png" alt="PWU"></a>
    <nav class="nav">{nav_html(slug + ".html")}</nav>
    <div class="topbar-actions">
      <a class="btn-entrar" href="login.html" data-entrar>Iniciar sessão</a>
      <a class="btn-jogue-agora" href="download.html">JOGUE AGORA</a>
    </div>
    <button class="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
  </header>

  <section class="banner{(' banner--blend') if banner.get('blend') else ''}{(' banner--solo') if not banner.get('art') else ''}" style="--bg:url('{banner['bg']}')">
    <span class="banner__glow" aria-hidden="true"></span>
    <span class="banner__mesh" aria-hidden="true"></span>
    <span class="banner__ball" aria-hidden="true"></span>
    <div class="banner__inner">
      <nav class="banner__crumb" aria-label="Você está em"><a href="index.html">Início</a><i aria-hidden="true"></i><span>{banner.get('crumb', title)}</span></nav>
      <span class="banner__tag">{banner['tag']}</span>
      <h1 class="banner__title"{(' data-text="' + slug + '.banner.title"') if banner.get('editable') else ''}>{banner['title']}</h1>
      <p class="banner__sub"{(' data-text="' + slug + '.banner.sub"') if banner.get('editable') else ''}>{banner['sub']}</p>{banner.get('selos','')}
    </div>{('<div class="banner__stage' + (' banner__stage--duo' if banner.get('art2') else '') + '">' + (('<img class="banner__art banner__art--2" src="' + banner['art2'] + '" alt="">') if banner.get('art2') else '') + '<img class="banner__art" src="' + banner['art'] + '" alt=""></div>') if banner.get('art') else ''}
  </section>

  <main class="sub">
{body}
  </main>
{FOOTER}
</div>
{extra_bottom}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="data.js"></script>
<script src="store.js"></script>
<script src="ui.js"></script>
<script src="pages.js"></script>
</body>
</html>
"""

LIGHTBOX = """
<div class="lightbox" id="lightbox" hidden>
  <button class="lightbox__close" type="button" aria-label="Fechar">×</button>
  <img class="lightbox__img" src="" alt="">
</div>"""

PAGES = {}

# ---------------------------------------------------------------- O JOGO
PAGES["o-jogo"] = dict(
    title="O Jogo",
    desc="Conheça o Pokeworld Universe: MOBA de Pokémon em equipes de 5, com cross-play entre celular, PC e Nintendo Switch.",
    banner=dict(bg="assets/img/bg/champions-arena.jpg", tag="Sobre o jogo", title="Um universo<br>para batalhar",
                sub="Forme seu time de cinco treinadores, escolha seu Pokémon e dispute arenas em partidas rápidas de 10 minutos.",
                art="assets/img/art/player-girl.png", art2="assets/img/art/trainer-amarela.png"),
    extra_bottom=LIGHTBOX,
    body="""
    <section class="sec">
      <div class="wrap intro">
        <div class="intro__text" data-reveal>
          <h2 class="sec__title">O que é o <span class="grad">Pokeworld Universe</span></h2>
          <p data-text="ojogo.intro.p1">Pokeworld Universe é um jogo online de batalhas em equipe. Dois times de cinco treinadores disputam uma arena, derrotam Pokémon selvagens, acumulam energia e marcam pontos nos gols adversários antes do tempo acabar.</p>
          <p data-text="ojogo.intro.p2">Cada Pokémon evolui durante a partida e desbloqueia novos golpes. A sinergia entre funções, o controle dos objetivos e a comunicação decidem quem sai vitorioso.</p>
          <div class="btn-row" style="margin-top:3rem">
            <a class="btn btn--yellow" href="download.html">Jogar grátis</a>
            <a class="btn btn--black" href="wiki.html">Ver Pokédex</a>
          </div>
        </div>
        <div class="intro__art" data-reveal>
          <img src="assets/img/art/screenshot-1.jpg" alt="Arena do Pokeworld Universe">
          <img class="float" src="assets/img/art/pikachu.png" alt="">
        </div>
      </div>
      <div class="wrap stats-row">
        <div class="stat-box" data-reveal><b data-count="69">0</b><span>Pokémon jogáveis</span></div>
        <div class="stat-box" data-reveal><b data-count="1342321">0</b><span>Jogadores online</span></div>
        <div class="stat-box" data-reveal><b data-count="4">0</b><span>Plataformas com cross-play</span></div>
        <div class="stat-box" data-reveal><b data-count="10" data-suffix=" min">0</b><span>Duração média da partida</span></div>
      </div>
    </section>

    <section class="sec sec--white">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Modos de <span class="grad">jogo</span></h2><p class="sec__sub">Do competitivo ranqueado às salas personalizadas com amigos.</p></div></div>
        <div class="modes">
          <a class="mode" href="ranking.html" data-reveal><img src="assets/img/art/screenshot-2.jpg" alt=""><div class="mode__body"><span class="mode__tag">Competitivo</span><h3>Ranqueada 5x5</h3><p>Suba de Iniciante a Mestre e garanta recompensas de temporada.</p></div></a>
          <a class="mode" href="download.html" data-reveal><img src="assets/img/art/screenshot-3.jpg" alt=""><div class="mode__body"><span class="mode__tag">Casual</span><h3>Batalha Rápida</h3><p>Partidas de 5 minutos em mapas menores, ideais para aquecer.</p></div></a>
          <a class="mode" href="noticia.html?id=modo-batalha-privada" data-reveal><img src="assets/img/art/screenshot-4.jpg" alt=""><div class="mode__body"><span class="mode__tag">Personalizado</span><h3>Batalha Privada</h3><p>Crie salas com regras próprias, espectadores e códigos de convite.</p></div></a>
        </div>
      </div>
    </section>

    <section class="sec sec--dark">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Sistemas do <span class="grad">jogo</span></h2><p class="sec__sub">Tudo o que faz o Pokeworld Universe ser diferente.</p></div></div>
        <div class="features">
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Mundo livre para explorar</h3><p>Voe pelo mapa, use montarias e descubra cidades construídas do zero, como Lumiose City, com torre central, bairros e hunts espalhadas pela cidade.</p></div>
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Ascensão estelar e evolução</h3><p>Leve seu pokémon além da forma final com a ascensão estelar, subindo estrelas para desbloquear poder. Com evolução por pedras, helds e boost, o time fica do jeito que você montar.</p></div>
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Guildas com bosses e buffs</h3><p>Junte seu grupo, encare bosses exclusivos de guilda e libere buffs que valem para todos os membros. Quanto mais ativa a guilda, mais forte cada treinador fica.</p></div>
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Ranking de treinadores</h3><p>Quem está no topo do servidor aparece aqui: level, catches, conquistas e a disputa entre guildas.</p></div>
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Tasks e conquistas progressivas</h3><p>Complete tarefas diárias e por região para avançar em trilhas de recompensa. Quanto mais longe você chega, melhores os itens e as liberações.</p></div>
          <div class="feature" data-reveal><img class="feature__icon" src="assets/d-sys-icon.svg" alt=""><h3>Battle Pass exclusivo</h3><p>Cada temporada traz um passe com níveis de recompensa: cosméticos, itens e addons que só aparecem ali. Joga, sobe os níveis e leva o que a temporada oferece.</p></div>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Conheça os <span class="grad">Pokémon</span></h2><p class="sec__sub">69 Pokémon jogáveis, cada um com seu estilo de batalha.</p></div><a class="sec__link" href="wiki.html">Ver todos →</a></div>
      </div>
      <div class="pk-marquee" data-reveal><div class="pk-marquee__track"></div></div>
    </section>

    <section class="sec sec--white">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Galeria</h2><p class="sec__sub">Clique para ampliar.</p></div></div>
        <div class="gallery-grid">
          <a href="assets/img/art/screenshot-1.jpg" data-lightbox data-reveal><img src="assets/img/art/screenshot-1.jpg" alt=""></a>
          <a href="assets/img/art/screenshot-2.jpg" data-lightbox data-reveal><img src="assets/img/art/screenshot-2.jpg" alt=""></a>
          <a href="assets/img/art/trailer-thumb.jpg" data-lightbox data-reveal><img src="assets/img/art/trailer-thumb.jpg" alt=""></a>
          <a href="assets/img/art/screenshot-3.jpg" data-lightbox data-reveal><img src="assets/img/art/screenshot-3.jpg" alt=""></a>
          <a href="assets/img/art/update-thumb.jpg" data-lightbox data-reveal><img src="assets/img/art/update-thumb.jpg" alt=""></a>
          <a href="assets/img/bg/battle-map.jpg" data-lightbox data-reveal><img src="assets/img/bg/battle-map.jpg" alt=""></a>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <img class="cta-band__pk cta-band__pk--l" src="assets/img/art/charizard.png" alt="">
      <img class="cta-band__pk cta-band__pk--r" src="assets/img/art/greninja.png" alt="">
      <div class="wrap" data-reveal>
        <h2>Pronto para a sua primeira batalha?</h2>
        <p>Crie sua conta, baixe o jogo e entre na arena. É grátis.</p>
        <div class="btn-row"><a class="btn btn--yellow" href="#" data-auth="register">Criar conta</a><a class="btn btn--black" href="download.html">Baixar agora</a></div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- NOTÍCIAS
PAGES["noticias"] = dict(
    title="Notícias",
    desc="Últimas notícias, atualizações e eventos do Pokeworld Universe.",
    banner=dict(bg="assets/img/bg/unite-city.jpg", tag="Central de notícias", editable=True, title="Últimas<br>notícias",
                sub="Atualizações, balanceamento, eventos e tudo o que acontece no Pokeworld."),
    body="""
    <section class="sec">
      <div class="wrap">
        <div class="sec__head">
          <div class="chips">
            <button class="chip is-active" type="button" data-filter="todas">Todas</button>
            <button class="chip" type="button" data-filter="Atualização">Atualizações</button>
            <button class="chip" type="button" data-filter="Evento">Eventos</button>
            <button class="chip" type="button" data-filter="Novidade">Novidades</button>
            <button class="chip" type="button" data-filter="Comunidade">Comunidade</button>
          </div>
        </div>
        <div class="news-featured" id="news-featured"></div>
        <div class="news-grid" id="news-grid"></div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- ARTIGO
PAGES["noticia"] = dict(
    title="Notícia",
    desc="Notícia do Pokeworld Universe.",
    banner=dict(bg="assets/img/bg/news-pattern.png", tag="Notícia", title="Central de<br>notícias",
                sub="Fique por dentro de tudo o que acontece no Pokeworld."),
    body="""
    <section class="sec">
      <div class="wrap article">
        <article id="article"></article>
        <aside class="aside">
          <h4>Mais notícias</h4>
          <div id="related" style="display:flex;flex-direction:column;gap:2rem"></div>
          <a class="btn btn--black btn--sm" href="noticias.html">Ver todas</a>
        </aside>
      </div>
    </section>
""")

# ---------------------------------------------------------------- DOWNLOAD
PAGES["download"] = dict(
    title="Download",
    desc="Baixe o Pokeworld Universe para iOS, Android, Nintendo Switch e PC.",
    banner=dict(bg="assets/img/bg/stadium-light.jpg", tag="Grátis para jogar", title="Baixe e<br>jogue agora",
                sub="Baixe o launcher no PC ou o APK no Android. A conta e o progresso são os mesmos nos dois.",
                art="assets/img/art/player-boy.png", art2="assets/img/art/blastoise.png",
                selos='<div class="banner__selos"><span><i></i>Grátis para sempre</span><span><i></i>PC e Android</span><span><i></i>Mesma conta nos dois</span></div>'),
    body="""
    <section class="sec">
      <div class="wrap">
        <div class="platforms">
          <div class="platform platform--destaque" data-reveal><span class="platform__ribbon">Recomendado</span><div class="platform__icon">💻</div><h3>PC</h3><p>Windows 10 e 11 de 64 bits. O launcher instala o jogo e mantém ele atualizado sozinho.</p><span class="size" id="size-pc">v12.0.1</span><a class="btn btn--yellow" href="#" id="dl-pc" data-require-auth>Baixar o launcher</a></div>
          <div class="platform" data-reveal><div class="platform__icon">🤖</div><h3>Android</h3><p>Android 9 ou superior com 3 GB de RAM. Instale o APK e entre com a mesma conta.</p><span class="size" id="size-android">v12.0.1</span><a class="btn btn--lime" href="#" id="dl-android" data-require-auth>Baixar o APK</a></div>
        </div>
      </div>
    </section>

    <section class="sec sec--dark">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Como <span class="grad">instalar</span></h2><p class="sec__sub">Três passos e você está na arena.</p></div></div>
        <div class="steps">
          <div class="step" data-reveal><h3>Crie sua conta Pokeworld</h3><p>Use seu e-mail para criar uma conta gratuita. É ela que guarda seu progresso em todas as plataformas.</p></div>
          <div class="step" data-reveal><h3>Baixe o jogo</h3><p>Escolha sua plataforma acima. O download inicial é leve e o restante do conteúdo é baixado dentro do jogo.</p></div>
          <div class="step" data-reveal><h3>Entre e complete o tutorial</h3><p>O tutorial leva 5 minutos e já libera seu primeiro Pokémon e 2.000 moedas Aeos.</p></div>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="wrap--narrow">
        <div class="sec__head"><div><h2 class="sec__title">Requisitos <span class="grad">mínimos</span></h2></div></div>
        <table class="req" data-reveal>
          <thead><tr><th>Plataforma</th><th>Sistema</th><th>Memória</th><th>Armazenamento</th></tr></thead>
          <tbody>
            <tr><td>iOS</td><td>iOS 15+</td><td>3 GB</td><td>4 GB livres</td></tr>
            <tr><td>Android</td><td>Android 9+</td><td>3 GB</td><td>4 GB livres</td></tr>
            <tr><td>Nintendo Switch</td><td>Firmware 16+</td><td>—</td><td>4 GB livres</td></tr>
            <tr><td>PC</td><td>Windows 10 64 bits</td><td>8 GB</td><td>8 GB livres · GTX 1050</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="sec sec--white" id="faq">
      <div class="wrap--narrow">
        <div class="sec__head"><div><h2 class="sec__title">Perguntas <span class="grad">frequentes</span></h2></div></div>
        <div class="faq">
          <details data-reveal><summary>O jogo é realmente gratuito?</summary><p>Sim. Todos os modos e Pokémon podem ser obtidos jogando. As compras opcionais são cosméticas ou aceleram o progresso.</p></details>
          <details data-reveal><summary>Meu progresso é compartilhado entre plataformas?</summary><p>Sim. Ao vincular sua conta Pokeworld, itens, Pokémon, amigos e ranking são sincronizados em todas as plataformas.</p></details>
          <details data-reveal><summary>Posso jogar com amigos em outras plataformas?</summary><p>Sim. O cross-play é completo: jogadores de Switch, celular e PC compartilham as mesmas filas.</p></details>
          <details data-reveal><summary>Preciso de internet para jogar?</summary><p>Sim, todas as partidas acontecem online. Recomendamos uma conexão estável de pelo menos 5 Mbps.</p></details>
        </div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- RANKING
PAGES["ranking"] = dict(
    title="Ranking",
    desc="Rankings do Pokeworld Universe: experiência, ganho de experiência, mortes e guildas.",
    banner=dict(bg="assets/img/bg/stadium-blue.jpg", tag="Temporada 12", blend=True, title="Os melhores<br>treinadores",
                sub="Quatro rankings, troféus exclusivos e a disputa pelo topo do servidor.",
                art="assets/img/art/volkner.png", art2="assets/img/trophies/tier-1.png"),
    body="""
    <section class="sec rank-sec">
      <div class="wrap">
        <div class="season" data-reveal>
          <div><b>Temporada 12 · Aurora</b><br><span id="rank-updated">Estatísticas atualizadas hoje. Cumulativo até agora.</span></div>
          <div class="season__timer"><div><b id="t-d">0</b><small>dias</small></div><div><b id="t-h">00</b><small>horas</small></div><div><b id="t-m">00</b><small>min</small></div></div>
        </div>

        <div class="rank-cats" id="rank-cats"></div>

        <div class="rank-tools">
          <p class="sec__sub" id="rank-desc"></p>
          <label class="search">🔍 <input id="rank-search" type="search" placeholder="Buscar treinador ou guilda"></label>
        </div>

        <div class="trophy-legend" data-reveal>
          <span>Troféus da temporada</span>
          <div id="trophy-legend"></div>
        </div>

        <div class="rank-list" id="rank-list"></div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- LOJA
PAGES["loja"] = dict(
    title="Loja",
    desc="Loja do Pokeworld Universe: Pokémon, holo-trajes, gemas e Passe de Aventura.",
    banner=dict(bg="assets/img/bg/sky.jpg", tag="Loja oficial", title="Loja<br>Pokeworld",
                sub="Novos Pokémon, holo-trajes exclusivos e o Passe de Aventura da temporada.", art="assets/img/art/charizard.png"),
    body="""
    <section class="sec">
      <div class="wrap">
        <div class="sec__head">
          <div class="chips">
            <button class="chip is-active" type="button" data-filter="todos">Todos</button>
            <button class="chip" type="button" data-filter="pokemon">Pokémon</button>
            <button class="chip" type="button" data-filter="traje">Holo-trajes</button>
            <button class="chip" type="button" data-filter="gemas">Gemas</button>
            <button class="chip" type="button" data-filter="passe">Passe</button>
          </div>
          <div class="wallet"><div><img class="coin" src="assets/img/coins/pcoin.png" alt=""><b>24.500</b> créditos</div><div><i class="gem"></i><b>380</b> gemas</div></div>
        </div>
        <div class="shop-gate" id="shop-gate" hidden>
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para acessar a loja</h3>
            <p>Você precisa estar conectado à sua conta Pokeworld para ver e comprar itens.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="#" data-auth="login">Iniciar sessão</a><a class="btn btn--ghost" href="#" data-auth="register">Criar conta</a></div>
          </div>
        </div>
        <div class="shop-grid" id="shop-grid"></div>
      </div>
    </section>
""",
    extra_bottom="""
<button class="cart-fab" id="cart-fab" type="button">🛒 Carrinho <b>0</b></button>
<aside class="cart" id="cart">
  <div class="cart__head">Seu carrinho <button type="button" data-cart-close aria-label="Fechar">×</button></div>
  <div class="cart__list"></div>
  <div class="cart__foot"><div class="cart__total"><span>Total</span><b>R$ 0,00</b></div><button class="btn btn--yellow" type="button" data-checkout>Finalizar compra</button></div>
</aside>""")

# ---------------------------------------------------------------- WIKI
PAGES["wiki"] = dict(
    title="Wiki",
    desc="Pokédex do Pokeworld Universe: funções, alcance, dificuldade e estatísticas de todos os Pokémon.",
    banner=dict(bg="assets/img/bg/battle-map.jpg", tag="Pokédex", editable=True, title="Todos os<br>Pokémon",
                sub="Funções, alcance, dificuldade e estatísticas de cada um dos 69 Pokémon jogáveis.", art="assets/img/art/gengar.png"),
    body="""
    <section class="sec">
      <div class="wrap">
        <div class="dex-tools">
          <div class="chips">
            <button class="chip is-active" type="button" data-role="todos">Todos</button>
            <button class="chip" type="button" data-role="atacante">Atacante</button>
            <button class="chip" type="button" data-role="versatil">Versátil</button>
            <button class="chip" type="button" data-role="defensor">Defensor</button>
            <button class="chip" type="button" data-role="suporte">Suporte</button>
            <button class="chip" type="button" data-role="velocista">Velocista</button>
          </div>
          <label class="search">🔍 <input id="dex-search" type="search" placeholder="Buscar Pokémon"></label>
        </div>
        <p class="sec__sub" style="margin-bottom:2rem;display:flex;justify-content:space-between;align-items:center;gap:2rem"><span><b id="dex-count">0</b> Pokémon encontrados</span><a class="btn btn--black btn--sm" href="admin.html?tab=pokemon">Painel admin</a></p>
        <div class="dex-grid" id="dex-grid"></div>
      </div>
    </section>
""",
    extra_bottom="""
<div class="dex-modal" id="dex-modal" hidden><div class="dex-modal__bd"></div><div class="dex-modal__card"></div></div>""")


# ---------------------------------------------------------------- MINHA CONTA
PAGES["minha-conta"] = dict(
    title="Minha Conta",
    desc="Sua conta Pokeworld Universe: dados, treinadores, doações e segurança.",
    banner=dict(bg="assets/img/bg/stadium-blue.jpg", tag="Área do treinador", blend=True, title="Minha<br>conta",
                sub="Gerencie seus dados, seus treinadores e apoie o servidor.", art="assets/img/art/player-boy.png"),
    body="""
    <section class="sec acc-sec">
      <div class="wrap--narrow">
        <div class="shop-gate" id="acc-gate" hidden style="margin-bottom:0">
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para ver sua conta</h3>
            <p>Faça login ou crie sua conta Pokeworld para acessar esta área.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="#" data-auth="login">Iniciar sessão</a><a class="btn btn--ghost" href="#" data-auth="register">Criar conta</a></div>
          </div>
        </div>

        <div id="acc" hidden>
          <div class="acc-alert" id="acc-alert" hidden></div>

          <article class="acc-card" data-reveal>
            <div class="acc-top">
              <div class="acc-avatar">
                <img id="acc-avatar" src="assets/img/pokemon/pikachu.png" alt="Foto de perfil">
                <a class="acc-avatar__edit" href="perfil.html" aria-label="Trocar foto">Trocar foto</a>
              </div>
              <h2 class="acc-card__title">Minha <span class="grad grad--yellow">conta</span></h2>
            </div>
            <div class="acc-grid">
              <div>
                <div class="acc-field">
                  <div class="acc-field__head"><h5>Nome de usuário</h5><button type="button" class="acc-toggle" data-toggle="name">mostrar</button></div>
                  <input type="text" readonly id="acc-name" value=" *  *  *  *  *">
                </div>
                <div class="acc-field">
                  <div class="acc-field__head"><h5>E-mail</h5><button type="button" class="acc-toggle" data-toggle="email">mostrar</button></div>
                  <input type="text" readonly id="acc-email" value=" *  *  *  *  *">
                </div>
              </div>
              <div class="acc-side">
                <div class="acc-stat acc-stat--moeda"><img src="assets/img/coins/pcoin.png" alt=""><div><b id="acc-diamonds">0</b><span>Créditos · <a href="#coins" class="acc-buy-link">+ Comprar</a></span></div></div>
                <div class="acc-stat"><b id="acc-plan">Conta Grátis</b><span>Plano</span></div>
              </div>
            </div>
            <div class="acc-actions">
              <a class="btn btn--lime btn--sm" href="tickets.html">Tickets</a>
              <a class="btn btn--yellow btn--sm" href="doar.html#pacotes">Efetuar doação</a>
              <a class="btn btn--black btn--sm" href="seguranca.html">Segurança</a>
              <a class="btn btn--twitch btn--sm" href="seguranca.html#twitch">Vincular Twitch</a>
              <button type="button" class="btn btn--danger btn--sm" data-acc="logout">Sair</button>
            </div>
          </article>

          <article class="acc-card" id="coins" data-reveal>
            <div class="acc-card__head">
              <h2 class="acc-card__title">Efetuar <span class="grad grad--yellow">doação</span></h2>
              <a class="btn btn--yellow btn--sm" href="doar.html#pacotes">Efetuar doação</a>
            </div>
            <div class="packs" id="acc-packs"></div>
          </article>

          <article class="acc-card" data-reveal>
            <div class="acc-card__head">
              <h2 class="acc-card__title">Meus <span class="grad grad--yellow">treinadores</span> <small id="acc-tcount">(0)</small></h2>
              <button type="button" class="btn btn--ghost btn--sm" data-acc="new-trainer">+ Novo treinador</button>
            </div>
            <div class="trainers" id="acc-trainers"></div>
          </article>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <img class="cta-band__pk cta-band__pk--l" src="assets/img/art/charizard.png" alt="">
      <img class="cta-band__pk cta-band__pk--r" src="assets/img/art/greninja.png" alt="">
      <div class="wrap" data-reveal>
        <h2>Aventuras lendárias te esperam</h2>
        <p>Entre no mundo Pokémon e seja o melhor. Baixe o cliente e jogue agora.</p>
        <div class="btn-row"><a class="btn btn--yellow" href="download.html">Jogue agora!</a><a class="btn btn--black" href="https://discord.gg/pokeworlduniverse" target="_blank" rel="noopener">Entrar no Discord</a></div>
      </div>
    </section>
""",
    extra_bottom="""
<div class="pmodal" id="pmodal" hidden><div class="pmodal__bd" data-pclose></div><div class="pmodal__card"><button class="pmodal__close" type="button" data-pclose aria-label="Fechar">×</button><div id="pmodal-body"></div></div></div>""")

# ---------------------------------------------------------------- DOAR
PAGES["doar"] = dict(
    title="Doar",
    desc="Apoie o Pokeworld Universe e receba créditos com bônus. Pix, boleto ou cartão.",
    banner=dict(bg="assets/img/bg/stadium-blue.jpg", tag="Apoie o servidor", blend=True,
                title="Doe e ganhe<br><span class=\"grad grad--yellow\">mais créditos</span>",
                sub="Sua doação paga os servidores, o desenvolvimento e os eventos. Quanto maior o pacote, maior o bônus que volta pra você em créditos.",
                art="assets/img/art/charizard.png",
                selos='<div class="banner__selos"><span><i></i>Créditos na conta em segundos</span><span><i></i>Pix, boleto ou cartão</span><span><i></i>Até 30% de bônus</span></div>'),
    body="""
    <section class="sec sec--dark sec--textura" id="pacotes">
      <div class="wrap">
        <div class="sec__head"><div><h2 class="sec__title">Escolha seu <span class="grad grad--yellow">pacote</span></h2><p class="sec__sub">Clique no valor e escolha entre Mercado Pago ou Stripe. Os créditos caem na sua conta do jogo em segundos.</p></div></div>
        <div class="packs packs--3" id="doar-packs"></div>
      </div>
    </section>

    <section class="cta-band">
      <img class="cta-band__pk cta-band__pk--l" src="assets/img/art/pikachu.png" alt="">
      <img class="cta-band__pk cta-band__pk--r" src="assets/img/art/gengar.png" alt="">
      <div class="wrap" data-reveal>
        <h2>Obrigado por apoiar o Pokeworld</h2>
        <p>Cada doação mantém o mundo no ar e acelera as próximas atualizações.</p>
        <div class="btn-row"><a class="btn btn--yellow" href="minha-conta.html#coins">Ver meus créditos</a><a class="btn btn--black" href="https://discord.gg/pokeworlduniverse" target="_blank" rel="noopener">Falar com a equipe</a></div>
      </div>
    </section>
""",
    extra_bottom="""
<div class="pmodal" id="pmodal" hidden><div class="pmodal__bd" data-pclose></div><div class="pmodal__card"><button class="pmodal__close" type="button" data-pclose aria-label="Fechar">×</button><div id="pmodal-body"></div></div></div>""")

# ---------------------------------------------------------------- TICKETS
PAGES["tickets"] = dict(
    title="Tickets",
    desc="Abra um chamado para a equipe do Pokeworld Universe.",
    banner=dict(bg="assets/img/bg/stadium-light.jpg", tag="Suporte", blend=True, title="Tickets",
                sub="Fale com a equipe. Respondemos pelo e-mail da sua conta."),
    body="""
    <section class="sec acc-sec">
      <div class="wrap--narrow">
        <div class="shop-gate" id="acc-gate" hidden style="margin-bottom:0">
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para continuar</h3>
            <p>Faça login na sua conta Pokeworld para acessar esta área.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="login.html">Iniciar sessão</a></div>
          </div>
        </div>
        <div id="acc" hidden>
          <a class="voltar" href="minha-conta.html">← Voltar para minha conta</a>
          <article class="acc-card">
            <h2 class="acc-card__title">Abrir <span class="grad grad--yellow">ticket</span></h2>
            <form id="f-ticket" novalidate style="margin-top:2.4rem">
              <label class="field"><span>Assunto</span><select name="subject"><option>Problema com a conta</option><option>Pagamento ou doação</option><option>Bug no jogo</option><option>Denúncia</option><option>Outro</option></select></label>
              <label class="field"><span>Mensagem</span><textarea name="message" rows="6" placeholder="Descreva o que aconteceu com o máximo de detalhes"></textarea></label>
              <p class="auth__error" hidden></p>
              <button class="auth__submit" type="submit"><span>Enviar ticket</span></button>
            </form>
          </article>
          <article class="acc-card">
            <h2 class="acc-card__title">Meus <span class="grad grad--yellow">chamados</span></h2>
            <div class="ticket-list" id="lista-tickets"></div>
          </article>
        </div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- SEGURANÇA
PAGES["seguranca"] = dict(
    title="Segurança",
    desc="Troque sua senha e gerencie os computadores autorizados na sua conta.",
    banner=dict(bg="assets/img/bg/battle-map.jpg", tag="Sua conta", blend=True, title="Segurança",
                sub="Senha, aparelhos autorizados e histórico de acesso."),
    body="""
    <section class="sec acc-sec">
      <div class="wrap--narrow">
        <div class="shop-gate" id="acc-gate" hidden style="margin-bottom:0">
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para continuar</h3>
            <p>Faça login na sua conta Pokeworld para acessar esta área.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="login.html">Iniciar sessão</a></div>
          </div>
        </div>
        <div id="acc" hidden>
          <a class="voltar" href="minha-conta.html">← Voltar para minha conta</a>

          <article class="acc-card">
            <h2 class="acc-card__title">Trocar <span class="grad grad--yellow">senha</span></h2>
            <p class="acc-card__sub">É a mesma senha que você usa para entrar no jogo.</p>
            <form id="f-sec" novalidate style="margin-top:2rem;max-width:52rem">
              <label class="field"><span>Senha atual</span><input type="password" name="current" autocomplete="current-password"></label>
              <label class="field"><span>Nova senha</span><input type="password" name="next" autocomplete="new-password"></label>
              <label class="field"><span>Confirmar nova senha</span><input type="password" name="confirm" autocomplete="new-password"></label>
              <p class="auth__error" hidden></p>
              <button class="auth__submit" type="submit"><span>Salvar nova senha</span></button>
            </form>
          </article>

          <article class="acc-card">
            <div class="acc-card__head">
              <h2 class="acc-card__title">Computadores <span class="grad grad--yellow">autorizados</span></h2>
              <span class="acc-card__hint" id="dev-status"></span>
            </div>
            <p class="acc-card__sub">Quando alguém entra na sua conta de um computador novo, mandamos um código de 6 dígitos para o seu e-mail. Sem o código, o acesso não é liberado.</p>
            <div class="devices" id="lista-aparelhos"></div>
          </article>
        </div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- FOTO DE PERFIL
PAGES["perfil"] = dict(
    title="Foto de perfil",
    desc="Escolha a foto de perfil da sua conta Pokeworld Universe.",
    banner=dict(bg="assets/img/bg/sky.jpg", tag="Sua conta", blend=True, title="Foto de perfil",
                sub="Escolha um parceiro para representar você no site."),
    body="""
    <section class="sec acc-sec">
      <div class="wrap--narrow">
        <div class="shop-gate" id="acc-gate" hidden style="margin-bottom:0">
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para continuar</h3>
            <p>Faça login na sua conta Pokeworld para acessar esta área.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="login.html">Iniciar sessão</a></div>
          </div>
        </div>
        <div id="acc" hidden>
          <a class="voltar" href="minha-conta.html">← Voltar para minha conta</a>
          <article class="acc-card">
            <div class="acc-top">
              <div class="acc-avatar"><img id="acc-avatar" src="assets/img/pokemon/pikachu.png" alt="Foto atual"></div>
              <div><h2 class="acc-card__title">Sua <span class="grad grad--yellow">foto</span></h2><p class="acc-card__sub" style="margin-top:.6rem">Clique em um parceiro para escolher.</p></div>
            </div>
            <div class="avatar-grid avatar-grid--page" id="grade-avatar" style="margin-top:2.6rem"></div>
            <form id="f-av" novalidate style="max-width:52rem">
              <label class="field"><span>Ou cole o endereço de uma imagem (https)</span><input type="url" name="url" placeholder="https://..."></label>
              <p class="auth__error" hidden></p>
              <button class="auth__submit" type="submit"><span>Salvar foto</span></button>
            </form>
          </article>
        </div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- PAGAMENTO
PAGES["pagamento"] = dict(
    title="Pagamento",
    desc="Escolha como pagar seus créditos do Pokeworld Universe.",
    banner=dict(bg="assets/img/bg/stadium-blue.jpg", tag="Checkout", blend=True, title="Como quer<br>pagar?",
                sub="Você é levado para o site do provedor. Nenhum dado de cartão passa pelo Pokeworld."),
    body="""
    <section class="sec acc-sec">
      <div class="wrap--narrow">
        <div class="shop-gate" id="acc-gate" hidden style="margin-bottom:0">
          <div class="shop-gate__card">
            <img src="assets/logo-sigla.png" alt="">
            <h3>Entre para continuar</h3>
            <p>Faça login na sua conta Pokeworld para acessar esta área.</p>
            <div class="btn-row" style="justify-content:center"><a class="btn btn--yellow" href="login.html">Iniciar sessão</a></div>
          </div>
        </div>
        <div id="acc" hidden>
          <a class="voltar" href="doar.html">← Escolher outro pacote</a>
          <article class="acc-card">
            <h2 class="acc-card__title">Seu <span class="grad grad--yellow">pedido</span></h2>
            <div class="resumo" id="resumo-pedido"></div>
            <h3 class="pay-title">Escolha o meio de pagamento <span>clique em uma das opções</span></h3>
            <div class="pay-ways" id="meios-pagamento">
              <button type="button" class="pay-way pay-way--mp" data-prov="mercadopago">
                <span class="pay-way__head"><b>Mercado Pago</b><i class="pay-way__seta" aria-hidden="true"></i></span>
                <span class="pay-way__li">Pix, boleto ou cartão</span>
                <span class="pay-way__li">Confirmação na hora</span>
              </button>
              <button type="button" class="pay-way pay-way--st" data-prov="stripe">
                <span class="pay-way__head"><b>Stripe</b><i class="pay-way__seta" aria-hidden="true"></i></span>
                <span class="pay-way__li">Cartão de crédito ou débito</span>
                <span class="pay-way__li">Aceita cartão internacional</span>
              </button>
            </div>
            <p class="mp-note">🔒 O pagamento acontece no site do provedor. Nenhum dado de cartão passa pelo Pokeworld.</p>
            <p class="mp-regras">** Ao gerar o QR Code você automaticamente declara aceitar <a href="regras.html" target="_blank" rel="noopener">as regras</a></p>
          </article>

          <article class="acc-card">
            <h2 class="acc-card__title">O que acontece <span class="grad grad--yellow">agora</span></h2>
            <ol class="passos">
              <li><b>1</b><div><strong>Escolha o meio de pagamento</strong><span>Mercado Pago para Pix, boleto e cartão. Stripe para cartão internacional.</span></div></li>
              <li><b>2</b><div><strong>Pague no site do provedor</strong><span>Você sai do Pokeworld e volta assim que terminar. Nenhum dado de cartão passa por aqui.</span></div></li>
              <li><b>3</b><div><strong>Bônus liberado na conta</strong><span>Assim que o pagamento é confirmado, o bônus entra na conta que está logada agora.</span></div></li>
            </ol>
          </article>
        </div>
      </div>
    </section>
""")

# ---------------------------------------------------------------- REGRAS
PAGES["regras"] = dict(
    title="Regras",
    desc="Termos de Uso, Contrato de Utilização, Termos de Serviços Pagos, Regras do Jogo e Política de Cookies do PokeWorld Universe.",
    banner=dict(bg="assets/img/bg/battle-map.jpg", tag="Documento oficial", blend=True, title="Termos e<br>regras",
                sub="Termos de Uso, serviços pagos, regras do jogo e política de cookies. Operado por Avante Labs LTDA."),
    body="""
    <section class="sec acc-sec legal">
""" + REGRAS_HTML + """
    </section>
""")

if __name__ == "__main__":
    for slug, cfg in PAGES.items():
        html = layout(slug, cfg["title"], cfg["desc"], cfg["banner"], cfg["body"],
                      cfg.get("extra_head", ""), cfg.get("extra_bottom", ""))
        (ROOT / f"{slug}.html").write_text(html, encoding="utf-8")
        print("ok", slug + ".html")
