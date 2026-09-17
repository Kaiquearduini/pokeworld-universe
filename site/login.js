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
      p.then(function (user) {
        PWU.auth.set(user);
        PWU.toast(kind === 'register' ? 'Conta criada! Já pode entrar no jogo.' : 'Bem-vindo de volta, treinador!', 'ok');
        setTimeout(function () { location.href = DESTINO; }, 700);
      }).catch(function (err) {
        erro(f, err.message || 'Algo deu errado. Tente novamente.');
        btn.classList.remove('is-loading'); btn.disabled = false;
      });
    });
  });

  // já logado? vai direto para a conta
  if (PWU.auth.user) location.replace(DESTINO);

  if (window.gsap) {
    gsap.from('.login-box', { y: 40, autoAlpha: 0, duration: .7, ease: 'power3.out' });
    gsap.from('.login-page__art', { y: 60, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power3.out' });
  }
})();
