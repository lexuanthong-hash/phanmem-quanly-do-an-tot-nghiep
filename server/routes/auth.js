const router = require('express').Router();
const { login, getProfile, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

// POST /api/auth/login — Đăng nhập, trả về JWT token (không cần đăng nhập trước)
router.post('/login', auditLog('LOGIN', 'users'), login);

// GET /api/auth/profile — Lấy thông tin cá nhân của người dùng đang đăng nhập
router.get('/profile', auth, getProfile);

// PUT /api/auth/change-password — Đổi mật khẩu (phải đăng nhập, nhập mật khẩu cũ + mới)
router.put('/change-password', auth, auditLog('CHANGE_PASSWORD', 'users'), changePassword);

module.exports = router;
