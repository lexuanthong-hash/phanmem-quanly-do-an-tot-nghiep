const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const { startDeadlineNotifier } = require('./utils/notificationService');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true })); // cho phép frontend gọi API
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // phục vụ file upload

// Đăng ký routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/wishes', require('./routes/wishes'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

app.use(errorHandler); // phải đặt cuối cùng, bắt tất cả lỗi chưa xử lý

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    startDeadlineNotifier(); // cron job nhắc deadline mỗi ngày lúc 8h
});
