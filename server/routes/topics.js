const router = require('express').Router();
const ctrl = require('../controllers/topicController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

// GET /api/topics/available — Lấy danh sách đề tài đang mở để sinh viên đăng ký nguyện vọng
router.get('/available', ctrl.getAvailableTopics);

// GET /api/topics/open — Lấy danh sách đề tài đang ở trạng thái mở (chưa đủ sinh viên)
router.get('/open', ctrl.getOpenTopics);

// GET /api/topics — Lấy toàn bộ danh sách đề tài (có thể lọc theo trạng thái, học kỳ)
router.get('/', ctrl.getTopics);

// GET /api/topics/:id — Lấy chi tiết 1 đề tài theo ID
router.get('/:id', ctrl.getTopicById);

// POST /api/topics — Tạo đề tài mới (admin hoặc giảng viên)
router.post('/', authorize('admin', 'lecturer'), auditLog('CREATE', 'topics'), ctrl.createTopic);

// PUT /api/topics/:id — Chỉnh sửa thông tin đề tài (admin hoặc giảng viên sở hữu đề tài)
router.put('/:id', authorize('admin', 'lecturer'), auditLog('UPDATE', 'topics'), ctrl.updateTopic);

// PUT /api/topics/:id/approve — Duyệt đề tài (chỉ admin; nếu không phải admin sẽ bị chặn lỗi 403)
router.put('/:id/approve', authorize('admin'), auditLog('APPROVE', 'topics'), ctrl.approveTopic);

// DELETE /api/topics/:id — Xóa đề tài (admin hoặc giảng viên sở hữu đề tài)
router.delete('/:id', authorize('admin', 'lecturer'), auditLog('DELETE', 'topics'), ctrl.deleteTopic);

module.exports = router;
