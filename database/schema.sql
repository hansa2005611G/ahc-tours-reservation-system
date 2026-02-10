-- ============================================
-- AHC TOURS DATABASE SCHEMA
-- ============================================

USE ahc_tours_db;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  role ENUM('admin', 'passenger', 'conductor') DEFAULT 'passenger',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: buses
-- ============================================
CREATE TABLE buses (
  bus_id INT PRIMARY KEY AUTO_INCREMENT,
  bus_number VARCHAR(20) NOT NULL UNIQUE,
  bus_name VARCHAR(100),
  total_seats INT NOT NULL,
  bus_type ENUM('AC', 'Non-AC', 'Semi-Luxury', 'Luxury') DEFAULT 'Non-AC',
  status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
  registration_number VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_bus_number (bus_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: routes
-- ============================================
CREATE TABLE routes (
  route_id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance_km DECIMAL(6,2),
  duration_hours DECIMAL(4,2),
  base_fare DECIMAL(8,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_origin (origin),
  INDEX idx_destination (destination),
  INDEX idx_origin_destination (origin, destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: schedules
-- ============================================
CREATE TABLE schedules (
  schedule_id INT PRIMARY KEY AUTO_INCREMENT,
  bus_id INT NOT NULL,
  route_id INT NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  journey_date DATE NOT NULL,
  available_seats INT NOT NULL,
  status ENUM('scheduled', 'departed', 'arrived', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
  
  INDEX idx_journey_date (journey_date),
  INDEX idx_route_date (route_id, journey_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: bookings
-- ============================================
CREATE TABLE bookings (
  booking_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_reference VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  schedule_id INT NOT NULL,
  seat_number INT NOT NULL,
  passenger_name VARCHAR(100) NOT NULL,
  passenger_email VARCHAR(100) NOT NULL,
  passenger_phone VARCHAR(15) NOT NULL,
  journey_date DATE NOT NULL,
  total_amount DECIMAL(8,2) NOT NULL,
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  booking_status ENUM('confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
  qr_code_data TEXT,
  qr_code_path VARCHAR(255),
  verification_status ENUM('pending', 'verified', 'used') DEFAULT 'pending',
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE CASCADE,
  
  INDEX idx_booking_reference (booking_reference),
  INDEX idx_user_id (user_id),
  INDEX idx_schedule_id (schedule_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_journey_date (journey_date),
  INDEX idx_schedule_seat (schedule_id, seat_number),
  INDEX idx_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  amount DECIMAL(8,2) NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  payment_gateway VARCHAR(50) DEFAULT 'PayHere',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  
  INDEX idx_booking_id (booking_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: qr_verification_logs
-- ============================================
CREATE TABLE qr_verification_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  conductor_id INT,
  verification_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status ENUM('valid', 'invalid', 'duplicate', 'expired') DEFAULT 'valid',
  device_info VARCHAR(255),
  location VARCHAR(255),
  
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (conductor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  
  INDEX idx_booking_id (booking_id),
  INDEX idx_conductor_id (conductor_id),
  INDEX idx_verification_time (verification_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  booking_id INT,
  type ENUM('booking', 'payment', 'cancellation', 'reminder', 'system') DEFAULT 'system',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Sample Admin User (password: admin123)
INSERT INTO users (username, email, password_hash, phone, role) VALUES
('admin', 'admin@ahctours.lk', '$2b$10$rKvFWZw7YHZ6Yx/rqB3EKuJzR5WmN9qLpDXOQx5Z0YxVJZXZ0YxVJ', '+94771234567', 'admin');

-- Sample Buses
INSERT INTO buses (bus_number, bus_name, total_seats, bus_type, status, registration_number) VALUES
('AHC-001', 'Express Colombo', 40, 'AC', 'active', 'WP-CAB-1234'),
('AHC-002', 'Kandy Special', 45, 'Semi-Luxury', 'active', 'WP-CAB-5678'),
('AHC-003', 'Galle Express', 40, 'AC', 'active', 'WP-CAB-9012');

-- Sample Routes
INSERT INTO routes (route_name, origin, destination, distance_km, duration_hours, base_fare, is_active) VALUES
('Colombo - Kandy Express', 'Colombo', 'Kandy', 115.00, 3.50, 450.00, TRUE),
('Colombo - Galle Highway', 'Colombo', 'Galle', 119.00, 2.00, 380.00, TRUE),
('Kandy - Jaffna Direct', 'Kandy', 'Jaffna', 290.00, 8.00, 1200.00, TRUE);

-- Sample Schedules (for next 3 days)
INSERT INTO schedules (bus_id, route_id, departure_time, arrival_time, journey_date, available_seats, status) VALUES
(1, 1, '08:00:00', '11:30:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 40, 'scheduled'),
(2, 2, '09:00:00', '11:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 45, 'scheduled'),
(3, 2, '14:00:00', '16:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 40, 'scheduled');