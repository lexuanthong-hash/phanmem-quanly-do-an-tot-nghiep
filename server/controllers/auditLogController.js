const pool = require('../config/db');


// [ADMIN ONLY] Lấy nhật ký hành động của toàn hệ thống
// Ghi nhận: ai làm gì, lúc nào, IP nào, giá trị trước/sau khi thay đổi
// Hỗ trợ lọc theo: action, loại bảng (entity_type), user_id, khoảng ngày
// Phân trang mặc định 20 bản ghi/trang
exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, entity_type, user_id, date_from, date_to } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT al.*, u.full_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
        let countQuery = 'SELECT COUNT(*) as total FROM audit_logs al WHERE 1=1';
        const params = [];
        const countParams = [];

        if (action) { query += ' AND al.action = ?'; countQuery += ' AND al.action = ?'; params.push(action); countParams.push(action); }
        if (entity_type) { query += ' AND al.entity_type = ?'; countQuery += ' AND al.entity_type = ?'; params.push(entity_type); countParams.push(entity_type); }
        if (user_id) { query += ' AND al.user_id = ?'; countQuery += ' AND al.user_id = ?'; params.push(user_id); countParams.push(user_id); }
        if (date_from) { query += ' AND al.created_at >= ?'; countQuery += ' AND al.created_at >= ?'; params.push(date_from); countParams.push(date_from); }
        if (date_to) { query += ' AND al.created_at <= ?'; countQuery += ' AND al.created_at <= ?'; params.push(date_to); countParams.push(date_to); }

        query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [logs] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);

        res.json({
            success: true,
            data: {
                logs,
                pagination: { total: countResult[0].total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countResult[0].total / limit) }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
