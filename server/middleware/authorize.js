// Kiểm tra role: authorize('admin', 'lecturer') → chỉ admin hoặc GV mới vào được
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện hành động này.' });
        }
        next();
    };
};

module.exports = authorize;
