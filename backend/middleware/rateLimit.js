const rateLimit = require('express-rate-limit');

const getEnv = () => String(process.env.NODE_ENV || 'development').toLowerCase();
const inTestMode = () => getEnv() === 'test' || Boolean(process.env.JEST_WORKER_ID);
const shouldSkipRateLimit = () => {
    if (inTestMode()) return true;
    // Keep local/dev workflows usable unless explicitly overridden.
    if (getEnv() !== 'production' && process.env.RATE_LIMIT_IN_DEV !== 'true') {
        return true;
    }
    return false;
};
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
    skip: () => shouldSkipRateLimit()
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
    skip: () => shouldSkipRateLimit()
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
    skip: () => shouldSkipRateLimit()
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
    skip: () => shouldSkipRateLimit()
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
    skip: () => shouldSkipRateLimit()
});

const lookupLimiter = rateLimit({
    windowMs: toInt(process.env.LOOKUP_RATE_LIMIT_WINDOW_MINUTES, 10) * 60 * 1000,
    max: toInt(process.env.LOOKUP_RATE_LIMIT_MAX_REQUESTS, 60),
    message: {
        success: false,
        error: 'Too many lookup requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => shouldSkipRateLimit()
});

const pinLimiter = rateLimit({
    windowMs: toInt(process.env.PIN_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    max: toInt(process.env.PIN_RATE_LIMIT_MAX_REQUESTS, 20),
    message: {
        success: false,
        error: 'Too many PIN attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => shouldSkipRateLimit()
});

const settingsWriteLimiter = rateLimit({
    windowMs: toInt(process.env.SETTINGS_RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    max: toInt(process.env.SETTINGS_RATE_LIMIT_MAX_REQUESTS, 50),
    message: {
        success: false,
        error: 'Too many settings updates, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => shouldSkipRateLimit()
});

module.exports = {
    apiLimiter,
    authLimiter,
    passwordResetLimiter,
    transactionLimiter,
    uploadLimiter,
    lookupLimiter,
    pinLimiter,
    settingsWriteLimiter
};
