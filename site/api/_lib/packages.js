/**
 * Catálogo de pacotes de créditos do PokeWorld Universe.
 *
 * REGRA DE OURO: o preço e a quantidade de créditos vivem AQUI, no servidor.
 * O frontend manda só o `id` do pacote. Se o preço viesse do cliente,
 * qualquer pessoa compraria 1.950 créditos por R$ 1 com o DevTools aberto.
 *
 * Base: 1 crédito por R$ 1. O bônus é o degrau por faixa e já vem somado
 * em `credits` (o total que o jogador recebe).
 *
 * `num` é o que vai para `historico_pagamentos.id_pacote`, que no banco do
 * jogo é int(11): gravar 'ultra' ali falha (modo estrito) ou vira 0, e o
 * webhook deixa de reconhecer o pacote. A faixa 901+ não colide com os ids
 * da tabela `pacotes` da loja do jogo.
 */

export const PACKAGES = {
  plus:    { id: 'plus',    num: 901, title: '108 Créditos',   price: 100,  credits: 108,  bonusPct: 8  },
  premium: { id: 'premium', num: 902, title: '168 Créditos',   price: 150,  credits: 168,  bonusPct: 12 },
  master:  { id: 'master',  num: 903, title: '236 Créditos',   price: 200,  credits: 236,  bonusPct: 18 },
  ultra:   { id: 'ultra',   num: 904, title: '500 Créditos',   price: 400,  credits: 500,  bonusPct: 25 },
  legend:  { id: 'legend',  num: 905, title: '1.280 Créditos', price: 1000, credits: 1280, bonusPct: 28 },
  mythic:  { id: 'mythic',  num: 906, title: '1.950 Créditos', price: 1500, credits: 1950, bonusPct: 30 },
};

/** id textual ('ultra') a partir do número gravado no banco (904). */
export function packageIdFromNum(num) {
  const n = Number(num);
  const pkg = Object.values(PACKAGES).find((p) => p.num === n);
  return pkg ? pkg.id : null;
}

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
