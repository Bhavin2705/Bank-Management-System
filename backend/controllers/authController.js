const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
    });
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
            await Transaction.create({
                userId: user._id,
                type: 'credit',
                amount: initialDeposit,
                balance: initialDeposit,
                description: 'Initial account deposit',
                category: 'deposit'
            });
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
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get reset token
        const resetToken = user.createPasswordResetToken();

        await user.save({ validateBeforeSave: false });

        // In a real application, you would send an email here
        // For now, we'll just return the token for testing purposes
        res.status(200).json({
            success: true,
            data: resetToken,
            message: 'Password reset token generated'
        });
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
        // Get hashed token (the token from URL is already the raw token, we need to hash it to compare with stored hash)
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: resetPasswordToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Set new password
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            data: { token },
            message: 'Password reset successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error resetting password'
        });
    }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Get user
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const token = generateToken(user._id);

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
    refreshToken
};
