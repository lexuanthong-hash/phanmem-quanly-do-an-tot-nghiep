const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập. Vui lòng cung cấp token.' });
        }

        const token = authHeader.split(' ')[1]; // tách lấy phần token sau "Bearer "
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // giải mã + kiểm tra hạn

        // gắn thông tin user vào req để controller dùng
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            full_name: decoded.full_name
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
        }
        return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
    }
};

module.exports = auth;
