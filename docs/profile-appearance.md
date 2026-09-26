# Seleção de personagem e card do perfil

A página `perfil.html` oferece cinco personagens em uma aba e cinco cards de fundo, mais a opção sem card, em outra. A prévia é um card vertical 3:4 com a arte completa disponível. Foram retirados da seleção Leon, Ash/Pikachu e as três treinadoras, conforme pedido do usuário. Arquivos de versões anteriores continuam disponíveis para não quebrar fotos já salvas.

Os nomes escolhidos por semelhança visual são Wattson (arte 1), Koga (arte 2), Giovanni (arte 3), Acerola (arte 4) e Bruno (arte 5). São nomes atribuídos a artes personalizadas; não uma confirmação da identidade original pelo artista. Referência consultada: https://www.artofpkm.com/characters, incluindo as páginas /characters/wattson/cards, /characters/304/artwork, /characters/giovanni, /characters/acerola e /characters/303/secondary_cards.

A prévia não contém nome, descrição ou legenda abaixo da arte. O rodapé mantém os botões e só exibe mensagens quando existe uma operação ou um resultado a informar. Erros de salvamento continuam visíveis.

## Foto no cabeçalho

O topo usa um retrato quadrado de 44 px com cantos arredondados, borda dourada e enquadramento individual do rosto. O fundo continua sendo o mesmo card escolhido. A página da conta usa o card vertical inteiro. As imagens originais não foram deformadas ou modificadas; os enquadramentos são feitos com SVG e viewBox.

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
