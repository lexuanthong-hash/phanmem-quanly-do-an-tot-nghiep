/**
 * ============================================
 * DASHBOARD CONTROLLER - Thống kê & Xuất báo cáo
 * ============================================
 * - getStats():      Thống kê tổng quan (overview, biểu đồ, top SV)
 * - exportReport():  Xuất file Excel (bảng điểm hoặc danh sách đề tài)
 *   Sử dụng thư viện ExcelJS để tạo file .xlsx
 */

const pool = require('../config/db');
const ExcelJS = require('exceljs');

// Thống kê Dashboard
exports.getStats = async (req, res) => {
    try {
        const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [totalStudents] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
        const [totalLecturers] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE role = 'lecturer'");
        const [totalTopics] = await pool.execute("SELECT COUNT(*) as count FROM topics WHERE status != 'cancelled'");
        const [assignedTopics] = await pool.execute("SELECT COUNT(*) as count FROM topics WHERE status IN ('assigned', 'in_progress', 'completed')");
        const [pendingWishes] = await pool.execute("SELECT COUNT(*) as count FROM wish_registrations WHERE status = 'pending'");
        const [totalAssignments] = await pool.execute("SELECT COUNT(*) as count FROM topic_assignments WHERE status = 'active'");
        const [completedAssignments] = await pool.execute("SELECT COUNT(*) as count FROM topic_assignments WHERE status = 'completed'");

        // Thống kê theo trạng thái đề tài
        const [topicsByStatus] = await pool.execute("SELECT status, COUNT(*) as count FROM topics WHERE status != 'cancelled' GROUP BY status");

        // Thống kê theo danh mục
        const [topicsByCategory] = await pool.execute("SELECT COALESCE(category, 'Khác') as category, COUNT(*) as count FROM topics WHERE status != 'cancelled' GROUP BY category");

        // Thống kê điểm trung bình
        const [avgScores] = await pool.execute("SELECT AVG(final_score) as avg_score FROM topic_assignments WHERE final_score IS NOT NULL");

        // Top 5 SV điểm cao nhất
        const [topStudents] = await pool.execute(`SELECT ta.final_score, u.full_name, u.student_code, t.title as topic_title
      FROM topic_assignments ta LEFT JOIN users u ON ta.student_id = u.id LEFT JOIN topics t ON ta.topic_id = t.id
      WHERE ta.final_score IS NOT NULL ORDER BY ta.final_score DESC LIMIT 5`);

        // Dữ liệu riêng cho sinh viên
        let studentInfo = null;
        if (req.user.role === 'student') {
            // Kiểm tra đã có assignment chưa (có final_score = đã được chấm)
            const [myAssignment] = await pool.execute(
                `SELECT ta.final_score, t.title as topic_title FROM topic_assignments ta
                 LEFT JOIN topics t ON ta.topic_id = t.id
                 WHERE ta.student_id = ? AND ta.status = 'active' LIMIT 1`,
                [req.user.id]
            );
            // Kiểm tra đã đăng ký nguyện vọng chưa
            const [myWishes] = await pool.execute(
                "SELECT COUNT(*) as count FROM wish_registrations WHERE student_id = ?",
                [req.user.id]
            );

            if (myAssignment.length > 0) {
                studentInfo = {
                    status: myAssignment[0].final_score !== null ? 'graded' : 'assigned',
                    score: myAssignment[0].final_score ? parseFloat(myAssignment[0].final_score).toFixed(2) : null,
                    topicTitle: myAssignment[0].topic_title
                };
            } else if (myWishes[0].count > 0) {
                studentInfo = { status: 'has_wish', score: null, topicTitle: null };
            } else {
                studentInfo = { status: 'no_wish', score: null, topicTitle: null };
            }
        }

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers: totalUsers[0].count,
                    totalStudents: totalStudents[0].count,
                    totalLecturers: totalLecturers[0].count,
                    totalTopics: totalTopics[0].count,
                    assignedTopics: assignedTopics[0].count,
                    pendingWishes: pendingWishes[0].count,
                    totalAssignments: totalAssignments[0].count,
                    completedAssignments: completedAssignments[0].count
                },
                topicsByStatus,
                topicsByCategory,
                avgScore: avgScores[0].avg_score ? parseFloat(avgScores[0].avg_score).toFixed(2) : 0,
                topStudents,
                studentInfo
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// Xuất báo cáo Excel
exports.exportReport = async (req, res) => {
    try {
        const { type } = req.query;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Thesis Management System';

        if (type === 'grades') {
            const sheet = workbook.addWorksheet('Bảng điểm');
            sheet.columns = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'MSSV', key: 'student_code', width: 15 },
                { header: 'Họ tên SV', key: 'student_name', width: 25 },
                { header: 'Đề tài', key: 'topic_title', width: 40 },
                { header: 'GV hướng dẫn', key: 'lecturer_name', width: 25 },
                { header: 'Điểm', key: 'final_score', width: 10 },
            ];

            const [data] = await pool.execute(`SELECT ta.final_score, u.full_name as student_name, u.student_code,
        t.title as topic_title, l.full_name as lecturer_name
        FROM topic_assignments ta LEFT JOIN users u ON ta.student_id = u.id
        LEFT JOIN topics t ON ta.topic_id = t.id LEFT JOIN users l ON t.lecturer_id = l.id
        WHERE ta.status IN ('active', 'completed') ORDER BY u.full_name`);

            data.forEach((row, i) => { sheet.addRow({ stt: i + 1, ...row }); });

            // Style header
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        } else {
            const sheet = workbook.addWorksheet('Danh sách đề tài');
            sheet.columns = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Tên đề tài', key: 'title', width: 40 },
                { header: 'GV HD', key: 'lecturer_name', width: 25 },
                { header: 'Trạng thái', key: 'status', width: 15 },
                { header: 'Học kỳ', key: 'semester', width: 15 },
                { header: 'Lĩnh vực', key: 'category', width: 15 },
            ];

            const [data] = await pool.execute(`SELECT t.*, u.full_name as lecturer_name FROM topics t
        LEFT JOIN users u ON t.lecturer_id = u.id WHERE t.status != 'cancelled' ORDER BY t.created_at DESC`);

            data.forEach((row, i) => { sheet.addRow({ stt: i + 1, ...row }); });
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=report_${type || 'topics'}_${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xuất báo cáo.' });
    }
};
