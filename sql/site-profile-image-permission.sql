-- Correção exclusiva da imagem de perfil do site.
-- Aplicar com o administrador do banco no host que já contém poke2.
-- Não concede alteração de saldo, senha, personagens ou configuração do jogo.
GRANT UPDATE (image) ON poke2.accounts TO 'pwu_site_app'@'localhost';
