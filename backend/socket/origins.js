const parseOrigins = (value) => (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getAllowedSocketOrigins = () => new Set([
    process.env.FRONTEND_URL,
    ...parseOrigins(process.env.FRONTEND_URLS),
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
].filter(Boolean));

const isAllowedSocketOrigin = (origin, allowedOrigins) => {
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

module.exports = {
    getAllowedSocketOrigins,
    isAllowedSocketOrigin
};
