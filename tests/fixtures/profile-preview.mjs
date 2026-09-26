import { createApp } from '../../runtime/server.mjs';
import { appearanceUrl, selection } from '../../site/profile-catalog.js';
const account = { id: 90001, name: 'Treinador PWU', email: 'preview@example.invalid', avatar: 'assets/img/art/leon.png', coins: 0, diamondPoints: 0, plan: 'Conta Grátis', trainers: [], totp: true, totpPendente: false };
const server = createApp({ apiEnabled: true, emailAuthEnabled: true, loadHandler: async () => async (req, res) => {
  if (req.headers.authorization !== 'Bearer profile-local-test') return res.status(401).json({ error: 'Prévia sem autenticação.' });
  if (req.method === 'GET') return res.status(200).json(account);
  if (req.body.action === 'appearance' && selection(req.body.characterId, req.body.cardId)) {
    account.avatar = appearanceUrl(req.body.characterId, req.body.cardId);
    return res.status(200).json({ ok: true, avatar: account.avatar });
  }
  return res.status(400).json({error:'Ação não disponível nesta prévia local.'});
}});
// This isolated fixture has no production credentials. Simulate the website origin
// so browser checks can exercise saving; the production runtime remains unchanged.
server.prependListener('request', req => { req.headers.origin='https://pokeworlduniverse.com'; req.headers['sec-fetch-site']='same-origin'; });
server.listen(17941, '127.0.0.1', () => console.log('Prévia isolada do perfil: http://127.0.0.1:17941/perfil.html'));
