const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'thesis_management',
  waitForConnections: true,
  connectionLimit: 10, // tối đa 10 kết nối đồng thời
  queueLimit: 0,
  charset: 'utf8mb4' // hỗ trợ tiếng Việt
});

pool.getConnection()
  .then(conn => { console.log('✅ Kết nối MySQL thành công'); conn.release(); })
  .catch(err => { console.error('❌ Lỗi kết nối MySQL:', err.message); });

module.exports = pool;
