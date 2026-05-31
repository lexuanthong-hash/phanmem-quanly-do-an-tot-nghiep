-- Migration: Chat SV-GV (chạy trên DB thesis_management đã có sẵn)
USE thesis_management;

-- Thêm loại thông báo tin nhắn
ALTER TABLE notifications
  MODIFY COLUMN type ENUM('deadline', 'approval', 'grade', 'system', 'reminder', 'message') NOT NULL DEFAULT 'system';

CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES topic_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_conv_created (conversation_id, created_at),
  INDEX idx_unread (conversation_id, is_read, sender_id)
) ENGINE=InnoDB;

-- Tạo conversation cho các phân công đã có
INSERT IGNORE INTO conversations (assignment_id)
SELECT id FROM topic_assignments WHERE status = 'active';
