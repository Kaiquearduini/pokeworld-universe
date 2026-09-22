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

-- =====================================================================
-- Dispositivos autorizados (login em um PC novo pede código por e-mail).
-- O código em si é guardado na tabela `tokenvalidat`, que já existe.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `site_devices` (
  `account_id` INT(11)     NOT NULL,
  `device_id`  VARCHAR(64) NOT NULL,
  `label`      VARCHAR(120) DEFAULT NULL,
  `last_ip`    VARCHAR(45)  DEFAULT NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`, `device_id`),
  KEY `site_devices_account` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Verificação em duas etapas por aplicativo (Google Authenticator, Authy...)
-- O segredo fica aqui; enabled = 0 enquanto o jogador ainda não confirmou
-- o primeiro código.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `site_totp` (
  `account_id` INT(11)     NOT NULL,
  `secret`     VARCHAR(64) NOT NULL,
  `enabled`    TINYINT(1)  NOT NULL DEFAULT 0,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
