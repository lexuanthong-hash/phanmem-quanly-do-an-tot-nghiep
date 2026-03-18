const pool = require('../config/db');

// override res.json để tự động ghi log khi request thành công
const auditLog = (action, entityType) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async (data) => {
            if (data.success !== false && res.statusCode < 400) {
                try {
                    const userId = req.user ? req.user.id : null;
                    const username = req.user ? req.user.username : 'anonymous';
                    const entityId = req.params.id || (data.data && data.data.id) || null;

                    await pool.execute(
                        `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, new_value, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [userId, username, action, entityType, entityId, JSON.stringify(req.body || {}), req.ip || req.connection.remoteAddress, req.headers['user-agent'] || '']
                    );
                } catch (err) {
                    console.error('Audit log error:', err.message); // lỗi ghi log không ảnh hưởng response
                }
            }
            return originalJson(data);
        };
        next();
    };
};

module.exports = auditLog;
