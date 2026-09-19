/**
 * Cupons de desconto na doação.
 *
 * Ficam na variável de ambiente COUPONS (JSON), para a equipe criar e tirar
 * cupom sem deploy de código:
 *   COUPONS={"PWU10":{"pct":10},"LANCAMENTO":{"pct":15,"ate":"2026-10-31"}}
 *
 *   pct  desconto em % sobre o preço do pacote (1 a 90)
 *   ate  opcional, último dia de validade (AAAA-MM-DD, horário de Brasília)
 *
 * Os créditos continuam os do pacote: o cupom só baixa o valor pago.
 * O preço final é sempre calculado aqui no servidor.
 */
function catalogo() {
  try { return JSON.parse(process.env.COUPONS || '{}') || {}; } catch (e) { return {}; }
}

export function normalizarCodigo(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
}

/** Cupom válido ou null. */
export function findCoupon(code) {
  const codigo = normalizarCodigo(code);
  if (!codigo) return null;
  const c = catalogo()[codigo];
  if (!c) return null;
  const pct = Number(c.pct);
  if (!(pct >= 1 && pct <= 90)) return null;
  if (c.ate) {
    const fim = new Date(String(c.ate) + 'T23:59:59-03:00');
    if (!isNaN(fim) && Date.now() > fim.getTime()) return null;
  }
  return { code: codigo, pct };
}

/** Preço do pacote com o cupom, em reais com 2 casas. */
export function precoComCupom(pkg, coupon) {
  if (!coupon) return pkg.price;
  return Math.round(pkg.price * (100 - coupon.pct)) / 100;
}
