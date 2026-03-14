const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');
const Card = require('../models/Card');

const getUserOr404 = async (req, res, select = '') => {
    const user = await User.findById(req.user._id).select(select);
    if (!user) {
        res.status(404).json({
            success: false,
            error: 'User not found'
        });
        return null;
    }
    return user;
};

const getSettings = async (req, res) => {
    try {
        const user = await getUserOr404(req, res);
        if (!user) return;

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    photoUrl: user.profile?.photoUrl,
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
                kyc: {
                    status: user.kyc?.status || 'unverified',
                    idType: user.kyc?.idType,
                    idNumberMasked: user.kyc?.idNumberMasked,
                    documentUrls: user.kyc?.documentUrls,
                    submittedAt: user.kyc?.submittedAt,
                    reviewedAt: user.kyc?.reviewedAt,
                    rejectionReason: user.kyc?.rejectionReason
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

        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'Preferences Updated',
            message: 'Your notification or display preferences were updated.',
            priority: 'low',
            metadata: { category: 'settings' }
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

        await createInAppNotification({
            userId: req.user._id,
            type: 'security_alert',
            title: 'Two-Factor Authentication Updated',
            message: `Two-factor authentication was ${enable ? 'enabled' : 'disabled'} on your account.`,
            priority: 'high',
            metadata: { category: 'security' }
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

const getLinkedAccounts = async (req, res) => {
    try {
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

const getSessions = async (req, res) => {
    try {
        const user = await getUserOr404(req, res);
        if (!user) return;

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
