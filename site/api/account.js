/**
 * Conta do jogador — grava direto na tabela `accounts` do banco do jogo.
 * A conta criada aqui é a MESMA que entra no cliente do Pokeworld.
 *
 * POST /api/account { action: 'register' | 'login' | 'password' | 'forgot' | 'reset' | 'totp-setup' | 'totp-enable' | 'totp-disable', ... }
 * GET  /api/account            -> dados da conta + treinadores (Bearer token)
 */
import crypto from 'crypto';
import { gameConfigured, q, one, run, tableExists } from './_lib/gamedb.js';
import { sign, accountFromRequest, hashSenha } from './_lib/session.js';
import { mailConfigured, enviarEmail, emailCodigoDispositivo, emailCodigoSenha } from './_lib/mail.js';
import { novoSegredo, confereTotp, otpauthUrl } from './_lib/totp.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_VALE_MIN = 15;

function ipDe(req) { return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null; }
function apelidoDoAparelho(req) {
  const ua = String(req.headers['user-agent'] || '');
  const so = /Windows/i.test(ua) ? 'Windows' : /Mac OS|Macintosh/i.test(ua) ? 'Mac' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Linux/i.test(ua) ? 'Linux' : 'Desconhecido';
  const nav = /Edg\//i.test(ua) ? 'Edge' : /Chrome\//i.test(ua) ? 'Chrome' : /Safari\//i.test(ua) ? 'Safari' : /Firefox\//i.test(ua) ? 'Firefox' : 'Navegador';
  return `${nav} no ${so}`;
}

/* ---------- autorização de aparelho ----------
   Guardamos os aparelhos em site_devices e o código em tokenvalidat (já existia).
   Regra: o primeiro aparelho da conta entra sem código; os próximos precisam
   do código que vai por e-mail. Sem e-mail configurado, a checagem é pulada
   (o site continua funcionando) e /api/health avisa. */
async function aparelhoConhecido(accountId, deviceId) {
  if (!deviceId) return true;
  if (!(await tableExists('site_devices'))) return true;
  const r = await one('SELECT device_id FROM site_devices WHERE account_id = ? AND device_id = ? LIMIT 1', [accountId, deviceId]);
  return !!r;
}
async function primeiroAparelho(accountId) {
  const r = await one('SELECT COUNT(*) AS n FROM site_devices WHERE account_id = ?', [accountId]);
  return Number((r && r.n) || 0) === 0;
}
async function registrarAparelho(accountId, deviceId, req) {
  if (!deviceId || !(await tableExists('site_devices'))) return;
  await run(
    `INSERT INTO site_devices (account_id, device_id, label, last_ip, created_at, last_seen)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE last_seen = NOW(), last_ip = VALUES(last_ip)`,
    [accountId, String(deviceId).slice(0, 64), apelidoDoAparelho(req), ipDe(req)]
  );
}
/** Autenticador por aplicativo ativo nesta conta? */
async function totpAtivo(accountId) {
  if (!(await tableExists('site_totp'))) return false;
  const r = await one('SELECT enabled FROM site_totp WHERE account_id = ? LIMIT 1', [accountId]);
  return !!(r && Number(r.enabled) === 1);
}
async function totpSegredo(accountId) {
  const r = await one('SELECT secret, enabled FROM site_totp WHERE account_id = ? LIMIT 1', [accountId]);
  return r || null;
}

async function mandarCodigoSenha(acc, req) {
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await run("UPDATE tokenvalidat SET expired = '1' WHERE id_account = ? AND expired = '0' AND token LIKE 'pwd:%'", [acc.id]);
  await run(
    "INSERT INTO tokenvalidat (id_account, token, expired, validation_date) VALUES (?, ?, '0', NOW())",
    [acc.id, `pwd:${codigo}`]
  );
  await enviarEmail({
    para: acc.email || acc.name,
    assunto: 'Código para redefinir sua senha — Pokeworld Universe',
    html: emailCodigoSenha({ codigo, ip: ipDe(req), quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) })
  });
}

async function mandarCodigo(acc, deviceId, req) {
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await run("UPDATE tokenvalidat SET expired = '1' WHERE id_account = ? AND expired = '0'", [acc.id]);
  await run(
    "INSERT INTO tokenvalidat (id_account, token, expired, validation_date) VALUES (?, ?, '0', NOW())",
    [acc.id, `dev:${String(deviceId).slice(0, 64)}:${codigo}`]
  );
  await enviarEmail({
    para: acc.email || acc.name,
    assunto: 'Código para autorizar um novo acesso — Pokeworld Universe',
    html: emailCodigoDispositivo({ codigo, ip: ipDe(req), quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) })
  });
}

function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }
  return b || {};
}

