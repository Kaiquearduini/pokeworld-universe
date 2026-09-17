/**
 * Pedidos de coins — gravados no banco do jogo (`historico_pagamentos`)
 * e creditados em `accounts.pontos`, que é o saldo que o cliente do
 * Pokeworld lê. Sem banco paralelo: o pagamento cai direto no jogo.
 *
 * Semântica das colunas (a tabela já existia no schema do servidor):
 *   payment_id   id da order do Mercado Pago (ORD...)
 *   tipo         'mercadopago'
 *   account_id   conta que comprou
 *   currency     'BRL'
 *   valor        coins creditados (já com o bônus)
 *   id_pacote    pacote do catálogo (api/_lib/packages.js)
 *   status       0 pendente · 1 pago
 *   entregue     0 não creditado · 1 creditado  <- trava de idempotência
 */
import { q, one, run, tx } from './gamedb.js';

/** Cria o pedido local ANTES de chamar o Mercado Pago, com status pendente. */
export async function createLocalOrder({ userId, packageId, amount, coins }) {
  const r = await run(
    `INSERT INTO historico_pagamentos
       (payment_id, tipo, account_id, player_id, currency, valor, id_pacote, multiplicador, promocional_id, status, entregue, date_created)
     VALUES ('', 'mercadopago', ?, 0, 'BRL', ?, ?, 1.0, 0, 0, 0, NOW())`,
    [userId, coins, String(packageId).slice(0, 10)]
  );
  return { id: r.insertId, package_id: packageId, amount, coins, status: 'pending' };
}

/** Guarda o id da order do Mercado Pago (ORD...) no pedido local. */
export async function attachMpOrderId(localOrderId, mpOrderId) {
  await run('UPDATE historico_pagamentos SET payment_id = ? WHERE id = ?', [String(mpOrderId), localOrderId]);
}

export async function findOrderByMpId(mpOrderId) {
  const r = await one(
    'SELECT id, account_id, valor, id_pacote, status, entregue FROM historico_pagamentos WHERE payment_id = ? LIMIT 1',
    [String(mpOrderId)]
  );
  if (!r) return null;
  return {
    id: r.id,
    account_id: r.account_id,
    coins: Number(r.valor || 0),
    package_id: String(r.id_pacote || ''),
    status: Number(r.entregue) === 1 ? 'paid' : 'pending'
  };
}

/**
 * Marca como pago e credita os coins — NA MESMA TRANSAÇÃO.
 *
 * A trava é o `WHERE entregue = 0`: se não afetar nenhuma linha, outro webhook
 * já creditou. É isso que torna seguro o reenvio do Mercado Pago (a cada 15 min
 * até receber 200) e dois webhooks simultâneos.
 */
export async function markPaidAndCredit(localOrderId, { mpPaymentId }) {
  return tx(async (conn) => {
    const [upd] = await conn.execute(
      'UPDATE historico_pagamentos SET status = 1, entregue = 1 WHERE id = ? AND entregue = 0',
      [localOrderId]
    );
    if (!upd.affectedRows) return false;               // já creditado por outro webhook

    const [rows] = await conn.execute(
      'SELECT account_id, valor FROM historico_pagamentos WHERE id = ? LIMIT 1',
      [localOrderId]
    );
    const p = rows[0];
    if (!p) return false;

    await conn.execute('UPDATE accounts SET pontos = pontos + ? WHERE id = ?', [Number(p.valor || 0), p.account_id]);
    if (mpPaymentId) {
      await conn.execute('UPDATE historico_pagamentos SET qrcode = ? WHERE id = ?', [String(mpPaymentId).slice(0, 250), localOrderId]);
    }
    return true;
  });
}

/** Log cru do que o Mercado Pago mandou. Nunca derruba o webhook. */
export async function logWebhookEvent({ mpOrderId, action, payload }) {
  try {
    await run(
      `INSERT INTO historico_mp (payment_id, account_id, valor, multiplicador, promocional_id, status, date_created, create_admin_id)
       VALUES (?, 0, 0, 1, 0, 0, CURDATE(), 0)`,
      [String(mpOrderId || action || '').slice(0, 250)]
    );
  } catch (e) { console.warn('[webhook] não consegui gravar o log', e.message); }
}

/** Últimas compras da conta, para mostrar em Minha Conta. */
export async function listOrders(accountId, limit = 10) {
  return q(
    `SELECT id, payment_id, valor, id_pacote, status, entregue, date_created
       FROM historico_pagamentos WHERE account_id = ? AND tipo = 'mercadopago'
      ORDER BY id DESC LIMIT ${Number(limit)}`,
    [accountId]
  );
}
