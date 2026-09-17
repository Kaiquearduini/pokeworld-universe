/**
 * Conta do jogador — grava direto na tabela `accounts` do banco do jogo.
 * A conta criada aqui é a MESMA que entra no cliente do Pokeworld.
 *
 * POST /api/account { action: 'register' | 'login' | 'password', ... }
 * GET  /api/account            -> dados da conta + treinadores (Bearer token)
 */
import { gameConfigured, q, one, run } from './_lib/gamedb.js';
import { sign, accountFromRequest, hashSenha } from './_lib/session.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    'SELECT id, name, email, type, premdays, pontos, creation FROM accounts WHERE id = ? LIMIT 1',
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
      const conta = await dadosDaConta(r.insertId);
      return res.status(201).json({ token: sign(r.insertId), account: conta });
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
