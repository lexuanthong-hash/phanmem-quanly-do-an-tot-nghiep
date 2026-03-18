const router = require('express').Router();
const ctrl = require('../controllers/milestoneController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

router.get('/', ctrl.getMilestones);
router.post('/', authorize('admin', 'lecturer'), auditLog('CREATE', 'milestones'), ctrl.createMilestone);
router.put('/:id', authorize('admin', 'lecturer'), auditLog('UPDATE', 'milestones'), ctrl.updateMilestone);
router.delete('/:id', authorize('admin', 'lecturer'), auditLog('DELETE', 'milestones'), ctrl.deleteMilestone);

module.exports = router;
