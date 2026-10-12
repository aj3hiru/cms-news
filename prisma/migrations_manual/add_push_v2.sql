-- Push notifications v2: subscriber details (device / OS / browser / state), imported key sets, segments,
-- per-notification segment and icon. Additive only: no table or row is removed or changed.
-- The app also adds these by itself on first use (lib/push/schema.ts), so running this by hand is optional.

ALTER TABLE `push_subscriptions`
  ADD COLUMN `key_id` INT NULL,
  ADD COLUMN `device` VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN `os` VARCHAR(30) NOT NULL DEFAULT '',
  ADD COLUMN `browser` VARCHAR(30) NOT NULL DEFAULT '',
  ADD COLUMN `region` VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN `city` VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN `lang` VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN `tz` VARCHAR(60) NOT NULL DEFAULT '',
  ADD COLUMN `updated_at` DATETIME(3) NULL,
  ADD INDEX `idx_push_geo` (`country`, `region`);

ALTER TABLE `push_campaigns`
  ADD COLUMN `segment_id` INT NULL,
  ADD COLUMN `segment_name` VARCHAR(120) NULL,
  ADD COLUMN `icon` VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS `push_keys` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `public_key` VARCHAR(255) NOT NULL,
  `private_key` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_keys_public_key_key` (`public_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_segments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `rules` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
