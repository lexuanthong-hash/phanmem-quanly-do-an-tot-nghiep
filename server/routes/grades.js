const router = require('express').Router();
const ctrl = require('../controllers/gradeController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

router.get('/criteria', ctrl.getCriteria);
router.post('/criteria', authorize('admin'), auditLog('CREATE', 'rubric_criteria'), ctrl.createCriteria);
router.get('/assignments', ctrl.getAssignments);
router.get('/', ctrl.getGrades);
router.post('/', authorize('lecturer'), auditLog('GRADE', 'grades'), ctrl.gradeAssignment);

module.exports = router;
