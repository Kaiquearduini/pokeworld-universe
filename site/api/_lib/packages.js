/**
 * Catálogo de pacotes de créditos do PokeWorld Universe.
 *
 * REGRA DE OURO: o preço e a quantidade de créditos vivem AQUI, no servidor.
 * O frontend manda só o `id` do pacote. Se o preço viesse do cliente,
 * qualquer pessoa compraria 1.950 créditos por R$ 1 com o DevTools aberto.
 *
 * Base: 1 crédito por R$ 1. O bônus é o degrau por faixa e já vem somado
 * em `credits` (o total que o jogador recebe).
 */

export const PACKAGES = {
  plus:    { id: 'plus',    title: '108 Créditos',   price: 100,  credits: 108,  bonusPct: 8  },
  premium: { id: 'premium', title: '168 Créditos',   price: 150,  credits: 168,  bonusPct: 12 },
  master:  { id: 'master',  title: '236 Créditos',   price: 200,  credits: 236,  bonusPct: 18 },
  ultra:   { id: 'ultra',   title: '500 Créditos',   price: 400,  credits: 500,  bonusPct: 25 },
  legend:  { id: 'legend',  title: '1.280 Créditos', price: 1000, credits: 1280, bonusPct: 28 },
  mythic:  { id: 'mythic',  title: '1.950 Créditos', price: 1500, credits: 1950, bonusPct: 30 },
};

export function getPackage(id) {
  const pkg = PACKAGES[id];
  if (!pkg) throw new Error(`Pacote inexistente: ${id}`);
  // `coins` fica como apelido de `credits` para o código que já usa esse nome.
  return { ...pkg, coins: pkg.credits };
}

/** Quanto de bônus o jogador ganhou, em créditos. Só para exibir no recibo. */
export function bonusCredits(pkg) {
  return pkg.credits - pkg.price;
}
