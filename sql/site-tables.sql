-- =====================================================================
-- POKEWORLD UNIVERSE — tabela opcional usada só pelo site.
-- Rode uma vez no banco `poke`. Não altera nenhuma tabela do jogo.
--
-- Serve para o "ranking de ganho de experiência": guarda um retrato
-- diário da experiência de cada player, e o ranking mostra a diferença
-- entre o valor de agora e o do retrato mais recente.
--
-- Depois de criar, agende o retrato uma vez por dia chamando:
--   https://SEU-SITE/api/game?resource=snapshot&key=<CRON_SECRET>
-- =====================================================================

CREATE TABLE IF NOT EXISTS `site_exp_snapshots` (
  `player_id`  INT(11)    NOT NULL,
  `taken_on`   DATE       NOT NULL,
  `experience` BIGINT(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`player_id`, `taken_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Primeiro retrato, para o ranking já começar a funcionar hoje:
INSERT INTO `site_exp_snapshots` (`player_id`, `taken_on`, `experience`)
SELECT `id`, CURDATE(), `experience` FROM `players` WHERE `deletion` = 0
ON DUPLICATE KEY UPDATE `experience` = VALUES(`experience`);
