-- ============================================================================
--  FleetOps: An AI-Driven Fleet Operations System
--  Database Schema for Hollydot Car Rental
--  Target: MySQL 8.x (phpMyAdmin)
--  Import: phpMyAdmin -> Import -> choose this file (or paste into SQL tab)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS fleetops_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fleetops_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS billing;
DROP TABLE IF EXISTS payroll_reports;
DROP TABLE IF EXISTS payroll;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS trip_logs;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS vehicle_owners;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS maintenance_logs;
DROP TABLE IF EXISTS price_recommendations;
DROP TABLE IF EXISTS vehicle_pricing;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS action_logs;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  SECTION A: CORE TABLES (from the ERD)
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. users  (ERD: User)  - holds ALL login accounts, RBAC via `role`
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,        -- SHA-256 hashed password
  fullname      VARCHAR(100) NOT NULL,
  email         VARCHAR(100) NULL,
  contact_number VARCHAR(20) NULL,
  role          ENUM('superadmin','admin','reservation_officer',
                     'driver_management_head','payroll_officer',
                     'billing_officer','driver','auditor','customer')
                NOT NULL DEFAULT 'driver',
  status        ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  2. vehicle_owners  (ERD: Vehicle Owners) - owners of subcontracted vehicles
-- ----------------------------------------------------------------------------
CREATE TABLE vehicle_owners (
  owner_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_name        VARCHAR(100) NOT NULL,
  contact_number    VARCHAR(20)  NOT NULL,
  email_address     VARCHAR(100) DEFAULT NULL,
  bank_account      VARCHAR(50)  DEFAULT NULL,
  status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
  registration_date DATE NOT NULL,
  PRIMARY KEY (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  3. vehicles  (ERD: Vehicles) - owner_id NULL = company-owned (internal)
-- ----------------------------------------------------------------------------
CREATE TABLE vehicles (
  vehicle_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  plate_number  VARCHAR(20) NOT NULL,
  model         VARCHAR(100) NOT NULL,
  year          YEAR NOT NULL,
  color         VARCHAR(30) DEFAULT NULL,
  owner_id      INT UNSIGNED DEFAULT NULL,    -- NULL = internal vehicle
  status        ENUM('available','reserved','on_trip','maintenance','inactive')
                NOT NULL DEFAULT 'available',
  purchase_date DATE DEFAULT NULL,
  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uk_vehicles_plate (plate_number),
  KEY idx_vehicles_owner (owner_id),
  CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id)
    REFERENCES vehicle_owners (owner_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  4. drivers  (ERD: Drivers) - user_id links the driver to their login
-- ----------------------------------------------------------------------------
CREATE TABLE drivers (
  driver_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED DEFAULT NULL,  -- login account (role = 'driver')
  fullname        VARCHAR(100) NOT NULL,
  contact_number  VARCHAR(20)  NOT NULL,
  license_number  VARCHAR(50)  NOT NULL,
  license_expiry  DATE NOT NULL,
  address         VARCHAR(255) DEFAULT NULL,
  status          ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  hire_date       DATE NOT NULL,
  PRIMARY KEY (driver_id),
  UNIQUE KEY uk_drivers_license (license_number),
  KEY idx_drivers_user (user_id),
  CONSTRAINT fk_drivers_user FOREIGN KEY (user_id)
    REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  5. clients  (ERD: Clients)
-- ----------------------------------------------------------------------------
CREATE TABLE clients (
  client_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name      VARCHAR(150) NOT NULL,
  contact_person    VARCHAR(100) DEFAULT NULL,
  contact_number    VARCHAR(20)  DEFAULT NULL,
  email_address     VARCHAR(100) DEFAULT NULL,
  client_type       ENUM('corporate','individual') NOT NULL DEFAULT 'individual',
  registration_date DATE NOT NULL,
  status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (client_id),
  KEY idx_clients_company (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  6. reservations  (ERD: Reservations)
-- ----------------------------------------------------------------------------
CREATE TABLE reservations (
  reservation_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id        INT UNSIGNED NOT NULL,
  driver_id        INT UNSIGNED DEFAULT NULL,
  vehicle_id       INT UNSIGNED DEFAULT NULL,
  reservation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  trip_purpose     VARCHAR(255) DEFAULT NULL,
  status           ENUM('pending','confirmed','on_trip','completed','cancelled')
                   NOT NULL DEFAULT 'pending',
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (reservation_id),
  KEY idx_reservations_client (client_id),
  KEY idx_reservations_driver (driver_id),
  KEY idx_reservations_vehicle (vehicle_id),
  KEY idx_reservations_status_driver (status, driver_id),
  KEY idx_reservations_status_vehicle (status, vehicle_id),
  CONSTRAINT fk_reservations_client FOREIGN KEY (client_id)
    REFERENCES clients (client_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (driver_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reservations_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  7. trip_logs  (ERD: Trip Logs) - a trip may exist without a reservation
-- ----------------------------------------------------------------------------
CREATE TABLE trip_logs (
  log_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver_id      INT UNSIGNED NOT NULL,
  vehicle_id     INT UNSIGNED NOT NULL,
  reservation_id INT UNSIGNED DEFAULT NULL,
  trip_date      DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME DEFAULT NULL,
  start_location VARCHAR(255) DEFAULT NULL,
  end_location   VARCHAR(255) DEFAULT NULL,
  gps_data       JSON DEFAULT NULL,           -- GPS coordinates / trace
  trip_distance  DECIMAL(8,2) DEFAULT NULL,   -- kilometers
  expenses       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  remarks        VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (log_id),
  KEY idx_trip_driver (driver_id),
  KEY idx_trip_vehicle (vehicle_id),
  KEY idx_trip_reservation (reservation_id),
  CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_trip_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_trip_reservation FOREIGN KEY (reservation_id)
    REFERENCES reservations (reservation_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  8. loans  (ERD: Loans) - cash advances / cooperative loans of drivers
-- ----------------------------------------------------------------------------
CREATE TABLE loans (
  loan_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver_id         INT UNSIGNED NOT NULL,
  loan_type         VARCHAR(50) NOT NULL,     -- 'Cash Advance', 'Cooperative Loan', ...
  loan_amount       DECIMAL(12,2) NOT NULL,
  interest_rate     DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- percent
  start_date        DATE NOT NULL,
  monthly_deduction DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status            ENUM('active','paid','closed','defaulted') NOT NULL DEFAULT 'active',
  PRIMARY KEY (loan_id),
  KEY idx_loans_driver (driver_id),
  CONSTRAINT fk_loans_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  9. payroll  (ERD: Payroll) - one row per driver per pay period
-- ----------------------------------------------------------------------------
CREATE TABLE payroll (
  payroll_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver_id    INT UNSIGNED NOT NULL,
  payroll_date DATE NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  deductions   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_salary   DECIMAL(12,2) NOT NULL,
  loan_id      INT UNSIGNED DEFAULT NULL,     -- active loan being deducted
  status       ENUM('pending','paid','unpaid') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (payroll_id),
  KEY idx_payroll_driver (driver_id),
  KEY idx_payroll_loan (loan_id),
  CONSTRAINT fk_payroll_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_payroll_loan FOREIGN KEY (loan_id)
    REFERENCES loans (loan_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  10. payroll_reports  (ERD: Payroll Reports)
-- ----------------------------------------------------------------------------
CREATE TABLE payroll_reports (
  report_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  payroll_id      INT UNSIGNED NOT NULL,
  report_date     DATE NOT NULL,
  total_employees INT NOT NULL DEFAULT 0,
  total_pay       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  generated_by    INT UNSIGNED DEFAULT NULL,  -- users.user_id (AdminID in ERD)
  PRIMARY KEY (report_id),
  KEY idx_reports_payroll (payroll_id),
  KEY idx_reports_generated_by (generated_by),
  CONSTRAINT fk_reports_payroll FOREIGN KEY (payroll_id)
    REFERENCES payroll (payroll_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by)
    REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  11. billing  (ERD: Billing) - one invoice per reservation
-- ----------------------------------------------------------------------------
CREATE TABLE billing (
  billing_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id INT UNSIGNED NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date   DATE NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  vat            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount   DECIMAL(12,2) NOT NULL,
  status         ENUM('draft','sent','partial','paid','overdue','cancelled')
                 NOT NULL DEFAULT 'draft',
  PRIMARY KEY (billing_id),
  UNIQUE KEY uk_billing_invoice (invoice_number),
  KEY idx_billing_reservation (reservation_id),
  CONSTRAINT fk_billing_reservation FOREIGN KEY (reservation_id)
    REFERENCES reservations (reservation_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  12. payments  (ERD: Payments) - payments against an invoice
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
  payment_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  billing_id       INT UNSIGNED NOT NULL,
  payment_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_method   ENUM('cash','bank_transfer','gcash','check','online')
                   NOT NULL DEFAULT 'cash',
  amount_paid      DECIMAL(12,2) NOT NULL,
  reference_number VARCHAR(100) DEFAULT NULL,
  status           ENUM('pending','completed','failed','refunded')
                   NOT NULL DEFAULT 'completed',
  PRIMARY KEY (payment_id),
  KEY idx_payments_billing (billing_id),
  CONSTRAINT fk_payments_billing FOREIGN KEY (billing_id)
    REFERENCES billing (billing_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
--  SECTION B: EXTRA TABLES (NOT in the ERD - for features from the paper)
--  Attendance / Notifications / Feedback / Maintenance / Price Recommendations
-- ============================================================================

-- ----------------------------------------------------------------------------
--  13. attendance  - driver attendance w/ OCR plate-verification status
-- ----------------------------------------------------------------------------
CREATE TABLE attendance (
  attendance_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  driver_id          INT UNSIGNED NOT NULL,
  vehicle_id         INT UNSIGNED NOT NULL,
  attendance_date    DATE NOT NULL,
  time_in            TIME NOT NULL,
  time_out           TIME DEFAULT NULL,
  vehicle_image      VARCHAR(255) DEFAULT NULL,  -- uploaded plate photo path
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason   VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (attendance_id),
  UNIQUE KEY uk_attendance_driver_date (driver_id, attendance_date),
  KEY idx_attendance_vehicle (vehicle_id),
  CONSTRAINT fk_attendance_driver FOREIGN KEY (driver_id)
    REFERENCES drivers (driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  14. notifications  - real-time notifications for users
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  type            ENUM('attendance_verified','attendance_rejected',
                       'payroll_released','reservation_confirmed',
                       'vehicle_updated','maintenance_due','system_alert',
                       'system_announcement')
                  NOT NULL DEFAULT 'system_alert',
  title           VARCHAR(150) NOT NULL,
  description     TEXT DEFAULT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES users (user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  15. feedback  - ratings & comments from customers and employees
-- ----------------------------------------------------------------------------
CREATE TABLE feedback (
  feedback_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED DEFAULT NULL,   -- customer/employee submitting
  reservation_id INT UNSIGNED DEFAULT NULL,
  rating       TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT DEFAULT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (feedback_id),
  KEY idx_feedback_user (user_id),
  KEY idx_feedback_reservation (reservation_id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id)
    REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_feedback_reservation FOREIGN KEY (reservation_id)
    REFERENCES reservations (reservation_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  16. maintenance_logs  - service history + predictive maintenance input
-- ----------------------------------------------------------------------------
CREATE TABLE maintenance_logs (
  maintenance_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id      INT UNSIGNED NOT NULL,
  scheduled_date  DATE NOT NULL,
  completed_date  DATE DEFAULT NULL,
  service_type    VARCHAR(100) NOT NULL,
  description     TEXT DEFAULT NULL,
  cost            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  mileage_at_service DECIMAL(10,2) DEFAULT NULL,
  status          ENUM('scheduled','in_progress','completed','cancelled')
                  NOT NULL DEFAULT 'scheduled',
  PRIMARY KEY (maintenance_id),
  KEY idx_maintenance_vehicle (vehicle_id),
  CONSTRAINT fk_maintenance_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  17. price_recommendations  - XGBoost dynamic pricing suggestions
-- ----------------------------------------------------------------------------
CREATE TABLE price_recommendations (
  price_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id      INT UNSIGNED NOT NULL,
  suggested_price DECIMAL(12,2) NOT NULL,
  pricing_factors JSON DEFAULT NULL,          -- demand, seasonality, holidays, ...
  reviewed_by     INT UNSIGNED DEFAULT NULL,  -- admin who accepted/modified/rejected
  review_status   ENUM('pending','accepted','modified','disregarded')
                  NOT NULL DEFAULT 'pending',
  final_price     DECIMAL(12,2) DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (price_id),
  KEY idx_price_vehicle (vehicle_id),
  KEY idx_price_reviewed_by (reviewed_by),
  CONSTRAINT fk_price_vehicle FOREIGN KEY (vehicle_id)
    REFERENCES vehicles (vehicle_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_price_reviewed_by FOREIGN KEY (reviewed_by)
    REFERENCES users (user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
--  Default accounts
--  NOTE: all passwords are SHA-256 hashed, matching what the app stores.
-- ============================================================================
INSERT INTO users (username, password_hash, fullname, role)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
        'System Administrator', 'superadmin');

-- Demo account: Driver Management Head (password: "fleetops123")
INSERT INTO users (username, password_hash, fullname, role)
VALUES ('miggy.basina', 'cee62b2378fbd190e90f5a22d37962c9640cd189860dbb8405b6fca33705f019',
        'Miggy Basina', 'driver_management_head');

-- Demo account: Reservation Officer (password: "rental2026")
INSERT INTO users (username, password_hash, fullname, role)
VALUES ('elena.reyes', '04ef8cc3a64588a48373bc2553524c78e0f8dc09b41992c0b587e39a59749316',
        'Elena Reyes', 'reservation_officer');

-- Demo account: Billing Officer (password: "billing2026")
INSERT INTO users (username, password_hash, fullname, role)
VALUES ('macasinag', 'e007fbdc563042ac6aa9dcdfc979b2a8233938d600c412c2b2ad00a273ddd0d1',
        'Macasinag', 'billing_officer');

-- Demo account: Payroll Officer (password: "payroll2026")
INSERT INTO users (username, password_hash, fullname, email, contact_number, role)
VALUES ('maria.santos', 'ae73ed7baa283dcfb004d4b855041c27f8d913bc4bd9ffc9929f176e86343498',
        'Maria Santos', 'maria.santos@hollydot.com', '0917 555 1234', 'payroll_officer');

-- Demo account: Customer (password: "customer2026")
INSERT INTO users (username, password_hash, fullname, email, contact_number, role)
VALUES ('charles.buque', 'a2b629e293f5efea6939928836e8482520a804d68586919fd58d98cee36a4d5b',
        'Charles John Buque', 'charles.buque@email.com', '0912 345 6789', 'customer');

-- ----------------------------------------------------------------------------
--  vehicle_pricing - admin-managed pricing rules per vehicle type
--  (base daily rate + rule-based overrides: weekly discount, weekend surcharge)
-- ----------------------------------------------------------------------------
CREATE TABLE vehicle_pricing (
  vehicle_type          VARCHAR(30) NOT NULL,
  base_daily_rate       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  weekly_discount_pct   DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  weekend_surcharge_pct DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (vehicle_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vehicle_pricing (vehicle_type, base_daily_rate) VALUES
('AUV', 2500.00), ('SUV', 3500.00), ('L300', 4000.00);

-- ----------------------------------------------------------------------------
--  user_permissions - fine-grained RBAC (CenSys UserPermission pattern)
--  one row per (user, scope, action); Super Admin bypasses all checks
-- ----------------------------------------------------------------------------
CREATE TABLE user_permissions (
  permission_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  scope         VARCHAR(30)  NOT NULL,
  action        VARCHAR(30)  NOT NULL,
  is_allowed    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (permission_id),
  UNIQUE KEY uk_user_scope_action (user_id, scope, action),
  KEY idx_permissions_user (user_id),
  CONSTRAINT fk_permissions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  action_logs - audit trail for account management and system actions
--  (CenSys ActionLog pattern)
-- ----------------------------------------------------------------------------
CREATE TABLE action_logs (
  log_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  action     VARCHAR(50)  NOT NULL,
  details    VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_action_logs_user (user_id),
  CONSTRAINT fk_action_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Baseline permission grants for the demo accounts
-- (Super Admin is bypassed and needs none; the module heads get their own scopes)
INSERT INTO user_permissions (user_id, scope, action)
SELECT u.user_id, p.scope, p.action
FROM users u
JOIN (
  -- Miggy Basina (driver_management_head): driver & fleet management
  SELECT 'miggy.basina' AS username, 'Home' AS scope, 'View' AS action UNION ALL
  SELECT 'miggy.basina', 'Drivers', 'View' UNION ALL
  SELECT 'miggy.basina', 'Drivers', 'Add' UNION ALL
  SELECT 'miggy.basina', 'Drivers', 'Edit' UNION ALL
  SELECT 'miggy.basina', 'Drivers', 'Delete' UNION ALL
  SELECT 'miggy.basina', 'Fleet', 'View' UNION ALL
  SELECT 'miggy.basina', 'Fleet', 'Add' UNION ALL
  SELECT 'miggy.basina', 'Fleet', 'Edit' UNION ALL
  SELECT 'miggy.basina', 'Fleet', 'Delete' UNION ALL
  SELECT 'miggy.basina', 'Assignments', 'View' UNION ALL
  SELECT 'miggy.basina', 'Assignments', 'Add' UNION ALL
  SELECT 'miggy.basina', 'Assignments', 'Delete' UNION ALL
  -- Elena Reyes (reservation_officer): reservations
  SELECT 'elena.reyes', 'Home', 'View' UNION ALL
  SELECT 'elena.reyes', 'Reservations', 'View' UNION ALL
  SELECT 'elena.reyes', 'Reservations', 'Add' UNION ALL
  SELECT 'elena.reyes', 'Reservations', 'Edit' UNION ALL
  SELECT 'elena.reyes', 'Reservations', 'Delete' UNION ALL
  -- Macasinag (billing_officer): billing & payments
  SELECT 'macasinag', 'Home', 'View' UNION ALL
  SELECT 'macasinag', 'Billing', 'View' UNION ALL
  SELECT 'macasinag', 'Billing', 'Add' UNION ALL
  SELECT 'macasinag', 'Billing', 'Edit' UNION ALL
  SELECT 'macasinag', 'Billing', 'Delete' UNION ALL
  SELECT 'macasinag', 'Payroll', 'View' UNION ALL
  -- Maria Santos (payroll_officer): payroll, attendance, driver records
  SELECT 'maria.santos', 'Home', 'View' UNION ALL
  SELECT 'maria.santos', 'Payroll', 'View' UNION ALL
  SELECT 'maria.santos', 'Payroll', 'Add' UNION ALL
  SELECT 'maria.santos', 'Payroll', 'Edit' UNION ALL
  SELECT 'maria.santos', 'Drivers', 'View' UNION ALL
  SELECT 'maria.santos', 'Attendance', 'View'
) p ON u.username = p.username;

-- Demo customer linked to a client record, so the customer portal has a profile.
INSERT INTO clients (user_id, company_name, contact_person, contact_number, email_address, client_type, registration_date, status)
SELECT u.user_id, 'Charles John Buque', 'Charles John Buque', '0912 345 6789', 'charles.buque@email.com', 'individual', CURDATE(), 'active'
FROM users u WHERE u.username = 'charles.buque';

-- ----------------------------------------------------------------------------
--  Demo data: fleet, drivers, attendance, payroll (for the customer & payroll portals)
-- ----------------------------------------------------------------------------
INSERT INTO vehicles (plate_number, model, year, vehicle_type, daily_rate, seats, status, purchase_date) VALUES
('ABC 1234', 'Toyota Innova',    2021, 'MPV',   2500.00, 7,  'available', '2022-01-15'),
('BCD 2345', 'Mitsubishi Xpander', 2022, 'MPV', 2300.00, 7,  'available', '2022-06-20'),
('CDE 3456', 'Toyota Veloz',     2023, 'MPV',   2300.00, 7,  'available', '2023-03-10'),
('DEF 4567', 'Toyota Fortuner',  2021, 'SUV',   3800.00, 7,  'available', '2021-11-05'),
('EFG 5678', 'Honda City',       2022, 'Sedan', 1800.00, 5,  'available', '2022-09-01'),
('FGH 6789', 'Nissan Urban',     2020, 'Van',   4000.00, 15, 'available', '2020-05-15'),
('GHI 7890', 'Hyundai Starex',   2019, 'Van',   3500.00, 12, 'available', '2019-08-22'),
('HIJ 8901', 'Toyota Hiace',     2022, 'Van',   4200.00, 15, 'available', '2022-02-14');

-- One pending reservation for the demo customer (picks the first seeded vehicle)
INSERT INTO reservations (client_id, vehicle_id, start_date, end_date, pickup_time, return_time, trip_purpose, destination, passengers, status, total_amount, trip_code)
SELECT c.client_id, v.vehicle_id, DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY), '08:00:00', '17:00:00',
       'Family trip', 'Clark Freeport Zone, Pampanga', 7, 'pending', 7500.00, 'BK-2026-0001'
FROM clients c
JOIN users u ON u.user_id = c.user_id AND u.username = 'charles.buque'
CROSS JOIN vehicles v
WHERE v.plate_number = (SELECT plate_number FROM vehicles ORDER BY vehicle_id LIMIT 1);

INSERT INTO drivers (fullname, contact_number, license_number, license_expiry, status, hire_date) VALUES
('Juan Dela Cruz', '0917 111 2222', 'N01-23-456789', '2027-05-10', 'active', '2022-03-01'),
('Pedro Santos',   '0918 222 3333', 'N02-23-456790', '2026-11-20', 'active', '2022-07-15'),
('Ana Cruz',       '0919 333 4444', 'N03-23-456791', '2028-01-30', 'active', '2023-02-01'),
('Miguel Lopez',   '0920 444 5555', 'N04-23-456792', '2026-09-25', 'active', '2023-06-12'),
('Rosa Mendoza',   '0921 555 6666', 'N05-23-456793', '2027-12-05', 'active', '2024-01-08');

INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out, verification_status)
SELECT d.driver_id, v.vehicle_id, CURDATE(), '07:58:00', '17:02:00', 'verified'
FROM drivers d CROSS JOIN vehicles v
WHERE d.fullname = 'Juan Dela Cruz' AND v.plate_number = 'ABC 1234';

INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out, verification_status)
SELECT d.driver_id, v.vehicle_id, CURDATE(), '08:15:00', '17:30:00', 'verified'
FROM drivers d CROSS JOIN vehicles v
WHERE d.fullname = 'Pedro Santos' AND v.plate_number = 'BCD 2345';

INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out, verification_status)
SELECT d.driver_id, v.vehicle_id, CURDATE(), '07:45:00', NULL, 'pending'
FROM drivers d CROSS JOIN vehicles v
WHERE d.fullname = 'Ana Cruz' AND v.plate_number = 'CDE 3456';

INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out, verification_status)
SELECT d.driver_id, v.vehicle_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:50:00', '17:10:00', 'verified'
FROM drivers d CROSS JOIN vehicles v
WHERE d.fullname = 'Juan Dela Cruz' AND v.plate_number = 'ABC 1234';

INSERT INTO attendance (driver_id, vehicle_id, attendance_date, time_in, time_out, verification_status)
SELECT d.driver_id, v.vehicle_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:05:00', '17:20:00', 'verified'
FROM drivers d CROSS JOIN vehicles v
WHERE d.fullname = 'Pedro Santos' AND v.plate_number = 'BCD 2345';

INSERT INTO payroll (driver_id, payroll_date, basic_salary, allowances, deductions, net_salary, status)
SELECT d.driver_id, CURDATE(), 12000.00, 1500.00, 1000.00, 12500.00, 'paid'
FROM drivers d WHERE d.fullname = 'Juan Dela Cruz';

INSERT INTO payroll (driver_id, payroll_date, basic_salary, allowances, deductions, net_salary, status)
SELECT d.driver_id, CURDATE(), 12000.00, 1500.00, 500.00, 13000.00, 'pending'
FROM drivers d WHERE d.fullname = 'Pedro Santos';

INSERT INTO payroll (driver_id, payroll_date, basic_salary, allowances, deductions, net_salary, status)
SELECT d.driver_id, CURDATE(), 12000.00, 1000.00, 500.00, 12500.00, 'pending'
FROM drivers d WHERE d.fullname = 'Ana Cruz';

INSERT INTO notifications (user_id, type, title, description)
SELECT u.user_id, 'reservation_confirmed', 'Reservation received', 'Your reservation BK-2026-0001 is awaiting approval.'
FROM users u WHERE u.username = 'charles.buque';

INSERT INTO notifications (user_id, type, title, description, is_read)
SELECT u.user_id, 'attendance_verified', 'OCR Attendance Verified', 'Ana Cruz attendance on the current date has been verified.', 1
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO notifications (user_id, type, title, description, is_read)
SELECT u.user_id, 'attendance_rejected', 'OCR Attendance Mismatch', 'Pedro Santos plate number mismatch. Entered: DEF 4567 | OCR: DEF 4567', 0
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO notifications (user_id, type, title, description, is_read)
SELECT u.user_id, 'payroll_released', 'Payroll Record Updated', 'Juan Dela Cruz payroll record for the current cut-off was marked Completed.', 0
FROM users u WHERE u.username = 'maria.santos';

-- ============================================================================
--  GUI EXTENSIONS (columns the web dashboard needs; not in the original ERD)
-- ============================================================================
ALTER TABLE vehicles
  ADD COLUMN vehicle_type VARCHAR(30) NOT NULL DEFAULT 'AUV' AFTER model;

ALTER TABLE vehicles
  ADD COLUMN daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER vehicle_type;

ALTER TABLE vehicles
  ADD COLUMN seats SMALLINT UNSIGNED NOT NULL DEFAULT 5 AFTER daily_rate;

ALTER TABLE drivers
  ADD COLUMN is_unavailable TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

ALTER TABLE reservations
  MODIFY COLUMN status ENUM('pending','confirmed','on_trip','completed','cancelled','denied')
  NOT NULL DEFAULT 'pending';

ALTER TABLE reservations
  ADD COLUMN trip_code    VARCHAR(20)  DEFAULT NULL AFTER vehicle_id,
  ADD COLUMN destination  VARCHAR(255) DEFAULT NULL AFTER trip_purpose,
  ADD COLUMN passengers   SMALLINT UNSIGNED DEFAULT NULL AFTER destination,
  ADD COLUMN luggage      VARCHAR(100) DEFAULT NULL AFTER passengers;

ALTER TABLE reservations
  ADD COLUMN pickup_time  TIME DEFAULT NULL AFTER end_date,
  ADD COLUMN return_time  TIME DEFAULT NULL AFTER pickup_time,
  ADD COLUMN special_requests VARCHAR(500) DEFAULT NULL AFTER return_time,
  ADD COLUMN denial_reason    VARCHAR(255) DEFAULT NULL AFTER status,
  ADD COLUMN additional_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount;

-- Customer portal: link clients to their login account (mirrors drivers.user_id)
ALTER TABLE clients
  ADD COLUMN user_id INT UNSIGNED DEFAULT NULL AFTER client_id,
  ADD KEY idx_clients_user (user_id),
  ADD CONSTRAINT fk_clients_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
--  GUI EXTENSIONS (part 2): security settings, login sessions, preferences
--  Backs the data shown on the customer + payroll dashboards.
-- ============================================================================
ALTER TABLE users
  ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER status;

CREATE TABLE security_settings (
  user_id                    INT UNSIGNED NOT NULL,
  face_recognition_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
  two_factor_enabled         TINYINT(1)   NOT NULL DEFAULT 0,
  two_factor_method          VARCHAR(40)  NOT NULL DEFAULT 'Authenticator App (TOTP)',
  login_notifications_enabled TINYINT(1)  NOT NULL DEFAULT 1,
  backup_codes_total         INT          NOT NULL DEFAULT 10,
  backup_codes_used          INT          NOT NULL DEFAULT 0,
  password_strength          VARCHAR(15)  NOT NULL DEFAULT 'Strong',
  last_security_check        DATE         DEFAULT NULL,
  updated_at                 TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_security_settings_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_sessions (
  session_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  device       VARCHAR(120) NOT NULL,
  location     VARCHAR(120) NOT NULL,
  ip_address   VARCHAR(45)  DEFAULT NULL,
  status       ENUM('current','active','ended') NOT NULL DEFAULT 'active',
  logged_in_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  KEY idx_login_sessions_user (user_id),
  CONSTRAINT fk_login_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_preferences (
  user_id     INT UNSIGNED NOT NULL,
  language    VARCHAR(30)  NOT NULL DEFAULT 'English',
  date_format VARCHAR(30)  NOT NULL DEFAULT 'MMM D, YYYY',
  time_format VARCHAR(30)  NOT NULL DEFAULT '12-hour (AM/PM)',
  timezone    VARCHAR(60)  NOT NULL DEFAULT '(GMT+08:00) Asia/Manila',
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default security settings + preferences for every account
INSERT INTO security_settings (user_id, face_recognition_enabled, two_factor_enabled,
                               login_notifications_enabled, backup_codes_used, last_security_check)
SELECT user_id,
       CASE WHEN role = 'customer' THEN 1 ELSE 0 END,
       1,
       1,
       2,
       CURDATE()
FROM users;

INSERT INTO user_preferences (user_id)
SELECT user_id FROM users;

-- Sample login activity for the demo accounts
INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Windows · Chrome', 'Pampanga, Philippines', '192.168.1.10', 'current', NOW()
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Android · Chrome', 'Pampanga, Philippines', '192.168.1.11', 'active', NOW() - INTERVAL 2 HOUR
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Windows · Edge', 'Pampanga, Philippines', '192.168.1.12', 'active', NOW() - INTERVAL 1 DAY
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Windows · Chrome', 'Pampanga, Philippines', '192.168.1.20', 'current', NOW()
FROM users u WHERE u.username = 'charles.buque';

INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Android · Chrome', 'Pampanga, Philippines', '192.168.1.21', 'active', NOW() - INTERVAL 3 HOUR
FROM users u WHERE u.username = 'charles.buque';

INSERT INTO login_sessions (user_id, device, location, ip_address, status, logged_in_at)
SELECT u.user_id, 'Windows · Edge', 'Pampanga, Philippines', '192.168.1.22', 'active', NOW() - INTERVAL 2 DAY
FROM users u WHERE u.username = 'charles.buque';

-- System announcements (drives the payroll/customer dashboards)
INSERT INTO notifications (user_id, type, title, description)
SELECT u.user_id, 'system_announcement', 'System Maintenance Schedule',
       'Scheduled system maintenance is set for this weekend. Payroll features will be temporarily unavailable during the window.'
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO notifications (user_id, type, title, description, is_read)
SELECT u.user_id, 'system_announcement', 'New Feature Update',
       'Payroll and attendance enhancements are now live. Review the Help Center for details.', 1
FROM users u WHERE u.username = 'maria.santos';

INSERT INTO notifications (user_id, type, title, description)
SELECT u.user_id, 'system_announcement', 'System Maintenance Schedule',
       'Scheduled system maintenance is set for this weekend. Booking features will be temporarily unavailable.'
FROM users u WHERE u.username = 'charles.buque';