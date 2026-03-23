const router = require('express').Router();
const { getStats, exportReport } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.use(auth);
// GET /api/dashboard/stats — Lấy số liệu thống kê tổng hợp (tổng SV, GV, đề tài, trạng thái...)
router.get('/stats', getStats);

// GET /api/dashboard/export — Xuất báo cáo tổng hợp ra file (dùng cho admin)
router.get('/export', exportReport);

module.exports = router;
