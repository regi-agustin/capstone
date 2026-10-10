-- ---------------------------------------------------------------------------
-- Training-data gate: raw AI recommendation behavior store.
--
-- Every recommendation exposure and customer choice is recorded here in its
-- raw state. Nothing in this table is training data until training/gate.py
-- validates, classifies and exports it.
--
-- Two independent eligibility lanes (never collapsed into one status):
--   label_status       Lane A - ranker training labels (strict; admin review)
--   interaction_status Lane B - CF/CB interactions (booking facts only)
--
-- A converted-but-contradicted row sits at label_status='pending' while its
-- interaction_status stays 'eligible': the booking really happened, only the
-- stated preference was noise. Raw rows train nothing.
--
-- Safe to run more than once: every statement is guarded.
-- ---------------------------------------------------------------------------

SET @has_table := (
  SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recommendation_logs'
);

SET @sql := IF(@has_table = 0,
  'CREATE TABLE `recommendation_logs` (
     `log_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
     `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
     `signature` char(64) NOT NULL,
     `client_id` int(10) unsigned DEFAULT NULL,
     `email` varchar(255) DEFAULT NULL,
     `passengers` smallint(5) unsigned NOT NULL DEFAULT 0,
     `days` int(10) unsigned NOT NULL DEFAULT 1,
     `budget` decimal(12,2) DEFAULT NULL,
     `luggage_size` varchar(10) DEFAULT NULL,
     `preferred_type` varchar(10) DEFAULT NULL,
     `shown_ids` text NOT NULL,
     `top_vehicle_id` int(10) unsigned DEFAULT NULL,
     `model_version` int(10) unsigned NOT NULL DEFAULT 0,
     `chosen_vehicle_id` int(10) unsigned DEFAULT NULL,
     `chosen_rank` tinyint(3) unsigned DEFAULT NULL,
     `picked_from` varchar(20) DEFAULT NULL,
     `chosen_at` datetime DEFAULT NULL,
     `reservation_id` int(10) unsigned DEFAULT NULL,
     `label_status` enum(''raw'',''pending'',''eligible'',''rejected'',''analysis_only'') NOT NULL DEFAULT ''raw'',
     `interaction_status` enum(''unknown'',''eligible'',''excluded'') NOT NULL DEFAULT ''unknown'',
     `data_class` varchar(32) NOT NULL DEFAULT ''unknown'',
     `reasons` text DEFAULT NULL,
     `reviewed_by` int(10) unsigned DEFAULT NULL,
     `reviewed_at` datetime DEFAULT NULL,
     `review_note` varchar(255) DEFAULT NULL,
     `validated_at` datetime DEFAULT NULL,
     PRIMARY KEY (`log_id`),
     KEY `idx_reclog_signature` (`signature`),
     KEY `idx_reclog_label` (`label_status`, `data_class`),
     KEY `idx_reclog_interaction` (`interaction_status`),
     KEY `idx_reclog_client` (`client_id`),
     KEY `idx_reclog_reservation` (`reservation_id`),
     CONSTRAINT `fk_reclog_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE,
     CONSTRAINT `fk_reclog_vehicle` FOREIGN KEY (`chosen_vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE SET NULL ON UPDATE CASCADE,
     CONSTRAINT `fk_reclog_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE SET NULL ON UPDATE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
