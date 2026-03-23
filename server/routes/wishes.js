const router = require('express').Router();
const ctrl = require('../controllers/wishController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

// GET /api/wishes — Lấy danh sách nguyện vọng (SV xem của mình, GV xem đề tài mình hướng dẫn)
router.get('/', ctrl.getWishes);

// POST /api/wishes — Sinh viên đăng ký nguyện vọng đề tài (chỉ student, tối đa 3 nguyện vọng)
router.post('/', authorize('student'), auditLog('CREATE', 'wishes'), ctrl.createWish);

// PUT /api/wishes/:id/approve — Giảng viên duyệt chấp nhận nguyện vọng của sinh viên
router.put('/:id/approve', authorize('lecturer'), auditLog('APPROVE', 'wishes'), ctrl.approveWish);

// PUT /api/wishes/:id/reject — Giảng viên từ chối nguyện vọng (kèm lý do từ chối)
router.put('/:id/reject', authorize('lecturer'), auditLog('REJECT', 'wishes'), ctrl.rejectWish);

// DELETE /api/wishes/:id — Sinh viên hủy đăng ký nguyện vọng (chỉ khi còn trạng thái pending)
router.delete('/:id', authorize('student'), ctrl.deleteWish);

module.exports = router;
