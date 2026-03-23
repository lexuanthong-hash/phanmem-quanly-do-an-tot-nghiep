const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// [PUBLIC] Đăng nhập hệ thống
// Kiểm tra username + password, tạo JWT token nếu hợp lệ
// rememberMe=true → token tồn tại 30 ngày, false → 1 ngày
// Ghi audit_log mỗi lần đăng nhập thành công
exports.login = async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash); // so sánh password với hash trong DB
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // tạo JWT token chứa id, role → frontend gửi kèm mỗi request
        const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '1d');
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        // ghi log đăng nhập
        await pool.execute(
            `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, ip_address, user_agent)
       VALUES (?, ?, 'LOGIN', 'users', ?, ?, ?)`,
            [user.id, user.username, user.id, req.ip, req.headers['user-agent'] || '']
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                token,
                user: {
                    id: user.id, username: user.username, full_name: user.full_name, email: user.email,
                    role: user.role, student_code: user.student_code, lecturer_code: user.lecturer_code,
                    department: user.department, avatar_url: user.avatar_url
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống khi đăng nhập.' });
    }
};

// [TẤT CẢ ROLE] Lấy thông tin cá nhân của người dùng đang đăng nhập
// req.user được middleware auth.js gắn vào sau khi xác thực JWT
exports.getProfile = async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, full_name, email, role, student_code, lecturer_code, department, phone, avatar_url, created_at FROM users WHERE id = ?',
            [req.user.id] // req.user được middleware auth.js gắn vào
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng.' });
        }
        res.json({ success: true, data: users[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Đổi mật khẩu của chính mình
// Phải nhập đúng mật khẩu hiện tại trước, mật khẩu mới ≥ 6 ký tự
// Dùng bcrypt hash mật khẩu mới trước khi lưu vào DB
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }

        const [users] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt); // hash password mới, salt = 10 rounds
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
