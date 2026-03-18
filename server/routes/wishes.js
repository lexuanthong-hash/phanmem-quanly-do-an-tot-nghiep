const router = require('express').Router();
const ctrl = require('../controllers/wishController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

router.get('/', ctrl.getWishes);
router.post('/', authorize('student'), auditLog('CREATE', 'wishes'), ctrl.createWish);
router.put('/:id/approve', authorize('lecturer'), auditLog('APPROVE', 'wishes'), ctrl.approveWish);
router.put('/:id/reject', authorize('lecturer'), auditLog('REJECT', 'wishes'), ctrl.rejectWish);
router.delete('/:id', authorize('student'), ctrl.deleteWish);

module.exports = router;
