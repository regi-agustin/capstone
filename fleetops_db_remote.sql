-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: fleetops_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `action_logs`
--

DROP TABLE IF EXISTS `action_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `action_logs` (
  `log_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `action` varchar(50) NOT NULL,
  `details` varchar(500) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `idx_action_logs_user` (`user_id`),
  CONSTRAINT `fk_action_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `action_logs`
--

LOCK TABLES `action_logs` WRITE;
/*!40000 ALTER TABLE `action_logs` DISABLE KEYS */;
INSERT INTO `action_logs` VALUES (8,1,'UPDATE_ACCOUNT','Updated user account (user id 2, Role: driver_management_head).','2026-08-13 17:54:56'),(9,8,'Payroll','Set payroll 4 to paid','2026-08-14 04:32:10'),(10,1,'CREATE_ACCOUNT','Created user account: miggy basina (Role: payroll_officer, Email: basinamigo@gmail.com)','2026-08-14 11:27:18'),(11,8,'ATTENDANCE_MANUAL','Recorded attendance for driver 6 on 2026-08-14 (Verified)','2026-08-14 11:59:10'),(12,9,'BACKUP_CODES','Viewed backup codes','2026-08-14 11:59:10'),(13,9,'CHANGE_PASSWORD','Password changed','2026-08-14 11:59:10'),(14,9,'CHANGE_PASSWORD','Password changed','2026-08-14 11:59:10'),(15,8,'ATTENDANCE_MANUAL','Recorded attendance for driver 6 on 2026-08-14 (Verified)','2026-08-14 11:59:41'),(16,9,'CANCEL_BOOKING','Cancelled reservation  (pending)','2026-08-14 11:59:41'),(17,9,'BACKUP_CODES','Viewed backup codes','2026-08-14 11:59:41'),(18,9,'CHANGE_PASSWORD','Password changed','2026-08-14 11:59:41'),(19,9,'CHANGE_PASSWORD','Password changed','2026-08-14 11:59:41'),(20,8,'ATTENDANCE_MANUAL','Recorded attendance for driver 6 on 2026-08-14 (Verified)','2026-08-14 12:00:03'),(21,9,'CANCEL_BOOKING','Cancelled reservation 5 (pending)','2026-08-14 12:00:03'),(22,9,'BACKUP_CODES','Viewed backup codes','2026-08-14 12:00:03'),(23,9,'CHANGE_PASSWORD','Password changed','2026-08-14 12:00:03'),(24,9,'CHANGE_PASSWORD','Password changed','2026-08-14 12:00:03'),(25,1,'ARCHIVE_ACCOUNT','Archived user account: miggy basina (Role: payroll_officer)','2026-08-14 12:03:15'),(26,1,'UPDATE_ACCOUNT','Set account status to active (user id 10).','2026-08-14 12:03:18'),(27,1,'UPDATE_ACCOUNT','Set account status to suspended (user id 10).','2026-08-14 12:03:18'),(28,1,'UPDATE_ACCOUNT','Set account status to active (user id 10).','2026-08-14 12:03:19'),(29,1,'ARCHIVE_ACCOUNT','Archived user account: miggy basina (Role: payroll_officer)','2026-08-14 12:03:21'),(30,1,'ARCHIVE_ACCOUNT','Archived user account: macasinag (Role: billing_officer)','2026-08-14 12:03:28'),(31,1,'ARCHIVE_ACCOUNT','Archived user account: elena.reyes (Role: reservation_officer)','2026-08-14 12:03:29'),(32,1,'ARCHIVE_ACCOUNT','Archived user account: miggy.basina (Role: driver_management_head)','2026-08-14 12:03:30'),(33,1,'ARCHIVE_ACCOUNT','Archived user account: maria.santos (Role: payroll_officer)','2026-08-14 12:03:32'),(34,1,'UPDATE_ACCOUNT','Set account status to active (user id 10).','2026-08-14 12:07:48'),(35,1,'ARCHIVE_ACCOUNT','Archived user account: miggy basina (Role: payroll_officer)','2026-08-14 12:18:16'),(36,1,'ARCHIVE_ACCOUNT','Archived user account: charles.buque (Role: customer)','2026-08-14 12:18:18');
/*!40000 ALTER TABLE `action_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attendance` (
  `attendance_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `driver_id` int(10) unsigned NOT NULL,
  `vehicle_id` int(10) unsigned NOT NULL,
  `attendance_date` date NOT NULL,
  `time_in` time NOT NULL,
  `time_out` time DEFAULT NULL,
  `vehicle_image` varchar(255) DEFAULT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uk_attendance_driver_date` (`driver_id`,`attendance_date`),
  KEY `idx_attendance_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_attendance_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (7,6,3,'2026-08-14','08:00:00','17:00:00',NULL,'verified',NULL),(8,7,4,'2026-08-14','08:15:00','17:30:00',NULL,'verified',NULL),(9,8,5,'2026-08-14','07:45:00',NULL,NULL,'pending',NULL),(10,6,3,'2026-08-13','07:50:00','17:10:00',NULL,'verified',NULL),(11,7,4,'2026-08-13','08:05:00','17:20:00',NULL,'verified',NULL);
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing`
--

DROP TABLE IF EXISTS `billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing` (
  `billing_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `reservation_id` int(10) unsigned NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `invoice_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `vat` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL,
  `status` enum('draft','sent','partial','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
  PRIMARY KEY (`billing_id`),
  UNIQUE KEY `uk_billing_invoice` (`invoice_number`),
  KEY `idx_billing_reservation` (`reservation_id`),
  CONSTRAINT `fk_billing_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing`
--

LOCK TABLES `billing` WRITE;
/*!40000 ALTER TABLE `billing` DISABLE KEYS */;
/*!40000 ALTER TABLE `billing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `client_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `company_name` varchar(150) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email_address` varchar(100) DEFAULT NULL,
  `client_type` enum('corporate','individual') NOT NULL DEFAULT 'individual',
  `registration_date` date NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`client_id`),
  KEY `idx_clients_company` (`company_name`),
  KEY `idx_clients_user` (`user_id`),
  CONSTRAINT `fk_clients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (2,9,'Charles John Buque','Charles John Buque','0912 345 6789','charles.buque@email.com','individual','2026-08-14','active');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drivers` (
  `driver_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `fullname` varchar(100) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `license_expiry` date NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `is_unavailable` tinyint(1) NOT NULL DEFAULT 0,
  `hire_date` date NOT NULL,
  PRIMARY KEY (`driver_id`),
  UNIQUE KEY `uk_drivers_license` (`license_number`),
  KEY `idx_drivers_user` (`user_id`),
  CONSTRAINT `fk_drivers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (6,NULL,'Juan Dela Cruz','0917 111 2222','N01-23-456789','2027-05-10',NULL,'active',0,'2022-03-01'),(7,NULL,'Pedro Santos','0918 222 3333','N02-23-456790','2026-11-20',NULL,'active',0,'2022-07-15'),(8,NULL,'Ana Cruz','0919 333 4444','N03-23-456791','2028-01-30',NULL,'active',0,'2023-02-01'),(9,NULL,'Miguel Lopez','0920 444 5555','N04-23-456792','2026-09-25',NULL,'active',0,'2023-06-12'),(10,NULL,'Rosa Mendoza','0921 555 6666','N05-23-456793','2027-12-05',NULL,'active',0,'2024-01-08');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback` (
  `feedback_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `reservation_id` int(10) unsigned DEFAULT NULL,
  `rating` tinyint(3) unsigned NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`feedback_id`),
  KEY `idx_feedback_user` (`user_id`),
  KEY `idx_feedback_reservation` (`reservation_id`),
  CONSTRAINT `fk_feedback_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loans`
