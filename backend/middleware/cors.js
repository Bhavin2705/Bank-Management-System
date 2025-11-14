const cors = require('cors');

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.FRONTEND_URL, // Production frontend URL
            'http://localhost:5173', // Vite dev server
            'http://localhost:5174', // Alternative Vite dev server
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://localhost:3000', // Alternative dev server
            'http://127.0.0.1:3000'
        ].filter(Boolean); // Remove undefined values

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = cors(corsOptions);
