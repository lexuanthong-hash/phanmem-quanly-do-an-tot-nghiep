const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.use(auth);
// GET /api/notifications — Lấy danh sách thông báo của người dùng đang đăng nhập
router.get('/', ctrl.getNotifications);

// PUT /api/notifications/read-all — Đánh dấu tất cả thông báo là đã đọc
router.put('/read-all', ctrl.markAllAsRead);

// PUT /api/notifications/:id/read — Đánh dấu 1 thông báo là đã đọc
router.put('/:id/read', ctrl.markAsRead);

module.exports = router;
