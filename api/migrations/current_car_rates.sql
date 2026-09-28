-- ---------------------------------------------------------------------------
-- Current Car Rates / Car Rate Management
--
-- Adds effective-dated vehicle rates, effective-dated vehicle->driver
-- assignments, and the payroll snapshot that freezes the rate actually used.
--
-- Safe to run more than once: every statement is guarded.
-- Mirrors the DDL already added to fleetops_db.sql.
-- ---------------------------------------------------------------------------

-- 1. Rate history (the open-ended row is the vehicle's current rate) --------
CREATE TABLE IF NOT EXISTS `vehicle_rate_history` (
  `rate_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(10) unsigned NOT NULL,
  `daily_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`rate_id`),
  KEY `idx_vrh_vehicle` (`vehicle_id`,`effective_from`),
  KEY `idx_vrh_range` (`vehicle_id`,`effective_from`,`effective_to`),
  CONSTRAINT `fk_vrh_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vrh_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Driver assignment per car code ---------------------------------------
CREATE TABLE IF NOT EXISTS `vehicle_driver_assignments` (
  `assignment_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(10) unsigned NOT NULL,
  `driver_id` int(10) unsigned NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`assignment_id`),
  KEY `idx_vda_vehicle` (`vehicle_id`,`effective_from`),
  KEY `idx_vda_driver` (`driver_id`,`effective_from`),
  CONSTRAINT `fk_vda_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vda_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vda_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Freeze the rate inputs on each payroll -------------------------------
-- Added after the fact so existing payroll rows simply keep a NULL snapshot
-- (their own payroll_trips.rental_rate remains the historical record).
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll' AND COLUMN_NAME = 'car_rate_snapshot'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE `payroll` ADD COLUMN `car_rate_snapshot` longtext DEFAULT NULL',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Backfill: seed one open-ended history row per vehicle from the rate that
--    is already stored on vehicles.daily_rate, so every existing car has a
--    history row without changing any amount that payroll already produced.
INSERT INTO `vehicle_rate_history` (`vehicle_id`, `daily_rate`, `effective_from`, `effective_to`, `created_by`)
SELECT v.vehicle_id, v.daily_rate, '1970-01-01', NULL, NULL
  FROM vehicles v
 WHERE NOT EXISTS (
       SELECT 1 FROM `vehicle_rate_history` h WHERE h.vehicle_id = v.vehicle_id
 );
