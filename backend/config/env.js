const path = require('path');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const loadEnv = () => {
    require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
};

const validateEnv = () => {
    const missing = requiredEnv.filter((name) => !process.env[name]);

    if (!missing.length) {
        return;
    }

    if (process.env.NODE_ENV === 'development') {
        console.warn('Warning: Missing environment variables:', missing.join(', '));
        console.warn('Please check your .env file and ensure all required variables are set.');
        return;
    }

    console.error('Error: Missing required environment variables:', missing.join(', '));
    console.error('Please set all required environment variables before running in production.');
    process.exit(1);
};

module.exports = {
    loadEnv,
    validateEnv
};
