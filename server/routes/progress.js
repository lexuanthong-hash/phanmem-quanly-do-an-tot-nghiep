const router = require('express').Router();
const ctrl = require('../controllers/progressController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');
const auditLog = require('../middleware/auditLog');

router.use(auth);

router.get('/', ctrl.getProgress);
router.get('/student/:studentId', authorize('admin', 'lecturer'), ctrl.getStudentProgress);
router.post('/', authorize('student'), upload.single('file'), auditLog('SUBMIT', 'progress'), ctrl.submitProgress);
router.put('/:id/review', authorize('lecturer'), auditLog('REVIEW', 'progress'), ctrl.reviewProgress);

module.exports = router;
