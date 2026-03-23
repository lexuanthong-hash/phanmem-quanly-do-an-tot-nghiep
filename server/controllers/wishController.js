const pool = require('../config/db');

// [SINH VIÊN] Đăng ký nguyện vọng đề tài
// Kiểm tra: SV chưa có đề tài, chưa đăng ký đề tài này, đề tài còn chỗ, tối đa 3 NV
// Sau khi đăng ký → gửi thông báo cho giảng viên hướng dẫn
exports.createWish = async (req, res) => {
    try {
        const { topic_id, priority, note } = req.body;
        const student_id = req.user.id;
        if (!topic_id) return res.status(400).json({ success: false, message: 'Vui lòng chọn đề tài.' });

        // kiểm tra SV đã có đề tài chưa
        const [existingAssignment] = await pool.execute("SELECT id FROM topic_assignments WHERE student_id = ? AND status = 'active'", [student_id]);
        if (existingAssignment.length > 0) return res.status(400).json({ success: false, message: 'Bạn đã được phân công đề tài. Không thể đăng ký thêm.' });

        // kiểm tra trùng NV
        const [existingWish] = await pool.execute('SELECT id FROM wish_registrations WHERE student_id = ? AND topic_id = ?', [student_id, topic_id]);
        if (existingWish.length > 0) return res.status(400).json({ success: false, message: 'Bạn đã đăng ký đề tài này rồi.' });

        // kiểm tra đề tài còn chỗ không (so sánh current_students vs max_students)
        const [topic] = await pool.execute("SELECT t.*, (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.topic_id = t.id AND ta.status = 'active') as current_students FROM topics t WHERE t.id = ? AND t.status = 'approved'", [topic_id]);
        if (topic.length === 0) return res.status(400).json({ success: false, message: 'Đề tài chưa được duyệt.' });
        if (topic[0].current_students >= topic[0].max_students) return res.status(400).json({ success: false, message: 'Đề tài đã đủ số lượng sinh viên.' });

        // max 3 NV
        const [wishCount] = await pool.execute("SELECT COUNT(*) as count FROM wish_registrations WHERE student_id = ? AND status = 'pending'", [student_id]);
        if (wishCount[0].count >= 3) return res.status(400).json({ success: false, message: 'Bạn đã đăng ký tối đa 3 nguyện vọng.' });

        const [result] = await pool.execute('INSERT INTO wish_registrations (student_id, topic_id, priority, note) VALUES (?, ?, ?, ?)',
            [student_id, topic_id, priority || (wishCount[0].count + 1), note || null]);

        // thông báo cho GV hướng dẫn
        await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'approval')",
            [topic[0].lecturer_id, 'Nguyện vọng mới', `Sinh viên ${req.user.full_name} đã đăng ký nguyện vọng cho đề tài "${topic[0].title}".`]);

        res.status(201).json({ success: true, message: 'Đăng ký nguyện vọng thành công!', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create wish error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Lấy danh sách nguyện vọng
// Sinh viên: chỉ thấy nguyện vọng của chính mình
// GV/Admin: thấy tất cả, có thể lọc theo ?topic_id hoặc ?status
exports.getWishes = async (req, res) => {
    try {
        const { status, topic_id } = req.query;
        let query = `SELECT wr.*, u.full_name as student_name, u.student_code, u.email as student_email,
      t.title as topic_title, t.semester, t.max_students,
      (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.topic_id = t.id AND ta.status = 'active') as current_students,
      rv.full_name as reviewer_name
      FROM wish_registrations wr LEFT JOIN users u ON wr.student_id = u.id
      LEFT JOIN topics t ON wr.topic_id = t.id LEFT JOIN users rv ON wr.reviewed_by = rv.id WHERE 1=1`;
        const params = [];

        // SV chỉ thấy NV của mình, GV thấy tất cả NV trong hệ thống
        if (req.user.role === 'student') { query += ' AND wr.student_id = ?'; params.push(req.user.id); }
        if (status) { query += ' AND wr.status = ?'; params.push(status); }
        if (topic_id) { query += ' AND wr.topic_id = ?'; params.push(topic_id); }
        query += ' ORDER BY wr.priority ASC, wr.created_at ASC';

        const [wishes] = await pool.execute(query, params);

        // Lấy danh sách tên SV đã ĐK và đang chờ duyệt cho từng đề tài
        for (let w of wishes) {
            const [assigned] = await pool.execute(`
                SELECT u.full_name 
                FROM topic_assignments ta 
                JOIN users u ON ta.student_id = u.id 
                WHERE ta.topic_id = ? AND ta.status = 'active'
            `, [w.topic_id]);
            w.assigned_students = assigned.map(s => s.full_name).join(', ');

            const [wishing] = await pool.execute(`
                SELECT u.full_name 
                FROM wish_registrations wr 
                JOIN users u ON wr.student_id = u.id 
                WHERE wr.topic_id = ? AND wr.status = 'pending'
            `, [w.topic_id]);
            w.wishing_students = wishing.map(s => s.full_name).join(', ');
        }

        res.json({ success: true, data: wishes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [GIẢNG VIÊN] Duyệt chấp nhận nguyện vọng của sinh viên
// Tự động: tạo phân công đề tài, từ chối các NV khác của SV, cập nhật trạng thái đề tài → 'assigned'
exports.approveWish = async (req, res) => {
    try {
        const wishId = req.params.id;
        const [wishes] = await pool.execute('SELECT wr.*, t.title as topic_title, t.max_students FROM wish_registrations wr LEFT JOIN topics t ON wr.topic_id = t.id WHERE wr.id = ?', [wishId]);
        if (wishes.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyện vọng.' });

        const wish = wishes[0];
        if (wish.status !== 'pending') return res.status(400).json({ success: false, message: 'Nguyện vọng đã được xử lý.' });

        const [assignments] = await pool.execute("SELECT COUNT(*) as count FROM topic_assignments WHERE topic_id = ? AND status = 'active'", [wish.topic_id]);
        if (assignments[0].count >= wish.max_students) return res.status(400).json({ success: false, message: 'Đề tài đã đủ số lượng sinh viên.' });

        // 1. duyệt NV này
        await pool.execute("UPDATE wish_registrations SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?", [req.user.id, wishId]);
        // 2. tạo phân công đề tài
        await pool.execute('INSERT INTO topic_assignments (topic_id, student_id) VALUES (?, ?)', [wish.topic_id, wish.student_id]);
        // 3. cập nhật trạng thái đề tài
        await pool.execute("UPDATE topics SET status = 'assigned' WHERE id = ?", [wish.topic_id]);
        // 4. TỰ ĐỘNG từ chối tất cả NV khác của SV này (vì đã có đề tài rồi)
        await pool.execute("UPDATE wish_registrations SET status = 'rejected', rejection_reason = 'Đã được duyệt nguyện vọng khác', reviewed_by = ?, reviewed_at = NOW() WHERE student_id = ? AND id != ? AND status = 'pending'",
            [req.user.id, wish.student_id, wishId]);
        // 5. thông báo cho SV
        await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'approval')",
            [wish.student_id, 'Nguyện vọng được duyệt', `Nguyện vọng đăng ký đề tài "${wish.topic_title}" đã được duyệt.`]);

        res.json({ success: true, message: 'Duyệt nguyện vọng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [GIẢNG VIÊN] Từ chối nguyện vọng của sinh viên (có thể ghi lý do)
// Gửi thông báo kèm lý do từ chối đến sinh viên
exports.rejectWish = async (req, res) => {
    try {
        const wishId = req.params.id;
        const { rejection_reason } = req.body;
        const [wishes] = await pool.execute('SELECT wr.*, t.title as topic_title FROM wish_registrations wr LEFT JOIN topics t ON wr.topic_id = t.id WHERE wr.id = ?', [wishId]);
        if (wishes.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyện vọng.' });

        await pool.execute("UPDATE wish_registrations SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?", [rejection_reason || null, req.user.id, wishId]);
        await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'approval')",
            [wishes[0].student_id, 'Nguyện vọng bị từ chối', `Nguyện vọng đề tài "${wishes[0].topic_title}" bị từ chối. ${rejection_reason ? 'Lý do: ' + rejection_reason : ''}`]);

        res.json({ success: true, message: 'Từ chối nguyện vọng thành công.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SINH VIÊN] Hủy đăng ký nguyện vọng
// Chỉ hủy được khi còn 'pending' hoặc 'rejected', không hủy được khi đã 'approved'
exports.deleteWish = async (req, res) => {
    try {
        const [wishes] = await pool.execute('SELECT * FROM wish_registrations WHERE id = ? AND student_id = ?', [req.params.id, req.user.id]);
        if (wishes.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy nguyện vọng.' });
        // Cho SV xóa nguyện vọng pending / rejected để đăng ký lại.
        // Không cho xóa approved vì đã phát sinh phân công đề tài.
        if (wishes[0].status === 'approved') {
            return res.status(400).json({ success: false, message: 'Không thể xóa nguyện vọng đã được duyệt.' });
        }

        await pool.execute('DELETE FROM wish_registrations WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Xóa nguyện vọng thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
