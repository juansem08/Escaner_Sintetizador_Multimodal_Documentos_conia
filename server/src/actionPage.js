// Página propia para los enlaces de los correos de Firebase Authentication
// (verificar el correo y restablecer la contraseña), con el diseño de Clarify.
// En la consola de Firebase → Authentication → Plantillas → "Personalizar URL de acción"
// se pone https://<servidor>/auth/action. Firebase añade al enlace mode, oobCode, apiKey y lang.
// La página llama directamente a la API REST de Firebase Auth: el servidor no interviene.

export const actionPageHtml = /* html */ `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Clarify</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #F2F0EE; --surface: #FFFFFF; --muted-bg: #F6F4F2; --text: #151413; --muted: #77716C;
    --ink: #1B1A19; --on-ink: #FFFFFF; --accent: #E8603A; --accent-text: #C2481F;
    --success: #22A35A; --success-soft: #DDF3E8; --danger: #D23B2B; --danger-soft: #FDE3DF;
    --shadow: 0 18px 40px rgba(90, 58, 42, 0.10);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #121110; --surface: #1E1C1B; --muted-bg: #282524; --text: #F5F2EF; --muted: #A59E98;
      --ink: #F5F2EF; --on-ink: #151413; --accent: #FF7A4F; --accent-text: #FF9B74;
      --success: #4CD587; --success-soft: #173026; --danger: #FF7B6B; --danger-soft: #3D1D1A;
      --shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    background: var(--bg); color: var(--text);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 32px 16px;
  }
  main { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 24px; }
  .brand { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .brand-mark {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, #FFA374, #F26D45 55%, #D44E2A);
    display: grid; place-items: center; box-shadow: 0 8px 18px rgba(232, 87, 47, 0.35);
  }
  .brand-name { font-weight: 800; font-size: 24px; letter-spacing: -0.6px; }
  .card {
    background: var(--surface); border-radius: 28px; padding: 32px 24px; box-shadow: var(--shadow);
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px;
  }
  .icon {
    width: 84px; height: 84px; border-radius: 28px; display: grid; place-items: center; margin-bottom: 6px;
    background: linear-gradient(135deg, #FFA374, #F26D45 55%, #D44E2A); box-shadow: 0 12px 26px rgba(232, 87, 47, 0.35);
  }
  .icon.error { background: var(--danger-soft); box-shadow: none; }
  .icon svg { width: 38px; height: 38px; }
  h1 { margin: 0; font-size: 26px; line-height: 1.2; font-weight: 800; letter-spacing: -0.5px; }
  p { margin: 0; font-size: 15px; line-height: 1.55; color: var(--muted); font-weight: 500; }
  .email { color: var(--text); font-weight: 700; word-break: break-all; }
  .pill {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; padding: 10px 16px; border-radius: 999px;
    background: var(--success-soft); color: var(--success); font-weight: 700; font-size: 14px;
  }
  form { width: 100%; display: flex; flex-direction: column; gap: 14px; text-align: left; margin-top: 4px; }
  label { font-weight: 600; font-size: 14px; display: flex; flex-direction: column; gap: 8px; }
  input {
    font: inherit; font-size: 15px; font-weight: 500; color: var(--text); background: var(--muted-bg);
    border: 1.5px solid transparent; border-radius: 18px; padding: 16px 18px; outline: none; width: 100%;
  }
  input:focus { border-color: var(--accent); background: var(--surface); }
  button {
    font: inherit; font-weight: 700; font-size: 16px; border: 0; border-radius: 999px; min-height: 56px;
    background: var(--ink); color: var(--on-ink); cursor: pointer; margin-top: 4px;
  }
  button:disabled { opacity: 0.55; cursor: default; }
  .msg { display: none; width: 100%; text-align: left; padding: 12px 14px; border-radius: 16px; font-size: 14px; font-weight: 600; }
  .msg.show { display: block; }
  .msg.error { background: var(--danger-soft); color: var(--danger); }
  .spinner {
    width: 34px; height: 34px; border-radius: 50%; border: 3.5px solid var(--muted-bg); border-top-color: var(--accent);
    animation: spin 0.8s linear infinite; margin: 18px 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  footer { text-align: center; font-size: 13px; color: var(--muted); font-weight: 500; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <div class="brand">
    <div class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
    </div>
    <span class="brand-name">Clarify</span>
  </div>

  <section class="card" id="card">
    <div class="spinner" id="spinner" aria-hidden="true"></div>
    <div class="icon" id="icon" hidden></div>
    <h1 id="title"></h1>
    <p id="text"></p>
    <div class="pill" id="pill" hidden></div>

    <form id="form" hidden novalidate>
      <label><span id="l-new"></span><input id="pw1" type="password" autocomplete="new-password" minlength="8" required></label>
      <label><span id="l-confirm"></span><input id="pw2" type="password" autocomplete="new-password" minlength="8" required></label>
      <div class="msg error" id="form-error" role="alert"></div>
      <button type="submit" id="submit"></button>
    </form>
  </section>

  <footer id="footer"></footer>
</main>

<script>
(function () {
  var params = new URLSearchParams(location.search);
  var mode = params.get('mode');
  var oobCode = params.get('oobCode');
  var apiKey = params.get('apiKey');
  var lang = (params.get('lang') || navigator.language || 'es').toLowerCase().indexOf('en') === 0 ? 'en' : 'es';
  document.documentElement.lang = lang;

  var T = {
    es: {
      checking: 'Comprobando el enlace…',
      verifiedTitle: '¡Correo verificado!',
      verifiedText: 'Tu cuenta de Clarify ya está activa.',
      verifiedPill: 'Vuelve a la app: entrará automáticamente',
      recoveredTitle: 'Correo restaurado',
      recoveredText: 'Tu cuenta vuelve a usar su correo anterior. Si no pediste el cambio, cambia tu contraseña desde la app.',
      resetTitle: 'Nueva contraseña',
      resetText: 'Elige una contraseña nueva para',
      newPassword: 'Nueva contraseña',
      confirmPassword: 'Confirmar contraseña',
      save: 'Guardar contraseña',
      saving: 'Guardando…',
      resetDoneTitle: '¡Contraseña actualizada!',
      resetDoneText: 'Ya puedes iniciar sesión en Clarify con tu nueva contraseña.',
      resetDonePill: 'Vuelve a la app para entrar',
      short: 'La contraseña debe tener al menos 8 caracteres.',
      mismatch: 'Las contraseñas no coinciden.',
      weak: 'La contraseña es demasiado débil.',
      expiredTitle: 'Este enlace ya no sirve',
      expiredText: 'Caducó o ya se usó. Pide uno nuevo desde la app de Clarify.',
      invalidTitle: 'Enlace no válido',
      invalidText: 'Abre el enlace completo desde el correo que te enviamos.',
      genericTitle: 'Algo salió mal',
      genericText: 'No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo.',
      footer: 'Clarify · Escáner y sintetizador de documentos con IA'
    },
    en: {
      checking: 'Checking the link…',
      verifiedTitle: 'Email verified!',
      verifiedText: 'Your Clarify account is now active.',
      verifiedPill: 'Go back to the app: it will sign you in',
      recoveredTitle: 'Email restored',
      recoveredText: 'Your account uses its previous email again. If you did not request the change, change your password in the app.',
      resetTitle: 'New password',
      resetText: 'Choose a new password for',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      save: 'Save password',
      saving: 'Saving…',
      resetDoneTitle: 'Password updated!',
      resetDoneText: 'You can now sign in to Clarify with your new password.',
      resetDonePill: 'Go back to the app to sign in',
      short: 'The password must be at least 8 characters long.',
      mismatch: 'The passwords do not match.',
      weak: 'The password is too weak.',
      expiredTitle: 'This link no longer works',
      expiredText: 'It expired or was already used. Request a new one from the Clarify app.',
      invalidTitle: 'Invalid link',
      invalidText: 'Open the full link from the email we sent you.',
      genericTitle: 'Something went wrong',
      genericText: 'The action could not be completed. Check your connection and try again.',
      footer: 'Clarify · AI document scanner and summarizer'
    }
  }[lang];

  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger)"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
  };

  var $ = function (id) { return document.getElementById(id); };
  $('footer').textContent = T.footer;

  function show(opts) {
    $('spinner').hidden = true;
    var icon = $('icon');
    icon.hidden = false;
    icon.className = 'icon' + (opts.icon === 'alert' ? ' error' : '');
    icon.innerHTML = ICONS[opts.icon];
    $('title').textContent = opts.title;
    $('text').textContent = opts.text || '';
    if (opts.email) {
      var b = document.createElement('span');
      b.className = 'email';
      b.textContent = ' ' + opts.email;
      $('text').appendChild(b);
    }
    $('pill').hidden = !opts.pill;
    $('pill').textContent = opts.pill || '';
    $('form').hidden = !opts.form;
  }

  function fail(code) {
    code = String(code || '');
    if (/EXPIRED_OOB_CODE|INVALID_OOB_CODE/.test(code)) return show({ icon: 'alert', title: T.expiredTitle, text: T.expiredText });
    show({ icon: 'alert', title: T.genericTitle, text: T.genericText });
  }

  function call(endpoint, body) {
    return fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + endpoint + '?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error((data && data.error && data.error.message) || 'HTTP_' + res.status);
        return data;
      });
    });
  }

  $('title').textContent = T.checking;

  if (!mode || !oobCode || !apiKey) {
    show({ icon: 'alert', title: T.invalidTitle, text: T.invalidText });
    return;
  }

  if (mode === 'verifyEmail' || mode === 'recoverEmail') {
    call('update', { oobCode: oobCode })
      .then(function () {
        if (mode === 'verifyEmail') show({ icon: 'check', title: T.verifiedTitle, text: T.verifiedText, pill: T.verifiedPill });
        else show({ icon: 'check', title: T.recoveredTitle, text: T.recoveredText });
      })
      .catch(function (e) { fail(e.message); });
    return;
  }

  if (mode === 'resetPassword') {
    $('l-new').textContent = T.newPassword;
    $('l-confirm').textContent = T.confirmPassword;
    $('submit').textContent = T.save;
    // Sin newPassword, la API solo comprueba el código y devuelve el correo de la cuenta
    call('resetPassword', { oobCode: oobCode })
      .then(function (data) {
        show({ icon: 'key', title: T.resetTitle, text: T.resetText, email: data.email, form: true });
        $('pw1').focus();
      })
      .catch(function (e) { fail(e.message); });

    $('form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pw1 = $('pw1').value, pw2 = $('pw2').value, err = $('form-error');
      err.classList.remove('show');
      var problem = pw1.length < 8 ? T.short : pw1 !== pw2 ? T.mismatch : null;
      if (problem) { err.textContent = problem; err.classList.add('show'); return; }
      $('submit').disabled = true;
      $('submit').textContent = T.saving;
      call('resetPassword', { oobCode: oobCode, newPassword: pw1 })
        .then(function () { show({ icon: 'check', title: T.resetDoneTitle, text: T.resetDoneText, pill: T.resetDonePill }); })
        .catch(function (e) {
          $('submit').disabled = false;
          $('submit').textContent = T.save;
          if (/WEAK_PASSWORD/.test(e.message)) { err.textContent = T.weak; err.classList.add('show'); return; }
          fail(e.message);
        });
    });
    return;
  }

  show({ icon: 'alert', title: T.invalidTitle, text: T.invalidText });
})();
</script>
</body>
</html>
`;