/** Time de pokémon do player: a coluna `pokemons` guarda um JSON do jogo. */
function parseTeam(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 6).map((p) => ({
      name: String(p.name || '').trim(),
      level: Number(p.level || 0),
      boost: Number(p.boost || 0),
      lookType: (p.looktype && p.looktype.lookType) || null
    })).filter((p) => p.name);
  } catch (e) { return []; }
}

async function dadosDaConta(accountId) {
  const acc = await one(
    'SELECT id, name, email, type, premdays, pontos, creation, image FROM accounts WHERE id = ? LIMIT 1',
    [accountId]
  );
  if (!acc) return null;

  const players = await q(
    `SELECT p.id, p.name, p.level, p.experience, p.onlinetime, p.looktype, p.pokemons, p.diamond,
            (SELECT COUNT(*) FROM players_online o WHERE o.player_id = p.id) AS online
       FROM players p
      WHERE p.account_id = ? AND p.deletion = 0
      ORDER BY p.level DESC, p.experience DESC`,
    [accountId]
  );

  return {
    id: acc.id,
    name: acc.name,
    email: acc.email || acc.name,
    email_masked: String(acc.email || acc.name).replace(/^(.).*(@.*)$/, '$1***$2'),
    coins: Number(acc.pontos || 0),
    premdays: Number(acc.premdays || 0),
    plan: Number(acc.premdays || 0) > 0 ? `Premium · ${acc.premdays} dias` : 'Conta Grátis',
    admin: Number(acc.type || 1) >= 5,
    avatar: acc.image || null,
    totp: await totpAtivo(accountId),
    // false = ainda precisa ativar o autenticador (obrigatório para contas do site)
    totpPendente: (await tableExists('site_totp')) && !(await totpAtivo(accountId)),
    createdAt: Number(acc.creation || 0),
    trainers: players.map((p) => ({
      id: p.id,
      name: p.name,
      level: Number(p.level || 0),
      experience: Number(p.experience || 0),
      onlinetime: Number(p.onlinetime || 0),
      online: Number(p.online || 0) > 0,
      diamond: Number(p.diamond || 0),
      team: parseTeam(p.pokemons)
    }))
  };
}

