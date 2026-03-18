const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function seed() {
    try {
        console.log('🌱 Bắt đầu seed dữ liệu...');
        const salt = await bcrypt.genSalt(10);

        // Create admin
        const adminHash = await bcrypt.hash('admin123', salt);
        await pool.execute(
            `INSERT INTO users (username, password_hash, full_name, email, role, department)
       VALUES ('admin', ?, 'Quản trị viên', 'admin@university.edu.vn', 'admin', 'Phòng Đào tạo')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            [adminHash]
        );

        // Create lecturers
        const lecturerHash = await bcrypt.hash('lecturer123', salt);
        await pool.execute(
            `INSERT INTO users (username, password_hash, full_name, email, role, lecturer_code, department)
       VALUES ('gv_nguyen', ?, 'TS. Nguyễn Văn An', 'nguyenva@university.edu.vn', 'lecturer', 'GV001', 'Khoa CNTT')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            [lecturerHash]
        );
        await pool.execute(
            `INSERT INTO users (username, password_hash, full_name, email, role, lecturer_code, department)
       VALUES ('gv_tran', ?, 'ThS. Trần Thị Bình', 'tranthib@university.edu.vn', 'lecturer', 'GV002', 'Khoa CNTT')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
            [lecturerHash]
        );

        // Create students
        const studentHash = await bcrypt.hash('student123', salt);
        const students = [
            ['sv_le', 'Lê Văn Cường', 'levanc@student.edu.vn', 'SV001'],
            ['sv_pham', 'Phạm Thị Dung', 'phamthid@student.edu.vn', 'SV002'],
            ['sv_hoang', 'Hoàng Văn Em', 'hoangvane@student.edu.vn', 'SV003'],
        ];
        for (const [uname, fname, email, code] of students) {
            await pool.execute(
                `INSERT INTO users (username, password_hash, full_name, email, role, student_code, department)
         VALUES (?, ?, ?, ?, 'student', ?, 'Khoa CNTT')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                [uname, studentHash, fname, email, code]
            );
        }

        // Insert rubric criteria
        const criteria = [
            ['Nội dung báo cáo', 'Đánh giá chất lượng nội dung báo cáo đồ án', 10, 2.0, 'report', 1],
            ['Hình thức trình bày', 'Đánh giá hình thức, bố cục báo cáo', 10, 1.0, 'report', 2],
            ['Sản phẩm phần mềm', 'Đánh giá chất lượng sản phẩm', 10, 3.0, 'product', 3],
            ['Kỹ thuật sử dụng', 'Đánh giá công nghệ và kỹ thuật áp dụng', 10, 2.0, 'product', 4],
            ['Kỹ năng thuyết trình', 'Đánh giá kỹ năng trình bày', 10, 1.0, 'presentation', 5],
            ['Trả lời câu hỏi', 'Đánh giá khả năng phản biện', 10, 1.0, 'defense', 6],
        ];
        for (const [name, desc, max, weight, cat, order] of criteria) {
            await pool.execute(
                `INSERT IGNORE INTO rubric_criteria (name, description, max_score, weight, category, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, desc, max, weight, cat, order]
            );
        }

        // Insert sample topics
        const [lecturers] = await pool.execute("SELECT id FROM users WHERE username = 'gv_nguyen'");
        if (lecturers.length > 0) {
            const lid = lecturers[0].id;
            const topics = [
                ['Xây dựng hệ thống quản lý thư viện online', 'Phát triển ứng dụng web quản lý thư viện', lid, 2, 'approved', '2024-2025/HK2', 'Web'],
                ['Ứng dụng AI trong nhận diện khuôn mặt', 'Nghiên cứu và phát triển hệ thống nhận diện khuôn mặt', lid, 1, 'approved', '2024-2025/HK2', 'AI'],
                ['Phát triển app mobile đặt đồ ăn', 'Xây dựng ứng dụng di động đặt đồ ăn trực tuyến', lid, 1, 'draft', '2024-2025/HK2', 'Mobile'],
            ];
            for (const [title, desc, l, max, status, sem, cat] of topics) {
                await pool.execute(
                    `INSERT IGNORE INTO topics (title, description, lecturer_id, max_students, status, semester, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [title, desc, l, max, status, sem, cat]
                );
            }
        }

        console.log('✅ Seed dữ liệu thành công!');
        console.log('📋 Tài khoản mẫu:');
        console.log('   Admin:    admin / admin123');
        console.log('   GV:       gv_nguyen / lecturer123');
        console.log('   GV:       gv_tran / lecturer123');
        console.log('   SV:       sv_le / student123');
        console.log('   SV:       sv_pham / student123');
        console.log('   SV:       sv_hoang / student123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
