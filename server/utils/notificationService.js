const pool = require('../config/db');
const cron = require('node-cron');

const startDeadlineNotifier = () => {
    cron.schedule('0 8 * * *', async () => { // chạy lúc 8h sáng mỗi ngày
        try {
            console.log('🔔 Kiểm tra deadline...');

            // tìm milestones có deadline trong 2 ngày tới
            const [milestones] = await pool.execute(`
        SELECT m.*, t.title as topic_title FROM milestones m
        LEFT JOIN topics t ON m.topic_id = t.id
        WHERE m.deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 DAY)`);

            for (const m of milestones) {
                if (m.topic_id) {
                    // tìm SV chưa nộp tiến độ cho mốc này
                    const [students] = await pool.execute(`
            SELECT ta.student_id FROM topic_assignments ta
            WHERE ta.topic_id = ? AND ta.status = 'active'
            AND ta.id NOT IN (SELECT assignment_id FROM progress_reports WHERE milestone_id = ?)
          `, [m.topic_id, m.id]);

                    for (const s of students) {
                        await pool.execute("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'deadline')",
                            [s.student_id, '⚠️ Sắp đến hạn nộp', `Mốc "${m.title}" sẽ hết hạn vào ${new Date(m.deadline).toLocaleDateString('vi-VN')}.`]);
                    }
                }
            }
            console.log('✅ Kiểm tra deadline hoàn tất');
        } catch (error) {
            console.error('Deadline notifier error:', error);
        }
    });
    console.log('📅 Deadline notifier đã khởi động');
};

module.exports = { startDeadlineNotifier };
