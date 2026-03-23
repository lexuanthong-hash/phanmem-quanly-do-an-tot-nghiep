const router = require('express').Router();
const { getUsers, getUserById, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth); // tất cả đều phải đăng nhập

// GET /api/users — Lấy danh sách người dùng (có thể lọc theo role: admin/lecturer/student)
router.get('/', authorize('admin', 'lecturer', 'student'), getUsers);

// GET /api/users/:id — Lấy thông tin chi tiết 1 người dùng theo ID
router.get('/:id', authorize('admin', 'lecturer', 'student'), getUserById);

// POST /api/users — Tạo tài khoản mới (chỉ admin)
router.post('/', authorize('admin'), auditLog('CREATE', 'users'), createUser);

// PUT /api/users/:id — Cập nhật thông tin người dùng (chỉ admin)
router.put('/:id', authorize('admin'), auditLog('UPDATE', 'users'), updateUser);

// PUT /api/users/:id/reset-password — Reset mật khẩu cho người dùng (chỉ admin)
router.put('/:id/reset-password', authorize('admin'), auditLog('RESET_PASSWORD', 'users'), resetPassword);

// DELETE /api/users/:id — Xóa tài khoản người dùng (chỉ admin)
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'users'), deleteUser);

module.exports = router;
