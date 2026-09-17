/**
 * Stripe via REST (sem SDK, para manter a função leve).
 * A chave secreta fica só em STRIPE_SECRET_KEY, no servidor.
 */
import crypto from 'crypto';

const API = 'https://api.stripe.com/v1';

export function stripeConfigured() { return !!process.env.STRIPE_SECRET_KEY; }

/** Chamada à API da Stripe com corpo em form-urlencoded (o formato que ela usa). */
export async function stripeCall(path, form, { method = 'POST', idempotencyKey } = {}) {
  const headers = {
    Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const body = form ? new URLSearchParams(form).toString() : undefined;
  const r = await fetch(API + path, { method, headers, body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((data.error && data.error.message) || 'erro na Stripe');
    e.status = r.status;
    throw e;
  }
  return data;
}

/**
 * Valida a assinatura do webhook da Stripe.
 * Header: Stripe-Signature: t=1714764000,v1=<hmac>
 * Payload assinado: `${t}.${corpoCru}`  — precisa do corpo CRU, sem parse.
 */
export function assinaturaStripeValida({ header = '', rawBody = '', secret, toleranciaSeg = 300, now = Date.now() }) {
  if (!secret || !header) return false;
  let t = null;
  const v1 = [];
  for (const parte of String(header).split(',')) {
    const i = parte.indexOf('=');
    if (i === -1) continue;
    const k = parte.slice(0, i).trim();
    const v = parte.slice(i + 1).trim();
    if (k === 't') t = v;
    if (k === 'v1') v1.push(v);
  }
  if (!t || !v1.length) return false;

  const esperado = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const bateu = v1.some((sig) => {
    const b = Buffer.from(sig, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!bateu) return false;

  // Anti-replay: o t da Stripe vem em segundos.
  return Math.abs(now / 1000 - Number(t)) <= toleranciaSeg;
}

/** Lê o corpo cru da requisição (necessário para validar a assinatura). */
export function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
