import { randomUUID } from 'crypto';
import { mpOrder, mpConfigured } from './_lib/mercadopago.js';
import { getPackage } from './_lib/packages.js';
import { createLocalOrder, attachMpOrderId } from './_lib/orders.js';
import { dbConfigured, getUserFromToken } from './_lib/supabase.js';

const APP_URL = (process.env.APP_URL || 'https://pokeworld-universe.vercel.app').replace(/\/+$/, '');

/** POST /api/checkout { packageId } -> { checkoutUrl } */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'método não permitido' });
  if (!mpConfigured() || !dbConfigured()) return res.status(503).json({ error: 'pagamento ainda não configurado no servidor' });

  try {
    // 1. Quem está comprando. Sem usuário logado não há pra quem creditar.
    const auth = req.headers.authorization || '';
    const user = await getUserFromToken(auth.startsWith('Bearer ') ? auth.slice(7) : null);
    if (!user) return res.status(401).json({ error: 'não autenticado' });

    // 2. O frontend manda SÓ o id do pacote. Preço e coins vêm do servidor.
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
    let pkg;
    try { pkg = getPackage(body && body.packageId); } catch (e) { return res.status(400).json({ error: 'pacote inexistente' }); }

    // 3. Pedido local primeiro, com status pending.
    const local = await createLocalOrder({ userId: user.id, packageId: pkg.id, amount: pkg.price, coins: pkg.coins });

    // 4. Cria a order no Mercado Pago. Valores monetários são STRING (number dá 400).
    const order = await mpOrder().create({
      body: {
        type: 'online',
        processing_mode: 'manual',   // valor fixo do Checkout Pro
        capture_mode: 'automatic',
        total_amount: pkg.price.toFixed(2),
        external_reference: String(local.id),
        description: `PokeWorld Universe — ${pkg.title}`,
        expiration_time: 'PT2H',
        payer: { email: user.email },
        items: [{ title: pkg.title, quantity: 1, unit_price: pkg.price.toFixed(2), unit_measure: 'unit' }],
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
