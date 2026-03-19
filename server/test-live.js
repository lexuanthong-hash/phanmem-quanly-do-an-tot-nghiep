const https = require('https');
const jwt = require('jsonwebtoken');

function testFetch() {
  const token = jwt.sign(
    { id: 1, role: 'admin' }, 
    'thesis_management_secret_key_2024_graduation', // Fallback JWT secret trên mây
    { expiresIn: '1h' }
  );
  
  https.get('https://phanmem-quanly-do-an-tot-nghiep.onrender.com/api/topics', {
    headers: { Authorization: `Bearer ${token}` }
  }, r2 => {
    let b2 = ''; r2.on('data', d => b2+=d);
    r2.on('end', () => console.log('TOPICS:', b2.substring(0, 500)));
  });

  https.get('https://phanmem-quanly-do-an-tot-nghiep.onrender.com/api/users', {
    headers: { Authorization: `Bearer ${token}` }
  }, r3 => {
    let b3 = ''; r3.on('data', d => b3+=d);
    r3.on('end', () => console.log('USERS:', b3.substring(0, 500)));
  });
}

testFetch();
