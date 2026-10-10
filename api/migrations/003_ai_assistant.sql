-- ---------------------------------------------------------------------------
-- AI Assistant (vehicle recommendation model)
--
-- Adds the vehicle luggage capacity used by the recommender's hard filter
-- and training features, then backfills sensible per-type defaults.
--
-- Safe to run more than once: every statement is guarded.
-- ---------------------------------------------------------------------------

-- 1. Luggage capacity (pieces of luggage the vehicle can carry) -------------
SET @has_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'luggage_capacity'
);
SET @sql := IF(@has_col = 0,
  'ALTER TABLE `vehicles` ADD COLUMN `luggage_capacity` smallint(5) unsigned NOT NULL DEFAULT 0 AFTER `seats`',
  'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Backfill: type-based defaults for rows that still carry 0 --------------
--    (L300 = van, SUV = mid-size, AUV = compact)
UPDATE `vehicles`
   SET `luggage_capacity` = CASE `vehicle_type`
         WHEN 'L300' THEN 12
         WHEN 'SUV'  THEN 6
         ELSE 4
       END
 WHERE `luggage_capacity` = 0;
