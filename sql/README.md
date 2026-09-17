# Banco do jogo (poke) — o que o site usa

O site lê e escreve direto no banco MariaDB do servidor do Pokeworld.
Não há banco paralelo: a conta criada no site é a conta do jogo, e os
coins comprados caem em `accounts.pontos`, que o cliente já lê.

## Tabelas usadas (todas já existem no seu dump)

| Tabela | Para quê |
|---|---|
| `accounts` | login e cadastro do site · saldo em `pontos` |
| `players` | treinadores da conta, ranking, time em `pokemons` |
| `players_online` | quantos estão online agora |
| `server_config` | recorde de jogadores (`players_record`) |
| `guilds`, `guild_members` | ranking de guildas |
| `player_deaths` | ranking de mortes |
| `noticias` | notícias do site |
| `pacotes` | pacotes da loja |
| `historico_pagamentos` | pedidos de coins (Mercado Pago e Stripe) |
| `historico_mp` | log dos avisos recebidos do Mercado Pago |
| `suporte` | tickets abertos em Minha Conta |
| `config_inicio`, `download` | links de download e redes sociais |

## Como o pagamento grava

1. O jogador escolhe o pacote → o site cria uma linha em `historico_pagamentos`
   com `status = 0`, `entregue = 0` e `valor` = coins do pacote.
2. O provedor confirma o pagamento e chama o webhook.
3. O webhook faz `UPDATE ... SET status = 1, entregue = 1 WHERE entregue = 0`.
   Se não afetar nenhuma linha, outro aviso já creditou e nada acontece.
   É essa trava que impede crédito em dobro quando o provedor reenvia.
4. Na mesma transação: `UPDATE accounts SET pontos = pontos + valor`.

## Tabela opcional

`site-tables.sql` cria `site_exp_snapshots`, usada só pelo ranking de
"ganho de experiência" (guarda um retrato diário da experiência).
Sem ela, esse ranking aparece vazio com um aviso; os outros três funcionam.
