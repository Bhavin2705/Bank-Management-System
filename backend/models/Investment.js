const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    type: {
        type: String,
        enum: ['stocks', 'mutual_funds', 'bonds', 'fd', 'rd', 'gold', 'crypto', 'etf'],
        required: [true, 'Investment type is required']
    },
    name: {
        type: String,
        required: [true, 'Investment name is required'],
        maxlength: [100, 'Investment name cannot be more than 100 characters']
    },
    symbol: {
        type: String,
        uppercase: true,
        sparse: true // Allow null values but ensure uniqueness when present
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required'],
        min: [0, 'Purchase price cannot be negative']
    },
    currentPrice: {
        type: Number,
        default: 0,
        min: [0, 'Current price cannot be negative']
    },
    totalValue: {
        type: Number,
        default: 0,
        min: [0, 'Total value cannot be negative']
    },
    // For fixed investments like FD, RD
    investmentDetails: {
        principal: Number,
        interestRate: Number,
        tenure: Number, // in months
        maturityDate: Date,
        maturityAmount: Number,
        compoundingFrequency: {
            type: String,
            enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
            default: 'yearly'
        }
    },
    // For market investments
    marketData: {
        exchange: String,
        sector: String,
        marketCap: String,
        dividendYield: Number,
        peRatio: Number,
        pbRatio: Number,
        eps: Number
    },
    // Performance tracking
    performance: {
        dayChange: { type: Number, default: 0 },
        dayChangePercent: { type: Number, default: 0 },
        weekChange: { type: Number, default: 0 },
        weekChangePercent: { type: Number, default: 0 },
        monthChange: { type: Number, default: 0 },
        monthChangePercent: { type: Number, default: 0 },
        yearChange: { type: Number, default: 0 },
        yearChangePercent: { type: Number, default: 0 },
        allTimeChange: { type: Number, default: 0 },
        allTimeChangePercent: { type: Number, default: 0 }
    },
    // Transaction history for this investment
    transactions: [{
        type: {
            type: String,
            enum: ['buy', 'sell', 'dividend', 'interest', 'bonus']
        },
        quantity: Number,
        price: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        notes: String
    }],
    status: {
        type: String,
        enum: ['active', 'sold', 'matured', 'defaulted'],
        default: 'active'
    },
    // Risk profile
    risk: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    // Tags for categorization
    tags: [String]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
investmentSchema.index({ userId: 1, type: 1 });
investmentSchema.index({ userId: 1, symbol: 1 });
investmentSchema.index({ symbol: 1 });
investmentSchema.index({ status: 1 });

// Virtual for profit/loss
investmentSchema.virtual('profitLoss').get(function () {
    return this.totalValue - (this.purchasePrice * this.quantity);
});

// Virtual for profit/loss percentage
investmentSchema.virtual('profitLossPercent').get(function () {
    if (this.purchasePrice * this.quantity === 0) return 0;
    return ((this.totalValue - (this.purchasePrice * this.quantity)) / (this.purchasePrice * this.quantity)) * 100;
});

// Virtual for investment age
investmentSchema.virtual('investmentAge').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to calculate total value
investmentSchema.pre('save', function (next) {
    if (this.quantity && this.currentPrice) {
        this.totalValue = this.quantity * this.currentPrice;
    }
    next();
});

// Instance method to add transaction
investmentSchema.methods.addTransaction = function (transactionData) {
    this.transactions.push({
        ...transactionData,
        date: new Date()
    });

    // Update quantity based on transaction type
    if (transactionData.type === 'buy') {
        this.quantity += transactionData.quantity;
        this.purchasePrice = ((this.purchasePrice * (this.quantity - transactionData.quantity)) +
            (transactionData.price * transactionData.quantity)) / this.quantity;
    } else if (transactionData.type === 'sell') {
        this.quantity -= transactionData.quantity;
    }

    return this.save();
};

// Instance method to update current price
investmentSchema.methods.updatePrice = function (newPrice) {
    const oldValue = this.totalValue;
    this.currentPrice = newPrice;
    this.totalValue = this.quantity * newPrice;

    // Calculate day change
    if (oldValue > 0) {
        this.performance.dayChange = this.totalValue - oldValue;
        this.performance.dayChangePercent = (this.performance.dayChange / oldValue) * 100;
    }

    return this.save();
};

// Static method to get user portfolio
investmentSchema.statics.getUserPortfolio = function (userId) {
    return this.find({ userId, status: 'active' })
        .sort({ totalValue: -1 });
};

// Static method to get portfolio summary
investmentSchema.statics.getPortfolioSummary = function (userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), status: 'active' } },
        {
            $group: {
                _id: '$type',
                totalValue: { $sum: '$totalValue' },
                totalInvested: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                type: '$_id',
                totalValue: 1,
                totalInvested: 1,
                profitLoss: { $subtract: ['$totalValue', '$totalInvested'] },
                count: 1
            }
        }
    ]);
};

// Static method to get top performers
investmentSchema.statics.getTopPerformers = function (userId, limit = 5) {
    return this.find({ userId, status: 'active' })
        .sort({ 'performance.monthChangePercent': -1 })
        .limit(limit);
};

module.exports = mongoose.model('Investment', investmentSchema);
