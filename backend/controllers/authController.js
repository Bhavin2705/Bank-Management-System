const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_me';
const JWT_EXPIRE_DAYS = parseInt(process.env.JWT_EXPIRE_DAYS) || 7;
const JWT_REFRESH_EXPIRE_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS) || 30;

const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || `${JWT_EXPIRE_DAYS}d`
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || `${JWT_REFRESH_EXPIRE_DAYS}d`
    });
};

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: JWT_EXPIRE_DAYS * 24 * 60 * 60 * 1000
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60 * 1000
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, phone, password, initialDeposit, bankDetails } = req.body;

        // Check if email exists (email should remain unique)
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Check phone number account limit
        const phoneCheck = await User.checkPhoneAccountLimit(phone);
        if (!phoneCheck.canRegister) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${phoneCheck.maxAllowed} accounts allowed per phone number. Current count: ${phoneCheck.count}`
            });
        }

        // Create user with bank details
        const userData = {
            name,
            email,
            phone,
            password,
            balance: initialDeposit || 0,
            accountNumber: 'ACC-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5).toUpperCase(),
            bankDetails: bankDetails || {
                bankName: 'BankPro',
                ifscCode: 'BANK0001234',
                branchName: 'Main Branch'
            }
        };

        const user = await User.create(userData);

        // Create initial deposit transaction if amount > 0
        if (initialDeposit && initialDeposit > 0) {
            // Prevent accidental duplicate initial deposit creation (e.g. double submit).
            // If a matching initial deposit transaction was created very recently for this user,
            // skip creating another one.
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
                // Best-effort: do not block registration if this check fails, continue
            }
        }

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            balance: user.balance,
            accountNumber: user.accountNumber,
            bankDetails: user.bankDetails
        };

        res.cookie('token', token, cookieOptions);
        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

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
            error: 'Server error during registration',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        // Check for user
        const users = await User.findByEmailOrPhone(identifier).select('+password');

        // Handle multiple users for phone number case
        let user;
        if (Array.isArray(users)) {
            // Multiple users found for phone number
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            } else if (users.length === 1) {
                user = users[0];
            } else {
                // Multiple accounts exist for this phone number
                // Return list of accounts for user to choose from
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
            // Single user found (email case)
            user = users;
        }

        // If user was not found, return invalid credentials (DB recreation may remove accounts)
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // If user is blocked (suspended or inactive), return specific error
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

        // Check if account is locked
        if (user.security && user.security.lockUntil && user.security.lockUntil > Date.now()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked due to too many failed attempts'
            });
        }

        // Reset login attempts on successful login
        if (user.security && user.security.loginAttempts > 0) {
            user.security.loginAttempts = 0;
            user.security.lockUntil = undefined;
            await user.save();
        }

        // Update last login
        if (user.security) {
            user.security.lastLogin = new Date();
        } else {
            user.security = { lastLogin: new Date() };
        }
        await user.save({ validateBeforeSave: false });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            balance: user.balance,
            accountNumber: user.accountNumber,
            bankDetails: user.bankDetails,
            profile: user.profile,
            preferences: user.preferences
        };

        res.cookie('token', token, cookieOptions);
        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        res.cookie('token', token, cookieOptions);
        res.cookie('refreshToken', refreshToken, refreshCookieOptions);

        res.status(200).json({
            success: true,
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Server error during login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Login with specific account selection (when multiple accounts exist for phone)
// @route   POST /api/auth/login-account
// @access  Public
const loginWithAccount = async (req, res) => {
    try {
        const { identifier, password, accountId } = req.body;

        if (!accountId) {
            return res.status(400).json({
                success: false,
                error: 'Account ID is required'
            });
        }

        // Find the specific user account
        const user = await User.findById(accountId).select('+password');

        // If user was not found, return invalid credentials
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // If user is blocked (suspended or inactive), return specific error
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

        // Verify the identifier matches this user (additional security)
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

        // Check if account is locked
        if (user.security && user.security.lockUntil && user.security.lockUntil > Date.now()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked due to too many failed attempts'
            });
        }

        // Reset login attempts on successful login
        if (user.security && user.security.loginAttempts > 0) {
            user.security.loginAttempts = 0;
            user.security.lockUntil = undefined;
            await user.save();
        }

        // Update last login
        if (user.security) {
            user.security.lastLogin = new Date();
        } else {
            user.security = { lastLogin: new Date() };
        }
        await user.save({ validateBeforeSave: false });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            balance: user.balance,
            accountNumber: user.accountNumber,
            bankDetails: user.bankDetails,
            profile: user.profile,
            preferences: user.preferences
        };

        res.status(200).json({
            success: true,
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login with account error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        res.clearCookie('token', cookieOptions);
        res.clearCookie('refreshToken', refreshCookieOptions);

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

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
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

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
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

        // Remove undefined fields
        Object.keys(fieldsToUpdate).forEach(key => {
            if (fieldsToUpdate[key] === undefined) {
                delete fieldsToUpdate[key];
            }
        });

        const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
            new: true,
            runValidators: true
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

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+password');

        // Check current password
        if (!(await user.comparePassword(req.body.currentPassword))) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        user.password = req.body.newPassword;
        await user.save();

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

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email;

        // Find user by email. Don't reveal existence to the caller.
        const user = await User.findOne({ email });

        if (!user) {
            // Respond with success to avoid email enumeration
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Get reset token (raw) and set hashed token+expiry on user.security
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Build reset URL for the frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

        // Support both SMTP_* and legacy EMAIL_* env var names. Prefer SMTP_* when available.
        const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
        const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
        const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
        const smtpPortRaw = process.env.SMTP_PORT || process.env.EMAIL_PORT;
        const smtpSecureFlag = (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true';

        const smtpConfigured = smtpHost && smtpUser && smtpPass;

        if (!smtpConfigured && process.env.NODE_ENV === 'development') {
            // In development, return token so developer can test the flow easily
            console.warn('SMTP/EMAIL not configured. Returning reset token in development mode.');
            return res.status(200).json({
                success: true,
                message: 'Password reset token generated (development only)',
                data: resetToken
            });
        }

        if (!smtpConfigured) {
            // In production, do not proceed without SMTP/EMAIL
            // Clear token fields to avoid leaving a valid token
            user.security.passwordResetToken = undefined;
            user.security.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            console.error('SMTP/EMAIL configuration missing. Cannot send password reset email.');
            return res.status(500).json({
                success: false,
                error: 'Password reset is temporarily unavailable. Please contact support.'
            });
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPortRaw ? parseInt(smtpPortRaw, 10) : 587,
            secure: smtpSecureFlag,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const mailFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || `no-reply@${process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).host : 'localhost'}`;

        const mailOptions = {
            from: mailFrom,
            to: user.email,
            subject: 'BankPro Password Reset',
            text: `You requested a password reset for your BankPro account. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email. This link will expire in 10 minutes.`,
            html: `<p>You requested a password reset for your BankPro account.</p><p>Click the link below to reset your password (valid for 10 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, please ignore this email.</p>`
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', {
                messageId: info && info.messageId,
                response: info && info.response
            });

            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        } catch (sendErr) {
            console.error('Error sending password reset email:', sendErr && sendErr.message ? sendErr.message : sendErr);
            // Clear token fields to avoid leaving a valid token
            user.security.passwordResetToken = undefined;
            user.security.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                error: 'Failed to send password reset email. Please try again later.'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error with password reset'
        });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const rawToken = req.params.resettoken;
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        console.log('Password reset debug:');
        console.log('  Raw token:', rawToken);
        console.log('  Hashed token:', resetPasswordToken);

        // Find user by token, regardless of expiry
        const user = await User.findOne({ 'security.passwordResetToken': resetPasswordToken });

        if (!user) {
            console.error('Password reset error: invalid token');
            return res.status(400).json({
                success: false,
                error: 'Invalid password reset token.'
            });
        }

        // Check expiry
        if (!user.security?.passwordResetExpires || user.security.passwordResetExpires < Date.now()) {
            console.error('Password reset error: expired token');
            return res.status(400).json({
                success: false,
                error: 'Password reset token has expired.'
            });
        }

        // Set new password
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

// @desc    Verify reset password token (no password change)
// @route   GET /api/auth/resetpassword/:resettoken
// @access  Public
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

        // Token is valid - return success and email (do not reveal more)
        return res.status(200).json({ success: true, data: { email: user.email } });
    } catch (error) {
        console.error('Error verifying reset token:', error);
        return res.status(500).json({ success: false, error: 'Server error verifying token' });
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
    try {
        // Accept refresh token from request body or httpOnly cookie
        const refreshTokenFromBody = req.body && req.body.refreshToken;
        const refreshTokenFromCookie = req.cookies && req.cookies.refreshToken;
        const tokenToVerify = refreshTokenFromBody || refreshTokenFromCookie;

        if (!tokenToVerify) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(tokenToVerify, JWT_REFRESH_SECRET);

        // Get user
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
