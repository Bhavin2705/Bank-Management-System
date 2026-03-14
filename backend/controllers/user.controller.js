const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Bank = require('../models/Bank');
const AdminActionLog = require('../models/AdminActionLog');
const { logAdminAction } = require('../utils/adminAudit');
const { createInAppNotification } = require('../utils/notifications');
const fs = require('fs');
const path = require('path');
const { PROFILE_UPLOAD_DIR } = require('../middleware/upload');

const isAdmin = (req) => req.user && req.user.role === 'admin';

const isSelfOrAdmin = (req, user) => {
    if (!req.user || !user) return false;
    return user._id.toString() === req.user._id.toString() || isAdmin(req);
};

const notAuthorized = (res) => res.status(403).json({ success: false, error: 'Not authorized' });
const VALID_USER_STATUSES = ['active', 'inactive', 'suspended'];

const getBankMetrics = async (req, res) => {
    try {
        const accountStats = await Account.aggregate([
            { $match: { status: 'active' } },
            {
                $group: {
                    _id: '$accountType',
                    totalBalance: { $sum: '$balance' },
                    averageBalance: { $avg: '$balance' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalDeposits = accountStats.reduce((sum, acc) => sum + acc.totalBalance, 0);

        res.status(200).json({
            success: true,
            data: {
                totalDeposits,
                accountTypeBreakdown: accountStats
            }
        });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting bank metrics' });
    }
};

const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const query = {};

        const search = String(req.query.search || '').trim();
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            query.$or = [
                { name: regex },
                { email: regex },
                { phone: regex },
                { accountNumber: regex }
            ];
        }

        const status = String(req.query.status || '').trim().toLowerCase();
        if (['active', 'suspended', 'inactive'].includes(status)) {
            query.status = status;
        }

        const role = String(req.query.role || '').trim().toLowerCase();
        if (['user', 'admin'].includes(role)) {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting users' });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (!isSelfOrAdmin(req, user)) {
            return notAuthorized(res);
        }

        res.status(200).json({ success: true, data: user });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (!isSelfOrAdmin(req, user)) {
            return notAuthorized(res);
        }

        if (req.body.role !== undefined) {
            return res.status(403).json({ success: false, error: 'Role changes are not allowed in admin dashboard' });
        }

        const allowed = ['name', 'email', 'phone', 'profile', 'preferences', 'status'];
        if (!isAdmin(req)) {
            const index = allowed.indexOf('status');
            if (index !== -1) allowed.splice(index, 1);
        }

        const updates = {};
        allowed.forEach(f => req.body[f] !== undefined && (updates[f] = req.body[f]));

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields provided to update' });
        }

        if (updates.status !== undefined && !VALID_USER_STATUSES.includes(String(updates.status))) {
            return res.status(400).json({ success: false, error: 'Invalid user status' });
        }

        const previousStatus = user.status;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        }).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (isAdmin(req) && updates.status !== undefined && updates.status !== previousStatus) {
            await logAdminAction(req, {
                action: 'user_status_updated',
                targetType: 'user',
                targetId: String(user._id),
                metadata: {
                    userName: user.name,
                    previousStatus,
                    nextStatus: updates.status
                }
            });
        }

        res.status(200).json({ success: true, data: updatedUser });
    } catch {
        res.status(500).json({ success: false, error: 'Server error updating user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (req.user && req.user.role === 'admin') {
            return res.status(403).json({ success: false, error: 'User deletion is disabled for admin dashboard' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        await Transaction.deleteMany({ userId: user._id });
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true });
    } catch {
        res.status(500).json({ success: false, error: 'Server error deleting user' });
    }
};

const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        res.status(200).json({
            success: true,
            data: { totalUsers, activeUsers, adminUsers, newUsers }
        });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting stats' });
    }
};

const getAdminActions = async (req, res) => {
    try {
        const limitRaw = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

        const actions = await AdminActionLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('adminId', 'name email role');

        res.status(200).json({
            success: true,
            data: actions
        });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting admin actions' });
    }
};

const getBanks = async (req, res) => {
    try {
        const banks = await Bank.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: banks });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting banks' });
    }
};

