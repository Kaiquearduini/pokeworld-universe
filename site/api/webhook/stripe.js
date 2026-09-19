/**
 * Webhook da Stripe. POST /api/webhook/stripe
 *
 * Precisa do corpo CRU para validar a assinatura, por isso o bodyParser
 * fica desligado. Só `checkout.session.completed` com payment_status `paid`
 * credita, e o crédito é idempotente (UPDATE ... WHERE entregue = 0).
 */
import { assinaturaStripeValida, rawBody } from '../_lib/stripe.js';
import { getPackage } from '../_lib/packages.js';
import { findOrderByMpId, markPaidAndCredit } from '../_lib/orders.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const cru = await rawBody(req);

  if (!assinaturaStripeValida({ header: req.headers['stripe-signature'], rawBody: cru, secret })) {
    console.warn('[stripe] assinatura inválida');
    return res.status(401).end();
  }

  let evento;
  try { evento = JSON.parse(cru); } catch (e) { return res.status(400).end(); }

  // Só o fim do checkout importa para creditar.
  if (evento.type !== 'checkout.session.completed') return res.status(200).end();

  try {
    const s = evento.data && evento.data.object;
    if (!s || s.payment_status !== 'paid') { console.log('[stripe] sessão não paga', s && s.id); return res.status(200).end(); }

    const local = await findOrderByMpId(s.id);
    if (!local) { console.error('[stripe] sessão sem pedido local', s.id); return res.status(200).end(); }
    if (local.status === 'paid') return res.status(200).end();

    // confere o valor contra o pacote (em centavos)
    const pkg = getPackage(local.package_id);
    const esperado = Math.round(pkg.price * (local.fator || 1) * 100);   // centavos, com cupom se houver
    if (Number(s.amount_total || 0) < esperado) {
      console.error('[stripe] valor divergente', { sessao: s.id, pago: s.amount_total, esperado });
      return res.status(200).end();
    }

    const creditou = await markPaidAndCredit(local.id, { mpPaymentId: s.payment_intent || s.id });
    console.log('[stripe]', s.id, creditou ? 'creditado' : 'já creditado');
  } catch (err) {
    console.error('[stripe] erro ao processar', err);
    return res.status(500).end();   // a Stripe reenvia; o crédito é idempotente
  }
  return res.status(200).end();
}
