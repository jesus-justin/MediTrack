-- MediTrack MySQL database schema
-- Suitable for authentication, patient workflow, appointments, EMR, and analytics queries.

CREATE DATABASE IF NOT EXISTS meditrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE meditrack;

-- =====================
-- Authentication / Users
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT') NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

-- =====================
-- Patient Management
-- =====================
CREATE TABLE IF NOT EXISTS patient (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_code VARCHAR(30) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(30) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  insurance_provider VARCHAR(200) NULL,
  medical_history TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_patient_code (patient_code),
  KEY idx_patient_name (last_name, first_name),
  KEY idx_patient_email (email)
) ENGINE=InnoDB;

-- =====================
-- Doctor / Staff
-- =====================
CREATE TABLE IF NOT EXISTS doctor (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(180) NOT NULL,
  specialization VARCHAR(180) NOT NULL,
  department VARCHAR(180) NOT NULL,
  schedule TEXT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_doctor_department (department),
  KEY idx_doctor_specialization (specialization),
  KEY idx_doctor_active (active)
) ENGINE=InnoDB;

-- =====================
-- Appointments
-- =====================
CREATE TABLE IF NOT EXISTS appointment (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
  reason VARCHAR(500) NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_appointment_patient
    FOREIGN KEY (patient_id) REFERENCES patient(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_appointment_time CHECK (end_time > start_time),
  KEY idx_appointment_doctor_time (doctor_id, start_time, end_time),
  KEY idx_appointment_patient_time (patient_id, start_time),
  KEY idx_appointment_status_time (status, start_time)
) ENGINE=InnoDB;

-- =====================
-- Consultation / EMR
-- =====================
CREATE TABLE IF NOT EXISTS consultation_record (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NOT NULL,
  diagnosis VARCHAR(2000) NOT NULL,
  prescription VARCHAR(2000) NULL,
  notes VARCHAR(3000) NULL,
  attachment_url VARCHAR(1024) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_consultation_appointment (appointment_id),
  CONSTRAINT fk_consultation_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointment(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  KEY idx_consultation_created_at (created_at)
) ENGINE=InnoDB;

-- =====================
-- Optional notification queue table (future scheduler/SMS/email integration)
-- =====================
CREATE TABLE IF NOT EXISTS notification_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('APPOINTMENT_REMINDER', 'UPCOMING_SCHEDULE') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  payload JSON NULL,
  status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notification_status_scheduled (status, scheduled_at)
) ENGINE=InnoDB;

-- =====================
-- Trigger-based conflict detection for doctor schedules
-- Prevents overlapping active appointments for the same doctor.
-- =====================
DROP TRIGGER IF EXISTS trg_appointment_no_overlap_ins;
DROP TRIGGER IF EXISTS trg_appointment_no_overlap_upd;

DELIMITER $$

CREATE TRIGGER trg_appointment_no_overlap_ins
BEFORE INSERT ON appointment
FOR EACH ROW
BEGIN
  IF NEW.status <> 'CANCELED' THEN
    IF EXISTS (
      SELECT 1
      FROM appointment a
      WHERE a.doctor_id = NEW.doctor_id
        AND a.status <> 'CANCELED'
        AND NEW.start_time < a.end_time
        AND NEW.end_time > a.start_time
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Scheduling conflict: doctor already has an appointment in that timeslot';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_appointment_no_overlap_upd
BEFORE UPDATE ON appointment
FOR EACH ROW
BEGIN
  IF NEW.status <> 'CANCELED' THEN
    IF EXISTS (
      SELECT 1
      FROM appointment a
      WHERE a.doctor_id = NEW.doctor_id
        AND a.id <> NEW.id
        AND a.status <> 'CANCELED'
        AND NEW.start_time < a.end_time
        AND NEW.end_time > a.start_time
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Scheduling conflict: doctor already has an appointment in that timeslot';
    END IF;
  END IF;
END$$

DELIMITER ;

-- Notes:
-- 1) Authentication uses BCrypt hashes in users.password (handled by Spring app).
-- 2) App startup seeds default admin user if not present (DataInitializer).
-- 3) This schema can be imported directly in MySQL before running the backend.
