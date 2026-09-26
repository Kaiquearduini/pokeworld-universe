# Seleção de personagem e card do perfil

A página `perfil.html` oferece personagens e cards em abas independentes. Cada aba mostra três opções por vez em uma única linha horizontal, com setas, rolagem nativa e indicador da faixa visível. O catálogo atual tem cinco personagens e cinco cards, mais a opção sem card. A prévia é um card vertical 3:4 com a arte completa disponível. Foram retirados da seleção Leon, Ash/Pikachu e as três treinadoras, conforme pedido do usuário. Arquivos de versões anteriores continuam disponíveis para não quebrar fotos já salvas.

Os nomes escolhidos por semelhança visual são Wattson (arte 1), Koga (arte 2), Giovanni (arte 3), Acerola (arte 4) e Bruno (arte 5). São nomes atribuídos a artes personalizadas; não uma confirmação da identidade original pelo artista. Referência consultada: https://www.artofpkm.com/characters, incluindo as páginas /characters/wattson/cards, /characters/304/artwork, /characters/giovanni, /characters/acerola e /characters/303/secondary_cards.

A prévia não contém nome, descrição ou legenda abaixo da arte. O rodapé mantém os botões e só exibe mensagens quando existe uma operação ou um resultado a informar. Erros de salvamento continuam visíveis.

## Foto no cabeçalho

O topo usa blocos alinhados de 44 px para foto, nome e Sair. A foto mantém a moldura dourada e o recorte do rosto; o nome recebe uma moldura dourada discreta. Nomes compridos são abreviados visualmente e a navegação reserva espaço para a área do usuário. No celular, o nome fica oculto conforme o comportamento anterior. O fundo continua sendo o mesmo card escolhido. A página da conta usa o card vertical inteiro. As imagens originais não foram deformadas ou modificadas; os enquadramentos são feitos com SVG e viewBox.

Ao abrir o site, a foto salva no servidor atualiza uma sessão local antiga. A resposta inicial é descartada se o usuário já trocou de sessão, saiu ou salvou uma foto enquanto a leitura estava pendente. O nome no cabeçalho é inserido como texto, sem interpolação de HTML.

## Catálogo, geração e persistência

`site/profile-catalog.js` é a lista permitida compartilhada entre editor, API e gerador. A revisão `4215a26d3fb6-v3` inclui 30 composições verticais em `assets/img/profile/portraits/` e 30 retratos em `assets/img/profile/faces/`. Cada SVG incorpora os PNGs para funcionar como imagem independente no navegador. Não remova arquivos antigos enquanto existirem contas referenciando seus caminhos.

Para acrescentar opções, edite o catálogo, altere a revisão e execute `node tools/build-profile-avatars.mjs`. Os assets já são entregues prontos para a hospedagem.

`POST /api/account`, com `action: appearance`, valida personagem e card e grava somente `accounts.image` da conta autenticada. O banco continua usando a permissão específica UPDATE(image), corrigida na entrega anterior. Não há migração de dados, mudanças de saldo, nem alteração no cliente/servidor do jogo nesta entrega.

## Validação em 26/09/2026 — revisão v3

- 56 testes offline aprovados, incluindo nove do perfil e as verificações existentes de segurança e limites dos pagamentos.
- Integração real com MariaDB local isolado, TLS e HTTP autenticado: 30 combinações salvas e relidas; outra conta e saldos preservados; dados inválidos e ausência de sessão/MFA recusados.
- Dez cenários no Chrome: remoções, ausência dos textos, seleção independente, salvar/recarregar/restaurar, teclado, erro de gravação, sessão local antiga, respostas atrasadas após salvar/sair, card inteiro na conta e rosto no topo. Cinco larguras: 320, 390, 768, 1024 e 1440 px, sem transbordamento.
- Os testes de escrita usam contas fictícias locais. Não foram feitas gravações em contas reais nem pagamentos reais.
- Os testes de integração Pix dedicados ao transporte do jogo não foram executados nesta alteração de perfil. A seleção inicial do transporte na suíte offline foi recusada por falta da configuração da fixture, antes de qualquer teste; a suíte apropriada foi executada separadamente com sucesso.
- Na hospedagem: comparação SHA-256 com os arquivos atuais, cópia preservada da versão anterior, teste em serviço temporário e checagem após ativação. As diferenças nas demais páginas publicadas foram preservadas; somente sete arquivos existentes do perfil/cabeçalho e 60 novos SVGs foram publicados.

