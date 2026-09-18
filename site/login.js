/* =====================================================================
   POKEWORLD UNIVERSE — página /login
   Cadastro e login na conta do JOGO (tabela `accounts` do banco poke).
   Depois de entrar, vai para Minha Conta.
   ===================================================================== */
(function () {
  var box = document.getElementById('login-box');
  if (!box || !window.PWU) return;

  var DESTINO = 'minha-conta.html';
  var atual = 'login';

  function form(tab) { return box.querySelector('[data-lform="' + tab + '"]'); }
  function erro(f, msg) { var p = f.querySelector('.auth__error'); p.textContent = msg || ''; p.hidden = !msg; }

  function trocar(tab) {
    atual = tab;
    box.querySelectorAll('.login-tab').forEach(function (b) { b.classList.toggle('is-active', b.dataset.ltab === tab); });
    box.querySelectorAll('.login-form').forEach(function (f) { f.hidden = f.dataset.lform !== tab; f.classList.remove('is-oculto'); });
    box.querySelector('.login-tabs__ink').style.transform = 'translateX(' + (tab === 'login' ? 0 : 100) + '%)';
    var first = form(tab).querySelector('input');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  box.addEventListener('click', function (e) {
    var t = e.target;
    var tab = t.closest('[data-ltab]'); if (tab) return trocar(tab.dataset.ltab);
    var go = t.closest('[data-lgoto]'); if (go) { e.preventDefault(); return trocar(go.dataset.lgoto); }
    var eye = t.closest('.field__eye');
    if (eye) { var inp = eye.previousElementSibling; inp.type = inp.type === 'password' ? 'text' : 'password'; return; }
    if (t.closest('[data-terms]')) { e.preventDefault(); PWU.toast('Termos de Uso: demonstração. Substitua pelo link real.'); }
    if (t.closest('[data-lforgot]')) { e.preventDefault(); return telaRecuperar(form('login').email.value.trim()); }
  });

  // medidor de força da senha
  var pw = form('register').querySelector('[name="password"]');
  pw.addEventListener('input', function () {
    var v = pw.value, score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    box.querySelectorAll('.strength i').forEach(function (b, i) { b.className = i < score ? 'lvl-' + score : ''; });
  });

  box.querySelectorAll('.login-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = f.dataset.lform;
      var email = f.email.value.trim(), senha = f.password.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro(f, 'Digite um e-mail válido.');
      if (senha.length < 8) return erro(f, 'A senha precisa ter pelo menos 8 caracteres.');
      if (kind === 'register' && senha !== f.confirm.value) return erro(f, 'As senhas não coincidem.');
      if (!f.terms.checked) return erro(f, 'Você precisa aceitar os termos para continuar.');
      erro(f, '');

      var btn = f.querySelector('.auth__submit');
      btn.classList.add('is-loading'); btn.disabled = true;

      var p = kind === 'register' ? PWU.auth.api.register(email, senha) : PWU.auth.api.login(email, senha);
      p.catch(function (err) {
        if (!err.needsDevice) throw err;
        pedirCodigo(email, senha, err.email, err.message);
        var e2 = new Error(''); e2.tratado = true; throw e2;
      }).then(function (user) {
        PWU.auth.set(user);
        PWU.toast(kind === 'register' ? 'Conta criada! Já pode entrar no jogo.' : 'Bem-vindo de volta, treinador!', 'ok');
        setTimeout(function () { location.href = DESTINO; }, 700);
      }).catch(function (err) {
        if (!err.tratado) erro(f, err.message || 'Algo deu errado. Tente novamente.');
        btn.classList.remove('is-loading'); btn.disabled = false;
      });
    });
  });

  /* Computador novo: pede o código de 6 dígitos que foi para o e-mail. */
  function pedirCodigo(email, senha, emailMascarado, aviso) {
    esconderLogin(true);
    var antigo = box.querySelector('.device-step'); if (antigo) antigo.remove();
    var div = document.createElement('div');
    div.className = 'login-form device-step';
    div.innerHTML = '<div class="device-code"><h2 style="font:400 3.2rem/1 var(--bebas);margin-bottom:.8rem">Autorize este computador</h2>' +
      '<p style="font-size:1.5rem;color:rgba(255,255,255,.7);margin-bottom:2rem">' + (aviso || 'Enviamos um código de 6 dígitos') + (emailMascarado ? '<br><b>' + emailMascarado + '</b>' : '') + '</p>' +
      '<input id="dev-code" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">' +
      '<p class="auth__error" hidden style="margin-top:1.6rem"></p>' +
      '<button class="auth__submit" type="button" id="dev-ok" style="margin-top:1.8rem"><span>Autorizar e entrar</span></button>' +
      '<p class="auth__switch"><a href="#" id="dev-voltar">Tentar com outra conta</a></p></div>';
    box.appendChild(div);
    var campo = div.querySelector('#dev-code');
    campo.focus();
    campo.addEventListener('input', function () { campo.value = campo.value.replace(/\D/g, ''); });
    div.querySelector('#dev-voltar').addEventListener('click', function (e) { e.preventDefault(); div.remove(); esconderLogin(false); trocar('login'); });
    div.querySelector('#dev-ok').addEventListener('click', function () {
      var p2 = div.querySelector('.auth__error');
      if (campo.value.length !== 6) { p2.textContent = 'Digite os 6 dígitos.'; p2.hidden = false; return; }
      p2.hidden = true;
      var b = div.querySelector('#dev-ok'); b.classList.add('is-loading'); b.disabled = true;
      PWU.auth.api.confirmDevice(email, senha, campo.value).then(function (user) {
        PWU.auth.set(user);
        PWU.toast('Computador autorizado. Bem-vindo!', 'ok');
        setTimeout(function () { location.href = DESTINO; }, 700);
      }).catch(function (er) {
        p2.textContent = er.message || 'Código inválido.'; p2.hidden = false;
        b.classList.remove('is-loading'); b.disabled = false;
      });
    });
  }

  /* =========================================================
     Esqueci minha senha — dois passos na mesma tela:
     1) informa o e-mail e recebe um código de 6 dígitos
     2) digita o código e escolhe a senha nova
     ========================================================= */
  /* `hidden` sozinho não basta: o CSS das abas usa display:flex e vence o
     atributo. Por isso escondemos com uma classe própria. */
  function esconderLogin(esconder) {
    box.querySelectorAll('.login-form, .login-tabs, .login-perks').forEach(function (el) {
      if (!el.classList.contains('recover')) el.classList.toggle('is-oculto', !!esconder);
    });
  }

  function telaRecuperar(email) {
    esconderLogin(true);
    var antigo = box.querySelector('.recover'); if (antigo) antigo.remove();

    var el = document.createElement('div');
    el.className = 'login-form recover';
    el.innerHTML =
      '<div class="recover__head"><h2>Recuperar acesso</h2>' +
      '<p>Enviamos um código de 6 dígitos para o e-mail da sua conta. Ele vale por 15 minutos.</p></div>' +
      '<div class="recover__steps"><b class="is-on">1 · E-mail</b><i></i><b>2 · Nova senha</b></div>' +
      '<div data-rstep="1">' +
        '<label class="field"><span>E-mail da conta</span><input type="email" id="rc-email" autocomplete="email" placeholder="treinador@pokeworld.com"></label>' +
        '<p class="auth__error" hidden></p>' +
        '<button class="auth__submit" type="button" id="rc-enviar"><span>Enviar código</span></button>' +
      '</div>' +
      '<div data-rstep="2" hidden>' +
        '<div class="login-grid">' +
          '<label class="field"><span>Código do e-mail</span><input id="rc-code" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"></label>' +
          '<label class="field"><span>Nova senha</span><span class="field__pw"><input type="password" id="rc-pw" autocomplete="new-password" placeholder="Mínimo de 8 caracteres"><button type="button" class="field__eye" aria-label="Mostrar senha">👁</button></span></label>' +
          '<label class="field"><span>Confirmar nova senha</span><input type="password" id="rc-pw2" autocomplete="new-password" placeholder="Repita a senha"></label>' +
          '<ul class="login-dicas"><li>Pelo menos 8 caracteres</li><li>Misture maiúsculas e minúsculas</li><li>Inclua um número ou símbolo</li></ul>' +
        '</div>' +
        '<p class="auth__error" hidden></p>' +
        '<button class="auth__submit" type="button" id="rc-trocar"><span>Salvar nova senha</span></button>' +
        '<p class="auth__switch"><a href="#" id="rc-reenviar">Não chegou? Enviar outro código</a></p>' +
      '</div>' +
      '<p class="auth__switch"><a href="#" id="rc-voltar">← Voltar para o login</a></p>';
    box.appendChild(el);

    var passo1 = el.querySelector('[data-rstep="1"]');
    var passo2 = el.querySelector('[data-rstep="2"]');
    var campoEmail = el.querySelector('#rc-email');
    var campoCode = el.querySelector('#rc-code');
    if (email) campoEmail.value = email;
    campoEmail.focus();
    campoCode.addEventListener('input', function () { campoCode.value = campoCode.value.replace(/\D/g, ''); });
    el.addEventListener('click', function (e) {
      var eye = e.target.closest('.field__eye');
      if (eye) { var i = eye.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }
    });

    function aviso(dentro, msg) {
      var p = dentro.querySelector('.auth__error');
      p.textContent = msg || ''; p.hidden = !msg;
    }
    function ocupado(btn, sim) { btn.classList.toggle('is-loading', sim); btn.disabled = sim; }

    function enviar(btn) {
      var mail = campoEmail.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return aviso(passo1, 'Digite um e-mail válido.');
      aviso(passo1, ''); ocupado(btn, true);
      PWU.auth.api.forgot(mail).then(function () {
        ocupado(btn, false);
        passo1.hidden = true; passo2.hidden = false;
        el.querySelectorAll('.recover__steps b').forEach(function (b, i) { b.classList.toggle('is-on', i === 1); });
        PWU.toast('Se esse e-mail tiver conta, o código já está a caminho.', 'ok');
        campoCode.focus();
      }).catch(function (err) { ocupado(btn, false); aviso(passo1, err.message || 'Não consegui enviar o código.'); });
    }

    el.querySelector('#rc-enviar').addEventListener('click', function () { enviar(this); });
    campoEmail.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); enviar(el.querySelector('#rc-enviar')); } });
    el.querySelector('#rc-reenviar').addEventListener('click', function (e) {
      e.preventDefault();
      PWU.auth.api.forgot(campoEmail.value.trim())
        .then(function () { PWU.toast('Novo código enviado.', 'ok'); })
        .catch(function (err) { aviso(passo2, err.message); });
    });

    el.querySelector('#rc-trocar').addEventListener('click', function () {
      var btn = this;
      var codigo = campoCode.value, nova = el.querySelector('#rc-pw').value, rep = el.querySelector('#rc-pw2').value;
      if (codigo.length !== 6) return aviso(passo2, 'Digite os 6 dígitos do código.');
      if (nova.length < 8) return aviso(passo2, 'A senha precisa ter pelo menos 8 caracteres.');
      if (nova !== rep) return aviso(passo2, 'As senhas não coincidem.');
      aviso(passo2, ''); ocupado(btn, true);
      PWU.auth.api.reset(campoEmail.value.trim(), codigo, nova).then(function () {
        PWU.toast('Senha trocada! Já pode entrar.', 'ok');
        voltar(campoEmail.value.trim());
      }).catch(function (err) { ocupado(btn, false); aviso(passo2, err.message || 'Não consegui trocar a senha.'); });
    });

    el.querySelector('#rc-voltar').addEventListener('click', function (e) { e.preventDefault(); voltar(campoEmail.value.trim()); });

    function voltar(mail) {
      el.remove();
      esconderLogin(false);
      trocar('login');
      if (mail) form('login').email.value = mail;
      var senha = form('login').password; if (senha) senha.focus();
    }
  }

  // já logado? vai direto para a conta
  if (PWU.auth.user) location.replace(DESTINO);
  // link direto para a recuperação: /login.html?recuperar=1
  else if (/[?&]recuperar=1/.test(location.search)) telaRecuperar('');

  if (window.gsap) {
    gsap.from('.login-box', { y: 40, autoAlpha: 0, duration: .7, ease: 'power3.out' });
    gsap.from('.login-page__art', { y: 60, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power3.out' });
  }
})();
