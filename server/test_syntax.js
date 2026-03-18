const fs = require('fs');
const path = require('path');
const controllersDir = path.join(__dirname, 'controllers');

let hasError = false;
console.log('--- Kiểm tra 문 pháp Controllers ---');

if (fs.existsSync(controllersDir)) {
    const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        try {
            require(path.join(controllersDir, file));
            console.log(`[OK] ${file}`);
        } catch (err) {
            console.error(`[LỖI CÚ PHÁP LỚN] ${file}:`, err.message);
            hasError = true;
        }
    }
}

console.log('--- Kiểm tra Middleware ---');
const middlewares = ['auth.js', 'authorize.js', 'auditLog.js', 'errorHandler.js', 'upload.js'];
for (const file of middlewares) {
    try {
        require(path.join(__dirname, 'middleware', file));
        console.log(`[OK] ${file}`);
    } catch (err) {
        console.error(`[LỖI MIDDLEWARE] ${file}:`, err.message);
        hasError = true;
    }
}

process.exit(hasError ? 1 : 0);
