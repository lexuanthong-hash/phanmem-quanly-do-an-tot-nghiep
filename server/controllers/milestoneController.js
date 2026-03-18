/**
 * ============================================
 * MILESTONE CONTROLLER - Mốc Tiến độ
 * ============================================
 * - getMilestones():    DS mốc (lọc theo topic, sắp xếp theo order_index)
 * - createMilestone():  Tạo mốc (topic_id = null → mốc chung cho tất cả)
 * - updateMilestone():  Cập nhật mốc
 * - deleteMilestone():  Xóa mốc
 *   Khi tạo mốc mới → tự động gửi thông báo cho SV liên quan
 */

const pool = require('../config/db');

// Lấy danh sách milestones
exports.getMilestones = async (req, res) => {
    try {
        const { topic_id } = req.query;

        let query = `
      SELECT m.*, u.full_name as created_by_name,
        t.title as topic_title
      FROM milestones m
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN topics t ON m.topic_id = t.id
      WHERE 1=1
    `;
        const params = [];

        if (topic_id) {
            query += ' AND (m.topic_id = ? OR m.topic_id IS NULL)';
            params.push(topic_id);
        }

        query += ' ORDER BY m.order_index ASC, m.deadline ASC';

        const [milestones] = await pool.execute(query, params);

        res.json({ success: true, data: milestones });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// Tạo milestone
exports.createMilestone = async (req, res) => {
    try {
        const { topic_id, title, description, deadline, order_index } = req.body;

        if (!title || !deadline) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tiêu đề và hạn nộp.'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO milestones (topic_id, title, description, deadline, order_index, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [topic_id || null, title, description || null, deadline, order_index || 0, req.user.id]
        );

        // Gửi thông báo deadline cho SV liên quan
        if (topic_id) {
            const [assignments] = await pool.execute(
                "SELECT student_id FROM topic_assignments WHERE topic_id = ? AND status = 'active'",
                [topic_id]
            );

            for (const a of assignments) {
                await pool.execute(
                    `INSERT INTO notifications (user_id, title, message, type)
           VALUES (?, ?, ?, 'deadline')`,
                    [a.student_id, 'Mốc tiến độ mới', `Mốc "${title}" - Hạn nộp: ${new Date(deadline).toLocaleDateString('vi-VN')}`]
                );
            }
        }

        res.status(201).json({
            success: true,
            message: 'Tạo mốc tiến độ thành công!',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create milestone error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// Cập nhật milestone
exports.updateMilestone = async (req, res) => {
    try {
        const { title, description, deadline, order_index } = req.body;

        await pool.execute(
            'UPDATE milestones SET title = ?, description = ?, deadline = ?, order_index = ? WHERE id = ?',
            [title, description, deadline, order_index, req.params.id]
        );

        res.json({ success: true, message: 'Cập nhật mốc tiến độ thành công!' });
    } catch (error) {
        console.error('Update milestone error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// Xóa milestone
exports.deleteMilestone = async (req, res) => {
    try {
        await pool.execute('DELETE FROM milestones WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa mốc tiến độ thành công!' });
    } catch (error) {
        console.error('Delete milestone error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
