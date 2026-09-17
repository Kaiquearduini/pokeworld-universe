import { MercadoPagoConfig, Order } from 'mercadopago';

/**
 * Client do Mercado Pago (API de Orders). Inicialização preguiçosa para a função
 * responder 503 com mensagem clara quando o token ainda não foi configurado,
 * em vez de quebrar no import.
 */
let _order = null;
export function mpConfigured() { return !!process.env.MP_ACCESS_TOKEN; }
export function mpOrder() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado');
  if (!_order) {
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 8000 } });
    _order = new Order(client);
  }
  return _order;
}

/**
 * Consulta a order direto na API do Mercado Pago.
 * É a ÚNICA fonte de verdade sobre o pagamento — nunca confie no corpo do
 * webhook nem nos query params da página de retorno.
 */
export async function fetchOrder(orderId) {
  return mpOrder().get({ id: orderId });
}

/**
 * Na API de Orders, "pago e creditado" é `processed` + `accredited`.
 * NÃO é `approved`. Reembolso também fica `processed`, mas com status_detail
 * `refunded` — por isso sempre os dois campos juntos.
 */
export function isPaid(order) {
  return order?.status === 'processed' && order?.status_detail === 'accredited';
}
