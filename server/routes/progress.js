const router = require('express').Router();
const ctrl = require('../controllers/progressController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const auditLog = require('../middleware/auditLog');

router.use(auth);

// GET /api/progress — Lấy danh sách báo cáo tiến độ (SV xem của mình, GV xem SV của mình)
router.get('/', ctrl.getProgress);

// GET /api/progress/student/:studentId — Admin/GV xem toàn bộ báo cáo của 1 sinh viên cụ thể
router.get('/student/:studentId', authorize('admin', 'lecturer'), ctrl.getStudentProgress);

// POST /api/progress — Sinh viên nộp báo cáo tiến độ theo mốc (có thể đính kèm file .docx/.pdf)
router.post('/', authorize('student'), upload.single('file'), auditLog('SUBMIT', 'progress'), ctrl.submitProgress);

// PUT /api/progress/:id/review — Giảng viên duyệt báo cáo: nhận xét + đánh giá đạt/cần chỉnh sửa
router.put('/:id/review', authorize('lecturer'), auditLog('REVIEW', 'progress'), ctrl.reviewProgress);

module.exports = router;
