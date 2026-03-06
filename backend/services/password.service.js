const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('./email');
const { createInAppNotification } = require('../utils/notifications');
const { generateToken, cookieOptions } = require('../helpers/auth.helpers');

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

module.exports = {
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyResetToken
};
