const pool = require('../config/db');

// [ADMIN / GIẢNG VIÊN] Lấy toàn bộ danh sách đề tài (phân trang + lọc)
// Lọc được theo: status, semester, category, lecturer_id, từ khóa tìm kiếm
exports.getTopics = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, semester, lecturer_id, search, category } = req.query;
        const offset = (page - 1) * limit;

        let query = `
      SELECT t.*, u.full_name as lecturer_name, u.lecturer_code,
        (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.topic_id = t.id AND ta.status = 'active') as current_students
      FROM topics t
      LEFT JOIN users u ON t.lecturer_id = u.id
      WHERE 1=1
    `;
        let countQuery = 'SELECT COUNT(*) as total FROM topics t WHERE 1=1';
        const params = [];
        const countParams = [];

        // Lecturer và Admin đều thấy tất cả đề tài
        // (không filter theo lecturer_id nữa)

        if (status) {
            query += ' AND t.status = ?';
            countQuery += ' AND t.status = ?';
            params.push(status);
            countParams.push(status);
        }

        if (semester) {
            query += ' AND t.semester = ?';
            countQuery += ' AND t.semester = ?';
            params.push(semester);
            countParams.push(semester);
        }

        if (lecturer_id) {
            query += ' AND t.lecturer_id = ?';
            countQuery += ' AND t.lecturer_id = ?';
            params.push(lecturer_id);
            countParams.push(lecturer_id);
        }

        if (category) {
            query += ' AND t.category = ?';
            countQuery += ' AND t.category = ?';
            params.push(category);
            countParams.push(category);
        }

        if (search) {
            query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
            countQuery += ' AND (t.title LIKE ? OR t.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [topics] = await pool.execute(query, params);
        const [countResult] = await pool.execute(countQuery, countParams);

        res.json({
            success: true,
            data: {
                topics,
                pagination: {
                    total: countResult[0].total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get topics error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SINH VIÊN] Lấy tất cả đề tài không bị hủy (để SV xem tổng quan tất cả đề tài)
// Khác getOpenTopics: không điều kiện về trạng thái hoặc số chỗ
exports.getAvailableTopics = async (req, res) => {
    try {
        const [topics] = await pool.execute(`
      SELECT t.*, u.full_name as lecturer_name, u.lecturer_code,
        (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.topic_id = t.id AND ta.status = 'active') as current_students
      FROM topics t
      LEFT JOIN users u ON t.lecturer_id = u.id
      WHERE t.status != 'cancelled'
      ORDER BY t.created_at DESC
    `);

        res.json({
            success: true,
            data: topics
        });
    } catch (error) {
        console.error('Get available topics error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [GIẢNG VIÊN / SINH VIÊN] Lấy đề tài đã duyệt và còn chỗ để đăng ký
// Là nơi SV nhìn thấy danh sánh nguyện vọng: kèm tên SV đã đăng ký và đang chờ duyệt
exports.getOpenTopics = async (req, res) => {
    try {
        const [topics] = await pool.execute(`
      SELECT t.*, u.full_name as lecturer_name, u.lecturer_code,
        (SELECT COUNT(*) FROM topic_assignments ta WHERE ta.topic_id = t.id AND ta.status = 'active') as current_students,
        (SELECT COUNT(*) FROM wish_registrations w WHERE w.topic_id = t.id AND w.status = 'pending') as pending_wishes
      FROM topics t
      LEFT JOIN users u ON t.lecturer_id = u.id
      WHERE t.status = 'approved'
      ORDER BY t.created_at DESC
    `);

        // Get student names for each pending wish on each topic
        for (let topic of topics) {
            const [wishingStudents] = await pool.execute(`
                SELECT u.full_name 
                FROM wish_registrations w 
                JOIN users u ON w.student_id = u.id 
                WHERE w.topic_id = ? AND w.status = 'pending'
            `, [topic.id]);
            topic.wishing_students = wishingStudents.map(s => s.full_name).join(', ');
        }

        res.json({
            success: true,
            data: topics // Trả về tất cả để hiển thị (kèm số lượng và tên SV)
        });
    } catch (error) {
        console.error('Get open topics error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [TẤT CẢ ROLE] Lấy chi tiết 1 đề tài theo ID
// Kèm thông tin: SV được phân công và các mốc tiến độ của đề tài
exports.getTopicById = async (req, res) => {
    try {
        const [topics] = await pool.execute(`
      SELECT t.*, u.full_name as lecturer_name, u.lecturer_code, u.email as lecturer_email
      FROM topics t
      LEFT JOIN users u ON t.lecturer_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

        if (topics.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đề tài.' });
        }

        // Lấy SV đã được phân công
        const [assignments] = await pool.execute(`
      SELECT ta.*, u.full_name, u.student_code, u.email
      FROM topic_assignments ta
      LEFT JOIN users u ON ta.student_id = u.id
      WHERE ta.topic_id = ? AND ta.status = 'active'
    `, [req.params.id]);

        // Lấy milestones
        const [milestones] = await pool.execute(
            'SELECT * FROM milestones WHERE topic_id = ? OR topic_id IS NULL ORDER BY order_index',
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...topics[0],
                assignments,
                milestones
            }
        });
    } catch (error) {
        console.error('Get topic error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN / GIẢNG VIÊN] Tạo đề tài mới
// GV tạo: tự động gán lecturer_id = chính mình
// Admin tạo: có thể chỉ định lecturer_id bất kỳ
exports.createTopic = async (req, res) => {
    try {
        const { title, description, max_students, semester, category, requirements } = req.body;
        const lecturer_id = req.user.role === 'lecturer' ? req.user.id : req.body.lecturer_id;

        if (!title || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tiêu đề và học kỳ.'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO topics (title, description, lecturer_id, max_students, semester, category, requirements)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, lecturer_id, max_students || 1, semester, category || null, requirements || null]
        );

        res.status(201).json({
            success: true,
            message: 'Tạo đề tài thành công!',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create topic error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN / GIẢNG VIÊN] Cập nhật thông tin đề tài (tiêu đề, mô tả, số SV, trạng thái...)
exports.updateTopic = async (req, res) => {
    try {
        const { title, description, max_students, status, semester, category, requirements } = req.body;
        const topicId = req.params.id;

        await pool.execute(
            `UPDATE topics SET title = ?, description = ?, max_students = ?, status = ?, 
       semester = ?, category = ?, requirements = ? WHERE id = ?`,
            [title, description, max_students, status, semester, category, requirements, topicId]
        );

        res.json({
            success: true,
            message: 'Cập nhật đề tài thành công!'
        });
    } catch (error) {
        console.error('Update topic error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN] Duyệt đề tài: chuyển trạng thái từ 'draft' → 'approved'
// Chỉ đề tài đã duyệt mới xuất hiện cho SV đăng ký nguyện vọng
exports.approveTopic = async (req, res) => {
    try {
        const topicId = req.params.id; // Lấy ID của đề tài từ URL param

        // Thực thi câu lệnh SQL cập nhật trạng thái đề tài thành 'approved' (Đã duyệt)
        await pool.execute(
            "UPDATE topics SET status = 'approved' WHERE id = ?",
            [topicId]
        );

        // Phản hồi kết quả thành công về cho Frontend (React)
        res.json({
            success: true,
            message: 'Duyệt đề tài thành công!'
        });
    } catch (error) {
        console.error('Approve topic error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [ADMIN / GIẢNG VIÊN] Xóa mềm đề tài (chuyển sang 'cancelled', không xóa khỏi DB)
// Không cho phép xóa nếu đề tài đã có sinh viên được phân công
exports.deleteTopic = async (req, res) => {
    try {
        const topicId = req.params.id;

        // Kiểm tra đề tài đã có SV đăng ký chưa
        const [assignments] = await pool.execute(
            "SELECT COUNT(*) as count FROM topic_assignments WHERE topic_id = ? AND status = 'active'",
            [topicId]
        );

        if (assignments[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa đề tài đã có sinh viên đăng ký.'
            });
        }

        await pool.execute("UPDATE topics SET status = 'cancelled' WHERE id = ?", [topicId]);

        res.json({
            success: true,
            message: 'Xóa đề tài thành công!'
        });
    } catch (error) {
        console.error('Delete topic error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
