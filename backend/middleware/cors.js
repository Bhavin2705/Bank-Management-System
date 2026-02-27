const cors = require('cors');

const parseOrigins = (value) => (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const explicitAllowedOrigins = [
    process.env.FRONTEND_URL, // Primary production frontend URL
    ...parseOrigins(process.env.FRONTEND_URLS), // Optional comma-separated frontend URLs
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173'
].filter(Boolean);

const allowedOrigins = new Set(explicitAllowedOrigins);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    try {
        const parsed = new URL(origin);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return true;
        }

        if (parsed.hostname.endsWith('.vercel.app')) {
            return true;
        }
    } catch (e) {
        return false;
    }

    return allowedOrigins.has(origin);
};

const corsOptions = {
    origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = cors(corsOptions);
