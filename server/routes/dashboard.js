const router = require('express').Router();
const { getStats, exportReport } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/stats', getStats);
router.get('/export', exportReport);

module.exports = router;
