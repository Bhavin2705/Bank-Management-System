const User = require('../models/User');

// @desc    Get user settings/preferences
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    dateOfBirth: user.profile?.dateOfBirth,
                    address: user.profile?.address,
                    occupation: user.profile?.occupation,
                    income: user.profile?.income
                },
                bank: {
                    bankName: user.bankDetails?.bankName,
                    ifscCode: user.bankDetails?.ifscCode,
                    branchName: user.bankDetails?.branchName,
                    accountNumber: user.accountNumber
                },
                security: {
                    isEmailVerified: user.security?.isEmailVerified,
                    isPhoneVerified: user.security?.isPhoneVerified,
                    twoFactorEnabled: user.security?.twoFactorEnabled,
                    lastLogin: user.security?.lastLogin
                },
                preferences: {
                    currency: user.preferences?.currency || 'INR',
                    language: user.preferences?.language || 'en',
                    theme: user.preferences?.theme || 'light',
                    notifications: {
                        email: user.preferences?.notifications?.email !== false,
                        sms: user.preferences?.notifications?.sms !== false,
                        push: user.preferences?.notifications?.push !== false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching settings'
        });
    }
};

// @desc    Update user preferences
// @route   PUT /api/settings/preferences
// @access  Private
const updatePreferences = async (req, res) => {
    try {
        const { currency, language, theme, notifications } = req.body;

        const updateData = {};

        if (currency) updateData['preferences.currency'] = currency;
        if (language) updateData['preferences.language'] = language;
        if (theme) updateData['preferences.theme'] = theme;

        if (notifications) {
            if (notifications.email !== undefined) updateData['preferences.notifications.email'] = notifications.email;
            if (notifications.sms !== undefined) updateData['preferences.notifications.sms'] = notifications.sms;
            if (notifications.push !== undefined) updateData['preferences.notifications.push'] = notifications.push;
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: user.preferences,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error updating preferences'
        });
    }
};

// @desc    Enable/Disable two-factor authentication
// @route   PUT /api/settings/two-factor
// @access  Private
const updateTwoFactor = async (req, res) => {
    try {
        const { enable } = req.body;

        const updateData = {
            'security.twoFactorEnabled': enable ? true : false
        };

        if (!enable) {
            updateData['security.twoFactorSecret'] = null;
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, {
            new: true
        });

        res.status(200).json({
            success: true,
            data: {
                twoFactorEnabled: user.security?.twoFactorEnabled
            },
            message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('Update two-factor error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error updating two-factor authentication'
        });
    }
};

// @desc    Get linked accounts/cards
// @route   GET /api/settings/linked-accounts
// @access  Private
const getLinkedAccounts = async (req, res) => {
    try {
        const Card = require('../models/Card');

        const cards = await Card.find({ userId: req.user._id }).select('-cvv');

        res.status(200).json({
            success: true,
            data: cards
        });
    } catch (error) {
        console.error('Get linked accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching linked accounts'
        });
    }
};

// @desc    Get account session information
// @route   GET /api/settings/sessions
// @access  Private
const getSessions = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const sessions = {
            lastLogin: user.security?.lastLogin,
            accountCreated: user.createdAt,
            accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
            currentSession: new Date()
        };

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error fetching sessions'
        });
    }
};

module.exports = {
    getSettings,
    updatePreferences,
    updateTwoFactor,
    getLinkedAccounts,
    getSessions
};
