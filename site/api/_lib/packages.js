/**
 * Catálogo de pacotes de coins do PokeWorld Universe.
 *
 * REGRA DE OURO: o preço e a quantidade de coins vivem AQUI, no servidor.
 * O frontend manda só o `id` do pacote. Se o preço vier do cliente,
 * qualquer pessoa compra 20.000 coins por R$ 1 com o DevTools aberto.
 *
 * Base: 10 coins por R$ 1. O bônus é o degrau por faixa.
 */

export const PACKAGES = {
  starter:  { id: 'starter',  title: '100 Coins',    price: 10,   coins: 100,    bonusPct: 0  },
  basic:    { id: 'basic',    title: '500 Coins',    price: 50,   coins: 500,    bonusPct: 0  },
  plus:     { id: 'plus',     title: '1.080 Coins',  price: 100,  coins: 1080,   bonusPct: 8  },
  premium:  { id: 'premium',  title: '1.680 Coins',  price: 150,  coins: 1680,   bonusPct: 12 },
  master:   { id: 'master',   title: '2.360 Coins',  price: 200,  coins: 2360,   bonusPct: 18 },
  ultra:    { id: 'ultra',    title: '5.000 Coins',  price: 400,  coins: 5000,   bonusPct: 25 },
  legend:   { id: 'legend',   title: '12.800 Coins', price: 1000, coins: 12800,  bonusPct: 28 },
  mythic:   { id: 'mythic',   title: '19.500 Coins', price: 1500, coins: 19500,  bonusPct: 30 },
};

export function getPackage(id) {
  const pkg = PACKAGES[id];
  if (!pkg) throw new Error(`Pacote inexistente: ${id}`);
  return pkg;
}

/** Quanto de bônus o jogador ganhou, em coins. Só pra exibir no recibo/e-mail. */
export function bonusCoins(pkg) {
  return pkg.coins - pkg.price * 10;
}
