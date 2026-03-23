const pool = require('../config/db');
const bcrypt = require('bcryptjs');


// [TẤT CẢ ROLE] Lấy danh sách người dùng (phân trang + lọc)
// Admin: thấy tất cả kể cả admin khác
// GV/SV: chỉ thấy student và lecturer, không thấy admin
// Lọc được theo: role, tìm kiếm tên/username/email/mã SV
exports.getUsers = async (req, res) => {
    try {
        let { page = 1, limit = 10, role, search, department } = req.query;
        const offset = (page - 1) * limit;

        // BẢO MẬT: Kiểm soát quyền xem dựa trên user role
        if (req.user) {
            if (req.user.role === 'student') {
                // Sinh viên chỉ được xem student và lecturer, không được xem admin
                if (!role || role === 'admin') {
                    role = null; // sẽ xử lý bên dưới
                }
            } else if (req.user.role === 'lecturer') {
                // Giảng viên không được xem admin, nếu yêu cầu admin thì ép thành lecturer
                if (role === 'admin') {
                    role = 'lecturer';
                }
            }
        }

        let query = 'SELECT id, username, full_name, email, role, student_code, lecturer_code, department, phone, is_active, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const params = [];
        const countParams = [];

        // Giảng viên và sinh viên mặc định không thấy admin
        if (req.user && (req.user.role === 'lecturer' || req.user.role === 'student') && !role) {
            query += " AND role IN ('student', 'lecturer')";
            countQuery += " AND role IN ('student', 'lecturer')";
        }

        if (role) {
            query += ' AND role = ?';
            countQuery += ' AND role = ?';
            params.push(role);
            countParams.push(role);
        }

        if (department) {
            query += ' AND department = ?';
            countQuery += ' AND department = ?';
            params.push(department);
            countParams.push(department);
        }

        if (search) {
            query += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ? OR student_code LIKE ?)';
            countQuery += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ? OR student_code LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    total: countResult[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Lấy thông tin chi tiết 1 người dùng theo ID
exports.getUserById = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, full_name, email, role, student_code, lecturer_code, department, phone, avatar_url, is_active, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN] Tạo tài khoản người dùng mới
// Hash password bằng bcrypt (salt=10) trước khi lưu
// Báo lỗi 409 nếu username hoặc email đã tồn tại
exports.createUser = async (req, res) => {
    try {
        const { username, password, full_name, email, role, student_code, lecturer_code, department, phone } = req.body;

        if (!username || !password || !full_name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            `INSERT INTO users (username, password_hash, full_name, email, role, student_code, lecturer_code, department, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, password_hash, full_name, email, role, student_code || null, lecturer_code || null, department || null, phone || null]
        );

        res.status(201).json({
            success: true,
            message: 'Tạo tài khoản thành công!',
            data: { id: result.insertId }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Username hoặc email đã tồn tại.'
            });
        }
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN] Cập nhật thông tin người dùng (tên, email, role, mã SV/GV, khoa)
exports.updateUser = async (req, res) => {
    try {
        const { full_name, email, role, student_code, lecturer_code, department, phone, is_active } = req.body;
        const userId = req.params.id;

        await pool.execute(
            `UPDATE users SET full_name = ?, email = ?, role = ?, student_code = ?, lecturer_code = ?, 
       department = ?, phone = ?, is_active = ? WHERE id = ?`,
            [full_name, email, role, student_code || null, lecturer_code || null, department || null, phone || null, is_active !== undefined ? is_active : 1, userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công!'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN] Reset mật khẩu cho bất kỳ người dùng
// Không cần biết mật khẩu cũ, hash mật khẩu mới rồi cập nhật
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.params.id;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [password_hash, userId]
        );

        res.json({
            success: true,
            message: 'Reset mật khẩu thành công!'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN] Vô hiệu hóa tài khoản (soft delete: đặt is_active = 0, không xóa thật)
// Không cho phép admin tự xóa chính mình
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Không cho xóa chính mình
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản của chính bạn.'
            });
        }

        await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: 'Vô hiệu hóa tài khoản thành công!'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
