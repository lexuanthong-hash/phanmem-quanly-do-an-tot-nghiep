const router = require('express').Router();
const { getLogs } = require('../controllers/auditLogController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);
// Toàn bộ route này chỉ dành cho admin (authorize('admin') áp dụng cho tất cả bên dưới)
router.use(authorize('admin'));

// GET /api/audit-logs — Lấy nhật ký hành động của toàn hệ thống (ai làm gì, lúc nào, IP nào)
router.get('/', getLogs);

module.exports = router;
