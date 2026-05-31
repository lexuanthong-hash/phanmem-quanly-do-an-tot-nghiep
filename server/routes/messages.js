const router = require('express').Router();
const ctrl = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/unread-count', ctrl.getUnreadCount);
router.get('/conversations', ctrl.getConversations);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.post('/conversations/:id/messages', ctrl.sendMessage);
router.put('/conversations/:id/read', ctrl.markAsRead);

module.exports = router;
