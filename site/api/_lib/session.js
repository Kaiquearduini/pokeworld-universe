/**
 * Sessão do site, sem tocar no schema do jogo.
 *
 * O token é assinado com HMAC-SHA256 (SESSION_SECRET) e carrega só o id da
 * conta e a validade. Nada de gravar em `accounts.sessionkey`, que é do
 * cliente do jogo.
 */
import crypto from 'crypto';

const DIAS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET não configurado (mínimo 16 caracteres)');
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function sign(accountId) {
  const payload = b64url(JSON.stringify({ a: Number(accountId), exp: Date.now() + DIAS * 864e5 }));
  const mac = b64url(crypto.createHmac('sha256', secret()).update(payload).digest());
  return `${payload}.${mac}`;
}

/** Devolve o id da conta, ou null se o token for inválido/expirado. */
export function verify(token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return null;
  const [payload, mac] = token.split('.');
  let esperado;
  try { esperado = b64url(crypto.createHmac('sha256', secret()).update(payload).digest()); } catch (e) { return null; }
  const a = Buffer.from(mac || '', 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!data.a || !data.exp || Date.now() > data.exp) return null;
    return data.a;
  } catch (e) { return null; }
}

/** Lê o token do header Authorization: Bearer ... */
export function accountFromRequest(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? verify(h.slice(7)) : null;
}

/** Hash de senha do OTServ: SHA1 em hexadecimal. Obrigatório para o cliente do jogo aceitar. */
export function hashSenha(senha) {
  return crypto.createHash('sha1').update(String(senha), 'utf8').digest('hex');
}
