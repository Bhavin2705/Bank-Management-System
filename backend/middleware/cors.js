const cors = require('cors');

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Basic allowlist plus a localhost wildcard to accept any localhost:port
        const allowedOrigins = [
            process.env.FRONTEND_URL, // Production frontend URL (if set)
            'http://localhost:5173', // Vite dev server
            'http://localhost:5174', // Alternative Vite dev server
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://localhost:3000', // Alternative dev server
            'http://127.0.0.1:3000',
            'http://localhost:4173' // Vite preview default
        ].filter(Boolean); // Remove undefined values

        // Allow any localhost (or 127.0.0.1) origin regardless of port to simplify local dev
        try {
            const parsed = new URL(origin);
            if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
                return callback(null, true);
            }
        } catch (e) {
            // If origin is not a valid URL for some reason, fall through to explicit list check
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
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
