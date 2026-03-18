const pool = require('./config/db');
const ctrl = require('./controllers/topicController');

const req = {
    query: {},
    user: { role: 'admin', id: 1 }
};

const res = {
    json: (data) => console.log('RESPONSE:', JSON.stringify(data)),
    status: (code) => {
        console.log('STATUS:', code);
        return {
            json: (data) => console.log('ERROR JSON:', data)
        };
    }
};

ctrl.getTopics(req, res).then(() => {
    setTimeout(() => process.exit(0), 1000);
}).catch(err => {
    console.error('UNCAUGHT:', err);
    process.exit(1);
});
