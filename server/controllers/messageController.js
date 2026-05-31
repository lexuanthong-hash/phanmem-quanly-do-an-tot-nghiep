const pool = require('../config/db');
const { getConversationAccess } = require('../utils/conversationHelper');

const CONVERSATION_SELECT = `
    SELECT c.id, c.assignment_id, c.updated_at,
           ta.student_id, ta.topic_id,
           sv.full_name AS student_name, sv.student_code,
           t.title AS topic_title, t.lecturer_id,
           gv.full_name AS lecturer_name,
           (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
           (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
    FROM conversations c
    JOIN topic_assignments ta ON c.assignment_id = ta.id AND ta.status = 'active'
    JOIN topics t ON ta.topic_id = t.id
    JOIN users sv ON ta.student_id = sv.id
    JOIN users gv ON t.lecturer_id = gv.id
`;

const getUnreadForConversation = async (conversationId, userId) => {
    const [rows] = await pool.execute(
        'SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
        [conversationId, userId]
    );
    return Number(rows[0].count) || 0;
};

const notifyRecipient = async (recipientId, senderName, topicTitle, conversationId) => {
    await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES (?, ?, ?, 'message', ?)`,
        [
            recipientId,
            'Tin nhắn mới',
            `${senderName} đã gửi tin nhắn về đề tài "${topicTitle}".`,
            `chat:${conversationId}`,
        ]
    );
};

// [SV / GV] Số tin nhắn chưa đọc
exports.getUnreadCount = async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.json({ success: true, data: { unreadCount: 0 } });
        }

        let query = `
            SELECT COUNT(*) AS count FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN topic_assignments ta ON c.assignment_id = ta.id AND ta.status = 'active'
            JOIN topics t ON ta.topic_id = t.id
            WHERE m.sender_id != ? AND m.is_read = 0
        `;
        const params = [req.user.id];

        if (req.user.role === 'student') {
            query += ' AND ta.student_id = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'lecturer') {
            query += ' AND t.lecturer_id = ?';
            params.push(req.user.id);
        }

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: { unreadCount: Number(rows[0].count) || 0 } });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SV / GV] Danh sách hội thoại
exports.getConversations = async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.json({ success: true, data: [] });
        }

        let query = CONVERSATION_SELECT + ' WHERE 1=1';
        const params = [];

        if (req.user.role === 'student') {
            query += ' AND ta.student_id = ?';
            params.push(req.user.id);
        } else if (req.user.role === 'lecturer') {
            query += ' AND t.lecturer_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY COALESCE(last_message_at, c.updated_at) DESC';

        const [conversations] = await pool.execute(query, params);

        for (const conv of conversations) {
            conv.unread_count = await getUnreadForConversation(conv.id, req.user.id);
        }

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('getConversations error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SV / GV] Lấy tin nhắn trong hội thoại
exports.getMessages = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const afterId = parseInt(req.query.after_id, 10) || 0;
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

        const conv = await getConversationAccess(conversationId, req.user);
        if (!conv) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập hội thoại này.' });
        }

        let query = `
            SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
                   u.full_name AS sender_name, u.role AS sender_role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
        `;
        const params = [conversationId];

        if (afterId > 0) {
            query += ' AND m.id > ?';
            params.push(afterId);
        }

        query += ' ORDER BY m.created_at ASC LIMIT ?';
        params.push(limit + 1);

        const [rows] = await pool.execute(query, params);
        const hasMore = rows.length > limit;
        const messages = hasMore ? rows.slice(0, limit) : rows;

        res.json({
            success: true,
            data: {
                conversation: conv,
                messages,
                has_more: hasMore,
            },
        });
    } catch (error) {
        console.error('getMessages error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SV / GV] Gửi tin nhắn
exports.sendMessage = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const content = (req.body.content || '').trim();

        if (!content) {
            return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống.' });
        }

        const conv = await getConversationAccess(conversationId, req.user);
        if (!conv) {
            return res.status(403).json({ success: false, message: 'Không có quyền gửi tin nhắn trong hội thoại này.' });
        }

        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Admin không thể gửi tin nhắn.' });
        }

        const [result] = await pool.execute(
            'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
            [conversationId, req.user.id, content]
        );

        await pool.execute(
            'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
            [conversationId]
        );

        const recipientId = req.user.role === 'student' ? conv.lecturer_id : conv.student_id;
        await notifyRecipient(recipientId, req.user.full_name, conv.topic_title, conversationId);

        const [messages] = await pool.execute(`
            SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at,
                   u.full_name AS sender_name, u.role AS sender_role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.id = ?
        `, [result.insertId]);

        res.status(201).json({ success: true, data: messages[0] });
    } catch (error) {
        console.error('sendMessage error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// [SV / GV] Đánh dấu tin nhắn đã đọc
exports.markAsRead = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const conv = await getConversationAccess(conversationId, req.user);
        if (!conv) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập hội thoại này.' });
        }

        await pool.execute(
            'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
            [conversationId, req.user.id]
        );

        res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
    } catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
