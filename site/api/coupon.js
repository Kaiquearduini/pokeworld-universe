/**
 * Confere um cupom antes do pagamento, só para mostrar o novo valor na tela.
 * GET /api/coupon?code=PWU10&pacote=ultra   (ou pacote=custom&amount=123.45) -> { valid, code, pct, price, original }
 * O checkout valida de novo no servidor; esta resposta não vale como preço.
 */
import { findCoupon, precoComCupom } from './_lib/coupons.js';
import { resolvePackage } from './_lib/packages.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let pkg;
  try { pkg = resolvePackage(req.query.pacote, req.query.amount); } catch (e) { return res.status(400).json({ valid: false, error: 'pacote inexistente' }); }
  const c = findCoupon(req.query.code);
  if (!c) return res.status(200).json({ valid: false, error: 'Cupom inválido ou expirado.' });
  return res.status(200).json({ valid: true, code: c.code, pct: c.pct, price: precoComCupom(pkg, c), original: pkg.price });
}
