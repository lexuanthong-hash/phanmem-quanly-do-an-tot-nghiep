// Middleware xử lý lỗi tập trung
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Lỗi Multer (upload file)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File quá lớn. Kích thước tối đa: 50MB'
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: `Lỗi upload file: ${err.message}`
        });
    }

    // Lỗi validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Lỗi MySQL duplicate
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Dữ liệu đã tồn tại trong hệ thống.'
        });
    }

    // Lỗi chung
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.'
    });
};

module.exports = errorHandler;
