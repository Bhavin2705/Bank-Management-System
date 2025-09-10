const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        maxlength: [50, 'Budget name cannot be more than 50 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'food', 'transport', 'entertainment', 'shopping', 'utilities',
            'rent', 'insurance', 'healthcare', 'education', 'savings',
            'investment', 'debt_payment', 'miscellaneous', 'other'
        ]
    },
    amount: {
        type: Number,
        required: [true, 'Budget amount is required'],
        min: [0, 'Budget amount cannot be negative']
    },
    spent: {
        type: Number,
        default: 0,
        min: [0, 'Spent amount cannot be negative']
    },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly'],
        default: 'monthly'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'over_budget', 'cancelled'],
        default: 'active'
    },
    // Budget alerts
    alerts: {
        warningThreshold: { type: Number, default: 80 }, // Alert at 80% of budget
        criticalThreshold: { type: Number, default: 100 }, // Alert at 100% of budget
        emailAlerts: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false }
    },
    // Recurring budget
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringFrequency: {
        type: String,
        enum: ['weekly', 'monthly', 'yearly']
    },
    // Budget notes
    notes: {
        type: String,
        maxlength: [200, 'Notes cannot be more than 200 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
budgetSchema.index({ userId: 1, category: 1 });
budgetSchema.index({ userId: 1, status: 1 });
budgetSchema.index({ userId: 1, period: 1 });

// Virtual for remaining amount
budgetSchema.virtual('remaining').get(function () {
    return Math.max(0, this.amount - this.spent);
});

// Virtual for spent percentage
budgetSchema.virtual('spentPercent').get(function () {
    if (this.amount === 0) return 0;
    return (this.spent / this.amount) * 100;
});

// Virtual for budget status based on spending
budgetSchema.virtual('budgetStatus').get(function () {
    const percent = this.spentPercent;
    if (percent >= 100) return 'over_budget';
    if (percent >= this.alerts.criticalThreshold) return 'critical';
    if (percent >= this.alerts.warningThreshold) return 'warning';
    return 'good';
});

// Virtual for days remaining in budget period
budgetSchema.virtual('daysRemaining').get(function () {
    if (!this.endDate) return null;
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to set end date based on period
budgetSchema.pre('save', function (next) {
    if (this.isNew && !this.endDate) {
        const start = new Date(this.startDate);
        switch (this.period) {
            case 'weekly':
                this.endDate = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                this.endDate = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
                break;
            case 'yearly':
                this.endDate = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
                break;
        }
    }
    next();
});

// Instance method to add expense
budgetSchema.methods.addExpense = function (amount) {
    this.spent += amount;

    // Update status based on spending
    if (this.spent >= this.amount) {
        this.status = 'over_budget';
    }

    return this.save();
};

// Instance method to check if budget is exceeded
budgetSchema.methods.isExceeded = function () {
    return this.spent >= this.amount;
};

// Instance method to get budget progress
budgetSchema.methods.getProgress = function () {
    return {
        spent: this.spent,
        remaining: this.remaining,
        spentPercent: this.spentPercent,
        status: this.budgetStatus,
        daysRemaining: this.daysRemaining
    };
};

// Static method to get user budgets
budgetSchema.statics.getUserBudgets = function (userId, status = 'active') {
    return this.find({ userId, status }).sort({ createdAt: -1 });
};

// Static method to get budgets by category
budgetSchema.statics.getBudgetsByCategory = function (userId, category) {
    return this.find({ userId, category, status: 'active' });
};

// Static method to get budget summary
budgetSchema.statics.getBudgetSummary = function (userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId), status: 'active' } },
        {
            $group: {
                _id: null,
                totalBudget: { $sum: '$amount' },
                totalSpent: { $sum: '$spent' },
                budgetCount: { $sum: 1 },
                overBudgetCount: {
                    $sum: { $cond: [{ $gte: ['$spent', '$amount'] }, 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Budget', budgetSchema);
