const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    type: {
        type: String,
        enum: ['credit', 'debit', 'transfer'],
        required: [true, 'Transaction type is required']
    },
    transferType: {
        type: String,
        enum: ['internal', 'external'],
        default: 'internal'
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be greater than 0']
    },
    balance: {
        type: Number,
        required: [true, 'Balance after transaction is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [200, 'Description cannot be more than 200 characters']
    },
    category: {
        type: String,
        enum: [
            'withdrawal', 'transfer', 'bill_payment', 'shopping',
            'food', 'transport', 'entertainment', 'utilities', 'salary',
            'investment', 'loan', 'fee', 'interest', 'other'
        ],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'completed'
    },
    reference: {
        type: String,
        unique: true,
        sparse: true
    },
    // For transfers
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recipientAccount: String,
    recipientName: String,
    recipientBank: {
        bankName: String,
        ifscCode: String,
        branchName: String
    },

    // For bill payments
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill'
    },

    // For investments
    investmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment'
    },

    // Location data (if available)
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },

    // Device information
    deviceInfo: {
        userAgent: String,
        ipAddress: String
    },

    // For recurring transactions
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RecurringPayment'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ recipientId: 1 });
transactionSchema.index({ status: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(this.amount);
});

// Virtual for transaction direction
transactionSchema.virtual('direction').get(function () {
    return this.type === 'credit' ? 'received' : 'sent';
});

// Pre-save middleware to generate reference
transactionSchema.pre('save', function (next) {
    if (!this.reference) {
        this.reference = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
    next();
});

// Static method to get user transactions
transactionSchema.statics.getUserTransactions = function (userId, options = {}) {
    const { limit = 50, skip = 0, type, category, startDate, endDate } = options;

    let query = { userId };

    if (type) query.type = type;
    if (category && type !== 'credit') query.category = category;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('recipientId', 'name accountNumber')
        .populate('billId', 'type amount')
        .populate('investmentId', 'type name');
};

// Static method to get transaction statistics
transactionSchema.statics.getTransactionStats = function (userId, period = 'month') {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: null,
                totalCredits: {
                    $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
                },
                totalDebits: {
                    $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] }
                },
                transactionCount: { $sum: 1 },
                categories: {
                    $push: {
                        $cond: [{ $ne: ['$type', 'credit'] }, '$category', '$$REMOVE']
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
