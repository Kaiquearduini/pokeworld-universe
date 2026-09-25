import { cents } from './payment-validation.js';
export { checkoutInput, UUID } from './stripe-live-validation.js';
export const ORDER_ID = /^ORD(?!TST)[A-Z0-9]{26}$/;
export const PAYMENT_ID = /^PAY[A-Z0-9]{26}$/;
export function validatePixOrder(remote, local, {userId, applicationId, test = false, paid = false} = {}) {
  const payments = remote?.transactions?.payments;
  const idPattern = test ? /^ORDTST[A-Z0-9]{26}$/ : ORDER_ID;
  if (!local || !remote || !idPattern.test(remote.id || '') || remote.type !== 'online' || remote.processing_mode !== 'automatic' ||
      !/^[1-9][0-9]+$/.test(String(userId || '')) || !/^[1-9][0-9]+$/.test(String(applicationId || '')) ||
      String(remote.user_id) !== String(userId) || String(remote.integration_data?.application_id) !== String(applicationId) ||
      remote.country_code !== 'BRA' || remote.currency !== 'BRL' || remote.external_reference !== local.reference ||
      (local.provider_order_id && local.provider_order_id !== remote.id) ||
      cents(remote.total_amount) !== Number(local.amount_cents) || !Array.isArray(payments) || payments.length !== 1)
    throw new Error('pix-order-mismatch');
  const p = payments[0];
  if (!PAYMENT_ID.test(p.id || '') || (local.payment_id && local.payment_id !== p.id) ||
      p.payment_method?.id !== 'pix' || p.payment_method?.type !== 'bank_transfer' || cents(p.amount) !== Number(local.amount_cents))
    throw new Error('pix-payment-mismatch');
  if (paid && (remote.status !== 'processed' || remote.status_detail !== 'accredited' ||
      p.status !== 'processed' || p.status_detail !== 'accredited' || cents(p.paid_amount) !== Number(local.amount_cents) || cents(remote.total_paid_amount) !== Number(local.amount_cents)))
    throw new Error('pix-not-paid');
  return remote;
}
export function pixTicketUrl(value, {test = false} = {}) {
  let u; try {u = new URL(value);} catch {throw new Error('pix-url-invalid');}
  const path = test ? /^\/sandbox\/payments\/[0-9]+\/ticket$/ : /^\/payments\/[0-9]+\/ticket$/;
  if (u.protocol !== 'https:' || u.hostname !== 'www.mercadopago.com.br' || u.port || u.username || u.password || !path.test(u.pathname))
    throw new Error('pix-url-invalid');
  return u.href;
}
