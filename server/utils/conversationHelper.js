const pool = require('../config/db');

// Tạo hội thoại cho phân công đề tài (nếu chưa có)
const ensureConversation = async (assignmentId) => {
    const [existing] = await pool.execute(
        'SELECT id FROM conversations WHERE assignment_id = ?',
        [assignmentId]
    );
    if (existing.length > 0) return existing[0].id;

    const [result] = await pool.execute(
        'INSERT INTO conversations (assignment_id) VALUES (?)',
        [assignmentId]
    );
    return result.insertId;
};

// Kiểm tra user có quyền truy cập hội thoại không (SV hoặc GV hướng dẫn)
const getConversationAccess = async (conversationId, user) => {
    const [rows] = await pool.execute(`
        SELECT c.id, c.assignment_id,
               ta.student_id, ta.topic_id, ta.status AS assignment_status,
               t.title AS topic_title, t.lecturer_id,
               sv.full_name AS student_name, sv.student_code,
               gv.full_name AS lecturer_name
        FROM conversations c
        JOIN topic_assignments ta ON c.assignment_id = ta.id
        JOIN topics t ON ta.topic_id = t.id
        JOIN users sv ON ta.student_id = sv.id
        JOIN users gv ON t.lecturer_id = gv.id
        WHERE c.id = ?
    `, [conversationId]);

    if (rows.length === 0) return null;

    const conv = rows[0];
    const isStudent = user.role === 'student' && conv.student_id === user.id;
    const isLecturer = user.role === 'lecturer' && conv.lecturer_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isStudent && !isLecturer && !isAdmin) return null;

    return conv;
};

module.exports = { ensureConversation, getConversationAccess };
