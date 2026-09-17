/**
 * Diagnóstico do servidor: diz o que já está configurado, sem revelar
 * nenhum valor. Só booleanos e prefixos de chave pública.
 * GET /api/health
 */
import { gameConfigured } from './_lib/gamedb.js';

export default async function handler(req, res) {
  const has = (k) => !!(process.env[k] && String(process.env[k]).trim());
  const modo = (k, p) => (has(k) ? (String(process.env[k]).startsWith(p) ? 'producao' : 'teste') : null);

  let banco = { configurado: gameConfigured(), conecta: null, erro: null };
  if (banco.configurado) {
    try {
      const { one } = await import('./_lib/gamedb.js');
      const r = await one('SELECT COUNT(*) AS n FROM accounts');
      banco.conecta = true;
      banco.contas = Number((r && r.n) || 0);
    } catch (e) {
      banco.conecta = false;
      banco.erro = String(e.message || e).slice(0, 160);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    mercadopago: { token: has('MP_ACCESS_TOKEN'), modo: modo('MP_ACCESS_TOKEN', 'APP_USR-'), webhookSecret: has('MP_WEBHOOK_SECRET') },
    stripe: { secret: has('STRIPE_SECRET_KEY'), modo: modo('STRIPE_SECRET_KEY', 'sk_live_'), publica: has('STRIPE_PUBLIC_KEY'), webhookSecret: has('STRIPE_WEBHOOK_SECRET') },
    sessao: has('SESSION_SECRET'),
    appUrl: process.env.APP_URL || null,
    bancoDoJogo: banco
  });
}
