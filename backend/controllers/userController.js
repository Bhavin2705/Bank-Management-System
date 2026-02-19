const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Bank = require('../models/Bank');

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

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        const total = await User.countDocuments();

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

        if (user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
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

        if (user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        const allowed = ['name', 'email', 'phone', 'profile', 'preferences', 'status'];
        if (req.user.role !== 'admin') allowed.splice(allowed.indexOf('status'), 1);

        const updates = {};
        allowed.forEach(f => req.body[f] !== undefined && (updates[f] = req.body[f]));

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        }).select('-password');

        res.status(200).json({ success: true, data: updatedUser });
    } catch {
        res.status(500).json({ success: false, error: 'Server error updating user' });
    }
};

const deleteUser = async (req, res) => {
    try {
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

const getBanks = async (req, res) => {
    try {
        const banks = await Bank.find().sort({ name: 1 });
        res.status(200).json({ success: true, data: banks });
    } catch {
        res.status(500).json({ success: false, error: 'Server error getting banks' });
    }
};

module.exports = {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getBanks,
    getBankMetrics
};
