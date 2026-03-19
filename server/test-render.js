const https = require('https');

const data = JSON.stringify({
  username: 'admin', // Giả sử username là admin
  password: '123'
});

const options = {
  hostname: 'phanmem-quanly-do-an-tot-nghiep.onrender.com',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', body);
    
    // Nêú lấy đc token thì fetch topics
    if (res.statusCode === 200) {
        const token = JSON.parse(body).token;
        const options2 = {
          hostname: 'phanmem-quanly-do-an-tot-nghiep.onrender.com',
          path: '/api/topics',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        const req2 = https.request(options2, res2 => {
            let body2 = '';
            res2.on('data', d => body2 += d);
            res2.on('end', () => {
                console.log('TOPICS:', body2);
            });
        });
        req2.end();
    }
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