--

DROP TABLE IF EXISTS `loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `loans` (
  `loan_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `driver_id` int(10) unsigned NOT NULL,
  `loan_type` varchar(50) NOT NULL,
  `loan_amount` decimal(12,2) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `start_date` date NOT NULL,
  `monthly_deduction` decimal(12,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('active','paid','closed','defaulted') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`loan_id`),
  KEY `idx_loans_driver` (`driver_id`),
  CONSTRAINT `fk_loans_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loans`
--

LOCK TABLES `loans` WRITE;
/*!40000 ALTER TABLE `loans` DISABLE KEYS */;
/*!40000 ALTER TABLE `loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_sessions`
--

DROP TABLE IF EXISTS `login_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `login_sessions` (
  `session_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `device` varchar(120) NOT NULL,
  `location` varchar(120) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` enum('current','active','ended') NOT NULL DEFAULT 'active',
  `logged_in_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`session_id`),
  KEY `idx_login_sessions_user` (`user_id`),
  CONSTRAINT `fk_login_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_sessions`
--

LOCK TABLES `login_sessions` WRITE;
/*!40000 ALTER TABLE `login_sessions` DISABLE KEYS */;
INSERT INTO `login_sessions` VALUES (1,8,'Windows Â· Chrome','Pampanga, Philippines','192.168.1.10','active','2026-08-14 05:20:58'),(2,8,'Android Â· Chrome','Pampanga, Philippines','192.168.1.11','active','2026-08-14 03:20:58'),(3,8,'Windows Â· Edge','Pampanga, Philippines','192.168.1.12','active','2026-08-13 05:20:58'),(4,9,'Windows Â· Chrome','Pampanga, Philippines','192.168.1.20','active','2026-08-14 05:20:58'),(5,9,'Android Â· Chrome','Pampanga, Philippines','192.168.1.21','active','2026-08-14 02:20:58'),(6,9,'Windows Â· Edge','Pampanga, Philippines','192.168.1.22','active','2026-08-12 05:20:58'),(7,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 05:22:59'),(8,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 05:26:00'),(9,9,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 05:26:06'),(10,9,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 05:29:47'),(11,8,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 05:29:59'),(12,8,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 11:25:19'),(13,9,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 11:25:28'),(14,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 11:25:57'),(15,10,'Windows Â· Edge','Pampanga, Philippines','::1','current','2026-08-14 11:27:33'),(16,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 11:29:15'),(17,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 11:59:10'),(18,9,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 11:59:10'),(19,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 11:59:41'),(20,9,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 11:59:41'),(21,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 12:00:03'),(22,9,'Windows Â· Chrome','Pampanga, Philippines','::1','current','2026-08-14 12:00:03'),(23,8,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 12:00:28'),(24,8,'Windows Â· Edge','Pampanga, Philippines','::1','current','2026-08-14 12:01:41'),(25,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 12:02:29'),(26,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 12:02:40'),(27,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 12:03:07'),(28,1,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 12:07:06'),(29,1,'Windows Â· Chrome','Pampanga, Philippines','::1','active','2026-08-14 12:07:48'),(30,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 12:18:38'),(31,1,'Windows Â· Edge','Pampanga, Philippines','::1','active','2026-08-14 12:21:24'),(32,1,'Windows Â· Chrome','Pampanga, Philippines','::1','current','2026-08-14 12:25:00');
/*!40000 ALTER TABLE `login_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_logs`
--

DROP TABLE IF EXISTS `maintenance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_logs` (
  `maintenance_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(10) unsigned NOT NULL,
  `scheduled_date` date NOT NULL,
  `completed_date` date DEFAULT NULL,
  `service_type` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `mileage_at_service` decimal(10,2) DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  PRIMARY KEY (`maintenance_id`),
  KEY `idx_maintenance_vehicle` (`vehicle_id`),
  CONSTRAINT `fk_maintenance_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_logs`
--

LOCK TABLES `maintenance_logs` WRITE;
/*!40000 ALTER TABLE `maintenance_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `notification_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `type` enum('attendance_verified','attendance_rejected','payroll_released','reservation_confirmed','vehicle_updated','maintenance_due','system_alert','system_announcement') NOT NULL DEFAULT 'system_alert',
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,9,'reservation_confirmed','Reservation received','Your reservation BK-2026-0001 is awaiting approval.',1,'2026-08-14 04:14:11'),(2,8,'attendance_verified','OCR Attendance Verified','Ana Cruz attendance on 2026-08-14 has been verified.',1,'2026-08-14 04:30:05'),(3,8,'attendance_rejected','OCR Attendance Mismatch','Pedro Santos plate number mismatch on 2026-08-13. Entered: DEF 4567 | OCR: DEF 4567',1,'2026-08-14 04:30:05'),(4,8,'payroll_released','Payroll Record Updated','Juan Dela Cruz payroll record for the current cut-off was marked Completed.',1,'2026-08-14 04:30:05'),(5,8,'system_announcement','System Maintenance Schedule','Scheduled system maintenance is set for this weekend. Payroll features will be temporarily unavailable during the window.',0,'2026-08-14 05:21:20'),(6,8,'system_announcement','New Feature Update','Payroll and attendance enhancements are now live. Review the Help Center for details.',1,'2026-08-14 05:21:20'),(7,9,'system_announcement','System Maintenance Schedule','Scheduled system maintenance is set for this weekend. Booking features will be temporarily unavailable.',1,'2026-08-14 05:21:20');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `payment_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `billing_id` int(10) unsigned NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT current_timestamp(),
  `payment_method` enum('cash','bank_transfer','gcash','check','online') NOT NULL DEFAULT 'cash',
  `amount_paid` decimal(12,2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'completed',
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_billing` (`billing_id`),
  CONSTRAINT `fk_payments_billing` FOREIGN KEY (`billing_id`) REFERENCES `billing` (`billing_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll`
--

DROP TABLE IF EXISTS `payroll`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payroll` (
  `payroll_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `driver_id` int(10) unsigned NOT NULL,
  `payroll_date` date NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL,
  `allowances` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(12,2) NOT NULL,
  `loan_id` int(10) unsigned DEFAULT NULL,
  `status` enum('pending','paid','unpaid') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`payroll_id`),
  KEY `idx_payroll_driver` (`driver_id`),
  KEY `idx_payroll_loan` (`loan_id`),
  CONSTRAINT `fk_payroll_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_loan` FOREIGN KEY (`loan_id`) REFERENCES `loans` (`loan_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll`
--

LOCK TABLES `payroll` WRITE;
/*!40000 ALTER TABLE `payroll` DISABLE KEYS */;
INSERT INTO `payroll` VALUES (1,6,'2026-08-14',12000.00,1500.00,1000.00,12500.00,NULL,'paid'),(2,7,'2026-08-14',12000.00,1500.00,500.00,13000.00,NULL,'pending'),(3,8,'2026-08-14',12000.00,1000.00,500.00,12500.00,NULL,'pending');
/*!40000 ALTER TABLE `payroll` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll_reports`
--

DROP TABLE IF EXISTS `payroll_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payroll_reports` (
  `report_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_id` int(10) unsigned NOT NULL,
  `report_date` date NOT NULL,
  `total_employees` int(11) NOT NULL DEFAULT 0,
  `total_pay` decimal(14,2) NOT NULL DEFAULT 0.00,
  `generated_by` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `idx_reports_payroll` (`payroll_id`),
  KEY `idx_reports_generated_by` (`generated_by`),
  CONSTRAINT `fk_reports_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reports_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll_reports`
--

LOCK TABLES `payroll_reports` WRITE;
/*!40000 ALTER TABLE `payroll_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `payroll_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_recommendations`
--

DROP TABLE IF EXISTS `price_recommendations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `price_recommendations` (
  `price_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` int(10) unsigned NOT NULL,
  `suggested_price` decimal(12,2) NOT NULL,
  `pricing_factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pricing_factors`)),
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `review_status` enum('pending','accepted','modified','disregarded') NOT NULL DEFAULT 'pending',
  `final_price` decimal(12,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`price_id`),
  KEY `idx_price_vehicle` (`vehicle_id`),
  KEY `idx_price_reviewed_by` (`reviewed_by`),
  CONSTRAINT `fk_price_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_price_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_recommendations`
--

LOCK TABLES `price_recommendations` WRITE;
/*!40000 ALTER TABLE `price_recommendations` DISABLE KEYS */;
/*!40000 ALTER TABLE `price_recommendations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reservations` (
  `reservation_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `client_id` int(10) unsigned NOT NULL,
  `driver_id` int(10) unsigned DEFAULT NULL,
  `vehicle_id` int(10) unsigned DEFAULT NULL,
  `trip_code` varchar(20) DEFAULT NULL,
  `reservation_date` datetime NOT NULL DEFAULT current_timestamp(),
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `pickup_time` time DEFAULT NULL,
  `return_time` time DEFAULT NULL,
  `special_requests` varchar(500) DEFAULT NULL,
  `trip_purpose` varchar(255) DEFAULT NULL,
  `destination` varchar(255) DEFAULT NULL,
  `passengers` smallint(5) unsigned DEFAULT NULL,
  `luggage` varchar(100) DEFAULT NULL,
  `status` enum('pending','confirmed','on_trip','completed','cancelled','denied') NOT NULL DEFAULT 'pending',
  `denial_reason` varchar(255) DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `additional_charges` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`reservation_id`),
  KEY `idx_reservations_client` (`client_id`),
  KEY `idx_reservations_driver` (`driver_id`),
  KEY `idx_reservations_vehicle` (`vehicle_id`),
  KEY `idx_reservations_status_driver` (`status`,`driver_id`),
  KEY `idx_reservations_status_vehicle` (`status`,`vehicle_id`),
  CONSTRAINT `fk_reservations_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reservations_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reservations_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (2,2,NULL,3,'BK-2026-0001','2026-08-14 12:14:11','2026-08-17','2026-08-20','08:00:00','17:00:00',NULL,'Family trip','Clark Freeport Zone, Pampanga',7,NULL,'pending',NULL,7500.00,0.00),(4,2,NULL,NULL,'BK-2026-0004','2026-08-14 19:59:41','2026-08-16','2026-08-17','09:00:00','17:00:00','verify-cancel','Clark Freeport Zone','Clark Freeport Zone',2,NULL,'cancelled',NULL,5000.00,0.00),(5,2,NULL,NULL,'BK-2026-0005','2026-08-14 20:00:03','2026-08-16','2026-08-17','09:00:00','17:00:00','verify-cancel','Clark Freeport Zone','Clark Freeport Zone',2,NULL,'cancelled',NULL,5000.00,0.00);
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_settings`
--

DROP TABLE IF EXISTS `security_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `security_settings` (
  `user_id` int(10) unsigned NOT NULL,
  `face_recognition_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `two_factor_method` varchar(40) NOT NULL DEFAULT 'Authenticator App (TOTP)',
  `login_notifications_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `backup_codes_total` int(11) NOT NULL DEFAULT 10,
  `backup_codes_used` int(11) NOT NULL DEFAULT 0,
  `backup_codes` text DEFAULT NULL,
  `password_strength` varchar(15) NOT NULL DEFAULT 'Strong',
  `last_security_check` date DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_security_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_settings`
--

LOCK TABLES `security_settings` WRITE;
/*!40000 ALTER TABLE `security_settings` DISABLE KEYS */;
INSERT INTO `security_settings` VALUES (1,0,1,'Authenticator App (TOTP)',1,10,2,NULL,'Strong','2026-08-14','2026-08-14 05:20:58'),(2,0,1,'Authenticator App (TOTP)',1,10,2,NULL,'Strong','2026-08-14','2026-08-14 05:20:58'),(3,0,1,'Authenticator App (TOTP)',1,10,2,NULL,'Strong','2026-08-14','2026-08-14 05:20:58'),(4,0,1,'Authenticator App (TOTP)',1,10,2,NULL,'Strong','2026-08-14','2026-08-14 05:20:58'),(8,0,1,'Authenticator App (TOTP)',1,10,2,NULL,'Strong','2026-08-14','2026-08-14 05:20:58'),(9,1,1,'Authenticator App (TOTP)',1,10,0,'SHZU-2J8B-2RFV,KDMQ-EANX-NBT7,3KQ4-UTUT-GLNE,2R32-XYVE-5556,AZUN-SJQE-BV5M,HKML-BEFT-3DTU,UU4S-WX2A-BCFK,DZNQ-LQ64-UB5Q,KVYQ-ZYMH-646T,PGQ9-ECLQ-X3P2','Strong','2026-08-14','2026-08-14 11:59:10');
/*!40000 ALTER TABLE `security_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_logs`
--

DROP TABLE IF EXISTS `trip_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_logs` (
  `log_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `driver_id` int(10) unsigned NOT NULL,
  `vehicle_id` int(10) unsigned NOT NULL,
  `reservation_id` int(10) unsigned DEFAULT NULL,
  `trip_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time DEFAULT NULL,
  `start_location` varchar(255) DEFAULT NULL,
  `end_location` varchar(255) DEFAULT NULL,
  `gps_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gps_data`)),
  `trip_distance` decimal(8,2) DEFAULT NULL,
  `expenses` decimal(12,2) NOT NULL DEFAULT 0.00,
  `remarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_trip_driver` (`driver_id`),
  KEY `idx_trip_vehicle` (`vehicle_id`),
  KEY `idx_trip_reservation` (`reservation_id`),
  CONSTRAINT `fk_trip_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`driver_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trip_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`reservation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_trip_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`vehicle_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_logs`
--

LOCK TABLES `trip_logs` WRITE;
/*!40000 ALTER TABLE `trip_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_permissions` (
  `permission_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `scope` varchar(30) NOT NULL,
  `action` varchar(30) NOT NULL,
  `is_allowed` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_user_scope_action` (`user_id`,`scope`,`action`),
  KEY `idx_permissions_user` (`user_id`),
  CONSTRAINT `fk_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
INSERT INTO `user_permissions` VALUES (13,3,'Home','View',1),(14,3,'Reservations','View',1),(15,3,'Reservations','Add',1),(16,3,'Reservations','Edit',1),(17,3,'Reservations','Delete',1),(18,4,'Home','View',1),(19,4,'Billing','View',1),(20,4,'Billing','Add',1),(21,4,'Billing','Edit',1),(22,4,'Billing','Delete',1),(23,4,'Payroll','View',1),(41,2,'Home','View',1),(42,2,'Drivers','View',1),(43,2,'Drivers','Add',1),(44,2,'Drivers','Edit',1),(45,2,'Drivers','Delete',1),(46,2,'Fleet','View',1),(47,2,'Fleet','Add',1),(48,2,'Fleet','Edit',1),(49,2,'Fleet','Delete',1),(50,2,'Assignments','View',1),(51,2,'Assignments','Add',1),(52,2,'Assignments','Delete',1),(53,8,'Home','View',1),(54,8,'Payroll','View',1),(55,8,'Payroll','Add',1),(56,8,'Payroll','Edit',1),(57,8,'Drivers','View',1),(58,8,'Attendance','View',1),(59,10,'Home','View',1),(60,10,'Payroll','View',1);
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_preferences` (
  `user_id` int(10) unsigned NOT NULL,
  `language` varchar(30) NOT NULL DEFAULT 'English',
  `date_format` varchar(30) NOT NULL DEFAULT 'MMM D, YYYY',
  `time_format` varchar(30) NOT NULL DEFAULT '12-hour (AM/PM)',
  `timezone` varchar(60) NOT NULL DEFAULT '(GMT+08:00) Asia/Manila',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_preferences`
--

LOCK TABLES `user_preferences` WRITE;
/*!40000 ALTER TABLE `user_preferences` DISABLE KEYS */;
INSERT INTO `user_preferences` VALUES (1,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila'),(2,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila'),(3,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila'),(4,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila'),(8,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila'),(9,'English','MMM D, YYYY','12-hour (AM/PM)','(GMT+08:00) Asia/Manila');
/*!40000 ALTER TABLE `user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `role` enum('superadmin','admin','reservation_officer','driver_management_head','payroll_officer','billing_officer','driver','auditor','customer') NOT NULL DEFAULT 'driver',
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `is_verified` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','System Administrator',NULL,NULL,'superadmin','active',1,'2026-08-13 14:26:54'),(2,'miggy.basina','845979227e62e26330f60f62a762b1cb5da65af27d120cac7cf99b1c4b5f4078','Miggy Basina','basina.mi.bsinfotech@gmail.com','09492549864','driver_management_head','inactive',1,'2026-08-13 14:26:54'),(3,'elena.reyes','04ef8cc3a64588a48373bc2553524c78e0f8dc09b41992c0b587e39a59749316','Elena Reyes',NULL,NULL,'reservation_officer','inactive',1,'2026-08-13 14:26:54'),(4,'macasinag','e007fbdc563042ac6aa9dcdfc979b2a8233938d600c412c2b2ad00a273ddd0d1','Macasinag',NULL,NULL,'billing_officer','inactive',1,'2026-08-13 14:26:54'),(8,'maria.santos','ae73ed7baa283dcfb004d4b855041c27f8d913bc4bd9ffc9929f176e86343498','Maria Santos','maria.santos@hollydot.com','0917 555 1234','payroll_officer','inactive',1,'2026-08-14 04:14:11'),(9,'charles.buque','a2b629e293f5efea6939928836e8482520a804d68586919fd58d98cee36a4d5b','Charles John Buque','charles.buque@email.com','0912 345 6789','customer','inactive',1,'2026-08-14 04:14:11'),(10,'miggy basina','845979227e62e26330f60f62a762b1cb5da65af27d120cac7cf99b1c4b5f4078','Miguel IÃ±igo S. Basina','basinamigo@gmail.com','09492549864','payroll_officer','inactive',1,'2026-08-14 11:27:18');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_owners`
--

DROP TABLE IF EXISTS `vehicle_owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_owners` (
  `owner_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `owner_name` varchar(100) NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `email_address` varchar(100) DEFAULT NULL,
  `bank_account` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `registration_date` date NOT NULL,
  PRIMARY KEY (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_owners`
--

LOCK TABLES `vehicle_owners` WRITE;
/*!40000 ALTER TABLE `vehicle_owners` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_owners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_pricing`
--

DROP TABLE IF EXISTS `vehicle_pricing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicle_pricing` (
  `vehicle_type` varchar(30) NOT NULL,
  `base_daily_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `weekly_discount_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `weekend_surcharge_pct` decimal(5,2) NOT NULL DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`vehicle_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_pricing`
--

LOCK TABLES `vehicle_pricing` WRITE;
/*!40000 ALTER TABLE `vehicle_pricing` DISABLE KEYS */;
INSERT INTO `vehicle_pricing` VALUES ('AUV',2500.00,0.00,0.00,'2026-08-13 14:26:54'),('L300',4000.00,0.00,0.00,'2026-08-13 14:26:54'),('SUV',3500.00,0.00,0.00,'2026-08-13 16:52:21');
/*!40000 ALTER TABLE `vehicle_pricing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vehicles` (
  `vehicle_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `plate_number` varchar(20) NOT NULL,
  `model` varchar(100) NOT NULL,
  `vehicle_type` varchar(30) NOT NULL DEFAULT 'AUV',
  `daily_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `seats` smallint(5) unsigned NOT NULL DEFAULT 5,
  `year` year(4) NOT NULL,
  `color` varchar(30) DEFAULT NULL,
  `owner_id` int(10) unsigned DEFAULT NULL,
  `status` enum('available','reserved','on_trip','maintenance','inactive') NOT NULL DEFAULT 'available',
  `purchase_date` date DEFAULT NULL,
  PRIMARY KEY (`vehicle_id`),
  UNIQUE KEY `uk_vehicles_plate` (`plate_number`),
  KEY `idx_vehicles_owner` (`owner_id`),
  CONSTRAINT `fk_vehicles_owner` FOREIGN KEY (`owner_id`) REFERENCES `vehicle_owners` (`owner_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (3,'ABC 1234','Toyota Innova','MPV',2500.00,7,2021,NULL,NULL,'available','2022-01-15'),(4,'BCD 2345','Mitsubishi Xpander','MPV',2300.00,7,2022,NULL,NULL,'available','2022-06-20'),(5,'CDE 3456','Toyota Veloz','MPV',2300.00,7,2023,NULL,NULL,'available','2023-03-10'),(6,'DEF 4567','Toyota Fortuner','SUV',3800.00,7,2021,NULL,NULL,'available','2021-11-05'),(7,'EFG 5678','Honda City','Sedan',1800.00,5,2022,NULL,NULL,'available','2022-09-01'),(8,'FGH 6789','Nissan Urban','Van',4000.00,15,2020,NULL,NULL,'available','2020-05-15'),(9,'GHI 7890','Hyundai Starex','Van',3500.00,12,2019,NULL,NULL,'available','2019-08-22'),(10,'HIJ 8901','Toyota Hiace','Van',4200.00,15,2022,NULL,NULL,'available','2022-02-14');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 21:09:09
