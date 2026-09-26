# Seleção de personagem e card do perfil

A página `perfil.html` permite selecionar o personagem e o fundo em abas independentes, visualizar a combinação e salvá-la na conta autenticada. A prévia e o avatar em `minha-conta.html` são quadrados, maiores e enquadram o rosto e o busto. O visual usa as cores, fontes e botões do site PWU.

## Catálogo

- Sete personagens únicos importados: Leon, Ash e Pikachu e cinco artes numeradas. As três cópias fornecidas de Leon tinham o mesmo SHA-256; somente uma foi importada.
- Três treinadoras já existentes foram preservadas: dez personagens ao todo.
- Cinco cards: Água, Luta, Pedra, Psíquico e Planta, além da opção sem card.
- As imagens PNG originais mantêm a transparência. O enquadramento usa SVG com proporção preservada, sem deformar a arte.

`site/profile-catalog.js` é a lista permitida compartilhada pelo editor, API e gerador. As 60 combinações estão versionadas em `assets/img/profile/portraits/4215a26d3fb6-v1/`. Cada SVG contém suas imagens, de modo que pode ser usado em uma tag `img` sem depender de sub-recursos externos. Não remova uma versão antiga enquanto contas ainda utilizarem seus caminhos.

Para acrescentar opções, edite o catálogo, aumente a revisão e execute `node tools/build-profile-avatars.mjs`. Os arquivos gerados fazem parte da entrega, sem compilação ou serviço adicional na hospedagem.

## Gravação e compatibilidade

`POST /api/account` com `action: appearance`, `characterId` e `cardId` exige a sessão existente. A API valida os dois identificadores e grava apenas o caminho da combinação em `accounts.image`, usando o ID autenticado e parâmetros SQL. IDs de conta e saldos enviados pelo navegador não determinam o destino da gravação.

Não há migração de banco ou alteração no servidor/cliente do jogo. A API anterior de avatar permanece compatível. O editor identifica as artes anteriores, protege contra respostas de outra sessão e somente confirma sucesso após resposta da API. Falhas de gravação preservam a seleção para uma nova tentativa.

O `ui.js` desta entrega também incorpora as correções de autenticação que já estavam publicadas na hospedagem (acesso por conta do jogo, confirmação por e-mail, token após TOTP e ausência de substituição por autenticação local/Supabase). Isso evita reintroduzir a versão mais antiga do Git ao entregar o novo editor.

## Verificação em 26/09/2026

- 54 testes offline aprovados: sete específicos do perfil e as verificações existentes de limites de pagamento e segurança. Os dois testes de integração Pix que exigem uma instância dedicada de MariaDB não foram repetidos nesta alteração de perfil.
- As 60 combinações são verificadas quanto a gravação na conta correta, existência do SVG e leitura de retorno. Valores adulterados, ausência de sessão, modo somente leitura, métodos indevidos e falha do banco são rejeitados.
- Nove verificações em Chrome: escolhas independentes, persistência após recarregar, restaurar, navegação por teclado, falha ao salvar, telas de 1440/768/390/320 px e avatar maior na conta. O banco e a autenticação dessas verificações usam dados locais fictícios; não são testes de escrita em contas de jogadores reais.
- Pacote de 81 arquivos conferido por SHA-256, testado em serviço temporário na hospedagem e publicado somente no serviço do site. Login, loja, proteção de rotas privadas e recusa de chamadas não autenticadas foram conferidos antes e depois.

Execução dos testes de perfil: `node --experimental-vm-modules --test tests/profile-appearance.test.mjs`.
