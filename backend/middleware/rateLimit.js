const rateLimit = require('express-rate-limit');

const inTestMode = () =>
    process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
const toInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const apiLimiter = rateLimit({
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW, 15) * 60 * 1000,
    max: toInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => inTestMode()
});

const authLimiter = rateLimit({
    windowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    max: toInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 30),
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => inTestMode()
});

const passwordResetLimiter = rateLimit({
    windowMs: toInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES, 60) * 60 * 1000,
    max: toInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS, 5),
    message: {
        success: false,
        error: 'Too many password reset attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => inTestMode()
});

const transactionLimiter = rateLimit({
    windowMs: toInt(process.env.TRANSACTION_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    max: toInt(process.env.TRANSACTION_RATE_LIMIT_MAX_REQUESTS, 40),
    message: {
        success: false,
        error: 'Too many transaction requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => inTestMode()
});

const uploadLimiter = rateLimit({
    windowMs: toInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES, 60) * 60 * 1000,
    max: toInt(process.env.UPLOAD_RATE_LIMIT_MAX_REQUESTS, 10),
    message: {
        success: false,
        error: 'Too many file upload attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => inTestMode()
});

module.exports = {
    apiLimiter,
    authLimiter,
    passwordResetLimiter,
    transactionLimiter,
    uploadLimiter
};
