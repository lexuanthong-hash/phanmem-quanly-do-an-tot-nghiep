const router = require('express').Router();
const { getUsers, getUserById, createUser, updateUser, resetPassword, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth); // tất cả đều phải đăng nhập

// GET: admin/GV/SV đều được xem sinh viên
router.get('/', authorize('admin', 'lecturer', 'student'), getUsers);
router.get('/:id', authorize('admin', 'lecturer', 'student'), getUserById);

// Thao tác thêm/sửa/xóa: chỉ admin
router.post('/', authorize('admin'), auditLog('CREATE', 'users'), createUser);
router.put('/:id', authorize('admin'), auditLog('UPDATE', 'users'), updateUser);
router.put('/:id/reset-password', authorize('admin'), auditLog('RESET_PASSWORD', 'users'), resetPassword);
router.delete('/:id', authorize('admin'), auditLog('DELETE', 'users'), deleteUser);

module.exports = router;
