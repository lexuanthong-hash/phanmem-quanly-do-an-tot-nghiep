const router = require('express').Router();
const ctrl = require('../controllers/milestoneController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

// GET /api/milestones — Lấy danh sách mốc tiến độ (lọc theo topic_id nếu cần)
router.get('/', ctrl.getMilestones);

// POST /api/milestones — Tạo mốc tiến độ mới với deadline cụ thể (admin hoặc giảng viên)
router.post('/', authorize('admin', 'lecturer'), auditLog('CREATE', 'milestones'), ctrl.createMilestone);

// PUT /api/milestones/:id — Chỉnh sửa mốc tiến độ (đổi deadline, tiêu đề, mô tả)
router.put('/:id', authorize('admin', 'lecturer'), auditLog('UPDATE', 'milestones'), ctrl.updateMilestone);

// DELETE /api/milestones/:id — Xóa mốc tiến độ (admin hoặc giảng viên tạo mốc đó)
router.delete('/:id', authorize('admin', 'lecturer'), auditLog('DELETE', 'milestones'), ctrl.deleteMilestone);

module.exports = router;
