```
const router = require('express').Router();
const ctrl = require('../controllers/topicController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const auditLog = require('../middleware/auditLog');

router.use(auth);

router.get('/available', ctrl.getAvailableTopics);
router.get('/open', ctrl.getOpenTopics);
router.get('/', ctrl.getTopics);
router.get('/:id', ctrl.getTopicById);
router.post('/', authorize('admin', 'lecturer'), auditLog('CREATE', 'topics'), ctrl.createTopic);
router.put('/:id', authorize('admin', 'lecturer'), auditLog('UPDATE', 'topics'), ctrl.updateTopic);
// API duyệt đề tài: PUT /api/topics/:id/approve
// Middleware authorize('admin') đóng vai trò bảo vệ: nếu không phải Admin sẽ bị chặn lại (lỗi 403)
router.put('/:id/approve', authorize('admin'), auditLog('APPROVE', 'topics'), ctrl.approveTopic);
router.delete('/:id', authorize('admin', 'lecturer'), auditLog('DELETE', 'topics'), ctrl.deleteTopic);

module.exports = router;
