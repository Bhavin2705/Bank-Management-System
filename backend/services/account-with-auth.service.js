const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Bank = require('../models/Bank');
const emailNotifier = require('./email/notifier');
const { generateIFSCFromBankCode } = require('../utils/banks');
const {
    generateToken,
    generateRefreshToken,
    initiateTwoFactorLogin,
    verifyTwoFactorOtp,
    appendLoginHistoryEntry,
    setAuthCookies,
    buildAuthenticatedUserResponse
} = require('../helpers/auth.helpers');

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
            token
        }
    });
};

const startTwoFactorLogin = (user, req, res) => (
    initiateTwoFactorLogin(user, req, res, emailNotifier.sendLoginOtpEmail)
);

const resolveBankDetailsWithIfsc = async (requestedBankDetails = {}) => {
    const requestedName = String(requestedBankDetails?.bankName || '').trim();
    if (!requestedName) {
        return {
            bankName: 'BankPro',
            ifscCode: 'BANK0001234',
            branchName: 'Main Branch'
        };
    }

    const bank = await Bank.findOne({
        name: new RegExp(`^${requestedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    }).select('name bankCode ifscPrefix');

    const bankCode = String(bank?.bankCode || bank?.ifscPrefix || '').trim().toUpperCase();
    const generatedIfsc = generateIFSCFromBankCode(bankCode);

    return {
        bankName: bank?.name || requestedName,
        ifscCode: generatedIfsc || String(requestedBankDetails?.ifscCode || 'BANK0001234').trim().toUpperCase(),
        branchName: String(requestedBankDetails?.branchName || 'Main Branch').trim() || 'Main Branch'
    };
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

        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({
                success: false,
                error: 'PIN must be a 4 digit number'
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

        const resolvedBankDetails = await resolveBankDetailsWithIfsc(bankDetails);

        const userData = {
            name,
            email,
            phone,
            password,
            pin,
            balance: initialDeposit || 0,
            bankDetails: resolvedBankDetails,
            firstLogin: true
        };

        const user = new User(userData);
        user.generateAccountNumber();
        await user.save();

        if (initialDeposit && initialDeposit > 0) {
            try {
                const recentDuplicate = await Transaction.findOne({
                    userId: user._id,
                    type: 'credit',
                    amount: initialDeposit,
                    description: 'Initial account deposit',
                    createdAt: { $gte: new Date(Date.now() - 10 * 1000) }
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
            createdAt: user.createdAt,
            firstLogin: user.firstLogin
        };

        setAuthCookies(res, token, refreshToken);

        emailNotifier.sendWelcomeEmail(user.email, user.name);
        emailNotifier.sendAccountCreatedEmail(user.email, user.name, user.accountNumber);

        res.status(201).json({
            success: true,
            data: {
                user: userResponse,
                token
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
                const accountChoices = users.map((u) => ({
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
                return startTwoFactorLogin(user, req, res);
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
                return startTwoFactorLogin(user, req, res);
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

module.exports = {
    register,
    login,
    loginWithAccount
};
