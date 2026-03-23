const router = require('express').Router();
const ctrl = require('../controllers/gradeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

// GET /api/grades/criteria — Lấy danh sách tiêu chí chấm điểm (rubric) hiện có
router.get('/criteria', ctrl.getCriteria);

// POST /api/grades/criteria — Admin tạo tiêu chí chấm điểm mới (tên, trọng số, điểm tối đa)
router.post('/criteria', authorize('admin'), auditLog('CREATE', 'rubric_criteria'), ctrl.createCriteria);

// GET /api/grades/assignments — Lấy danh sách phân công đề tài (để biết SV nào đang làm đề tài nào)
router.get('/assignments', ctrl.getAssignments);

// GET /api/grades — Lấy bảng điểm (SV xem điểm của mình, GV xem điểm SV mình chấm)
router.get('/', ctrl.getGrades);

// POST /api/grades — Giảng viên chấm điểm sinh viên theo từng tiêu chí rubric
router.post('/', authorize('lecturer'), auditLog('GRADE', 'grades'), ctrl.gradeAssignment);

module.exports = router;
