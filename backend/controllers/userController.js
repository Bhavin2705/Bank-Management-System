const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getAllBanks } = require('../utils/banks');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
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
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting users'
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin or Own Profile
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if user is requesting their own profile or is admin
        if (user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view this user'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting user'
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Own Profile
const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if user is updating their own profile or is admin
        if (user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this user'
            });
        }

        // Fields that can be updated
        const allowedFields = [
            'name', 'email', 'phone', 'profile', 'preferences',
            'status' // Only admin can update status
        ];

        const updates = {};

        // If not admin, remove status from allowed fields
        if (req.user.role !== 'admin') {
            const adminIndex = allowedFields.indexOf('status');
            if (adminIndex > -1) {
                allowedFields.splice(adminIndex, 1);
            }
        }

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating user'
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        // Delete all user's transactions
        await Transaction.deleteMany({ userId: user._id });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {},
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error deleting user'
        });
    }
};

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'active' });
        const adminUsers = await User.countDocuments({ role: 'admin' });

        // Get users registered in last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const newUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get total balance across all users
        const balanceStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$balance' },
                    averageBalance: { $avg: '$balance' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                adminUsers,
                newUsers,
                totalBalance: balanceStats[0]?.totalBalance || 0,
                averageBalance: balanceStats[0]?.averageBalance || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting user statistics'
        });
    }
};

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent changing own role
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change your own role'
            });
        }

        user.role = role;
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            message: `User role updated to ${role}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating user role'
        });
    }
};

// @desc    Suspend/Reactivate user (Admin only)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent suspending own account
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change your own status'
            });
        }

        user.status = status;
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                status: user.status
            },
            message: `User status updated to ${status}`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error updating user status'
        });
    }
};

// @desc    Get user by account number
// @route   GET /api/users/account/:accountNumber
// @access  Private/Admin
const getUserByAccountNumber = async (req, res) => {
    try {
        const user = await User.findOne({
            accountNumber: req.params.accountNumber
        }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting user by account number'
        });
    }
};

// @desc    Get list of popular banks
// @route   GET /api/users/banks
// @access  Public
const getBanks = async (req, res) => {
    try {
        const banks = getAllBanks();

        res.status(200).json({
            success: true,
            data: banks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error getting banks list'
        });
    }
};

// @desc    Check if email exists
// @route   GET /api/users/check-email
// @access  Public
const checkEmailExists = async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email query parameter is required'
            });
        }

        const emailExists = await User.exists({ email });

        res.status(200).json({
            success: true,
            exists: !!emailExists
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error checking email'
        });
    }
};

// @desc    Check if phone exists and account limit
// @route   GET /api/users/check-phone
// @access  Public
const checkPhoneExists = async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: 'Phone query parameter is required'
            });
        }

        const phoneCheck = await User.checkPhoneAccountLimit(phone);

        res.status(200).json({
            success: true,
            exists: !phoneCheck.canRegister,
            count: phoneCheck.count,
            maxAllowed: phoneCheck.maxAllowed,
            canRegister: phoneCheck.canRegister,
            message: phoneCheck.canRegister
                ? `Phone number available (${phoneCheck.count}/${phoneCheck.maxAllowed} accounts used)`
                : `Maximum ${phoneCheck.maxAllowed} accounts allowed per phone number`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error checking phone'
        });
    }
};

// @desc    Get users for transfer (limited info)
// @route   GET /api/users/transfer-recipients
// @access  Private (authenticated users only)
const getTransferRecipients = async (req, res) => {
    try {
        // Get all users except the current user and admins
        // Only return essential information for transfers
        const users = await User.find({
            _id: { $ne: req.user.id }, // Exclude current user
            role: { $ne: 'admin' }, // Exclude admin users
            status: 'active' // Only active users
        })
            .select('firstName lastName email accountNumber profilePicture') // Limited fields
            .sort({ firstName: 1, lastName: 1 }); // Sort alphabetically

        res.status(200).json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error getting transfer recipients:', error);
        res.status(500).json({
            success: false,
            error: 'Server error getting transfer recipients'
        });
    }
};

module.exports = {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUserStats,
    getUserByAccountNumber,
    getBanks,
    updateUserRole,
    updateUserStatus,
    checkEmailExists,
    checkPhoneExists,
    getTransferRecipients
};
