const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const emailService = require('../utils/emailService');
const emailHelpers = require('../utils/emailHelpers');
const { createInAppNotification } = require('../utils/notifications');

const JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS) || 7;
const JWT_REFRESH_EXPIRE_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS) || 30;
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

const generateToken = (id) => {
    return jwt.sign({ id, tokenType: 'access' }, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRE || `${JWT_EXPIRE_DAYS}d`
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id, tokenType: 'refresh' }, getJwtRefreshSecret(), {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || `${JWT_REFRESH_EXPIRE_DAYS}d`
    });
};

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

const TWO_FACTOR_OTP_TTL_MS = 10 * 60 * 1000;
const LOGIN_HISTORY_LIMIT = 10;

const generateTwoFactorOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashTwoFactorOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const initiateTwoFactorLogin = async (user, req, res) => {
    const otpCode = generateTwoFactorOtp();
    user.security = user.security || {};
    user.security.twoFactorOtpHash = hashTwoFactorOtp(otpCode);
    user.security.twoFactorOtpExpires = new Date(Date.now() + TWO_FACTOR_OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const sent = await emailHelpers.sendLoginOtpEmail(user.email, user.name, otpCode);
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

const finalizeSuccessfulLogin = async (user, req, res) => {
    let userNeedsSave = false;

    if (user.security && user.security.loginAttempts > 0) {
        user.security.loginAttempts = 0;
        user.security.lockUntil = undefined;
        userNeedsSave = true;
    }

    if (user.security) {
        user.security.lastLogin = new Date();
    } else {
        user.security = { lastLogin: new Date() };
    }
    userNeedsSave = true;

    if (user.firstLogin) {
        user.firstLogin = false;
        userNeedsSave = true;
    }

    if (userNeedsSave) {
        appendLoginHistoryEntry(user, req);
        await user.save({ validateBeforeSave: false });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    const userResponse = buildAuthenticatedUserResponse(user);

    setAuthCookies(res, token, refreshToken);

    return res.status(200).json({
        success: true,
        data: {
            user: userResponse,
            token,
            refreshToken
        }
    });
};

const register = async (req, res) => {
    try {
        const { name, email, phone, password, pin, initialDeposit, bankDetails } = req.body;

        if (!pin) {
            return res.status(400).json({
                success: false,
                error: 'PIN is required'
            });
        }

        if (!/^\d{4,6}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                error: 'PIN must be a 4-6 digit number'
            });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        const phoneCheck = await User.checkPhoneAccountLimit(phone);
        if (!phoneCheck.canRegister) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${phoneCheck.maxAllowed} accounts allowed per phone number. Current count: ${phoneCheck.count}`
            });
        }

        const userData = {
            name,
            email,
            phone,
            password,
            pin,
            balance: initialDeposit || 0,
            bankDetails: bankDetails || {
                bankName: 'BankPro',
                ifscCode: 'BANK0001234',
                branchName: 'Main Branch'
            },
            firstLogin: true
        };

        const user = new User(userData);
        user.generateAccountNumber(); // Ensure accountNumber is set before validation
        await user.save();

        if (initialDeposit && initialDeposit > 0) {
            try {
                const recentDuplicate = await Transaction.findOne({
                    userId: user._id,
                    type: 'credit',
                    amount: initialDeposit,
                    description: 'Initial account deposit',
                    createdAt: { $gte: new Date(Date.now() - 10 * 1000) } // 10 seconds window
                });
                if (!recentDuplicate) {
                    await Transaction.create({
                        userId: user._id,
                        type: 'credit',
                        amount: initialDeposit,
                        balance: initialDeposit,
                        description: 'Initial account deposit'
                    });
                } else {
                    console.warn('Skipping duplicate initial deposit creation for user', user._id);
                }
            } catch (dupErr) {
                console.error('Error checking/creating initial deposit transaction:', dupErr);
            }
        }

        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            balance: user.balance,
            accountNumber: user.accountNumber,
            bankDetails: user.bankDetails,
            createdAt: user.createdAt, // ensure createdAt is sent to frontend
            firstLogin: user.firstLogin
        };

        setAuthCookies(res, token, refreshToken);

        emailHelpers.sendWelcomeEmail(user.email, user.name);
        emailHelpers.sendAccountCreatedEmail(user.email, user.name, user.accountNumber);

        res.status(201).json({
            success: true,
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during registration'
        });
    }
};

const login = async (req, res) => {
    try {
        const { identifier, password, otp } = req.body;

        const users = await User.findByEmailOrPhone(identifier).select('+password');

        let user;
        if (Array.isArray(users)) {
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            } else if (users.length === 1) {
                user = users[0];
            } else {
                const accountChoices = users.map(u => ({
                    _id: u._id,
                    name: u.name,
                    accountNumber: u.accountNumber,
                    bankDetails: u.bankDetails
                }));

                return res.status(300).json({
                    success: false,
                    error: 'Multiple accounts found',
                    message: 'Multiple accounts found for this phone number. Please specify which account to login to.',
                    accounts: accountChoices,
                    needsAccountSelection: true
                });
            }
        } else {
            user = users;
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        if (user.status === 'suspended' || user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                error: 'Your account has been blocked by admin.'
            });
        }

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (user.security && user.security.lockUntil && user.security.lockUntil > Date.now()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked due to too many failed attempts'
            });
        }

        if (user.security?.twoFactorEnabled) {
            if (!otp) {
                return initiateTwoFactorLogin(user, req, res);
            }

            const otpValid = verifyTwoFactorOtp(user, otp);
            if (!otpValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired OTP'
                });
            }

            user.security.twoFactorOtpHash = undefined;
            user.security.twoFactorOtpExpires = undefined;
        }
        return finalizeSuccessfulLogin(user, req, res);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
};

const loginWithAccount = async (req, res) => {
    try {
        const { identifier, password, accountId, otp } = req.body;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Account ID is required'
            });
        }

        const user = await User.findById(accountId).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        if (user.status === 'suspended' || user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                error: 'Your account has been blocked by admin.'
            });
        }

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier);
        if (isEmail && user.email !== identifier) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        } else if (!isEmail && user.phone !== identifier) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (user.security && user.security.lockUntil && user.security.lockUntil > Date.now()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked due to too many failed attempts'
            });
        }

        if (user.security?.twoFactorEnabled) {
            if (!otp) {
                return initiateTwoFactorLogin(user, req, res);
            }

            const otpValid = verifyTwoFactorOtp(user, otp);
            if (!otpValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired OTP'
                });
            }

            user.security.twoFactorOtpHash = undefined;
            user.security.twoFactorOtpExpires = undefined;
        }
        return finalizeSuccessfulLogin(user, req, res);
    } catch (error) {
        console.error('Login with account error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
};

const logout = async (req, res) => {
    try {
        res.clearCookie('token', clearTokenCookieOptions);
        res.clearCookie('refreshToken', clearRefreshCookieOptions);

        res.status(200).json({
            success: true,
            data: {},
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error during logout'
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting user data'
        });
    }
};

const updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            'profile.dateOfBirth': req.body.dateOfBirth,
            'profile.address': req.body.address,
            'profile.occupation': req.body.occupation,
            'profile.income': req.body.income,
            'preferences.currency': req.body.currency,
            'preferences.language': req.body.language,
            'preferences.theme': req.body.theme,
            'bankDetails.bankName': req.body.bankName,
            'bankDetails.ifscCode': req.body.ifscCode,
            'bankDetails.branchName': req.body.branchName
        };

        Object.keys(fieldsToUpdate).forEach(key => {
            if (fieldsToUpdate[key] === undefined) {
                delete fieldsToUpdate[key];
            }
        });

        const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'Profile Updated',
            message: 'Your profile details were updated successfully.',
            priority: 'low',
            metadata: { category: 'settings' }
        });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating user details'
        });
    }
};

const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+password');

        if (!(await user.comparePassword(req.body.currentPassword))) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        await createInAppNotification({
            userId: req.user._id,
            type: 'security_alert',
            title: 'Password Changed',
            message: 'Your account password was changed successfully.',
            priority: 'high',
            metadata: { category: 'security' }
        });

        const token = generateToken(user._id);
        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            data: { token },
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating password'
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

        if (!emailService.isConfigured()) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Email service not configured. Returning reset token in development mode.');
                return res.status(200).json({
                    success: true,
                    message: 'Password reset token generated (development only)',
                    data: resetToken
                });
            }

            user.security.passwordResetToken = undefined;
            user.security.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            console.error('Email service not configured. Cannot send password reset email.');
            return res.status(500).json({
                success: false,
                error: 'Password reset is temporarily unavailable. Please contact support.'
            });
        }

        try {
            await emailService.sendPasswordResetEmail(user.email, resetUrl);
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        } catch (sendErr) {
            console.error('Error sending password reset email:', sendErr.message);
            user.security.passwordResetToken = undefined;
            user.security.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                error: 'Failed to send password reset email. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error with password reset'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const rawToken = req.params.resettoken;
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        const user = await User.findOne({ 'security.passwordResetToken': resetPasswordToken });

        if (!user) {
            console.error('Password reset error: invalid token');
            return res.status(400).json({
                success: false,
                error: 'Invalid password reset token.'
            });
        }

        if (!user.security?.passwordResetExpires || user.security.passwordResetExpires < Date.now()) {
            console.error('Password reset error: expired token');
            return res.status(400).json({
                success: false,
                error: 'Password reset token has expired.'
            });
        }

        user.password = req.body.password;
        user.security.passwordResetToken = undefined;
        user.security.passwordResetExpires = undefined;
        await user.save();

        const token = generateToken(user._id);
        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            data: { token },
            message: 'Password reset successful'
        });
    } catch (error) {
        console.error('Server error resetting password:', error);
        res.status(500).json({
            success: false,
            error: 'Server error resetting password'
        });
    }
};

const verifyResetToken = async (req, res) => {
    try {
        const rawToken = req.params.resettoken;
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        const user = await User.findOne({ 'security.passwordResetToken': resetPasswordToken });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
        }

        if (!user.security?.passwordResetExpires || user.security.passwordResetExpires < Date.now()) {
            return res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
        }

        return res.status(200).json({ success: true, data: { email: user.email } });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        return res.status(500).json({ success: false, error: 'Server error verifying token' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const refreshTokenFromBody = req.body && req.body.refreshToken;
        const refreshTokenFromCookie = req.cookies && req.cookies.refreshToken;
        const tokenToVerify = refreshTokenFromBody || refreshTokenFromCookie;

        if (!tokenToVerify) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(tokenToVerify, getJwtRefreshSecret());

        if (!decoded || decoded.tokenType !== 'refresh' || !decoded.id) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const token = generateToken(user._id);
        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            data: { token }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
};

module.exports = {
    register,
    login,
    loginWithAccount,
    logout,
    getMe,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword,
    refreshToken,
    verifyResetToken
};
