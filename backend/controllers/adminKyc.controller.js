const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');

const listPendingKyc = async (req, res) => {
    try {
        const users = await User.find({ 'kyc.status': 'pending' })
            .select('name email kyc createdAt')
            .sort({ 'kyc.submittedAt': -1 });
        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('List pending KYC error:', error);
        return res.status(500).json({ success: false, error: 'Server error fetching pending verifications' });
    }
};

const approveKyc = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        user.kyc = user.kyc || {};
        user.kyc.status = 'verified';
        user.kyc.reviewedAt = new Date();
        user.kyc.reviewedBy = req.user._id;
        user.kyc.rejectionReason = '';
        await user.save();

        await createInAppNotification({
            userId: user._id,
            type: 'account_update',
            title: 'Verification Approved',
            message: 'Your account verification has been approved.',
            priority: 'medium',
            metadata: { category: 'kyc' }
        });

        return res.status(200).json({ success: true, data: user.kyc });
    } catch (error) {
        console.error('Approve KYC error:', error);
        return res.status(500).json({ success: false, error: 'Server error approving verification' });
    }
};

const rejectKyc = async (req, res) => {
    try {
        const reason = String(req.body.reason || '').trim();
        if (!reason) {
            return res.status(400).json({ success: false, error: 'Rejection reason is required' });
        }

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        user.kyc = user.kyc || {};
        user.kyc.status = 'rejected';
        user.kyc.reviewedAt = new Date();
        user.kyc.reviewedBy = req.user._id;
        user.kyc.rejectionReason = reason;
        await user.save();

        await createInAppNotification({
            userId: user._id,
            type: 'security_alert',
            title: 'Verification Rejected',
            message: `Your verification was rejected. Reason: ${reason}`,
            priority: 'high',
            metadata: { category: 'kyc' }
        });

        return res.status(200).json({ success: true, data: user.kyc });
    } catch (error) {
        console.error('Reject KYC error:', error);
        return res.status(500).json({ success: false, error: 'Server error rejecting verification' });
    }
};

module.exports = {
    listPendingKyc,
    approveKyc,
    rejectKyc
};
