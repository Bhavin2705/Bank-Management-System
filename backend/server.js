const http = require('http');
const { loadEnv, validateEnv } = require('./config');

loadEnv();
validateEnv();

const connectDB = require('./config/database');
const createApp = require('./app');
const configureSocket = require('./socket');
const emailService = require('./services/email');

connectDB();

const app = createApp();
const server = http.createServer(app);
configureSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    emailService.verifyConnection().then((ok) => {
        if (ok) {
            console.log('SMTP verified: email delivery is ready.');
        } else {
            const status = emailService.getStatus();
            console.warn(`SMTP not verified: ${status.message}`);
        }
    }).catch((err) => {
        console.warn(`SMTP verification error: ${err.message}`);
    });
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    console.log('Shutting down the server due to Uncaught Exception');
    process.exit(1);
});

module.exports = app;
