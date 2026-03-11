const path = require('path');
const fs = require('fs');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

const resolveEnvFile = () => {
    const currentEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
    if (currentEnv === 'production') return 'production.env';
    if (currentEnv === 'test') return 'test.env';
    return 'development.env';
};

const loadIfExists = (envPath) => {
    if (!fs.existsSync(envPath)) return false;
    require('dotenv').config({
        path: envPath,
        override: false
    });
    return true;
};

const loadEnv = () => {
    const envName = String(process.env.NODE_ENV || 'development').toLowerCase();
    const projectRoot = path.resolve(__dirname, '..');

    // Prioritize real environment setup (.env and process env) before legacy fallback files.
    const candidatePaths = [
        path.resolve(projectRoot, '.env'),
        path.resolve(projectRoot, `.env.${envName}`),
        path.resolve(projectRoot, '.env.local'),
        path.resolve(projectRoot, `.env.${envName}.local`)
    ];

    candidatePaths.forEach(loadIfExists);

    // Backward-compatible fallback for existing config/environments/*.env files.
    const envFile = resolveEnvFile();
    loadIfExists(path.resolve(__dirname, 'environments', envFile));
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
