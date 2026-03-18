const pool = require('../config/db');

exports.getCriteria = async (req, res) => {
    try {
        const [criteria] = await pool.execute('SELECT * FROM rubric_criteria WHERE is_active = 1 ORDER BY order_index');
        res.json({ success: true, data: criteria });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

exports.createCriteria = async (req, res) => {
    try {
        const { name, description, max_score, weight, category, order_index } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO rubric_criteria (name, description, max_score, weight, category, order_index) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description || null, max_score || 10, weight || 1.0, category || 'report', order_index || 0]);
        res.status(201).json({ success: true, message: 'Tạo tiêu chí thành công!', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

exports.gradeAssignment = async (req, res) => {
    try {
        const { assignment_id, grades } = req.body;
        if (!assignment_id || !grades || !Array.isArray(grades)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
        }

        // lưu điểm từng tiêu chí, ON DUPLICATE KEY UPDATE = nếu đã chấm rồi thì cập nhật
        for (const g of grades) {
            await pool.execute(
                `INSERT INTO grades (assignment_id, rubric_criteria_id, grader_id, score, comment)
         VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment), graded_at = NOW()`,
                [assignment_id, g.criteria_id, req.user.id, g.score, g.comment || null]);
        }

        // tính điểm tổng kết: (score/max × weight) rồi quy về thang 10
        // Sửa: Lấy tổng trọng số của TẤT CẢ tiêu chí đang active để làm mẫu số
        const [allCriteria] = await pool.execute('SELECT SUM(weight) as total_possible_weight FROM rubric_criteria WHERE is_active = 1');
        const totalPossibleWeight = parseFloat(allCriteria[0].total_possible_weight) || 1;

        const [allGrades] = await pool.execute(
            `SELECT g.score, rc.weight, rc.max_score FROM grades g
       JOIN rubric_criteria rc ON g.rubric_criteria_id = rc.id WHERE g.assignment_id = ?`, [assignment_id]);

        if (allGrades.length > 0) {
            let totalWeightedScore = 0;
            allGrades.forEach(g => {
                totalWeightedScore += (parseFloat(g.score) / parseFloat(g.max_score)) * parseFloat(g.weight);
            });
            // Chia cho TỔNG trọng số của tất cả tiêu chí, không phải chỉ những cái đã chấm
            const finalScore = ((totalWeightedScore / totalPossibleWeight) * 10).toFixed(2);
            await pool.execute('UPDATE topic_assignments SET final_score = ? WHERE id = ?', [finalScore, assignment_id]);
        }

        // thông báo cho SV
        const [asgn] = await pool.execute('SELECT student_id FROM topic_assignments WHERE id = ?', [assignment_id]);
        if (asgn.length > 0) {
            await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'grade')",
                [asgn[0].student_id, 'Điểm mới', 'Bạn đã được chấm điểm đồ án. Vui lòng kiểm tra.']);
        }

        res.json({ success: true, message: 'Chấm điểm thành công!' });
    } catch (error) {
        console.error('Grade error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

exports.getGrades = async (req, res) => {
    try {
        const { assignment_id } = req.query;

        // Nếu là sinh viên: kiểm tra assignment_id phải thuộc về chính mình
        if (req.user.role === 'student') {
            if (!assignment_id) {
                return res.json({ success: true, data: { grades: [], assignment: null } });
            }
            // Xác minh assignment này là của sinh viên này
            const [check] = await pool.execute(
                'SELECT id, final_score FROM topic_assignments WHERE id = ? AND student_id = ?',
                [assignment_id, req.user.id]
            );
            if (check.length === 0) {
                return res.status(403).json({ success: false, message: 'Không có quyền xem điểm này.' });
            }
            // Chỉ trả về điểm nếu giảng viên đã chấm xong (final_score != null)
            if (check[0].final_score === null) {
                return res.json({ success: true, data: { grades: [], assignment: null }, message: 'Chưa được chấm điểm.' });
            }
        }

        let query = `SELECT g.*, rc.name as criteria_name, rc.max_score, rc.weight, rc.category, u.full_name as grader_name
      FROM grades g LEFT JOIN rubric_criteria rc ON g.rubric_criteria_id = rc.id LEFT JOIN users u ON g.grader_id = u.id WHERE 1=1`;
        const params = [];
        if (assignment_id) { query += ' AND g.assignment_id = ?'; params.push(assignment_id); }
        query += ' ORDER BY rc.order_index';
        const [grades] = await pool.execute(query, params);

        let assignmentInfo = null;
        if (assignment_id) {
            const [info] = await pool.execute(
                `SELECT ta.*, t.title as topic_title, u.full_name as student_name, u.student_code
         FROM topic_assignments ta LEFT JOIN topics t ON ta.topic_id = t.id LEFT JOIN users u ON ta.student_id = u.id WHERE ta.id = ?`, [assignment_id]);
            if (info.length > 0) assignmentInfo = info[0];
        }
        res.json({ success: true, data: { grades, assignment: assignmentInfo } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        let query = `SELECT ta.*, t.title as topic_title, t.semester, u.full_name as student_name, u.student_code
      FROM topic_assignments ta LEFT JOIN topics t ON ta.topic_id = t.id LEFT JOIN users u ON ta.student_id = u.id WHERE ta.status = 'active'`;
        const params = [];

        if (req.user.role === 'student') {
            // SV chỉ thấy assignment của chính mình
            query += ' AND ta.student_id = ?';
            params.push(req.user.id);
        }
        // GV và Admin thấy tất cả assignments

        query += ' ORDER BY t.title, u.full_name';
        const [assignments] = await pool.execute(query, params);
        res.json({ success: true, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
