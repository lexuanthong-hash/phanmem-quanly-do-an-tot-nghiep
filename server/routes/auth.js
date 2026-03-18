const router = require('express').Router();
const { login, getProfile, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.post('/login', auditLog('LOGIN', 'users'), login);
router.get('/profile', auth, getProfile);
router.put('/change-password', auth, auditLog('CHANGE_PASSWORD', 'users'), changePassword);

module.exports = router;
