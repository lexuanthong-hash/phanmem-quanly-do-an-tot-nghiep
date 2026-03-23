const pool = require('../config/db');


// [SINH VIÊN] Nộp báo cáo tiến độ theo mốc
// Cho phép đính kèm file (.docx/.pdf) qua multer
// Nếu đã nộp trước đó → cập nhật lại (không tạo bản mới)
// Sau khi nộp → gửi thông báo đến giảng viên hướng dẫn
exports.submitProgress = async (req, res) => {
    try {
        const { milestone_id, content } = req.body;
        const file_url = req.file ? `/uploads/${req.file.filename}` : null;
        if (!milestone_id) return res.status(400).json({ success: false, message: 'Vui lòng chọn mốc tiến độ.' });

        const [assignments] = await pool.execute("SELECT * FROM topic_assignments WHERE student_id = ? AND status = 'active'", [req.user.id]);
        if (assignments.length === 0) return res.status(400).json({ success: false, message: 'Bạn chưa được phân công đề tài.' });

        const assignment = assignments[0];
        const [existing] = await pool.execute('SELECT id FROM progress_reports WHERE assignment_id = ? AND milestone_id = ?', [assignment.id, milestone_id]);

        if (existing.length > 0) {
            await pool.execute("UPDATE progress_reports SET content = ?, file_url = COALESCE(?, file_url), submitted_at = NOW(), status = 'submitted' WHERE assignment_id = ? AND milestone_id = ?", [content || null, file_url, assignment.id, milestone_id]);
            return res.json({ success: true, message: 'Cập nhật tiến độ thành công!' });
        }

        const [result] = await pool.execute('INSERT INTO progress_reports (assignment_id, milestone_id, content, file_url) VALUES (?, ?, ?, ?)', [assignment.id, milestone_id, content || null, file_url]);

        const [topic] = await pool.execute('SELECT t.lecturer_id, t.title FROM topics t WHERE t.id = ?', [assignment.topic_id]);
        if (topic.length > 0) {
            await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')", [topic[0].lecturer_id, 'Sinh viên nộp tiến độ', `SV ${req.user.full_name} đã nộp tiến độ cho đề tài "${topic[0].title}".`]);
        }

        res.status(201).json({ success: true, message: 'Nộp tiến độ thành công!', data: { id: result.insertId } });
    } catch (error) {
        console.error('Submit progress error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Lấy danh sách báo cáo tiến độ
// Sinh viên: chỉ thấy báo cáo của chính mình
// Giảng viên: thấy tất cả (hoặc lọc đề tài mình nếu ?mine=1)
// Admin: thấy tất cả
exports.getProgress = async (req, res) => {
    try {
        const { assignment_id, topic_id, mine } = req.query;
        let query = `SELECT pr.*, m.title as milestone_title, m.deadline as milestone_deadline, ta.topic_id, ta.student_id, u.full_name as student_name, u.student_code, t.title as topic_title, rv.full_name as reviewer_name FROM progress_reports pr LEFT JOIN milestones m ON pr.milestone_id = m.id LEFT JOIN topic_assignments ta ON pr.assignment_id = ta.id LEFT JOIN users u ON ta.student_id = u.id LEFT JOIN topics t ON ta.topic_id = t.id LEFT JOIN users rv ON pr.reviewed_by = rv.id WHERE 1=1`;
        const params = [];
        if (req.user.role === 'student') { query += ' AND ta.student_id = ?'; params.push(req.user.id); }
        // Mặc định: giảng viên xem được tất cả tiến độ (giống admin).
       
        if (req.user.role === 'lecturer' && mine === '1') { query += ' AND t.lecturer_id = ?'; params.push(req.user.id); }
        if (assignment_id) { query += ' AND pr.assignment_id = ?'; params.push(assignment_id); }
        if (topic_id) { query += ' AND ta.topic_id = ?'; params.push(topic_id); }
        query += ' ORDER BY m.order_index ASC, pr.submitted_at DESC';
        const [reports] = await pool.execute(query, params);
        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [GIẢNG VIÊN] Đánh giá báo cáo tiến độ của sinh viên
// status: 'reviewed' (đạt) hoặc 'revision_needed' (cần chỉnh sửa)
// Sau khi đánh giá → gửi thông báo kết quả đến sinh viên
exports.reviewProgress = async (req, res) => {
    try {
        const { status, feedback } = req.body;
        await pool.execute('UPDATE progress_reports SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', [status, feedback || null, req.user.id, req.params.id]);

        const [report] = await pool.execute('SELECT pr.*, ta.student_id, m.title as milestone_title FROM progress_reports pr LEFT JOIN topic_assignments ta ON pr.assignment_id = ta.id LEFT JOIN milestones m ON pr.milestone_id = m.id WHERE pr.id = ?', [req.params.id]);
        if (report.length > 0) {
            const statusText = status === 'reviewed' ? 'đã được đánh giá' : 'cần chỉnh sửa';
            await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')", [report[0].student_id, 'Đánh giá tiến độ', `Mốc "${report[0].milestone_title}" ${statusText}.`]);
        }
        res.json({ success: true, message: 'Đánh giá tiến độ thành công!' });
    } catch (error) {
        console.error('Review progress error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN / GIẢNG VIÊN] Xem tiến độ tổng hợp của 1 sinh viên cụ thể
// Trả về: thông tin đề tài + danh sách mốc + trạng thái nộp từng mốc
// Gắn isSubmitted và isOverdue để frontend hiển thị màu sắc cảnh báo
exports.getStudentProgress = async (req, res) => {
    try {
        const [assignment] = await pool.execute("SELECT ta.*, t.title as topic_title, t.id as topic_id, u.full_name as student_name, u.student_code FROM topic_assignments ta LEFT JOIN topics t ON ta.topic_id = t.id LEFT JOIN users u ON ta.student_id = u.id WHERE ta.student_id = ? AND ta.status = 'active'", [req.params.studentId]);
        if (assignment.length === 0) return res.status(404).json({ success: false, message: 'Sinh viên chưa được phân công đề tài.' });

        const [milestones] = await pool.execute('SELECT * FROM milestones WHERE topic_id = ? OR topic_id IS NULL ORDER BY order_index', [assignment[0].topic_id]);
        const [reports] = await pool.execute('SELECT * FROM progress_reports WHERE assignment_id = ?', [assignment[0].id]);

        const progressMap = milestones.map(m => {
            const report = reports.find(r => r.milestone_id === m.id);
            return { ...m, report: report || null, isSubmitted: !!report, isOverdue: !report && new Date(m.deadline) < new Date() };
        });

        res.json({ success: true, data: { assignment: assignment[0], progress: progressMap, stats: { total: milestones.length, submitted: reports.length, overdue: progressMap.filter(p => p.isOverdue).length } } });
    } catch (error) {
        console.error('Get student progress error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
