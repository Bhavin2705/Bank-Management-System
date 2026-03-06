const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS, 10) || 7;
const JWT_REFRESH_EXPIRE_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS, 10) || 30;
const TWO_FACTOR_OTP_TTL_MS = 10 * 60 * 1000;
const LOGIN_HISTORY_LIMIT = 10;

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    return process.env.JWT_SECRET;
};

const getJwtRefreshSecret = () => {
    if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not configured');
    return process.env.JWT_REFRESH_SECRET;
};

const normalizeSameSite = (value) => {
    const normalized = String(value || '').toLowerCase();
    if (['lax', 'strict', 'none'].includes(normalized)) return normalized;
    return 'none';
};

const PRODUCTION_COOKIE_SAME_SITE = normalizeSameSite(process.env.COOKIE_SAME_SITE || 'none');

const generateToken = (id) => jwt.sign({ id, tokenType: 'access' }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || `${JWT_EXPIRE_DAYS}d`
});

const generateRefreshToken = (id) => jwt.sign({ id, tokenType: 'refresh' }, getJwtRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || `${JWT_REFRESH_EXPIRE_DAYS}d`
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? PRODUCTION_COOKIE_SAME_SITE : 'Lax',
    maxAge: JWT_EXPIRE_DAYS * 24 * 60 * 60 * 1000
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? PRODUCTION_COOKIE_SAME_SITE : 'Lax',
    maxAge: JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60 * 1000
};

const getClearCookieOptions = (options) => {
    const { maxAge, ...clearOptions } = options;
    return clearOptions;
};

const clearTokenCookieOptions = getClearCookieOptions(cookieOptions);
const clearRefreshCookieOptions = getClearCookieOptions(refreshCookieOptions);

const generateTwoFactorOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashTwoFactorOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const initiateTwoFactorLogin = async (user, req, res, sendLoginOtpEmail) => {
    const otpCode = generateTwoFactorOtp();
    user.security = user.security || {};
    user.security.twoFactorOtpHash = hashTwoFactorOtp(otpCode);
    user.security.twoFactorOtpExpires = new Date(Date.now() + TWO_FACTOR_OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const sent = await sendLoginOtpEmail(user.email, user.name, otpCode);
    if (!sent) {
        return res.status(503).json({
            success: false,
            error: 'Unable to send OTP email. Please verify SMTP configuration and try again.'
        });
    }

    return res.status(202).json({
        success: false,
        requiresTwoFactor: true,
        message: 'A 6-digit OTP has been sent to your registered email.'
    });
};

const verifyTwoFactorOtp = (user, otp) => {
    const otpHash = user?.security?.twoFactorOtpHash;
    const otpExpiry = user?.security?.twoFactorOtpExpires;

    if (!otpHash || !otpExpiry) return false;
    if (new Date(otpExpiry).getTime() < Date.now()) return false;

    return hashTwoFactorOtp(otp) === otpHash;
};

const appendLoginHistoryEntry = (user, req) => {
    const forwardedHeader = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedHeader)
        ? forwardedHeader[0]
        : (typeof forwardedHeader === 'string' ? forwardedHeader.split(',')[0] : null);
    const ip = (forwardedIp || req.ip || req.socket?.remoteAddress || '').trim() || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';

    user.clientData = user.clientData || {};
    const existingHistory = Array.isArray(user.clientData.loginHistory) ? user.clientData.loginHistory : [];
    const nextHistory = [
        ...existingHistory,
        {
            timestamp: new Date(),
            ip,
            device: userAgent,
            status: 'SUCCESS'
        }
    ];

    user.clientData.loginHistory = nextHistory.slice(-LOGIN_HISTORY_LIMIT);
};

const setAuthCookies = (res, token, refreshToken) => {
    res.cookie('token', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

const buildAuthenticatedUserResponse = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    balance: user.balance,
    accountNumber: user.accountNumber,
    bankDetails: user.bankDetails,
    profile: user.profile,
    preferences: user.preferences,
    createdAt: user.createdAt,
    firstLogin: user.firstLogin
});

module.exports = {
    generateToken,
    generateRefreshToken,
    getJwtRefreshSecret,
    cookieOptions,
    clearTokenCookieOptions,
    clearRefreshCookieOptions,
    initiateTwoFactorLogin,
    verifyTwoFactorOtp,
    appendLoginHistoryEntry,
    setAuthCookies,
    buildAuthenticatedUserResponse
};