const getTransferRecipients = async (req, res) => {
    try {
        const scope = String(req.query.scope || '').toLowerCase();
        let query = { _id: { $ne: req.user._id } };

        if (scope === 'self') {
            const currentUser = await User.findById(req.user._id).select('phone email');
            if (!currentUser) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            const ownAccountFilters = [];
            if (currentUser.phone) ownAccountFilters.push({ phone: currentUser.phone });
            if (currentUser.email) ownAccountFilters.push({ email: currentUser.email });

            if (ownAccountFilters.length === 0) {
                return res.status(200).json({ success: true, data: [] });
            }

            query = {
                ...query,
                $or: ownAccountFilters
            };
        } else {
            query = {
                ...query,
                role: { $ne: 'admin' }
            };
        }

        const recipients = await User.find(
            query,
            'name email phone accountNumber bankDetails balance'
        ).sort({ name: 1, createdAt: 1 });

        res.status(200).json({ success: true, data: recipients });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting transfer recipients' });
    }
};

const getClientData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('clientData');
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.status(200).json({ success: true, data: user.clientData || {} });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting client data' });
    }
};

const updateClientData = async (req, res) => {
    try {
        const allowedSections = [
            'securityQuestions',
            'loginHistory',
            'recurringPayments',
            'budgets',
            'investments',
            'goals',
            'exchangeCache'
        ];

        const updates = {};
        allowedSections.forEach((section) => {
            if (req.body[section] !== undefined) {
                updates[`clientData.${section}`] = req.body[section];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid client data fields provided' });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('clientData');

        res.status(200).json({ success: true, data: updated?.clientData || {} });
    } catch {
        res.status(500).json({ success: false, error: 'Server error updating client data' });
    }
};

const verifyPin = async (req, res) => {
    try {
        const { pin } = req.body;
        const userId = req.user.id;

        if (!pin) {
            return res.status(400).json({
                success: false,
                error: 'PIN is required'
            });
        }

        const user = await User.findById(userId).select('+pin');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isPinValid = await user.comparePin(pin);

        if (!isPinValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid PIN'
            });
        }

        res.status(200).json({
            success: true,
            message: 'PIN verified successfully'
        });
    } catch (error) {
        console.error('PIN verification error:', error);
        res.status(500).json({
            success: false,
            error: 'PIN verification failed'
        });
    }
};

const updatePin = async (req, res) => {
    try {
        const { currentPin, newPin } = req.body || {};
        const userId = req.user.id;

        if (!currentPin || !newPin) {
            return res.status(400).json({
                success: false,
                error: 'Current PIN and new PIN are required'
            });
        }

        if (!/^\d{4}$/.test(String(newPin))) {
            return res.status(400).json({
                success: false,
                error: 'New PIN must be 4 digits'
            });
        }

        const user = await User.findById(userId).select('+pin');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isCurrentPinValid = await user.comparePin(String(currentPin));

        if (!isCurrentPinValid) {
            return res.status(401).json({
                success: false,
                error: 'Current PIN is incorrect'
            });
        }

        user.pin = String(newPin);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Account PIN updated successfully'
        });
    } catch (error) {
        console.error('PIN update error:', error);
        res.status(500).json({
            success: false,
            error: 'PIN update failed'
        });
    }
};

const updateProfilePhoto = async (req, res) => {
    try {
        console.log('[profile-photo] file', {
            hasFile: !!req.file,
            fieldname: req.file?.fieldname,
            mimetype: req.file?.mimetype,
            size: req.file?.size
        });
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Profile photo is required' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const nextPhotoUrl = `/uploads/profile/${req.file.filename}`;
        const existingUrl = user.profile?.photoUrl;

        if (existingUrl && existingUrl.startsWith('/uploads/profile/')) {
            const existingPath = path.join(PROFILE_UPLOAD_DIR, path.basename(existingUrl));
            if (fs.existsSync(existingPath)) {
                fs.unlink(existingPath, () => {});
            }
        }

        user.profile = user.profile || {};
        user.profile.photoUrl = nextPhotoUrl;
        await user.save();

        await createInAppNotification({
            userId: req.user._id,
            type: 'account_update',
            title: 'Profile Photo Updated',
            message: 'Your profile photo was updated successfully.',
            priority: 'low',
            metadata: { category: 'settings' }
        });

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Profile photo upload error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error uploading profile photo'
        });
    }
};

module.exports = {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getAdminActions,
    getBanks,
    getBankMetrics,
    getTransferRecipients,
    getClientData,
    updateClientData,
    verifyPin,
    updatePin,
    updateProfilePhoto
};
