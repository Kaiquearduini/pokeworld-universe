/**
 * Camada de banco dos pedidos (Supabase/Postgres). Schema em supabase/payments.sql.
 * Assinaturas iguais às do pacote pwu-mercadopago.
 */
import { rest } from './supabase.js';

/** Cria o pedido local ANTES de chamar o Mercado Pago, com status 'pending'. */
export async function createLocalOrder({ userId, packageId, amount, coins }) {
  const rows = await rest('orders', {
    method: 'POST', prefer: 'return=representation',
    body: { user_id: String(userId), package_id: packageId, amount, coins, status: 'pending' }
  });
  return rows[0];
}

/** Guarda o id da order do Mercado Pago (ORD...) no pedido local. */
export async function attachMpOrderId(localOrderId, mpOrderId) {
  await rest(`orders?id=eq.${encodeURIComponent(localOrderId)}`, { method: 'PATCH', body: { mp_order_id: mpOrderId } });
}

export async function findOrderByMpId(mpOrderId) {
  const rows = await rest(`orders?mp_order_id=eq.${encodeURIComponent(mpOrderId)}&limit=1`);
  return rows[0] || null;
}

/**
 * Marca como pago e credita os coins — EM UMA TRANSAÇÃO SÓ, dentro do Postgres
 * (função pwu_mark_paid_and_credit). A trava é o UPDATE condicional
 * `WHERE status = 'pending'`: se não afetar linha, outro webhook já creditou
 * e a função devolve false. É isso que torna o reenvio do Mercado Pago seguro.
 */
export async function markPaidAndCredit(localOrderId, { mpPaymentId }) {
  const ok = await rest('rpc/pwu_mark_paid_and_credit', {
    method: 'POST', body: { p_order_id: localOrderId, p_mp_payment_id: mpPaymentId || null }
  });
  return ok === true;
}

/** Log cru do que o Mercado Pago mandou (auditoria). Nunca derruba o webhook. */
export async function logWebhookEvent({ mpOrderId, action, payload }) {
  try { await rest('mp_webhook_events', { method: 'POST', body: { mp_order_id: mpOrderId || null, action: action || null, payload: payload || {} } }); }
  catch (e) { console.warn('[webhook] não consegui gravar o log', e.message); }
}