Teste unitário: `node --experimental-vm-modules --test tests/profile-appearance.test.mjs`.
Integração real: `tests/profile-database.integration.mjs`, restrita à fixture em `127.0.0.1:13316`, com as variáveis de configuração apropriadas.

## Layout compacto — revisão v4, 26/09/2026

- `profile-carousel.js` mantém três opções visíveis, independentemente do tamanho do catálogo. Setas avançam por grupos de três; toque e barra de rolagem usam o movimento nativo. Home/End e setas do teclado alcançam qualquer opção. A seleção salva reaparece na faixa visível quando se abre a aba ou restaura a prévia. O fim da rolagem e as mudanças de tamanho alinham novamente as opções.
- Personagens e cards mantêm escolhas independentes; navegar pelas setas não salva nem troca a seleção.
- Os banners de Minha conta e Foto de perfil ficaram compactos, com título em uma linha e a identidade visual preservada. O card e os dados passam a aparecer mais cedo na tela. Demais banners não foram alterados.
- Testes em sete larguras (320, 390, 768, 1024, 1280, 1440 e 1920 px): três opções completas por faixa, setas e teclado, nome/foto/Sair alinhados, menu sem sobreposição, nomes longos contidos, ausência de transbordamento da página e banner abaixo de 210 px. A primeira ficha da conta começa antes de 350 px nos tamanhos verificados.
- Catálogos fictícios com 45 personagens e 45 cards foram testados em desktop e celular, sem novas linhas e com a última opção acessível. O catálogo real permanece com cinco personagens.
- Dez cenários anteriores de seleção/salvamento/erros/sessão continuam passando. As 56 verificações offline existentes passaram. Banco, autenticação e pagamentos não foram alterados; a integração com MariaDB da revisão v3 não precisou ser repetida para esta alteração de layout.
- Somente sete arquivos do site foram publicados, com conferência de hashes, estágio temporário, backup e verificações HTTPS posteriores. A revisão dos SVGs permanece v3; nenhuma imagem foi regenerada.

Para reproduzir o teste visual, inicie a fixture local com `node tests/fixtures/profile-preview.mjs` e execute `node tests/profile-layout.browser.mjs` com Playwright e Chrome disponíveis. A variável opcional `PWU_PLAYWRIGHT_MODULE` informa a URL de um módulo Playwright já instalado. A fixture usa apenas 127.0.0.1:17941 e dados fictícios; evidências são gravadas numa pasta temporária.


## Moldura e banner — revisão v5, 26/09/2026

A foto vertical da conta e a prévia do editor agora usam a mesma borda dourada de 2 px do retrato no cabeçalho. A composição continua inteira e sem deformação. O banner agrupa a navegação e o selo numa linha com quebra responsiva; título, textura, degradê e detalhe luminoso permanecem. O espaço acima dos dados foi reduzido.

Verificações desta revisão: dez cenários de seleção, salvamento local, erros e sessão; sete larguras de 320 a 1920 px; banner entre 118 e 135 px e início da conta entre 200 e 307 px. Carrosséis de três opções, teclado, redimensionamento e catálogos fictícios com 45 opções continuam passando. A borda da foto grande foi comparada à borda do topo no navegador. Nenhum erro JavaScript detectado.

Somente quatro arquivos de apresentação publicados após comparação da versão anterior, backup e teste temporário na hospedagem. Os arquivos públicos foram conferidos por HTTPS após ativação. As folhas de estilo alteradas usam `profile-20260926-v5`; imagens e scripts preservam suas revisões existentes. Esta revisão não altera API, banco, autenticação, pagamentos ou jogo. Os testes de integração com banco da revisão v3 não foram repetidos para este ajuste de apresentação.
