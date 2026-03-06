const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');

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
        const normalizedAddress = (() => {
            if (req.body.address === undefined) return undefined;
            if (req.body.address === null) return { street: '' };
            if (typeof req.body.address === 'string') {
                return { street: req.body.address.trim() };
            }
            if (typeof req.body.address === 'object') {
                return req.body.address;
            }
            return undefined;
        })();

        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            'profile.dateOfBirth': req.body.dateOfBirth,
            'profile.address': normalizedAddress,
            'profile.occupation': req.body.occupation,
            'profile.income': req.body.income,
            'preferences.currency': req.body.currency,
            'preferences.language': req.body.language,
            'preferences.theme': req.body.theme,
            'bankDetails.bankName': req.body.bankName,
            'bankDetails.ifscCode': req.body.ifscCode,
            'bankDetails.branchName': req.body.branchName
        };

        Object.keys(fieldsToUpdate).forEach((key) => {
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
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors || {})
                .map((entry) => entry.message)
                .join(', ') || 'Invalid profile details';

            return res.status(400).json({
                success: false,
                error: message
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error updating user details'
        });
    }
};

module.exports = {
    getMe,
    updateDetails
};
