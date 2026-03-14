const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { createInAppNotification } = require('../utils/notifications');
const { KYC_UPLOAD_DIR } = require('../middleware/upload');

const maskIdNumber = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\s+/g, '');
    if (digits.length <= 4) return `****${digits}`;
    return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const submitKyc = async (req, res) => {
    try {
        if (!req.file && (!req.files || req.files.length === 0)) {
            return res.status(400).json({ success: false, error: 'At least one document image is required' });
        }

        const files = req.files || (req.file ? [req.file] : []);
        const idType = String(req.body.idType || '').trim().toLowerCase();
        const allowedTypes = ['aadhaar', 'pan', 'passport', 'driver_license', 'other'];

        if (!allowedTypes.includes(idType)) {
            return res.status(400).json({ success: false, error: 'Invalid ID type' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const existingDocs = Array.isArray(user.kyc?.documentUrls) ? user.kyc.documentUrls : [];
        existingDocs
            .filter((doc) => doc.startsWith('/uploads/kyc/'))
            .forEach((doc) => {
                const existingPath = path.join(KYC_UPLOAD_DIR, path.basename(doc));
                if (fs.existsSync(existingPath)) {
                    fs.unlink(existingPath, () => {});
                }
            });

        const documentUrls = files.map((file) => `/uploads/kyc/${file.filename}`);
        const idNumberMasked = maskIdNumber(req.body.idNumber || '');

        user.kyc = {
            status: 'pending',
            idType,
            idNumberMasked,
            documentUrls,
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: ''
        };

        await user.save();

        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'Verification Submitted',
            message: 'Your verification documents have been submitted for review.',
            priority: 'low',
            metadata: { category: 'kyc' }
        });

        return res.status(200).json({ success: true, data: user.kyc });
    } catch (error) {
        console.error('KYC submit error:', error);
        return res.status(500).json({ success: false, error: 'Server error submitting verification' });
    }
};

const getKycStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user.kyc || { status: 'unverified' } });
    } catch (error) {
        console.error('KYC status error:', error);
        return res.status(500).json({ success: false, error: 'Server error fetching verification status' });
    }
};

module.exports = {
    submitKyc,
    getKycStatus
};
