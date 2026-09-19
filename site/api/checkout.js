import { randomUUID } from 'crypto';
import { mpOrder, mpConfigured } from './_lib/mercadopago.js';
import { getPackage } from './_lib/packages.js';
import { findCoupon, precoComCupom } from './_lib/coupons.js';
import { createLocalOrder, attachMpOrderId } from './_lib/orders.js';
import { gameConfigured, one } from './_lib/gamedb.js';
import { accountFromRequest } from './_lib/session.js';

const APP_URL = (process.env.APP_URL || 'https://pokeworld-universe.vercel.app').replace(/\/+$/, '');

/** POST /api/checkout { packageId, coupon? } -> { checkoutUrl } */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'método não permitido' });
  if (!mpConfigured() || !gameConfigured()) return res.status(503).json({ error: 'pagamento ainda não configurado no servidor' });

  try {
    // 1. Quem está comprando: a conta do JOGO. Sem ela não há pra quem creditar.
    const accountId = accountFromRequest(req);
    if (!accountId) return res.status(401).json({ error: 'não autenticado' });
    const user = await one('SELECT id, email, name FROM accounts WHERE id = ? LIMIT 1', [accountId]);
    if (!user) return res.status(401).json({ error: 'conta não encontrada' });

    // 2. O frontend manda SÓ o id do pacote. Preço e coins vêm do servidor.
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
    let pkg;
    try { pkg = getPackage(body && body.packageId); } catch (e) { return res.status(400).json({ error: 'pacote inexistente' }); }

    // cupom opcional: se veio e não vale, recusa em vez de cobrar cheio sem avisar
    let cupom = null;
    if (body && body.coupon) {
      cupom = findCoupon(body.coupon);
      if (!cupom) return res.status(400).json({ error: 'Cupom inválido ou expirado.' });
    }
    const preco = precoComCupom(pkg, cupom);

    // 3. Pedido local primeiro, com status pending.
    const local = await createLocalOrder({ userId: user.id, packageId: pkg.id, amount: preco, coins: pkg.coins, cupomPct: cupom ? cupom.pct : 0 });

    // 4. Cria a order no Mercado Pago. Valores monetários são STRING (number dá 400).
    const order = await mpOrder().create({
      body: {
        type: 'online',
        processing_mode: 'manual',   // valor fixo do Checkout Pro
        capture_mode: 'automatic',
        total_amount: preco.toFixed(2),
        external_reference: String(local.id),
        description: `PokeWorld Universe — ${pkg.title}` + (cupom ? ` (cupom ${cupom.code})` : ''),
        expiration_time: 'PT2H',
        payer: { email: user.email || user.name },
        items: [{ title: pkg.title, quantity: 1, unit_price: preco.toFixed(2), unit_measure: 'unit' }],
        config: {
          notification_url: `${APP_URL}/api/webhook/mercadopago`,
          online: {
            // Estas páginas são só enfeite: quem libera os coins é o webhook.
            success_url: `${APP_URL}/minha-conta.html?pagamento=retorno`,
            failure_url: `${APP_URL}/minha-conta.html?pagamento=falhou`,
            pending_url: `${APP_URL}/minha-conta.html?pagamento=pendente`,
            auto_return: 'approved'
          },
          payment_method: { max_installments: 1 }
        }
      },
      requestOptions: { idempotencyKey: randomUUID() } // sem isso, duplo clique vira duas orders
    });

    await attachMpOrderId(local.id, order.id);

    // 5. Devolve a URL do checkout que veio da API (não montar à mão).
    return res.status(200).json({ checkoutUrl: order.checkout_url });
  } catch (err) {
    console.error('[checkout] falhou', err);
    return res.status(500).json({ error: 'erro ao criar checkout' });
  }
}