export default async function handler(req, res) {
  if (!gameConfigured()) return res.status(503).json({ error: 'banco do jogo não configurado no servidor' });

  try {
    // ---------------- dados da conta logada ----------------
    if (req.method === 'GET') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const conta = await dadosDaConta(id);
      if (!conta) return res.status(401).json({ error: 'conta não encontrada' });
      return res.status(200).json(conta);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'método não permitido' });

    const body = parseBody(req);
    const action = body.action;
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    // ---------------- cadastro ----------------
    if (action === 'register') {
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Digite um e-mail válido.' });
      if (password.length < 8) return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres.' });

      const existe = await one('SELECT id FROM accounts WHERE name = ? OR email = ? LIMIT 1', [email, email]);
      if (existe) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });

      // `name` é a chave de login do OTServ e tem UNIQUE — guardamos o e-mail nos dois campos,
      // que é como o servidor do Pokeworld já vinha fazendo.
      const r = await run(
        `INSERT INTO accounts (name, password, email, creation, type, premdays, pontos, recovery_key, creationIp, authentication)
         VALUES (?, ?, ?, ?, 1, 0, 0, '', ?, 0)`,
        [email, hashSenha(password), email, Math.floor(Date.now() / 1000),
         String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '0']
      );
      // a verificação em duas etapas é obrigatória: a conta já nasce com o
      // segredo do autenticador e o site só libera depois do primeiro código
      let totpSetup = null;
      if (await tableExists('site_totp')) {
        const secret = novoSegredo();
        await run('INSERT INTO site_totp (account_id, secret, enabled, created_at) VALUES (?, ?, 0, NOW())', [r.insertId, secret]);
        totpSetup = { secret, otpauth: otpauthUrl(secret, email) };
      }
      const conta = await dadosDaConta(r.insertId);
      return res.status(201).json({ token: sign(r.insertId), account: conta, totpSetup });
    }

    // ---------------- login ----------------
    if (action === 'login') {
      if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
      const acc = await one(
        'SELECT id, password FROM accounts WHERE name = ? OR email = ? LIMIT 1',
        [email, email]
      );
      if (!acc || String(acc.password).toLowerCase() !== hashSenha(password)) {
        return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      }

      // autenticador por aplicativo ativo? exige o código de 6 dígitos.
      let usouTotp = false;
      if (await totpAtivo(acc.id)) {
        const codigo = String(body.totp || '').replace(/\D/g, '');
        if (!codigo) return res.status(403).json({ needsTotp: true, error: 'Digite o código do seu aplicativo autenticador.' });
        const t = await totpSegredo(acc.id);
        if (!confereTotp(t && t.secret, codigo)) return res.status(401).json({ needsTotp: true, error: 'Código do autenticador inválido.' });
        usouTotp = true;
      }

      // computador novo? pede código por e-mail antes de liberar.
      const deviceId = String(body.deviceId || '').slice(0, 64);
      const temTabela = await tableExists('site_devices');
      if (usouTotp && temTabela && deviceId) {
        await registrarAparelho(acc.id, deviceId, req);          // o app já provou que é o dono
      } else if (temTabela && deviceId && !(await aparelhoConhecido(acc.id, deviceId))) {
        if (await primeiroAparelho(acc.id)) {
          await registrarAparelho(acc.id, deviceId, req);       // o primeiro aparelho é o de confiança
        } else if (mailConfigured()) {
          try {
            await mandarCodigo(acc, deviceId, req);
            return res.status(403).json({ needsDevice: true, email: String(acc.email || acc.name).replace(/^(.).*(@.*)$/, '$1***$2'), error: 'Enviamos um código para o seu e-mail para autorizar este computador.' });
          } catch (e) {
            console.error('[account] falha ao enviar código', e.message);
            await registrarAparelho(acc.id, deviceId, req);      // não trava o jogador por falha de e-mail
          }
        } else {
          await registrarAparelho(acc.id, deviceId, req);        // envio de e-mail não configurado
        }
      } else if (temTabela && deviceId) {
        await registrarAparelho(acc.id, deviceId, req);          // atualiza o último acesso
      }

      const conta = await dadosDaConta(acc.id);
      return res.status(200).json({ token: sign(acc.id), account: conta });
    }

    // ---------------- troca de senha ----------------
    if (action === 'password') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const nova = String(body.next || '');
      if (nova.length < 8) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      const acc = await one('SELECT password FROM accounts WHERE id = ? LIMIT 1', [id]);
      if (!acc || String(acc.password).toLowerCase() !== hashSenha(password)) {
        return res.status(401).json({ error: 'Senha atual incorreta.' });
      }
      await run('UPDATE accounts SET password = ? WHERE id = ?', [hashSenha(nova), id]);
      return res.status(200).json({ ok: true });
    }

    // ---------------- esqueci minha senha: pedir o código ----------------
    if (action === 'forgot') {
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Digite um e-mail válido.' });
      if (!mailConfigured()) return res.status(503).json({ error: 'O envio de e-mail ainda não está configurado no servidor. Fale com a equipe pelo Discord.' });
      const acc = await one('SELECT id, name, email FROM accounts WHERE email = ? OR name = ? LIMIT 1', [email, email]);
      // a resposta é sempre a mesma: não dizemos se o e-mail existe ou não
      if (acc) {
        try { await mandarCodigoSenha(acc, req); }
        catch (e) { console.error('[account] forgot', e); return res.status(502).json({ error: 'Não consegui enviar o e-mail agora. Tente de novo em instantes.' }); }
      }
      return res.status(200).json({ ok: true });
    }

    // ---------------- esqueci minha senha: trocar com o código ----------------
    if (action === 'reset') {
      const codigo = String(body.code || '').replace(/\D/g, '');
      const nova = String(body.next || '');
      if (!EMAIL.test(email) || codigo.length !== 6) return res.status(400).json({ error: 'Informe o código de 6 dígitos que chegou no seu e-mail.' });
      if (nova.length < 8) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      const acc = await one('SELECT id FROM accounts WHERE email = ? OR name = ? LIMIT 1', [email, email]);
      if (!acc) return res.status(401).json({ error: 'Código inválido. Peça um novo e tente de novo.' });

      const reg = await one(
        `SELECT id, validation_date FROM tokenvalidat
          WHERE id_account = ? AND token = ? AND expired = '0'
          ORDER BY id DESC LIMIT 1`,
        [acc.id, `pwd:${codigo}`]
      );
      if (!reg) return res.status(401).json({ error: 'Código inválido. Peça um novo e tente de novo.' });
      if (Date.now() - new Date(reg.validation_date).getTime() > CODIGO_VALE_MIN * 60000) {
        return res.status(401).json({ error: 'Código expirado. Peça outro e tente de novo.' });
      }
      await run("UPDATE tokenvalidat SET expired = '1' WHERE id = ?", [reg.id]);
      await run('UPDATE accounts SET password = ? WHERE id = ?', [hashSenha(nova), acc.id]);
      return res.status(200).json({ ok: true });
    }

    // ---------------- autenticador por aplicativo ----------------
    if (action === 'totp-setup') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      if (!(await tableExists('site_totp'))) return res.status(412).json({ error: 'rode sql/site-tables.sql antes' });
      const acc = await one('SELECT name, email FROM accounts WHERE id = ? LIMIT 1', [id]);
      const secret = novoSegredo();
      await run(
        `INSERT INTO site_totp (account_id, secret, enabled, created_at) VALUES (?, ?, 0, NOW())
         ON DUPLICATE KEY UPDATE secret = VALUES(secret), enabled = 0, created_at = NOW()`,
        [id, secret]
      );
      return res.status(200).json({ secret, otpauth: otpauthUrl(secret, acc.email || acc.name) });
    }
    if (action === 'totp-enable') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const t = await totpSegredo(id);
      if (!t) return res.status(400).json({ error: 'Gere o QR Code primeiro.' });
      if (!confereTotp(t.secret, body.code)) return res.status(401).json({ error: 'Código inválido. Confira o horário do celular e tente de novo.' });
      await run('UPDATE site_totp SET enabled = 1 WHERE account_id = ?', [id]);
      return res.status(200).json({ ok: true });
    }
    if (action === 'totp-disable') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const acc = await one('SELECT password FROM accounts WHERE id = ? LIMIT 1', [id]);
      if (!acc || String(acc.password).toLowerCase() !== hashSenha(password)) return res.status(401).json({ error: 'Senha incorreta.' });
      await run('DELETE FROM site_totp WHERE account_id = ?', [id]);
      return res.status(200).json({ ok: true });
    }

    // ---------------- confirmar código do aparelho ----------------
    if (action === 'device-confirm') {
      const deviceId = String(body.deviceId || '').slice(0, 64);
      const codigo = String(body.code || '').replace(/\D/g, '');
      if (!EMAIL.test(email) || !deviceId || codigo.length !== 6) return res.status(400).json({ error: 'Informe o código de 6 dígitos.' });
      const acc = await one('SELECT id, password FROM accounts WHERE name = ? OR email = ? LIMIT 1', [email, email]);
      if (!acc || String(acc.password).toLowerCase() !== hashSenha(password)) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

      const reg = await one(
        `SELECT id, validation_date FROM tokenvalidat
          WHERE id_account = ? AND token = ? AND expired = '0'
          ORDER BY id DESC LIMIT 1`,
        [acc.id, `dev:${deviceId}:${codigo}`]
      );
      if (!reg) return res.status(401).json({ error: 'Código inválido. Peça um novo e tente de novo.' });
      if (Date.now() - new Date(reg.validation_date).getTime() > CODIGO_VALE_MIN * 60000) {
        return res.status(401).json({ error: 'Código expirado. Faça login de novo para receber outro.' });
      }
      await run("UPDATE tokenvalidat SET expired = '1' WHERE id = ?", [reg.id]);
      await registrarAparelho(acc.id, deviceId, req);
      const conta = await dadosDaConta(acc.id);
      return res.status(200).json({ token: sign(acc.id), account: conta });
    }

    // ---------------- aparelhos autorizados ----------------
    if (action === 'devices') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      if (!(await tableExists('site_devices'))) return res.status(200).json({ devices: [], missing: 'tabela' });
      const lista = await q('SELECT device_id, label, last_ip, created_at, last_seen FROM site_devices WHERE account_id = ? ORDER BY last_seen DESC', [id]);
      return res.status(200).json({ devices: lista, atual: String(body.deviceId || '') });
    }
    if (action === 'device-remove') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      await run('DELETE FROM site_devices WHERE account_id = ? AND device_id = ?', [id, String(body.deviceId || '').slice(0, 64)]);
      return res.status(200).json({ ok: true });
    }

    // ---------------- foto de perfil ----------------
    if (action === 'avatar') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const v = String(body.avatar || '').trim().slice(0, 255);
      // só caminho interno do site ou https — nada de javascript: nem data:
      if (v && !/^(assets\/[\w./-]+|https:\/\/[\w./%-]+\.(png|jpg|jpeg|webp|gif))$/i.test(v)) {
        return res.status(400).json({ error: 'Use uma imagem do site ou um endereço https terminando em .png, .jpg ou .webp.' });
      }
      await run('UPDATE accounts SET image = ? WHERE id = ?', [v || null, id]);
      return res.status(200).json({ ok: true, avatar: v || null });
    }

    // ---------------- ticket de suporte ----------------
    if (action === 'ticket') {
      const id = accountFromRequest(req);
      if (!id) return res.status(401).json({ error: 'não autenticado' });
      const titulo = String(body.subject || '').slice(0, 50);
      const descricao = String(body.message || '').trim().slice(0, 200);
      if (descricao.length < 10) return res.status(400).json({ error: 'Escreva pelo menos 10 caracteres.' });
      await run(
        'INSERT INTO suporte (account_id, titulo, descricao, status, date_created) VALUES (?, ?, ?, 0, NOW())',
        [id, titulo || 'Suporte', descricao]
      );
      return res.status(201).json({ ok: true });
    }

    return res.status(400).json({ error: 'ação inválida' });
  } catch (err) {
    console.error('[account]', err);
    return res.status(500).json({ error: 'erro no servidor' });
  }
}
