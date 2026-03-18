-- =====================================================
-- HỆ THỐNG QUẢN LÝ ĐỒ ÁN TỐT NGHIỆP
-- Database: thesis_management
-- =====================================================

CREATE DATABASE IF NOT EXISTS thesis_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE thesis_management;

-- =====================================================
-- 1. BẢNG USERS - Quản lý tài khoản người dùng
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('admin', 'lecturer', 'student') NOT NULL DEFAULT 'student',
  student_code VARCHAR(20) DEFAULT NULL,       -- Mã sinh viên (nếu là SV)
  lecturer_code VARCHAR(20) DEFAULT NULL,      -- Mã giảng viên (nếu là GV)
  department VARCHAR(100) DEFAULT NULL,        -- Khoa/Bộ môn
  phone VARCHAR(20) DEFAULT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 2. BẢNG TOPICS - Quản lý đề tài đồ án
-- =====================================================
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  lecturer_id INT NOT NULL,                    -- GV hướng dẫn
  max_students INT NOT NULL DEFAULT 1,         -- Số SV tối đa
  status ENUM('draft', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled') 
    NOT NULL DEFAULT 'draft',
  semester VARCHAR(20) NOT NULL,               -- VD: "2024-2025/HK2"
  category VARCHAR(100) DEFAULT NULL,          -- Lĩnh vực: Web, AI, Mobile...
  requirements TEXT,                           -- Yêu cầu đề tài
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================
-- 3. BẢNG WISH_REGISTRATIONS - Đăng ký nguyện vọng
-- =====================================================
CREATE TABLE IF NOT EXISTS wish_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  topic_id INT NOT NULL,
  priority INT NOT NULL DEFAULT 1,             -- Thứ tự ưu tiên: 1, 2, 3
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  note TEXT,                                   -- Ghi chú của SV
  rejection_reason TEXT,                       -- Lý do từ chối
  reviewed_by INT DEFAULT NULL,                -- Người duyệt
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_student_topic (student_id, topic_id)
) ENGINE=InnoDB;

-- =====================================================
-- 4. BẢNG TOPIC_ASSIGNMENTS - Phân công đề tài
-- =====================================================
CREATE TABLE IF NOT EXISTS topic_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  student_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  final_score DECIMAL(4,2) DEFAULT NULL,       -- Điểm tổng kết
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_assignment (topic_id, student_id)
) ENGINE=InnoDB;

-- =====================================================
-- 5. BẢNG MILESTONES - Mốc tiến độ
-- =====================================================
CREATE TABLE IF NOT EXISTS milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT DEFAULT NULL,                   -- NULL = mốc chung cho tất cả
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline DATETIME NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================
-- 6. BẢNG PROGRESS_REPORTS - Nộp tiến độ
-- =====================================================
CREATE TABLE IF NOT EXISTS progress_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  milestone_id INT NOT NULL,
  content TEXT,                                -- Nội dung báo cáo tiến độ
  file_url VARCHAR(255) DEFAULT NULL,          -- File đính kèm
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('submitted', 'reviewed', 'revision_needed') NOT NULL DEFAULT 'submitted',
  feedback TEXT,                               -- Nhận xét của GV
  reviewed_by INT DEFAULT NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (assignment_id) REFERENCES topic_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- 7. BẢNG RUBRIC_CRITERIA - Tiêu chí chấm điểm
-- =====================================================
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_score DECIMAL(4,2) NOT NULL DEFAULT 10,
  weight DECIMAL(4,2) NOT NULL DEFAULT 1.0,    -- Trọng số
  category ENUM('report', 'product', 'presentation', 'defense') NOT NULL DEFAULT 'report',
  order_index INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 8. BẢNG GRADES - Bảng điểm
-- =====================================================
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  rubric_criteria_id INT NOT NULL,
  grader_id INT NOT NULL,                      -- GV chấm điểm
  score DECIMAL(4,2) NOT NULL,
  comment TEXT,
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES topic_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (rubric_criteria_id) REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  FOREIGN KEY (grader_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_grade (assignment_id, rubric_criteria_id, grader_id)
) ENGINE=InnoDB;

-- =====================================================
-- 9. BẢNG NOTIFICATIONS - Thông báo
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('deadline', 'approval', 'grade', 'system', 'reminder') NOT NULL DEFAULT 'system',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(255) DEFAULT NULL,              -- Link liên quan
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 10. BẢNG AUDIT_LOGS - Nhật ký hành động
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,                -- CREATE, UPDATE, DELETE, LOGIN...
  entity_type VARCHAR(50) NOT NULL,            -- users, topics, grades...
  entity_id INT DEFAULT NULL,
  old_value JSON DEFAULT NULL,                 -- Giá trị cũ (JSON)
  new_value JSON DEFAULT NULL,                 -- Giá trị mới (JSON)
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- =====================================================

-- Admin account (password: admin123)
INSERT INTO users (username, password_hash, full_name, email, role, department) VALUES
('admin', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'Quản trị viên', 'admin@university.edu.vn', 'admin', 'Phòng Đào tạo');

-- Lecturer accounts (password: lecturer123)
INSERT INTO users (username, password_hash, full_name, email, role, lecturer_code, department) VALUES
('gv_nguyen', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'TS. Nguyễn Văn A', 'nguyenva@university.edu.vn', 'lecturer', 'GV001', 'Khoa CNTT'),
('gv_tran', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'ThS. Trần Thị B', 'tranthib@university.edu.vn', 'lecturer', 'GV002', 'Khoa CNTT');

-- Student accounts (password: student123)
INSERT INTO users (username, password_hash, full_name, email, role, student_code, department) VALUES
('sv_le', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'Lê Văn C', 'levanc@student.edu.vn', 'student', 'SV001', 'Khoa CNTT'),
('sv_pham', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'Phạm Thị D', 'phamthid@student.edu.vn', 'student', 'SV002', 'Khoa CNTT'),
('sv_hoang', '$2a$10$8KzQJZ5Y5X5X5X5X5X5X5.8KzQJZ5Y5X5X5X5X5X5X5X5X5X5X5X', 'Hoàng Văn E', 'hoangvane@student.edu.vn', 'student', 'SV003', 'Khoa CNTT');

-- Rubric criteria mẫu
INSERT INTO rubric_criteria (name, description, max_score, weight, category, order_index) VALUES
('Nội dung báo cáo', 'Đánh giá chất lượng nội dung báo cáo đồ án', 10, 2.0, 'report', 1),
('Hình thức trình bày', 'Đánh giá hình thức, bố cục báo cáo', 10, 1.0, 'report', 2),
('Sản phẩm phần mềm', 'Đánh giá chất lượng sản phẩm', 10, 3.0, 'product', 3),
('Kỹ thuật sử dụng', 'Đánh giá công nghệ và kỹ thuật áp dụng', 10, 2.0, 'product', 4),
('Kỹ năng thuyết trình', 'Đánh giá kỹ năng trình bày', 10, 1.0, 'presentation', 5),
('Trả lời câu hỏi', 'Đánh giá khả năng phản biện', 10, 1.0, 'defense', 6);
