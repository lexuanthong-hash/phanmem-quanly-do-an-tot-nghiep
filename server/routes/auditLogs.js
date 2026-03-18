const router = require('express').Router();
const { getLogs } = require('../controllers/auditLogController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.use(auth);
router.use(authorize('admin'));
router.get('/', getLogs);

module.exports = router;
