const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        unique: true
    },
    accountType: {
        type: String,
        enum: ['savings', 'checking', 'business', 'fixed_deposit', 'recurring_deposit'],
        required: [true, 'Account type is required']
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        maxlength: [50, 'Account name cannot be more than 50 characters'],
        validate: {
            validator: function (v) {
                // Only allow letters, numbers, and spaces
                return /^[A-Za-z0-9 ]+$/.test(v);
            },
            message: 'Account name must not contain special characters.'
        }
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY']
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'frozen', 'closed'],
        default: 'active'
    },
    // For fixed deposits
    fixedDeposit: {
        principal: Number,
        interestRate: Number,
        maturityDate: Date,
        maturityAmount: Number,
        isMatured: { type: Boolean, default: false }
    },
    // For recurring deposits
    recurringDeposit: {
        monthlyDeposit: Number,
        interestRate: Number,
        maturityDate: Date,
        maturityAmount: Number,
        isMatured: { type: Boolean, default: false }
    },
    // Account limits
    limits: {
        dailyWithdrawal: { type: Number, default: 50000 },
        monthlyWithdrawal: { type: Number, default: 500000 },
        dailyTransfer: { type: Number, default: 100000 },
        monthlyTransfer: { type: Number, default: 1000000 }
    },
    // Account features
    features: {
        onlineBanking: { type: Boolean, default: true },
        mobileBanking: { type: Boolean, default: true },
        atmCard: { type: Boolean, default: true },
        chequeBook: { type: Boolean, default: false },
        internetBanking: { type: Boolean, default: true }
    },
    // Branch information
    branch: {
        name: String,
        code: String,
        address: String,
        phone: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
accountSchema.index({ userId: 1 });
accountSchema.index({ accountType: 1 });
accountSchema.index({ status: 1 });

// Virtual for account age
accountSchema.virtual('accountAge').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for available balance (considering limits)
accountSchema.virtual('availableBalance').get(function () {
    // This would be calculated based on daily/monthly limits
    // For now, return the current balance
    return this.balance;
});

// Pre-save middleware to generate account number
accountSchema.pre('save', function (next) {
    if (!this.accountNumber) {
        const typeCode = this.accountType.substring(0, 2).toUpperCase();
        this.accountNumber = typeCode + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 2).toUpperCase();
    }
    next();
});

// Instance method to check withdrawal limits
accountSchema.methods.canWithdraw = function (amount, period = 'daily') {
    // This would check against transaction history
    // For now, return true if amount is within limits
    if (period === 'daily') {
        return amount <= this.limits.dailyWithdrawal;
    } else if (period === 'monthly') {
        return amount <= this.limits.monthlyWithdrawal;
    }
    return false;
};

// Instance method to check transfer limits
accountSchema.methods.canTransfer = function (amount, period = 'daily') {
    if (period === 'daily') {
        return amount <= this.limits.dailyTransfer;
    } else if (period === 'monthly') {
        return amount <= this.limits.monthlyTransfer;
    }
    return false;
};

// Static method to get user accounts
accountSchema.statics.getUserAccounts = function (userId) {
    return this.find({ userId, status: 'active' }).sort({ createdAt: -1 });
};

// Static method to get account by number
accountSchema.statics.findByAccountNumber = function (accountNumber) {
    return this.findOne({ accountNumber, status: 'active' });
};

module.exports = mongoose.model('Account', accountSchema);
