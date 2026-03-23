const pool = require('../config/db');


// [TẤT CẢ ROLE] Lấy 50 thông báo gần nhất của người dùng đang đăng nhập
// Trả về cả số thông báo chưa đọc để hiển thị badge đỏ
exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        const [unreadCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ success: true, data: { notifications, unreadCount: unreadCount[0].count } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Đánh dấu 1 thông báo cụ thể là đã đọc
// Kiểm tra user_id để ngăn việc đánh dấu thông báo của người khác
exports.markAsRead = async (req, res) => {
    try {
        await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Đánh dấu tất cả thông báo của mình là đã đọc
exports.markAllAsRead = async (req, res) => {
    try {
        await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
