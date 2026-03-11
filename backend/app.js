const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const emailService = require('./services/email');
const registerApiRoutes = require('./routes');

const createApp = () => {
    const app = express();

    app.use(helmet());
    app.use(cookieParser());
    app.use(cors);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(mongoSanitize());
    app.use(xss());
    app.use(hpp());

    app.options('*', cors);

    app.get('/health', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Bank Management API is running',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            email: emailService.getStatus()
        });
    });

    registerApiRoutes(app);

    app.all('*', (req, res) => {
        res.status(404).json({
            success: false,
            error: `Route ${req.originalUrl} not found`
        });
    });

    app.use(errorHandler);

    return app;
};

module.exports = createApp;
