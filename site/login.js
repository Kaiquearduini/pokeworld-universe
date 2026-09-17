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
    box.querySelectorAll('.login-form').forEach(function (f) { f.hidden = f.dataset.lform !== tab; });
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
    box.querySelectorAll('.login-form, .login-tabs').forEach(function (el) { el.hidden = true; });
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
    div.querySelector('#dev-voltar').addEventListener('click', function (e) { e.preventDefault(); div.remove(); box.querySelectorAll('.login-tabs').forEach(function (el) { el.hidden = false; }); trocar('login'); });
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

  // já logado? vai direto para a conta
  if (PWU.auth.user) location.replace(DESTINO);

  if (window.gsap) {
    gsap.from('.login-box', { y: 40, autoAlpha: 0, duration: .7, ease: 'power3.out' });
    gsap.from('.login-page__art', { y: 60, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power3.out' });
  }
})();
