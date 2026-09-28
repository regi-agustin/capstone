-- Run once on existing fleetops_db installations to enable driver profile photos.
ALTER TABLE `drivers`
  ADD COLUMN IF NOT EXISTS `profile_image` varchar(255) DEFAULT NULL AFTER `address`;

-- Link demo driver account (skip if user_id 11 already exists).
-- INSERT INTO users (...) — prefer re-importing fleetops_db.sql for fresh setup.
