const path = require('path');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const resolveEnvFile = () => {
    const currentEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
    if (currentEnv === 'production') return 'production.env';
    if (currentEnv === 'test') return 'test.env';
    return 'development.env';
};

const loadEnv = () => {
    const envFile = resolveEnvFile();
    require('dotenv').config({
        path: path.resolve(__dirname, 'environments', envFile)
    });
};

const validateEnv = () => {
    const missing = requiredEnv.filter((name) => !process.env[name]);
    if (!missing.length) return;

    if (process.env.NODE_ENV === 'development') {
        console.warn('Warning: Missing environment variables:', missing.join(', '));
        console.warn('Please check your environment file and ensure all required variables are set.');
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
