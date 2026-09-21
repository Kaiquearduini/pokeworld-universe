/**
 * Login do painel admin.
 * POST /api/admin-login { email, password } -> { ok, token }
 *
 * O e-mail e o HASH da senha ficam em variáveis de ambiente da Vercel
 * (ADMIN_EMAIL e ADMIN_PASSWORD_HASH, no formato scrypt$<salt>$<hash>).
 * Nada de senha no código do site, que é público.
 */
import crypto from 'crypto';

function confere(senha, guardado) {
  const partes = String(guardado || '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const esperado = Buffer.from(partes[2], 'hex');
  const obtido = crypto.scryptSync(String(senha), Buffer.from(partes[1], 'hex'), esperado.length);
  return esperado.length === obtido.length && crypto.timingSafeEqual(esperado, obtido);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'método não permitido' });
  const emailOk = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!emailOk || !hash || !process.env.SESSION_SECRET) return res.status(503).json({ error: 'Login do admin ainda não configurado no servidor.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  const email = String((body && body.email) || '').trim().toLowerCase();
  const senha = String((body && body.password) || '');

  // compara os dois sempre, para o tempo de resposta não revelar qual errou
  const a = Buffer.from(email.padEnd(128).slice(0, 128)), b = Buffer.from(emailOk.padEnd(128).slice(0, 128));
  const emailBate = crypto.timingSafeEqual(a, b);
  const senhaBate = confere(senha, hash);
  if (!(emailBate && senhaBate)) {
    await new Promise((r) => setTimeout(r, 700));   // freia tentativa em série
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }
  // token próprio do admin (não é token de conta do jogo), válido por 12 horas
  const payload = Buffer.from(JSON.stringify({ admin: true, exp: Date.now() + 12 * 3600e3 })).toString('base64url');
  const mac = crypto.createHmac('sha256', process.env.SESSION_SECRET).update('admin.' + payload).digest('base64url');
  return res.status(200).json({ ok: true, token: payload + '.' + mac });
}
