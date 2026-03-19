const mysql = require('mysql2/promise');
async function check() {
  try {
     const c = await mysql.createConnection({
         host:'localhost', user:'root', password:'', database:'thesis_management'
     });
     const [rows] = await c.query('SELECT COUNT(*) as c FROM users');
     console.log('XAMPP USERS COUNT:', rows[0].c);
     const [rows2] = await c.query('SELECT COUNT(*) as c FROM topics');
     console.log('XAMPP TOPICS COUNT:', rows2[0].c);
     await c.end();
  } catch(e) {
     console.log('FAIL:', e.message);
  }
}
check();
